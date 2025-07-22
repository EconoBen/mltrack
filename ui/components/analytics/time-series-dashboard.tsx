"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Legend,
  Brush,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Activity,
  Users,
  GitBranch,
  Layers,
  Download,
} from "lucide-react";
import { format, startOfDay, endOfDay, eachDayOfInterval, subDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { useRuns } from "@/lib/hooks/use-mlflow";

// Granularity options for time grouping
type Granularity = "hour" | "day" | "week" | "month";

interface TimeSeriesData {
  timestamp: string;
  runs: number;
  successes: number;
  failures: number;
  avgDuration: number;
  avgAccuracy: number;
  activeUsers: number;
  models: number;
}

export function TimeSeriesDashboard() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [selectedMetric, setSelectedMetric] = useState("runs");
  const [selectedExperiments, setSelectedExperiments] = useState<string[]>([]);

  // Fetch runs data
  const { data: runs, isLoading } = useRuns(selectedExperiments);

  // Process runs into time series data
  const timeSeriesData = useMemo(() => {
    if (!runs || !dateRange?.from || !dateRange?.to) return [];

    // Filter runs by date range
    const filteredRuns = runs.filter((run) => {
      const runDate = new Date(run.info.start_time);
      return runDate >= dateRange.from! && runDate <= dateRange.to!;
    });

    // Group by time period based on granularity
    const grouped = new Map<string, any[]>();
    
    filteredRuns.forEach((run) => {
      const date = new Date(run.info.start_time);
      let key: string;

      switch (granularity) {
        case "hour":
          key = format(date, "yyyy-MM-dd HH:00");
          break;
        case "day":
          key = format(date, "yyyy-MM-dd");
          break;
        case "week":
          key = format(startOfWeek(date), "yyyy-MM-dd");
          break;
        case "month":
          key = format(date, "yyyy-MM");
          break;
      }

      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(run);
    });

    // Calculate metrics for each time period
    const data: TimeSeriesData[] = Array.from(grouped.entries()).map(
      ([timestamp, runs]) => {
        const successes = runs.filter((r) => r.info.status === "FINISHED").length;
        const failures = runs.filter((r) => r.info.status === "FAILED").length;
        const durations = runs
          .filter((r) => r.info.end_time)
          .map((r) => (r.info.end_time - r.info.start_time) / 1000 / 60); // minutes
        const accuracies = runs
          .map((r) => r.data.metrics.accuracy || r.data.metrics.test_accuracy)
          .filter(Boolean);
        const users = new Set(runs.map((r) => r.data.tags["mlflow.user"]));
        const models = new Set(
          runs.map((r) => r.data.tags["model.type"]).filter(Boolean)
        );

        return {
          timestamp,
          runs: runs.length,
          successes,
          failures,
          avgDuration: durations.length
            ? durations.reduce((a, b) => a + b, 0) / durations.length
            : 0,
          avgAccuracy: accuracies.length
            ? accuracies.reduce((a, b) => a + b, 0) / accuracies.length
            : 0,
          activeUsers: users.size,
          models: models.size,
        };
      }
    );

    // Sort by timestamp
    return data.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }, [runs, dateRange, granularity]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!timeSeriesData.length) return null;

    const totalRuns = timeSeriesData.reduce((sum, d) => sum + d.runs, 0);
    const avgSuccess = 
      timeSeriesData.reduce((sum, d) => sum + d.successes, 0) / totalRuns;
    const totalUsers = new Set(
      timeSeriesData.flatMap((d) => Array(d.activeUsers).fill(0))
    ).size;

    // Calculate trend (compare last period to previous)
    const midpoint = Math.floor(timeSeriesData.length / 2);
    const firstHalf = timeSeriesData.slice(0, midpoint);
    const secondHalf = timeSeriesData.slice(midpoint);
    
    const firstHalfRuns = firstHalf.reduce((sum, d) => sum + d.runs, 0);
    const secondHalfRuns = secondHalf.reduce((sum, d) => sum + d.runs, 0);
    const trend = firstHalfRuns > 0 
      ? ((secondHalfRuns - firstHalfRuns) / firstHalfRuns) * 100
      : 0;

    return {
      totalRuns,
      avgSuccess,
      totalUsers,
      trend,
    };
  }, [timeSeriesData]);

  // Date range presets
  const dateRangePresets = [
    {
      label: "Last 7 days",
      value: () => ({
        from: subDays(new Date(), 7),
        to: new Date(),
      }),
    },
    {
      label: "Last 30 days",
      value: () => ({
        from: subDays(new Date(), 30),
        to: new Date(),
      }),
    },
    {
      label: "Last 90 days",
      value: () => ({
        from: subDays(new Date(), 90),
        to: new Date(),
      }),
    },
    {
      label: "This month",
      value: () => ({
        from: startOfMonth(new Date()),
        to: new Date(),
      }),
    },
    {
      label: "Last month",
      value: () => ({
        from: startOfMonth(subDays(startOfMonth(new Date()), 1)),
        to: endOfMonth(subDays(startOfMonth(new Date()), 1)),
      }),
    },
  ];

  // Metric configurations
  const metrics = {
    runs: { label: "Total Runs", color: "hsl(var(--primary))", icon: Activity },
    successes: { label: "Successful Runs", color: "hsl(var(--success))", icon: TrendingUp },
    failures: { label: "Failed Runs", color: "hsl(var(--destructive))", icon: TrendingDown },
    avgDuration: { label: "Avg Duration (min)", color: "hsl(var(--warning))", icon: Clock },
    avgAccuracy: { label: "Avg Accuracy", color: "hsl(var(--info))", icon: TrendingUp },
    activeUsers: { label: "Active Users", color: "hsl(var(--secondary))", icon: Users },
    models: { label: "Unique Models", color: "hsl(var(--accent))", icon: Layers },
  };

  const exportData = () => {
    const csv = [
      Object.keys(timeSeriesData[0] || {}).join(","),
      ...timeSeriesData.map((row) => Object.values(row).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mltrack-timeseries-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="h-96 flex items-center justify-center">
            <div className="text-muted-foreground">Loading time series data...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Time Series Analytics</CardTitle>
          <CardDescription>
            Analyze experiment trends and patterns over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <DatePickerWithRange
              date={dateRange}
              setDate={setDateRange}
              className="w-[300px]"
            />
            
            <Select value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select granularity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hour">Hourly</SelectItem>
                <SelectItem value="day">Daily</SelectItem>
                <SelectItem value="week">Weekly</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select metric" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(metrics).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={exportData}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {summaryStats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.totalRuns}</div>
              <p className="text-xs text-muted-foreground">
                {summaryStats.trend > 0 ? "+" : ""}
                {summaryStats.trend.toFixed(1)}% from previous period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(summaryStats.avgSuccess * 100).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Average across all runs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryStats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                Unique users in period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Time Period</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{timeSeriesData.length}</div>
              <p className="text-xs text-muted-foreground">
                {granularity} data points
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <CardTitle>{metrics[selectedMetric as keyof typeof metrics].label} Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeriesData}>
                <defs>
                  <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={metrics[selectedMetric as keyof typeof metrics].color}
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor={metrics[selectedMetric as keyof typeof metrics].color}
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => {
                    if (granularity === "hour") return format(new Date(value), "HH:mm");
                    if (granularity === "day") return format(new Date(value), "MMM dd");
                    if (granularity === "week") return format(new Date(value), "MMM dd");
                    return value;
                  }}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => format(new Date(value), "PPP")}
                  formatter={(value: any) =>
                    typeof value === "number" ? value.toFixed(2) : value
                  }
                />
                <Area
                  type="monotone"
                  dataKey={selectedMetric}
                  stroke={metrics[selectedMetric as keyof typeof metrics].color}
                  fillOpacity={1}
                  fill="url(#colorMetric)"
                />
                <Brush
                  dataKey="timestamp"
                  height={30}
                  stroke={metrics[selectedMetric as keyof typeof metrics].color}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Multi-metric Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Multi-Metric Comparison</CardTitle>
          <CardDescription>
            Compare multiple metrics on the same timeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => {
                    if (granularity === "day") return format(new Date(value), "MMM dd");
                    return value;
                  }}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  labelFormatter={(value) => format(new Date(value), "PPP")}
                  formatter={(value: any) =>
                    typeof value === "number" ? value.toFixed(2) : value
                  }
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="runs"
                  stroke={metrics.runs.color}
                  name="Total Runs"
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="successes"
                  stroke={metrics.successes.color}
                  name="Successes"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="avgAccuracy"
                  stroke={metrics.avgAccuracy.color}
                  name="Avg Accuracy"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Success/Failure Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Success vs Failure Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => {
                    if (granularity === "day") return format(new Date(value), "MMM dd");
                    return value;
                  }}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => format(new Date(value), "PPP")}
                />
                <Legend />
                <Bar dataKey="successes" stackId="a" fill={metrics.successes.color} />
                <Bar dataKey="failures" stackId="a" fill={metrics.failures.color} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper function
function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}