"use client";

import { useState, useEffect } from "react";
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
import type { Transaction } from "@/lib/types";

interface SaleDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    transactionId: string,
    data: { salePrice: number; saleFee: number; saleDate: string }
  ) => Promise<void>;
}

export function SaleDialog({ transaction, open, onOpenChange, onSubmit }: SaleDialogProps) {
  const [salePrice, setSalePrice] = useState("");
  const [saleFee, setSaleFee] = useState("");
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (transaction && open) {
      setSalePrice(transaction.salePrice?.toString() || "");
      setSaleFee(transaction.saleFee?.toString() || "");
      setSaleDate(transaction.saleDate || new Date().toISOString().slice(0, 10));
    }
  }, [transaction, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction) return;

    setLoading(true);
    try {
      await onSubmit(transaction.id, {
        salePrice: Number(salePrice) || 0,
        saleFee: Number(saleFee) || 0,
        saleDate,
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Registrar Venda</DialogTitle>
          <DialogDescription className="truncate">
            {transaction?.skinName || "Skin"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="salePrice">Preco de Venda (R$)</Label>
            <Input
              id="salePrice"
              type="number"
              step="0.01"
              min="0"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="saleFee">Taxa da Plataforma (%)</Label>
            <Input
              id="saleFee"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={saleFee}
              onChange={(e) => setSaleFee(e.target.value)}
              placeholder="Ex: 13 para Steam, 5 para DMarket"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="saleDate">Data da Venda</Label>
            <Input
              id="saleDate"
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
