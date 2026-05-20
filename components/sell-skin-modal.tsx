"use client";

import { useState } from "react";
import { useSkins } from "@/lib/skins-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Skin } from "@/lib/types";

interface SellSkinModalProps {
  skin: Skin;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SellSkinModal({ skin, open, onOpenChange }: SellSkinModalProps) {
  const { sellSkin } = useSkins();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    salePrice: "",
    saleFeePercent: "",
    saleDate: new Date().toISOString().split("T")[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!formData.salePrice) {
      return;
    }

    const salePrice = parseFloat(formData.salePrice);
    const feePercent = parseFloat(formData.saleFeePercent) || 0;
    const saleFee = (salePrice * feePercent) / 100;

    setSaving(true);

    try {
      await sellSkin(skin.id, salePrice, saleFee, formData.saleDate);

      setFormData({
        salePrice: "",
        saleFeePercent: "",
        saleDate: new Date().toISOString().split("T")[0],
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao registrar venda");
    } finally {
      setSaving(false);
    }
  };

  // Custo de compra = apenas o preço de compra (taxa é descontada na venda)
  const purchaseCost = skin.purchasePrice;
  const salePrice = parseFloat(formData.salePrice) || 0;
  const feePercent = parseFloat(formData.saleFeePercent) || 0;
  const saleFeeValue = (salePrice * feePercent) / 100;
  const estimatedProfit = formData.salePrice
    ? salePrice - saleFeeValue - purchaseCost
    : null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border/50 bg-card sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Registrar Venda</DialogTitle>
          <p className="text-sm text-muted-foreground">{skin.name}</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="rounded-lg bg-secondary/50 p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Custo Total de Compra</p>
            <p className="text-lg font-semibold">{formatCurrency(purchaseCost)}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="salePrice">Valor de Venda (R$) *</Label>
            <Input
              id="salePrice"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.salePrice}
              onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
              className="bg-input border-border/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="saleFee">Taxa do Marketplace (%)</Label>
            <Input
              id="saleFee"
              type="number"
              step="0.1"
              placeholder="Ex: 5"
              value={formData.saleFeePercent}
              onChange={(e) => setFormData({ ...formData, saleFeePercent: e.target.value })}
              className="bg-input border-border/50"
            />
            {saleFeeValue > 0 && (
              <p className="text-xs text-muted-foreground">
                Taxa: {formatCurrency(saleFeeValue)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="saleDate">Data da Venda</Label>
            <Input
              id="saleDate"
              type="date"
              value={formData.saleDate}
              onChange={(e) => setFormData({ ...formData, saleDate: e.target.value })}
              className="bg-input border-border/50"
            />
          </div>

          {estimatedProfit !== null && (
            <div
              className={`rounded-lg p-3 space-y-1 ${
                estimatedProfit >= 0 ? "bg-profit/10" : "bg-loss/10"
              }`}
            >
              <p className="text-xs text-muted-foreground">
                {estimatedProfit >= 0 ? "Lucro Estimado" : "Prejuízo Estimado"}
              </p>
              <p
                className={`text-lg font-bold ${
                  estimatedProfit >= 0 ? "text-profit" : "text-loss"
                }`}
              >
                {estimatedProfit >= 0 ? "+" : ""}
                {formatCurrency(estimatedProfit)}
              </p>
            </div>
          )}

          {error && <p className="text-sm text-loss">{error}</p>}

          <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={saving}>
            {saving ? "Salvando..." : "Confirmar Venda"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
