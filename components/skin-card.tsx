"use client";

import Image from "next/image";
import { Trash2, DollarSign, Calendar, TrendingUp, StickyNote } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, moneyFormatter, formatDate, formatPercent, getInitials } from "@/lib/utils";
import {
  type Transaction,
  hasSale,
  getNetSale,
  getPnl,
  getProfitPercent,
  getSaleFee,
  getSaleFeeAmount,
} from "@/lib/types";

interface SkinCardProps {
  transaction: Transaction;
  onSale: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

export function SkinCard({ transaction, onSale, onDelete }: SkinCardProps) {
  const sold = hasSale(transaction);
  const pnl = sold ? getPnl(transaction) : 0;
  const profitPercent = sold ? getProfitPercent(transaction) : 0;

  return (
    <Card className="group relative overflow-hidden transition-all hover:border-primary/50">
      <div className="flex flex-col">
        {/* Skin Image */}
        <div className="relative aspect-video bg-gradient-to-br from-muted to-muted/50 p-4">
          {transaction.skinImage ? (
            <Image
              src={transaction.skinImage}
              alt={transaction.skinName}
              fill
              className="object-contain p-2"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <span className="text-3xl font-bold text-muted-foreground">
                {getInitials(transaction.skinName)}
              </span>
            </div>
          )}

          {/* Sale Button */}
          <Button
            variant="secondary"
            size="sm"
            className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => onSale(transaction)}
          >
            <DollarSign data-icon="inline-start" />
            {sold ? "Editar" : "Venda"}
          </Button>

          {/* Status Badge */}
          <Badge
            variant={sold ? "success" : "secondary"}
            className="absolute left-2 top-2"
          >
            {sold ? "Vendido" : "Em posse"}
          </Badge>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-4 p-4">
          <div>
            <h3 className="truncate font-semibold text-foreground">{transaction.skinName}</h3>
            {transaction.skinRarity && (
              <span
                className="text-xs font-medium"
                style={{ color: transaction.skinRarityColor || undefined }}
              >
                {transaction.skinRarity}
              </span>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <DollarSign className="size-3" />
                Compra
              </span>
              <span className="font-medium text-foreground">
                {moneyFormatter.format(transaction.buyPrice)}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="size-3" />
                Data
              </span>
              <span className="font-medium text-foreground">{formatDate(transaction.purchaseDate)}</span>
            </div>

            {sold && (
              <>
                <div className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <DollarSign className="size-3" />
                    Venda
                  </span>
                  <span className="font-medium text-foreground">
                    {moneyFormatter.format(getNetSale(transaction))}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Bruto {moneyFormatter.format(transaction.salePrice!)} - taxa{" "}
                    {formatPercent(getSaleFee(transaction))}% (
                    {moneyFormatter.format(getSaleFeeAmount(transaction))})
                  </span>
                </div>

                <div className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="size-3" />
                    PnL
                  </span>
                  <span
                    className={cn(
                      "font-medium",
                      pnl > 0 && "text-success",
                      pnl < 0 && "text-destructive"
                    )}
                  >
                    {moneyFormatter.format(pnl)}
                  </span>
                  <span
                    className={cn(
                      "text-[10px]",
                      profitPercent > 0 && "text-success",
                      profitPercent < 0 && "text-destructive"
                    )}
                  >
                    {profitPercent > 0 ? "+" : ""}
                    {formatPercent(profitPercent)}%
                  </span>
                </div>
              </>
            )}

            {!sold && (
              <div className="col-span-2 flex flex-col gap-0.5">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="size-3" />
                  PnL
                </span>
                <span className="font-medium text-muted-foreground">Aguardando venda</span>
              </div>
            )}
          </div>

          {/* Notes */}
          {transaction.notes && (
            <div className="flex items-start gap-2 rounded-[var(--radius)] bg-muted/50 p-2">
              <StickyNote className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{transaction.notes}</p>
            </div>
          )}

          {/* Delete Button */}
          <Button
            variant="ghost"
            size="sm"
            className="self-start text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(transaction.id)}
          >
            <Trash2 data-icon="inline-start" />
            Remover
          </Button>
        </div>
      </div>
    </Card>
  );
}
