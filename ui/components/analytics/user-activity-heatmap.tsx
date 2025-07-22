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
import { Button } from "@/components/ui/button";
import { useRuns } from "@/lib/hooks/use-mlflow";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, subDays, startOfMonth, endOfMonth } from "date-fns";
import { Calendar, Download, Filter, Users } from "lucide-react";

interface HeatmapCell {
  date: Date;
  value: number;
  users: Set<string>;
  experiments: Set<string>;
}

type ViewMode = "contributions" | "diversity" | "experiments";

export function UserActivityHeatmap() {
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("contributions");
  const [timeRange, setTimeRange] = useState("90d");

  // Fetch all runs
  const { data: runs, isLoading } = useRuns([]);

  // Process data for heatmap
  const { heatmapData, users, maxValue, dateRange } = useMemo(() => {
    if (!runs || runs.length === 0) {
      return { heatmapData: [], users: [], maxValue: 0, dateRange: { start: new Date(), end: new Date() } };
    }

    // Determine date range
    const now = new Date();
    let startDate: Date;
    switch (timeRange) {
      case "30d":
        startDate = subDays(now, 30);
        break;
      case "90d":
        startDate = subDays(now, 90);
        break;
      case "365d":
        startDate = subDays(now, 365);
        break;
      default:
        startDate = subDays(now, 90);
    }

    // Extract unique users
    const usersSet = new Set<string>();
    runs.forEach((run) => {
      const userId = run.data.tags?.["mltrack.user.id"] || 
                     run.data.tags?.["mlflow.user"] || 
                     "unknown";
      usersSet.add(userId);
    });

    // Filter runs by user and date
    const filteredRuns = runs.filter((run) => {
      const runDate = new Date(run.info.start_time);
      if (runDate < startDate || runDate > now) return false;

      if (selectedUser === "all") return true;
      
      const userId = run.data.tags?.["mltrack.user.id"] || 
                     run.data.tags?.["mlflow.user"] || 
                     "unknown";
      return userId === selectedUser;
    });

    // Create heatmap data
    const dataMap = new Map<string, HeatmapCell>();
    
    filteredRuns.forEach((run) => {
      const runDate = new Date(run.info.start_time);
      const dateKey = format(runDate, "yyyy-MM-dd");
      
      const userId = run.data.tags?.["mltrack.user.id"] || 
                     run.data.tags?.["mlflow.user"] || 
                     "unknown";
      const experimentId = run.info.experiment_id;

      if (!dataMap.has(dateKey)) {
        dataMap.set(dateKey, {
          date: new Date(dateKey),
          value: 0,
          users: new Set(),
          experiments: new Set(),
        });
      }

      const cell = dataMap.get(dateKey)!;
      cell.value += 1;
      cell.users.add(userId);
      cell.experiments.add(experimentId);
    });

    // Fill in missing dates
    const allDates = eachDayOfInterval({ start: startDate, end: now });
    const heatmapData = allDates.map((date) => {
      const dateKey = format(date, "yyyy-MM-dd");
      return dataMap.get(dateKey) || {
        date,
        value: 0,
        users: new Set(),
        experiments: new Set(),
      };
    });

    // Calculate max value for scaling
    let maxValue = 0;
    heatmapData.forEach((cell) => {
      if (viewMode === "contributions") {
        maxValue = Math.max(maxValue, cell.value);
      } else if (viewMode === "diversity") {
        maxValue = Math.max(maxValue, cell.users.size);
      } else if (viewMode === "experiments") {
        maxValue = Math.max(maxValue, cell.experiments.size);
      }
    });

    return {
      heatmapData,
      users: Array.from(usersSet).sort(),
      maxValue,
      dateRange: { start: startDate, end: now },
    };
  }, [runs, selectedUser, timeRange, viewMode]);

  // Group data by weeks for display
  const weeklyData = useMemo(() => {
    const weeks: HeatmapCell[][] = [];
    let currentWeek: HeatmapCell[] = [];

    heatmapData.forEach((cell, index) => {
      const dayOfWeek = cell.date.getDay();
      
      if (dayOfWeek === 0 && currentWeek.length > 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      
      currentWeek.push(cell);
    });

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return weeks;
  }, [heatmapData]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalRuns = heatmapData.reduce((sum, cell) => sum + cell.value, 0);
    const activeDays = heatmapData.filter((cell) => cell.value > 0).length;
    const uniqueUsers = new Set<string>();
    const uniqueExperiments = new Set<string>();

    heatmapData.forEach((cell) => {
      cell.users.forEach((user) => uniqueUsers.add(user));
      cell.experiments.forEach((exp) => uniqueExperiments.add(exp));
    });

    const avgRunsPerDay = totalRuns / heatmapData.length;
    const avgRunsPerActiveDay = activeDays > 0 ? totalRuns / activeDays : 0;

    return {
      totalRuns,
      activeDays,
      uniqueUsers: uniqueUsers.size,
      uniqueExperiments: uniqueExperiments.size,
      avgRunsPerDay,
      avgRunsPerActiveDay,
    };
  }, [heatmapData]);

  const getIntensity = (cell: HeatmapCell): number => {
    if (maxValue === 0) return 0;
    
    let value = 0;
    if (viewMode === "contributions") {
      value = cell.value;
    } else if (viewMode === "diversity") {
      value = cell.users.size;
    } else if (viewMode === "experiments") {
      value = cell.experiments.size;
    }

    return Math.min(4, Math.floor((value / maxValue) * 4));
  };

  const getColor = (intensity: number): string => {
    const colors = [
      "bg-muted",
      "bg-green-200 dark:bg-green-900",
      "bg-green-400 dark:bg-green-700",
      "bg-green-600 dark:bg-green-500",
      "bg-green-800 dark:bg-green-300",
    ];
    return colors[intensity];
  };

  const exportData = () => {
    const csv = [
      ["Date", "Runs", "Users", "Experiments"],
      ...heatmapData.map((cell) => [
        format(cell.date, "yyyy-MM-dd"),
        cell.value,
        cell.users.size,
        cell.experiments.size,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mltrack-user-activity-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="h-96 flex items-center justify-center">
          <div className="text-muted-foreground">Loading activity data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>User Activity Heatmap</CardTitle>
          <CardDescription>
            Visualize user activity patterns over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user} value={user}>
                    {user}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="View mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contributions">Total Runs</SelectItem>
                <SelectItem value="diversity">User Diversity</SelectItem>
                <SelectItem value="experiments">Experiment Coverage</SelectItem>
              </SelectContent>
            </Select>

            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="365d">Last year</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={exportData}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{stats.totalRuns}</div>
              <div className="text-sm text-muted-foreground">Total Runs</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{stats.activeDays}</div>
              <div className="text-sm text-muted-foreground">Active Days</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{stats.avgRunsPerActiveDay.toFixed(1)}</div>
              <div className="text-sm text-muted-foreground">Avg Runs/Active Day</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">
                {viewMode === "diversity" ? stats.uniqueUsers : stats.uniqueExperiments}
              </div>
              <div className="text-sm text-muted-foreground">
                {viewMode === "diversity" ? "Unique Users" : "Unique Experiments"}
              </div>
            </div>
          </div>

          {/* Heatmap */}
          <div className="overflow-x-auto">
            <div className="inline-block">
              {/* Day labels */}
              <div className="flex gap-1 mb-2 ml-12">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
                  <div key={day} className="w-4 h-4 text-xs text-muted-foreground text-center">
                    {i % 2 === 1 ? day[0] : ""}
                  </div>
                ))}
              </div>

              {/* Heatmap grid */}
              <div className="flex gap-1">
                {/* Month labels */}
                <div className="flex flex-col gap-1 mr-2">
                  {weeklyData.map((week, i) => {
                    const firstDay = week[0]?.date;
                    const showLabel = firstDay && (i === 0 || firstDay.getDate() <= 7);
                    return (
                      <div key={i} className="h-4 text-xs text-muted-foreground flex items-center">
                        {showLabel ? format(firstDay, "MMM") : ""}
                      </div>
                    );
                  })}
                </div>

                {/* Cells */}
                <div className="flex gap-1">
                  {weeklyData.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex flex-col gap-1">
                      {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
                        const cell = week.find((c) => c.date.getDay() === dayIndex);
                        if (!cell) {
                          return <div key={dayIndex} className="w-4 h-4" />;
                        }

                        const intensity = getIntensity(cell);
                        const color = getColor(intensity);

                        return (
                          <TooltipProvider key={dayIndex}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={`w-4 h-4 rounded-sm cursor-pointer transition-all hover:ring-2 hover:ring-offset-1 hover:ring-primary ${color}`}
                                />
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-sm">
                                  <div className="font-semibold">
                                    {format(cell.date, "MMM d, yyyy")}
                                  </div>
                                  <div>{cell.value} runs</div>
                                  <div>{cell.users.size} users</div>
                                  <div>{cell.experiments.size} experiments</div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-2 mt-4">
                <span className="text-xs text-muted-foreground">Less</span>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className={`w-4 h-4 rounded-sm ${getColor(i)}`} />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">More</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}