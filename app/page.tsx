"use client";

import { useState } from "react";
import { SkinsProvider } from "@/lib/skins-context";
import { useSkins } from "@/lib/skins-context";
import { Header } from "@/components/header";
import { MetricsCards } from "@/components/metrics-cards";
import { PnLChart } from "@/components/pnl-chart";
import { AddTransactionModal } from "@/components/add-transaction-modal";
import { SkinsGrid } from "@/components/skins-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function AuthPanel() {
  const { login, register, authLoading, error, clearError } = useSkins();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [formData, setFormData] = useState({ username: "", password: "" });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const action = mode === "login" ? login : register;
    await action(formData).catch(() => undefined);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm border-border/50 bg-card/70">
        <CardHeader>
          <CardTitle>{mode === "login" ? "Entrar" : "Criar conta"}</CardTitle>
          <p className="text-sm text-muted-foreground">Acesse seu portfolio de skins</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(event) => setFormData({ ...formData, username: event.target.value })}
                className="bg-input border-border/50"
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                className="bg-input border-border/50"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>
            {error && <p className="text-sm text-loss">{error}</p>}
            <Button type="submit" className="w-full" disabled={authLoading}>
              {authLoading ? "Aguarde..." : mode === "login" ? "Entrar" : "Cadastrar"}
            </Button>
          </form>
          <Button
            type="button"
            variant="ghost"
            className="mt-3 w-full"
            onClick={() => {
              clearError();
              setMode(mode === "login" ? "register" : "login");
            }}
          >
            {mode === "login" ? "Criar uma conta" : "Ja tenho conta"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardContent() {
  const { user, loading, error } = useSkins();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground">
        Carregando dashboard...
      </div>
    );
  }

  if (!user) {
    return <AuthPanel />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-sm text-muted-foreground">Acompanhe suas transações</p>
          </div>
          <AddTransactionModal />
        </div>

        {error && <p className="rounded-md border border-loss/30 bg-loss/10 px-3 py-2 text-sm text-loss">{error}</p>}

        <MetricsCards />
        <PnLChart />
        <SkinsGrid />
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <SkinsProvider>
      <DashboardContent />
    </SkinsProvider>
  );
}
