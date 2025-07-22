"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  Server,
  TrendingUp,
  Users,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductionMetric {
  label: string;
  value: string | number;
  trend?: number;
  status?: "healthy" | "warning" | "critical";
  icon: React.ComponentType<{ className?: string }>;
}

export function MiniProductionStatus() {
  const [isLive, setIsLive] = useState(true);
  const [metrics, setMetrics] = useState<ProductionMetric[]>([
    {
      label: "Models",
      value: 5,
      status: "healthy",
      icon: Server,
    },
    {
      label: "Requests/min",
      value: "1.2K",
      trend: 12,
      icon: Activity,
    },
    {
      label: "Avg Latency",
      value: "142ms",
      status: "healthy",
      icon: TrendingUp,
    },
    {
      label: "Active Users",
      value: 89,
      icon: Users,
    },
    {
      label: "Cost/hour",
      value: "$8.23",
      trend: -5,
      icon: DollarSign,
    },
  ]);

  // Simulate real-time updates
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setMetrics(prev => prev.map(metric => {
        if (metric.label === "Requests/min") {
          const baseValue = 1200;
          const variation = Math.random() * 200 - 100;
          return {
            ...metric,
            value: `${((baseValue + variation) / 1000).toFixed(1)}K`,
            trend: Math.random() * 20 - 5,
          };
        }
        if (metric.label === "Avg Latency") {
          const newLatency = 142 + (Math.random() - 0.5) * 40;
          return {
            ...metric,
            value: `${Math.round(newLatency)}ms`,
            status: newLatency < 200 ? "healthy" : newLatency < 500 ? "warning" : "critical",
          };
        }
        if (metric.label === "Active Users") {
          return {
            ...metric,
            value: Math.max(50, metric.value as number + Math.floor((Math.random() - 0.5) * 10)),
          };
        }
        return metric;
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, [isLive]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "healthy": return "text-green-600";
      case "warning": return "text-amber-600";
      case "critical": return "text-red-600";
      default: return "text-muted-foreground";
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "healthy": return <CheckCircle className="h-3 w-3" />;
      case "warning": return <AlertTriangle className="h-3 w-3" />;
      case "critical": return <AlertTriangle className="h-3 w-3" />;
      default: return null;
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            Production Status
            <Badge variant={isLive ? "default" : "secondary"} className="text-xs">
              <span className={cn(
                "h-1.5 w-1.5 rounded-full mr-1",
                isLive ? "bg-green-500 animate-pulse" : "bg-gray-500"
              )} />
              {isLive ? "Live" : "Paused"}
            </Badge>
          </h3>
        </div>
      </div>
      <CardContent className="p-0">
        <div className="divide-y">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div
                key={index}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{metric.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-sm font-medium",
                    getStatusColor(metric.status)
                  )}>
                    {metric.value}
                  </span>
                  {metric.status && getStatusIcon(metric.status)}
                  {metric.trend !== undefined && (
                    <span className={cn(
                      "text-xs",
                      metric.trend > 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {metric.trend > 0 ? "+" : ""}{metric.trend.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}