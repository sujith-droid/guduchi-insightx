import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function KPICard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  trend = "neutral",
  subtitle,
  className 
}) {
  const trendConfig = {
    up: { icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
    down: { icon: TrendingDown, color: "text-red-500", bg: "bg-red-50" },
    neutral: { icon: Minus, color: "text-slate-400", bg: "bg-slate-50" }
  };

  const TrendIcon = trendConfig[trend].icon;

  return (
    <Card className={cn(
      "p-6 bg-white border-0 shadow-sm hover:shadow-md transition-all duration-300",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            {title}
          </p>
          <p className="text-3xl font-semibold text-slate-900 tracking-tight">
            {value}
          </p>
          {subtitle && (
            <p className="text-sm text-slate-500">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className="p-3 rounded-xl bg-slate-50">
            <Icon className="w-5 h-5 text-slate-600" />
          </div>
        )}
      </div>
      {change !== undefined && (
        <div className={cn(
          "mt-4 flex items-center gap-1.5 text-sm font-medium",
          trendConfig[trend].color
        )}>
          <TrendIcon className="w-4 h-4" />
          <span>{change}%</span>
          <span className="text-slate-400 font-normal">vs last period</span>
        </div>
      )}
    </Card>
  );
}