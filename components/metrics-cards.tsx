"use client";

import { useSkins } from "@/lib/skins-context";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Package, Percent, ShoppingBag, BarChart3 } from "lucide-react";

export function MetricsCards() {
  const { metrics } = useSkins();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const metricsData = [
    {
      title: "Lucro Total",
      value: formatCurrency(metrics.totalProfit),
      icon: metrics.totalProfit >= 0 ? TrendingUp : TrendingDown,
      trend: metrics.totalProfit >= 0 ? "positive" : "negative",
    },
    {
      title: "Total Investido",
      value: formatCurrency(metrics.totalInvested),
      icon: DollarSign,
      trend: "neutral",
    },
    {
      title: "Total Vendido",
      value: formatCurrency(metrics.totalSold),
      icon: ShoppingBag,
      trend: "neutral",
    },
    {
      title: "Em Estoque",
      value: metrics.skinsInStock.toString(),
      icon: Package,
      trend: "neutral",
    },
    {
      title: "ROI",
      value: `${metrics.roi.toFixed(2)}%`,
      icon: Percent,
      trend: metrics.roi >= 0 ? "positive" : "negative",
    },
    {
      title: "Lucro Médio",
      value: `${metrics.avgProfitPercent.toFixed(2)}%`,
      icon: BarChart3,
      trend: metrics.avgProfitPercent >= 0 ? "positive" : "negative",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
      {metricsData.map((metric) => (
        <Card
          key={metric.title}
          className="border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
        >
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
                {metric.title}
              </span>
              <metric.icon
                className={`h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 ${
                  metric.trend === "positive"
                    ? "text-profit"
                    : metric.trend === "negative"
                    ? "text-loss"
                    : "text-muted-foreground"
                }`}
              />
            </div>
            <p
              className={`mt-1 sm:mt-2 text-lg sm:text-2xl font-bold tracking-tight truncate ${
                metric.trend === "positive"
                  ? "text-profit"
                  : metric.trend === "negative"
                  ? "text-loss"
                  : "text-foreground"
              }`}
            >
              {metric.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
