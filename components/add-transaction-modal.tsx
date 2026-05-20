"use client";

import { useEffect, useRef, useState } from "react";
import { useSkins } from "@/lib/skins-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus } from "lucide-react";

const marketplaces = ["Steam", "CsFloat", "Buff163", "SkinPort", "CS.Money", "DMarket"];

interface SkinSuggestion {
  id: string;
  name: string;
  image: string;
  rarity: string;
  rarityColor: string;
}

export function AddTransactionModal() {
  const { addSkin } = useSkins();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<SkinSuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [selectedSkin, setSelectedSkin] = useState<SkinSuggestion | null>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    purchasePrice: "",
    marketplace: "",
    purchaseDate: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (!open) return;

    const query = formData.name.trim();
    if (query.length < 2 || selectedSkin?.name === query) {
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
  }, [formData.name, open, selectedSkin]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!searchBoxRef.current?.contains(event.target as Node)) {
        setSuggestionsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const selectSuggestion = (skin: SkinSuggestion) => {
    setSelectedSkin(skin);
    setFormData((current) => ({ ...current, name: skin.name }));
    setSuggestionsOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      await addSkin({
        skinId: skinInfo?.id,
        name: skinInfo?.name ?? formData.name,
        rarity: skinInfo?.rarity,
        rarityColor: skinInfo?.rarityColor,
        image: skinInfo?.image,
        purchasePrice: parseFloat(formData.purchasePrice),
        marketplace: formData.marketplace,
        purchaseDate: formData.purchaseDate,
      });

      setFormData({
        name: "",
        purchasePrice: "",
        marketplace: "",
        purchaseDate: new Date().toISOString().split("T")[0],
      });
      setSelectedSkin(null);
      setSuggestions([]);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar transacao");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          <span className="sm:inline">Adicionar Transação</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="border-border/50 bg-card sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Nova Skin</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2 relative" ref={searchBoxRef}>
            <Label htmlFor="name">Nome da Skin *</Label>
            <Input
              id="name"
              placeholder="Ex: AK-47 | Redline"
              value={formData.name}
              onChange={(e) => {
                setSelectedSkin(null);
                setFormData({ ...formData, name: e.target.value });
              }}
              onFocus={() => setSuggestionsOpen(suggestions.length > 0)}
              className="bg-input border-border/50"
              autoComplete="off"
            />
            {suggestionsOpen && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-md border border-border/50 bg-popover shadow-xl">
                {suggestions.map((skin) => (
                  <button
                    key={skin.id}
                    type="button"
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent/20 focus:bg-accent/20 focus:outline-none"
                    onClick={() => selectSuggestion(skin)}
                  >
                    {skin.image ? (
                      <img src={skin.image} alt="" className="h-10 w-14 flex-shrink-0 object-contain" />
                    ) : (
                      <span className="h-10 w-14 flex-shrink-0 rounded bg-secondary/50" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{skin.name}</span>
                      {skin.rarity && (
                        <span className="block truncate text-xs text-muted-foreground" style={{ color: skin.rarityColor || undefined }}>
                          {skin.rarity}
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="purchasePrice">Valor Pago (R$) *</Label>
            <Input
              id="purchasePrice"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.purchasePrice}
              onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
              className="bg-input border-border/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="marketplace">Marketplace *</Label>
            <Select
              value={formData.marketplace}
              onValueChange={(value) => setFormData({ ...formData, marketplace: value })}
            >
              <SelectTrigger className="bg-input border-border/50">
                <SelectValue placeholder="Selecione o marketplace" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border/50">
                {marketplaces.map((mp) => (
                  <SelectItem key={mp} value={mp}>
                    {mp}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="purchaseDate">Data da Compra</Label>
            <Input
              id="purchaseDate"
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
              className="bg-input border-border/50"
            />
          </div>
          {error && <p className="text-sm text-loss">{error}</p>}

          <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
