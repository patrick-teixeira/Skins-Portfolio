"use client";

import { useCallback, useContext, useEffect, useMemo, useState, createContext, ReactNode } from "react";
import type { DashboardMetrics, PnLDataPoint, Skin, Transaction, User } from "@/lib/types";

interface AuthCredentials {
  username: string;
  password: string;
}

interface SkinsContextType {
  skins: Skin[];
  user: User | null;
  loading: boolean;
  authLoading: boolean;
  error: string;
  addSkin: (skin: Omit<Skin, "id" | "status">) => Promise<void>;
  editSkin: (skinId: string, skin: Omit<Skin, "id" | "status" | "salePrice" | "saleFee" | "saleDate">) => Promise<void>;
  sellSkin: (skinId: string, salePrice: number, saleFee: number, saleDate: string) => Promise<void>;
  deleteSkin: (skinId: string) => Promise<void>;
  login: (credentials: AuthCredentials) => Promise<void>;
  register: (credentials: AuthCredentials) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  metrics: DashboardMetrics;
  pnlData: PnLDataPoint[];
}

const SkinsContext = createContext<SkinsContextType | undefined>(undefined);

async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error ?? "Nao foi possivel concluir a operacao");
  }

  return payload as T;
}

function transactionToSkin(transaction: Transaction): Skin {
  return {
    id: transaction.id,
    skinId: transaction.skinId,
    name: transaction.skinName,
    purchasePrice: transaction.buyPrice,
    marketplace: transaction.marketplace || "Nao informado",
    purchaseDate: transaction.purchaseDate,
    status: transaction.saleDate ? "sold" : "in_stock",
    rarity: transaction.skinRarity,
    rarityColor: transaction.skinRarityColor,
    image: transaction.skinImage,
    salePrice: transaction.salePrice ?? undefined,
    saleFee: transaction.saleFee ?? undefined,
    saleDate: transaction.saleDate ?? undefined,
    notes: transaction.notes,
  };
}

function calculateMetrics(skins: Skin[]): DashboardMetrics {
  let totalInvested = 0;
  let totalSold = 0;
  let totalProfit = 0;
  let skinsInStock = 0;
  const profitPercentages: number[] = [];

  skins.forEach((skin) => {
    totalInvested += skin.purchasePrice;

    if (skin.status === "sold" && skin.salePrice !== undefined && skin.saleFee !== undefined) {
      const saleNet = skin.salePrice - skin.saleFee;
      const profit = saleNet - skin.purchasePrice;
      totalSold += skin.salePrice;
      totalProfit += profit;

      if (skin.purchasePrice > 0) {
        profitPercentages.push((profit / skin.purchasePrice) * 100);
      }
    } else {
      skinsInStock++;
    }
  });

  return {
    totalProfit,
    totalInvested,
    totalSold,
    skinsInStock,
    roi: totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0,
    avgProfitPercent:
      profitPercentages.length > 0
        ? profitPercentages.reduce((a, b) => a + b, 0) / profitPercentages.length
        : 0,
  };
}

function calculatePnLData(skins: Skin[]): PnLDataPoint[] {
  const soldSkins = skins
    .filter((skin) => skin.status === "sold" && skin.saleDate)
    .sort((a, b) => new Date(a.saleDate!).getTime() - new Date(b.saleDate!).getTime());

  let cumulative = 0;

  return soldSkins.map((skin) => {
    const profit = skin.salePrice! - (skin.saleFee || 0) - skin.purchasePrice;
    cumulative += profit;

    return {
      date: skin.saleDate!,
      profit,
      cumulative,
    };
  });
}

export function SkinsProvider({ children }: { children: ReactNode }) {
  const [skins, setSkins] = useState<Skin[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState("");

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const transactions = await apiRequest<Transaction[]>("/api/transactions");
      setSkins(transactions.map(transactionToSkin));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar transacoes");
      setSkins([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      setLoading(true);

      try {
        const session = await apiRequest<{ user: User | null }>("/api/auth/me");
        if (!active) return;
        setUser(session.user);

        if (session.user) {
          const transactions = await apiRequest<Transaction[]>("/api/transactions");
          if (active) setSkins(transactions.map(transactionToSkin));
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Erro ao carregar sessao");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSession();

    return () => {
      active = false;
    };
  }, []);

  const authenticate = async (url: string, credentials: AuthCredentials) => {
    setAuthLoading(true);
    setError("");

    try {
      const payload = await apiRequest<{ user: User }>(url, {
        method: "POST",
        body: JSON.stringify(credentials),
      });
      setUser(payload.user);
      await loadTransactions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro de autenticacao");
      throw err;
    } finally {
      setAuthLoading(false);
    }
  };

  const addSkin = async (skinData: Omit<Skin, "id" | "status">) => {
    const transaction = await apiRequest<Transaction>("/api/transactions", {
      method: "POST",
      body: JSON.stringify({
        skinId: skinData.skinId,
        skinName: skinData.name,
        skinRarity: skinData.rarity,
        skinRarityColor: skinData.rarityColor,
        skinImage: skinData.image,
        buyPrice: skinData.purchasePrice,
        marketplace: skinData.marketplace,
        purchaseDate: skinData.purchaseDate,
        notes: skinData.notes,
      }),
    });

    setSkins((prev) => [transactionToSkin(transaction), ...prev]);
  };

  const editSkin = async (
    skinId: string,
    skinData: Omit<Skin, "id" | "status" | "salePrice" | "saleFee" | "saleDate">,
  ) => {
    const transaction = await apiRequest<Transaction>(`/api/transactions/${skinId}`, {
      method: "PUT",
      body: JSON.stringify({
        skinId: skinData.skinId,
        skinName: skinData.name,
        skinRarity: skinData.rarity,
        skinRarityColor: skinData.rarityColor,
        skinImage: skinData.image,
        buyPrice: skinData.purchasePrice,
        marketplace: skinData.marketplace,
        purchaseDate: skinData.purchaseDate,
        notes: skinData.notes,
      }),
    });

    setSkins((prev) => prev.map((skin) => (skin.id === skinId ? transactionToSkin(transaction) : skin)));
  };

  const sellSkin = async (skinId: string, salePrice: number, saleFee: number, saleDate: string) => {
    const transaction = await apiRequest<Transaction>(`/api/transactions/${skinId}/sale`, {
      method: "PUT",
      body: JSON.stringify({ salePrice, saleFee, saleDate }),
    });

    setSkins((prev) => prev.map((skin) => (skin.id === skinId ? transactionToSkin(transaction) : skin)));
  };

  const deleteSkin = async (skinId: string) => {
    await apiRequest<{ ok: boolean }>(`/api/transactions/${skinId}`, {
      method: "DELETE",
    });

    setSkins((prev) => prev.filter((skin) => skin.id !== skinId));
  };

  const logout = async () => {
    await apiRequest<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
    setUser(null);
    setSkins([]);
  };

  const metrics = useMemo(() => calculateMetrics(skins), [skins]);
  const pnlData = useMemo(() => calculatePnLData(skins), [skins]);

  return (
    <SkinsContext.Provider
      value={{
        skins,
        user,
        loading,
        authLoading,
        error,
        addSkin,
        editSkin,
        sellSkin,
        deleteSkin,
        login: (credentials) => authenticate("/api/auth/login", credentials),
        register: (credentials) => authenticate("/api/auth/register", credentials),
        logout,
        clearError: () => setError(""),
        metrics,
        pnlData,
      }}
    >
      {children}
    </SkinsContext.Provider>
  );
}

export function useSkins() {
  const context = useContext(SkinsContext);
  if (!context) {
    throw new Error("useSkins must be used within a SkinsProvider");
  }
  return context;
}
