import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  description?: string;
  icon: LucideIcon;
  trend?: "positive" | "negative" | "neutral";
}

export function StatsCard({ title, value, description, icon: Icon, trend }: StatsCardProps) {
  return (
    <Card className="relative overflow-hidden p-6">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <span
            className={cn(
              "text-2xl font-bold tracking-tight",
              trend === "positive" && "text-success",
              trend === "negative" && "text-destructive"
            )}
          >
            {value}
          </span>
          {description && (
            <span
              className={cn(
                "text-xs",
                trend === "positive" && "text-success",
                trend === "negative" && "text-destructive",
                !trend && "text-muted-foreground"
              )}
            >
              {description}
            </span>
          )}
        </div>
        <div className="rounded-full bg-primary/10 p-3">
          <Icon className="size-5 text-primary" />
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary/50 to-primary/0" />
    </Card>
  );
}
