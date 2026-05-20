"use client";

import { useEffect, useRef, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Skin } from "@/lib/types";

const marketplaces = ["Steam", "Buff163", "SkinPort", "CS.Money", "DMarket"];

interface SkinSuggestion {
  id: string;
  name: string;
  image: string;
  rarity: string;
  rarityColor: string;
}

interface EditSkinModalProps {
  skin: Skin;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditSkinModal({ skin, open, onOpenChange }: EditSkinModalProps) {
  const { editSkin } = useSkins();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<SkinSuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [selectedSkin, setSelectedSkin] = useState<SkinSuggestion | null>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    name: skin.name,
    purchasePrice: skin.purchasePrice.toString(),
    marketplace: skin.marketplace,
    purchaseDate: skin.purchaseDate,
  });

  useEffect(() => {
    if (!open) return;

    setFormData({
      name: skin.name,
      purchasePrice: skin.purchasePrice.toString(),
      marketplace: skin.marketplace,
      purchaseDate: skin.purchaseDate,
    });
    setSelectedSkin(null);
    setSuggestions([]);
    setError("");
  }, [open, skin]);

  useEffect(() => {
    if (!open) return;

    const query = formData.name.trim();
    if (query.length < 2 || selectedSkin?.name === query || skin.name === query) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/skins?q=${encodeURIComponent(query)}&limit=8`, {
          signal: controller.signal,
        });

        if (!response.ok) return;

        const data = (await response.json()) as SkinSuggestion[];
        setSuggestions(data);
        setSuggestionsOpen(data.length > 0);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setSuggestions([]);
        }
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [formData.name, open, selectedSkin, skin.name]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!searchBoxRef.current?.contains(event.target as Node)) {
        setSuggestionsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const selectSuggestion = (suggestion: SkinSuggestion) => {
    setSelectedSkin(suggestion);
    setFormData((current) => ({ ...current, name: suggestion.name }));
    setSuggestionsOpen(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!formData.name || !formData.purchasePrice || !formData.marketplace) {
      return;
    }

    setSaving(true);

    try {
      const skinInfo =
        selectedSkin ??
        (await fetch(`/api/skin-image?name=${encodeURIComponent(formData.name)}`)
          .then((response) => (response.ok ? response.json() : null))
          .catch(() => null));

      await editSkin(skin.id, {
        skinId: skinInfo?.id ?? skin.skinId,
        name: skinInfo?.name ?? formData.name,
        rarity: skinInfo?.rarity ?? skin.rarity,
        rarityColor: skinInfo?.rarityColor ?? skin.rarityColor,
        image: skinInfo?.image ?? skin.image,
        purchasePrice: parseFloat(formData.purchasePrice),
        marketplace: formData.marketplace,
        purchaseDate: formData.purchaseDate,
        notes: skin.notes,
      });

      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao editar skin");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border/50 bg-card sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Editar Skin</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2 relative" ref={searchBoxRef}>
            <Label htmlFor={`edit-name-${skin.id}`}>Nome da Skin *</Label>
            <Input
              id={`edit-name-${skin.id}`}
              placeholder="Ex: AK-47 | Redline"
              value={formData.name}
              onChange={(event) => {
                setSelectedSkin(null);
                setFormData({ ...formData, name: event.target.value });
              }}
              onFocus={() => setSuggestionsOpen(suggestions.length > 0)}
              className="bg-input border-border/50"
              autoComplete="off"
            />
            {suggestionsOpen && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-md border border-border/50 bg-popover shadow-xl">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent/20 focus:bg-accent/20 focus:outline-none"
                    onClick={() => selectSuggestion(suggestion)}
                  >
                    {suggestion.image ? (
                      <img src={suggestion.image} alt="" className="h-10 w-14 flex-shrink-0 object-contain" />
                    ) : (
                      <span className="h-10 w-14 flex-shrink-0 rounded bg-secondary/50" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{suggestion.name}</span>
                      {suggestion.rarity && (
                        <span className="block truncate text-xs text-muted-foreground" style={{ color: suggestion.rarityColor || undefined }}>
                          {suggestion.rarity}
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`edit-purchase-price-${skin.id}`}>Valor Pago (R$) *</Label>
            <Input
              id={`edit-purchase-price-${skin.id}`}
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.purchasePrice}
              onChange={(event) => setFormData({ ...formData, purchasePrice: event.target.value })}
              className="bg-input border-border/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`edit-marketplace-${skin.id}`}>Marketplace *</Label>
            <Select
              value={formData.marketplace}
              onValueChange={(value) => setFormData({ ...formData, marketplace: value })}
            >
              <SelectTrigger id={`edit-marketplace-${skin.id}`} className="bg-input border-border/50">
                <SelectValue placeholder="Selecione o marketplace" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border/50">
                {marketplaces.map((marketplace) => (
                  <SelectItem key={marketplace} value={marketplace}>
                    {marketplace}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`edit-purchase-date-${skin.id}`}>Data da Compra</Label>
            <Input
              id={`edit-purchase-date-${skin.id}`}
              type="date"
              value={formData.purchaseDate}
              onChange={(event) => setFormData({ ...formData, purchaseDate: event.target.value })}
              className="bg-input border-border/50"
            />
          </div>

          {error && <p className="text-sm text-loss">{error}</p>}

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Salvando..." : "Salvar alteracoes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
