import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  iconColor?: string;
}

export function StatCard({ title, value, icon: Icon, trend, className, iconColor }: StatCardProps) {
  // Extract color from className if border-l-4 border-l-{color} is present
  const getIconColor = () => {
    if (iconColor) return iconColor;
    if (className?.includes('border-l-blue')) return 'text-blue-500';
    if (className?.includes('border-l-purple')) return 'text-purple-500';
    if (className?.includes('border-l-yellow')) return 'text-yellow-500';
    if (className?.includes('border-l-red')) return 'text-red-500';
    if (className?.includes('border-l-green')) return 'text-green-500';
    if (className?.includes('border-l-indigo')) return 'text-indigo-500';
    if (className?.includes('border-l-orange')) return 'text-orange-500';
    return 'text-primary';
  };

  const getBgColor = () => {
    if (iconColor) return iconColor.replace('text-', 'bg-').replace('-500', '-500/10');
    if (className?.includes('border-l-blue')) return 'bg-blue-500/10';
    if (className?.includes('border-l-purple')) return 'bg-purple-500/10';
    if (className?.includes('border-l-yellow')) return 'bg-yellow-500/10';
    if (className?.includes('border-l-red')) return 'bg-red-500/10';
    if (className?.includes('border-l-green')) return 'bg-green-500/10';
    if (className?.includes('border-l-indigo')) return 'bg-indigo-500/10';
    if (className?.includes('border-l-orange')) return 'bg-orange-500/10';
    return 'bg-primary/10';
  };

  return (
    <div
      className={cn(
        "glass-card rounded-xl p-6 animate-fade-in",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-semibold tracking-tight">{value}</p>
          {trend && (
            <p
              className={cn(
                "text-xs font-medium",
                trend.isPositive ? "text-status-success" : "text-status-error"
              )}
            >
              {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}% from last week
            </p>
          )}
        </div>
        <div className={cn("rounded-lg p-3 shrink-0", getBgColor())}>
          <Icon className={cn("h-5 w-5", getIconColor())} />
        </div>
      </div>
    </div>
  );
}
