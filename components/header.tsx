"use client";

import { Crosshair, LogOut } from "lucide-react";
import { useSkins } from "@/lib/skins-context";
import { Button } from "@/components/ui/button";

export function Header() {
  const { user, logout } = useSkins();

  return (
    <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/20">
            <Crosshair className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight">CS Skin Trader</h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Gerencie suas skins</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user && <span className="hidden sm:inline text-sm text-muted-foreground">{user.username}</span>}
          <Button variant="ghost" size="icon" onClick={() => logout()} aria-label="Sair">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
