"use client";

import { useState } from "react";
import { useSkins } from "@/lib/skins-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SellSkinModal } from "@/components/sell-skin-modal";
import { EditSkinModal } from "@/components/edit-skin-modal";
import { Crosshair, Calendar, Pencil, Tag, Trash2 } from "lucide-react";
import type { Skin } from "@/lib/types";

function SkinCard({ skin }: { skin: Skin }) {
  const { deleteSkin } = useSkins();
  const [isHovered, setIsHovered] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const profit =
    skin.status === "sold" && skin.salePrice !== undefined && skin.saleFee !== undefined
      ? skin.salePrice - skin.saleFee - skin.purchasePrice
      : null;

  const profitPercent =
    profit !== null && skin.purchasePrice > 0
      ? (profit / skin.purchasePrice) * 100
      : null;

  const handleDelete = async () => {
    const confirmed = window.confirm(`Remover "${skin.name}" do portfolio?`);
    if (!confirmed) return;

    setDeleting(true);
    try {
      await deleteSkin(skin.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Card
        className={`relative border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 overflow-hidden ${
          isHovered ? "border-primary/50 shadow-lg shadow-primary/10 scale-[1.02]" : ""
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <CardContent className="p-3 sm:p-4">
          {/* Status Badge */}
          <div className="flex items-start justify-between mb-3">
            <Badge
              variant={skin.status === "in_stock" ? "default" : "secondary"}
              className={`text-xs ${
                skin.status === "in_stock"
                  ? "bg-primary/20 text-primary border-primary/30"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {skin.status === "in_stock" ? "Em Estoque" : "Vendida"}
            </Badge>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setEditModalOpen(true)}
                aria-label={`Editar ${skin.name}`}
                className="h-7 w-7 text-muted-foreground hover:text-primary"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={handleDelete}
                disabled={deleting}
                aria-label={`Remover ${skin.name}`}
                className="h-7 w-7 text-muted-foreground hover:text-loss"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Icon Placeholder */}
          <div className="flex items-center justify-center h-24 mb-4 rounded-lg bg-secondary/30 overflow-hidden">
            {skin.image ? (
              <img src={skin.image} alt={skin.name} className="h-full w-full object-contain p-2" />
            ) : (
              <Crosshair className="h-12 w-12 text-muted-foreground/50" />
            )}
          </div>

          {/* Skin Name */}
          <h3 className="font-semibold text-sm mb-3 line-clamp-2 min-h-[2.5rem]">{skin.name}</h3>
          {skin.rarity && (
            <p className="mb-2 text-xs text-muted-foreground" style={{ color: skin.rarityColor || undefined }}>
              {skin.rarity}
            </p>
          )}

          {/* Info Grid */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Tag className="h-3 w-3" />
                Valor Pago
              </span>
              <span className="font-medium">{formatCurrency(skin.purchasePrice)}</span>
            </div>

            {/* Valor de Venda - apenas para skins vendidas */}
            {skin.status === "sold" && skin.salePrice !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Valor de Venda</span>
                <span className="font-medium">{formatCurrency(skin.salePrice)}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-1 border-t border-border/50">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {skin.marketplace}
              </span>
              <span className="text-muted-foreground">{formatDate(skin.purchaseDate)}</span>
            </div>
          </div>

          {/* Profit/Loss for sold skins */}
          {profit !== null && profitPercent !== null && (
            <div
              className={`mt-3 pt-3 border-t border-border/50`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">PnL</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-bold ${profit >= 0 ? "text-profit" : "text-loss"}`}
                  >
                    {profit >= 0 ? "+" : ""}
                    {formatCurrency(profit)}
                  </span>
                  <span
                    className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                      profit >= 0 
                        ? "bg-profit/20 text-profit" 
                        : "bg-loss/20 text-loss"
                    }`}
                  >
                    {profitPercent >= 0 ? "+" : ""}
                    {profitPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Sell Button - always visible on mobile, hover on desktop */}
          {skin.status === "in_stock" && (
            <div
              className={`absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-card via-card to-transparent transition-all duration-300 sm:opacity-0 sm:translate-y-4 ${
                isHovered ? "sm:opacity-100 sm:translate-y-0" : ""
              }`}
            >
              <Button
                onClick={() => setSellModalOpen(true)}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                size="sm"
              >
                Registrar Venda
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <EditSkinModal skin={skin} open={editModalOpen} onOpenChange={setEditModalOpen} />
      <SellSkinModal skin={skin} open={sellModalOpen} onOpenChange={setSellModalOpen} />
    </>
  );
}

export function SkinsGrid() {
  const { skins, loading } = useSkins();

  const sortedSkins = [...skins].sort((a, b) => {
    // In stock first, then by date
    if (a.status === "in_stock" && b.status !== "in_stock") return -1;
    if (a.status !== "in_stock" && b.status === "in_stock") return 1;
    return new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime();
  });

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-semibold">Suas Skins</h2>
        <span className="text-xs sm:text-sm text-muted-foreground">{skins.length} itens</span>
      </div>
      {loading && <p className="text-sm text-muted-foreground">Carregando skins...</p>}
      {!loading && skins.length === 0 && (
        <div className="rounded-lg border border-border/50 bg-card/50 p-6 text-center text-sm text-muted-foreground">
          Nenhuma transacao cadastrada ainda
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sortedSkins.map((skin) => (
          <SkinCard key={skin.id} skin={skin} />
        ))}
      </div>
    </div>
  );
}
