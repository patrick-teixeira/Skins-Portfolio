"use client";

import { useSkins } from "@/lib/skins-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function PnLChart() {
  const { pnlData } = useSkins();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  };

  interface TooltipProps {
    active?: boolean;
    payload?: Array<{
      value: number;
      dataKey: string;
    }>;
    label?: string;
  }

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-border/50 bg-popover p-3 shadow-xl">
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          <p className="text-sm font-semibold text-profit">
            Lucro Acumulado: {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2 px-4 sm:px-6">
        <CardTitle className="text-base sm:text-lg font-semibold">Evolução do PnL</CardTitle>
        <p className="text-xs sm:text-sm text-muted-foreground">Lucro acumulado ao longo do tempo</p>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <div className="h-[220px] sm:h-[300px] w-full">
          {pnlData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={pnlData} margin={{ top: 10, right: 5, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.65 0.2 145)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.65 0.2 145)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.01 260)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="oklch(0.65 0 0)"
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  tickFormatter={(value) => `R$${(value/1000).toFixed(0)}k`}
                  stroke="oklch(0.65 0 0)"
                  tick={{ fontSize: 10 }}
                  width={45}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke="oklch(0.65 0.2 145)"
                  strokeWidth={2}
                  fill="url(#profitGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
              Nenhuma venda registrada ainda
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
