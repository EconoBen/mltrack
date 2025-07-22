"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Users,
  Brain,
  DollarSign,
  Server,
  Gauge,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  BarChart3,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useRuns } from "@/lib/hooks/use-mlflow";

interface ModelHealth {
  name: string;
  status: "healthy" | "degraded" | "down";
  uptime: number;
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;
  requestsPerMinute: number;
  errorRate: number;
  lastDeployed: string;
  version: string;
}

interface MetricTrend {
  timestamp: string;
  value: number;
  prediction?: number;
}

export function HomeRealtimeAnalytics() {
  const [isExpanded, setIsExpanded] = useState(false); // Start collapsed when no models
  const [selectedTimeRange, setSelectedTimeRange] = useState("1h");
  const [isLive, setIsLive] = useState(false); // Changed to false since no models are live
  const [hasLiveModels, setHasLiveModels] = useState(false); // Track if any models are deployed
  
  // Fetch recent runs
  const { data: runs } = useRuns([]);

  // Simulated real-time data (in production, this would come from a WebSocket or polling)
  const [realtimeData, setRealtimeData] = useState({
    activeModels: 0, // No models currently deployed
    totalRequests24h: 0,
    avgLatency: 0,
    errorRate: 0,
    activeUsers: 0,
    costRate: 0, // $ per request
  });

  const [performanceTrend, setPerformanceTrend] = useState<MetricTrend[]>([]);
  const [costTrend, setCostTrend] = useState<MetricTrend[]>([]);

  // Simulated model health data - empty array since no models are deployed
  const [modelHealth, setModelHealth] = useState<ModelHealth[]>([]);

  // Generate trend data
  useEffect(() => {
    const generateTrendData = () => {
      const now = new Date();
      const dataPoints = 20;
      const interval = selectedTimeRange === "1h" ? 3 : selectedTimeRange === "6h" ? 18 : 72; // minutes

      const performanceData: MetricTrend[] = [];
      const costData: MetricTrend[] = [];

      for (let i = dataPoints - 1; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * interval * 60000);
        
        // Performance trend (requests per minute)
        performanceData.push({
          timestamp: timestamp.toISOString(),
          value: 400 + Math.random() * 200 + (i < 10 ? 0 : -100),
          prediction: i < 3 ? 450 + Math.random() * 100 : undefined,
        });

        // Cost trend
        costData.push({
          timestamp: timestamp.toISOString(),
          value: 0.002 + Math.random() * 0.001,
          prediction: i < 3 ? 0.0025 + Math.random() * 0.0005 : undefined,
        });
      }

      setPerformanceTrend(performanceData);
      setCostTrend(costData);
    };

    generateTrendData();
    
    if (isLive) {
      const interval = setInterval(generateTrendData, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedTimeRange, isLive]);

  // Simulate real-time updates
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setRealtimeData(prev => ({
        activeModels: prev.activeModels,
        totalRequests24h: prev.totalRequests24h + Math.floor(Math.random() * 10),
        avgLatency: Math.max(50, prev.avgLatency + (Math.random() - 0.5) * 20),
        errorRate: Math.max(0, Math.min(5, prev.errorRate + (Math.random() - 0.5) * 0.1)),
        activeUsers: Math.max(50, prev.activeUsers + Math.floor((Math.random() - 0.5) * 5)),
        costRate: Math.max(0.001, prev.costRate + (Math.random() - 0.5) * 0.0002),
      }));

      // Update model health
      setModelHealth(prev => prev.map(model => ({
        ...model,
        requestsPerMinute: Math.max(0, model.requestsPerMinute + (Math.random() - 0.5) * 50),
        latencyP50: Math.max(20, model.latencyP50 + (Math.random() - 0.5) * 10),
        errorRate: Math.max(0, Math.min(10, model.errorRate + (Math.random() - 0.5) * 0.2)),
      })));
    }, 2000);

    return () => clearInterval(interval);
  }, [isLive]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy": return "text-green-600 bg-green-100 dark:bg-green-900/20";
      case "degraded": return "text-amber-600 bg-amber-100 dark:bg-amber-900/20";
      case "down": return "text-red-600 bg-red-100 dark:bg-red-900/20";
      default: return "text-gray-600 bg-gray-100 dark:bg-gray-900/20";
    }
  };

  const getUptimeColor = (uptime: number) => {
    if (uptime >= 99.9) return "text-green-600";
    if (uptime >= 99) return "text-amber-600";
    return "text-red-600";
  };

  const formatLatency = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    if (selectedTimeRange === "1h") {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleTimeString([], { hour: "numeric" });
  };

  return (
    <div className="space-y-4">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Production Analytics
          </h2>
          {realtimeData.activeModels > 0 && (
            <Badge variant={isLive ? "default" : "secondary"} className="gap-1">
              <span className={cn(
                "h-2 w-2 rounded-full",
                isLive ? "bg-green-500 animate-pulse" : "bg-gray-500"
              )} />
              {isLive ? "Live" : "Paused"}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {realtimeData.activeModels > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLive(!isLive)}
            >
              {isLive ? "Pause" : "Resume"}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Collapse
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Expand
              </>
            )}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* No Live Models State */}
            {realtimeData.activeModels === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center space-y-4">
                    <div className="flex justify-center">
                      <div className="p-4 rounded-full bg-muted">
                        <Server className="h-12 w-12 text-muted-foreground" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">No Models in Production</h3>
                      <p className="text-muted-foreground mt-2">
                        Deploy models to see real-time production analytics here
                      </p>
                    </div>
                    <div className="flex justify-center gap-2">
                      <Button variant="outline" size="sm">
                        <Sparkles className="mr-2 h-4 w-4" />
                        View Deployment Guide
                      </Button>
                      <Button variant="default" size="sm">
                        Deploy Your First Model
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Key Metrics Row */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Models</p>
                      <p className="text-2xl font-bold">{realtimeData.activeModels}</p>
                    </div>
                    <Server className="h-8 w-8 text-muted-foreground/20" />
                  </div>
                  <div className="mt-2 flex items-center text-xs">
                    <CheckCircle className="h-3 w-3 text-green-600 mr-1" />
                    <span className="text-green-600">All healthy</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Requests (24h)</p>
                      <p className="text-2xl font-bold">{(realtimeData.totalRequests24h / 1000).toFixed(1)}K</p>
                    </div>
                    <Activity className="h-8 w-8 text-muted-foreground/20" />
                  </div>
                  <div className="mt-2 flex items-center text-xs">
                    <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                    <span>+12% from yesterday</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Latency</p>
                      <p className="text-2xl font-bold">{realtimeData.avgLatency}ms</p>
                    </div>
                    <Gauge className="h-8 w-8 text-muted-foreground/20" />
                  </div>
                  <Progress value={Math.min(100, (realtimeData.avgLatency / 500) * 100)} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Error Rate</p>
                      <p className="text-2xl font-bold">{realtimeData.errorRate.toFixed(2)}%</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-muted-foreground/20" />
                  </div>
                  <div className="mt-2 flex items-center text-xs">
                    {realtimeData.errorRate < 1 ? (
                      <>
                        <CheckCircle className="h-3 w-3 text-green-600 mr-1" />
                        <span className="text-green-600">Within SLA</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3 text-amber-600 mr-1" />
                        <span className="text-amber-600">Above threshold</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Users</p>
                      <p className="text-2xl font-bold">{realtimeData.activeUsers}</p>
                    </div>
                    <Users className="h-8 w-8 text-muted-foreground/20" />
                  </div>
                  <div className="mt-2 flex items-center text-xs">
                    <Sparkles className="h-3 w-3 text-blue-600 mr-1" />
                    <span>Peak hours</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Cost Rate</p>
                      <p className="text-2xl font-bold">${realtimeData.costRate.toFixed(4)}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-muted-foreground/20" />
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    per request
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Performance Trend */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Request Volume</CardTitle>
                    <div className="flex gap-1">
                      {["1h", "6h", "24h"].map((range) => (
                        <Button
                          key={range}
                          variant={selectedTimeRange === range ? "default" : "ghost"}
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => setSelectedTimeRange(range)}
                        >
                          {range}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={performanceTrend}>
                        <defs>
                          <linearGradient id="performanceGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="predictionGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="timestamp"
                          tickFormatter={formatTimestamp}
                          stroke="#6b7280"
                          fontSize={12}
                        />
                        <YAxis stroke="#6b7280" fontSize={12} />
                        <Tooltip
                          content={({ payload }) => {
                            if (!payload || payload.length === 0) return null;
                            const data = payload[0].payload;
                            return (
                              <div className="bg-background border rounded-lg p-2 shadow-lg">
                                <p className="text-xs font-medium">
                                  {new Date(data.timestamp).toLocaleString()}
                                </p>
                                <p className="text-xs">
                                  Requests: <span className="font-bold">{Math.round(data.value)}/min</span>
                                </p>
                                {data.prediction && (
                                  <p className="text-xs text-green-600">
                                    Predicted: {Math.round(data.prediction)}/min
                                  </p>
                                )}
                              </div>
                            );
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          fill="url(#performanceGradient)"
                        />
                        <Area
                          type="monotone"
                          dataKey="prediction"
                          stroke="#10b981"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          fill="url(#predictionGradient)"
                        />
                        <ReferenceLine
                          y={500}
                          stroke="#ef4444"
                          strokeDasharray="3 3"
                          label={{ value: "Capacity", position: "right", fontSize: 10 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Cost Trend */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Cost per Request</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={costTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="timestamp"
                          tickFormatter={formatTimestamp}
                          stroke="#6b7280"
                          fontSize={12}
                        />
                        <YAxis
                          stroke="#6b7280"
                          fontSize={12}
                          tickFormatter={(value) => `$${value.toFixed(3)}`}
                        />
                        <Tooltip
                          content={({ payload }) => {
                            if (!payload || payload.length === 0) return null;
                            const data = payload[0].payload;
                            return (
                              <div className="bg-background border rounded-lg p-2 shadow-lg">
                                <p className="text-xs font-medium">
                                  {new Date(data.timestamp).toLocaleString()}
                                </p>
                                <p className="text-xs">
                                  Cost: <span className="font-bold">${data.value.toFixed(4)}</span>
                                </p>
                                {data.prediction && (
                                  <p className="text-xs text-green-600">
                                    Predicted: ${data.prediction.toFixed(4)}
                                  </p>
                                )}
                              </div>
                            );
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="prediction"
                          stroke="#10b981"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                        />
                        <ReferenceLine
                          y={0.003}
                          stroke="#ef4444"
                          strokeDasharray="3 3"
                          label={{ value: "Budget limit", position: "right", fontSize: 10 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Model Health Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Model Health Monitor</CardTitle>
                <CardDescription>
                  Real-time health metrics for deployed models
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {modelHealth.map((model) => (
                    <div
                      key={model.name}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className={cn(
                          "flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium",
                          getStatusColor(model.status)
                        )}>
                          {model.status === "healthy" && <CheckCircle className="h-3 w-3" />}
                          {model.status === "degraded" && <AlertTriangle className="h-3 w-3" />}
                          {model.status === "down" && <AlertCircle className="h-3 w-3" />}
                          {model.status}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{model.name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {model.version}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Deployed {model.lastDeployed}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-right">
                          <p className="text-muted-foreground text-xs">Uptime</p>
                          <p className={cn("font-medium", getUptimeColor(model.uptime))}>
                            {model.uptime.toFixed(2)}%
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-muted-foreground text-xs">Latency (P50/P95)</p>
                          <p className="font-medium">
                            {formatLatency(model.latencyP50)} / {formatLatency(model.latencyP95)}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-muted-foreground text-xs">Requests/min</p>
                          <p className="font-medium flex items-center gap-1">
                            {model.requestsPerMinute}
                            <Zap className="h-3 w-3 text-muted-foreground" />
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-muted-foreground text-xs">Error Rate</p>
                          <p className={cn(
                            "font-medium",
                            model.errorRate < 1 ? "text-green-600" : 
                            model.errorRate < 5 ? "text-amber-600" : "text-red-600"
                          )}>
                            {model.errorRate.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Alerts Section */}
            {(realtimeData.errorRate > 1 || modelHealth.some(m => m.status !== "healthy")) && (
              <Card className="border-amber-500/50 bg-amber-500/5">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Active Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {realtimeData.errorRate > 1 && (
                      <div className="flex items-center justify-between p-2 rounded bg-amber-500/10">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                          <span className="text-sm">High error rate detected</span>
                        </div>
                        <Button size="sm" variant="outline">
                          Investigate
                        </Button>
                      </div>
                    )}
                    {modelHealth
                      .filter(m => m.status !== "healthy")
                      .map(model => (
                        <div key={model.name} className="flex items-center justify-between p-2 rounded bg-amber-500/10">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <span className="text-sm">{model.name} is {model.status}</span>
                          </div>
                          <Button size="sm" variant="outline">
                            View Details
                          </Button>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}