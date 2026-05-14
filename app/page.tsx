"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import {
  Crosshair,
  Plus,
  Package,
  DollarSign,
  TrendingUp,
  Percent,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/stats-card";
import { SkinCard } from "@/components/skin-card";
import { AddTransactionDialog } from "@/components/add-transaction-dialog";
import { SaleDialog } from "@/components/sale-dialog";
import { moneyFormatter, formatPercent } from "@/lib/utils";
import { type Transaction, calculateStats } from "@/lib/types";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function Home() {
  const { data: transactions = [], isLoading } = useSWR<Transaction[]>("/api/transactions", fetcher);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const stats = calculateStats(transactions);

  const handleAddTransaction = async (data: {
    skinId: string;
    skinName: string;
    skinRarity: string;
    skinRarityColor: string;
    skinImage: string;
    buyPrice: number;
    purchaseDate: string;
    notes: string;
  }) => {
    const response = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erro ao adicionar transacao");
    }

    const transaction = await response.json();
    mutate("/api/transactions", [transaction, ...transactions], false);
    toast.success("Skin adicionada ao portfolio!");
  };

  const handleSale = async (
    transactionId: string,
    data: { salePrice: number; saleFee: number; saleDate: string }
  ) => {
    const response = await fetch(`/api/transactions/${transactionId}/sale`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erro ao registrar venda");
    }

    const updatedTransaction = await response.json();
    mutate(
      "/api/transactions",
      transactions.map((t) => (t.id === transactionId ? updatedTransaction : t)),
      false
    );
    toast.success("Venda registrada com sucesso!");
  };

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/transactions/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erro ao remover skin");
    }

    mutate(
      "/api/transactions",
      transactions.filter((t) => t.id !== id),
      false
    );
    toast.success("Skin removida do portfolio");
  };

  const openSaleDialog = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setSaleDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
              <Crosshair className="size-5 text-primary" />
            </div>
            <span className="text-lg font-semibold">CS2 Portfolio</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total de Skins"
            value={stats.totalSkins.toString()}
            icon={Package}
          />
          <StatsCard
            title="Total Investido"
            value={moneyFormatter.format(stats.totalInvested)}
            icon={DollarSign}
          />
          <StatsCard
            title="Total Vendido"
            value={moneyFormatter.format(stats.totalSold)}
            icon={TrendingUp}
          />
          <StatsCard
            title="Lucro / Prejuizo"
            value={moneyFormatter.format(stats.totalPnl)}
            description={`Media ${formatPercent(stats.averagePnlPercent)}%`}
            icon={Percent}
            trend={stats.totalPnl > 0 ? "positive" : stats.totalPnl < 0 ? "negative" : "neutral"}
          />
        </div>

        {/* Actions */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Suas Skins</h2>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus data-icon="inline-start" />
            Nova Transacao
          </Button>
        </div>

        {/* Skins Grid */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-96 animate-pulse rounded-[var(--radius)] bg-muted" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[var(--radius)] border border-dashed py-16">
            <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
              <Inbox className="size-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-medium">Nenhuma skin ainda</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Comece adicionando sua primeira transacao
            </p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus data-icon="inline-start" />
              Nova Transacao
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {transactions.map((transaction) => (
              <SkinCard
                key={transaction.id}
                transaction={transaction}
                onSale={openSaleDialog}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      {/* Dialogs */}
      <AddTransactionDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={handleAddTransaction}
      />

      <SaleDialog
        transaction={selectedTransaction}
        open={saleDialogOpen}
        onOpenChange={setSaleDialogOpen}
        onSubmit={handleSale}
      />
    </div>
  );
}
