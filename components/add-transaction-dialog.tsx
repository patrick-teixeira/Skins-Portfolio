"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import type { Skin } from "@/lib/types";

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    skinId: string;
    skinName: string;
    skinRarity: string;
    skinRarityColor: string;
    skinImage: string;
    buyPrice: number;
    purchaseDate: string;
    notes: string;
  }) => Promise<void>;
}

export function AddTransactionDialog({ open, onOpenChange, onSubmit }: AddTransactionDialogProps) {
  const [skinName, setSkinName] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [suggestions, setSuggestions] = useState<Skin[]>([]);
  const [selectedSkin, setSelectedSkin] = useState<Skin | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) {
      setSkinName("");
      setBuyPrice("");
      setPurchaseDate(new Date().toISOString().slice(0, 10));
      setNotes("");
      setSuggestions([]);
      setSelectedSkin(null);
      setShowSuggestions(false);
    }
  }, [open]);

  useEffect(() => {
    if (!skinName.trim()) {
      setSuggestions([]);
      return;
    }

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(async () => {
      controllerRef.current?.abort();
      controllerRef.current = new AbortController();

      try {
        const response = await fetch(`/api/skins?q=${encodeURIComponent(skinName)}&limit=8`, {
          signal: controllerRef.current.signal,
        });
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.filter((s: Skin) => s.image));
        }
      } catch {
        // Ignore abort errors
      }
    }, 220);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [skinName]);

  const handleSelectSkin = (skin: Skin) => {
    setSkinName(skin.name);
    setSelectedSkin(skin);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalSkin = selectedSkin;

      // Try to find skin by name if not selected
      if (!finalSkin && skinName.trim()) {
        const response = await fetch(`/api/skin-image?name=${encodeURIComponent(skinName)}`);
        if (response.ok) {
          finalSkin = await response.json();
        }
      }

      await onSubmit({
        skinId: finalSkin?.id || "",
        skinName: skinName.trim(),
        skinRarity: finalSkin?.rarity || "",
        skinRarityColor: finalSkin?.rarityColor || "",
        skinImage: finalSkin?.image || "",
        buyPrice: Number(buyPrice) || 0,
        purchaseDate,
        notes: notes.trim(),
      });

      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Transacao</DialogTitle>
          <DialogDescription>Registre a compra de uma nova skin para seu portfolio.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Skin Search */}
          <div className="relative flex flex-col gap-2">
            <Label htmlFor="skinName">Nome da Skin</Label>
            <Input
              id="skinName"
              value={skinName}
              onChange={(e) => {
                setSkinName(e.target.value);
                setSelectedSkin(null);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Ex: AK-47 | Redline"
              required
            />

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <Card className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-auto p-1">
                {suggestions.map((skin) => (
                  <button
                    key={skin.id}
                    type="button"
                    className="flex w-full items-center gap-3 rounded-[var(--radius)] p-2 text-left transition-colors hover:bg-muted"
                    onClick={() => handleSelectSkin(skin)}
                  >
                    <div className="relative size-12 shrink-0 overflow-hidden rounded bg-muted">
                      <Image
                        src={skin.image}
                        alt={skin.name}
                        fill
                        className="object-contain"
                        sizes="48px"
                      />
                    </div>
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                      <span className="truncate text-sm font-medium">{skin.name}</span>
                      <span
                        className="text-xs"
                        style={{ color: skin.rarityColor || "var(--color-muted-foreground)" }}
                      >
                        {skin.rarity || "Raridade desconhecida"}
                      </span>
                    </div>
                  </button>
                ))}
              </Card>
            )}
          </div>

          {/* Selected Skin Preview */}
          {selectedSkin?.image && (
            <Card className="flex items-center gap-3 p-3">
              <div className="relative size-16 shrink-0 overflow-hidden rounded bg-muted">
                <Image
                  src={selectedSkin.image}
                  alt={selectedSkin.name}
                  fill
                  className="object-contain"
                  sizes="64px"
                />
              </div>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                <span className="truncate font-medium">{selectedSkin.name}</span>
                <span
                  className="text-sm"
                  style={{ color: selectedSkin.rarityColor || "var(--color-muted-foreground)" }}
                >
                  {selectedSkin.rarity || "Raridade desconhecida"}
                </span>
              </div>
            </Card>
          )}

          {/* Price and Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="buyPrice">Preco de Compra (R$)</Label>
              <Input
                id="buyPrice"
                type="number"
                step="0.01"
                min="0"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="purchaseDate">Data da Compra</Label>
              <Input
                id="purchaseDate"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Observacoes (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione notas sobre esta transacao..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !skinName.trim()}>
              {loading ? "Salvando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
