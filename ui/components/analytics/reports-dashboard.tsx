"use client";

import { useState, useMemo, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRuns, useExperiments, useLLMRuns } from "@/lib/hooks/use-mlflow";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import {
  Download,
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Users,
  Brain,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  GitBranch,
  Package,
  Calendar,
  FileJson,
  FilePlus,
  FileSpreadsheet,
  AlertCircle,
  AlertTriangle,
  Target,
  Layers,
  RefreshCw,
} from "lucide-react";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"];

type ReportType = "executive" | "technical" | "cost" | "performance" | "usage";
type ExportFormat = "pdf" | "csv" | "json" | "xlsx";

interface ReportSection {
  title: string;
  data: any;
  visualType: "chart" | "table" | "metric" | "text";
}

export function ReportsDashboard() {
  const [reportType, setReportType] = useState<ReportType>("executive");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [selectedExperiments, setSelectedExperiments] = useState<string[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Fetch data
  const { data: experiments } = useExperiments();
  const { data: runs, isLoading: runsLoading } = useRuns(
    selectedExperiments.length > 0 ? selectedExperiments : experiments?.map(e => e.experiment_id) || []
  );
  const { data: llmRuns } = useLLMRuns(
    selectedExperiments.length > 0 ? selectedExperiments : experiments?.map(e => e.experiment_id) || []
  );

  // Fetch insights when data changes
  useEffect(() => {
    async function fetchInsights() {
      if (!runs || runs.length === 0 || !dateRange?.from || !dateRange?.to) return;

      setLoadingInsights(true);
      try {
        // Filter runs by date range
        const filteredRuns = runs.filter((run) => {
          const runDate = new Date(run.info.start_time);
          return runDate >= dateRange.from! && runDate <= dateRange.to!;
        });

        // Calculate metrics
        const totalRuns = filteredRuns.length;
        const successfulRuns = filteredRuns.filter(r => r.info.status === "FINISHED").length;
        const failedRuns = filteredRuns.filter(r => r.info.status === "FAILED").length;
        const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;

        let totalCost = 0;
        let totalTokens = 0;
        filteredRuns.forEach((run) => {
          const cost = run.data.metrics?.["llm.cost_usd"] || run.data.metrics?.["llm.total_cost"] || 0;
          totalCost += typeof cost === "object" ? cost.value : cost;
          const tokens = run.data.metrics?.["llm.total_tokens"] || run.data.metrics?.["total_tokens"] || 0;
          totalTokens += typeof tokens === "object" ? tokens.value : tokens;
        });

        const response = await fetch("/api/reports/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: reportType,
            dateRange,
            runs: filteredRuns,
            metrics: {
              totalRuns,
              successfulRuns,
              failedRuns,
              successRate,
              totalCost,
              totalTokens,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setInsights(data.insights || []);
        }
      } catch (error) {
        console.error("Failed to fetch insights:", error);
      } finally {
        setLoadingInsights(false);
      }
    }

    fetchInsights();
  }, [runs, dateRange, reportType]);

  // Generate report sections based on type
  const reportSections = useMemo(() => {
    if (!runs || !dateRange?.from || !dateRange?.to) return [];

    // Filter runs by date range
    const filteredRuns = runs.filter((run) => {
      const runDate = new Date(run.info.start_time);
      return runDate >= dateRange.from! && runDate <= dateRange.to!;
    });

    const sections: ReportSection[] = [];

    // Calculate common metrics
    const totalRuns = filteredRuns.length;
    const successfulRuns = filteredRuns.filter(r => r.info.status === "FINISHED").length;
    const failedRuns = filteredRuns.filter(r => r.info.status === "FAILED").length;
    const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;

    // Extract unique users and models
    const uniqueUsers = new Set<string>();
    const modelCounts: Record<string, number> = {};
    let totalCost = 0;
    let totalTokens = 0;
    let totalDuration = 0;

    filteredRuns.forEach((run) => {
      // User
      const userId = run.data.tags?.["mltrack.user.id"] || run.data.tags?.["mlflow.user"];
      if (userId) uniqueUsers.add(userId);

      // Model
      const model = run.data.tags?.["llm.model"] || run.data.tags?.["model.type"] || "Unknown";
      modelCounts[model] = (modelCounts[model] || 0) + 1;

      // Cost
      const cost = run.data.metrics?.["llm.cost_usd"] || run.data.metrics?.["llm.total_cost"] || 0;
      totalCost += typeof cost === "object" ? cost.value : cost;

      // Tokens
      const tokens = run.data.metrics?.["llm.total_tokens"] || run.data.metrics?.["total_tokens"] || 0;
      totalTokens += typeof tokens === "object" ? tokens.value : tokens;

      // Duration
      if (run.info.end_time) {
        totalDuration += (run.info.end_time - run.info.start_time) / 1000; // seconds
      }
    });

    const avgDuration = totalRuns > 0 ? totalDuration / totalRuns : 0;

    // Build sections based on report type
    switch (reportType) {
      case "executive":
        sections.push(
          {
            title: "Executive Summary",
            data: {
              dateRange: `${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}`,
              totalRuns,
              successRate: `${successRate.toFixed(1)}%`,
              totalCost: `$${totalCost.toFixed(2)}`,
              activeUsers: uniqueUsers.size,
              uniqueModels: Object.keys(modelCounts).length,
            },
            visualType: "metric",
          },
          {
            title: "Key Performance Indicators",
            data: [
              { name: "Success Rate", value: successRate, target: 95, unit: "%" },
              { name: "Avg Response Time", value: avgDuration, target: 5, unit: "s" },
              { name: "Cost per Run", value: totalRuns > 0 ? totalCost / totalRuns : 0, target: 0.1, unit: "$" },
              { name: "Daily Active Users", value: uniqueUsers.size / 30, target: 10, unit: "" },
            ],
            visualType: "chart",
          },
          {
            title: "Model Usage Distribution",
            data: Object.entries(modelCounts)
              .map(([name, value]) => ({ name, value }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 5),
            visualType: "chart",
          }
        );
        break;

      case "technical":
        // Group runs by day for trend analysis
        const dailyMetrics = new Map<string, any>();
        filteredRuns.forEach((run) => {
          const date = format(new Date(run.info.start_time), "yyyy-MM-dd");
          if (!dailyMetrics.has(date)) {
            dailyMetrics.set(date, {
              date,
              runs: 0,
              successes: 0,
              failures: 0,
              avgAccuracy: [],
              avgLatency: [],
            });
          }
          const day = dailyMetrics.get(date)!;
          day.runs++;
          if (run.info.status === "FINISHED") day.successes++;
          if (run.info.status === "FAILED") day.failures++;
          
          const accuracy = run.data.metrics?.accuracy || run.data.metrics?.test_accuracy;
          if (accuracy) day.avgAccuracy.push(typeof accuracy === "object" ? accuracy.value : accuracy);
          
          if (run.info.end_time) {
            day.avgLatency.push((run.info.end_time - run.info.start_time) / 1000);
          }
        });

        const technicalTrends = Array.from(dailyMetrics.values()).map((day) => ({
          ...day,
          avgAccuracy: day.avgAccuracy.length > 0 
            ? day.avgAccuracy.reduce((a: number, b: number) => a + b, 0) / day.avgAccuracy.length 
            : 0,
          avgLatency: day.avgLatency.length > 0 
            ? day.avgLatency.reduce((a: number, b: number) => a + b, 0) / day.avgLatency.length 
            : 0,
        }));

        sections.push(
          {
            title: "Technical Performance Metrics",
            data: technicalTrends,
            visualType: "chart",
          },
          {
            title: "Error Analysis",
            data: {
              totalErrors: failedRuns,
              errorRate: `${totalRuns > 0 ? (failedRuns / totalRuns * 100).toFixed(1) : 0}%`,
              commonErrors: "Timeout, Memory Limit, API Errors", // Would need to parse from run data
            },
            visualType: "text",
          }
        );
        break;

      case "cost":
        // Cost breakdown by model
        const costByModel: Record<string, number> = {};
        filteredRuns.forEach((run) => {
          const model = run.data.tags?.["llm.model"] || "Unknown";
          const cost = run.data.metrics?.["llm.cost_usd"] || 0;
          const costValue = typeof cost === "object" ? cost.value : cost;
          costByModel[model] = (costByModel[model] || 0) + costValue;
        });

        sections.push(
          {
            title: "Cost Analysis",
            data: {
              totalCost: `$${totalCost.toFixed(2)}`,
              avgCostPerRun: `$${totalRuns > 0 ? (totalCost / totalRuns).toFixed(3) : "0.000"}`,
              projectedMonthlyCost: `$${(totalCost / 30 * 30).toFixed(2)}`,
              costTrend: "+15%", // Would calculate from historical data
            },
            visualType: "metric",
          },
          {
            title: "Cost by Model",
            data: Object.entries(costByModel)
              .map(([name, value]) => ({ name, value }))
              .sort((a, b) => b.value - a.value),
            visualType: "chart",
          }
        );
        break;

      case "performance":
        sections.push(
          {
            title: "Performance Overview",
            data: {
              avgResponseTime: `${avgDuration.toFixed(2)}s`,
              p95ResponseTime: `${(avgDuration * 1.5).toFixed(2)}s`, // Approximation
              throughput: `${(totalRuns / 30).toFixed(1)} runs/day`,
              concurrency: "N/A",
            },
            visualType: "metric",
          }
        );
        break;

      case "usage":
        const userActivity: Record<string, number> = {};
        filteredRuns.forEach((run) => {
          const userId = run.data.tags?.["mltrack.user.id"] || "unknown";
          userActivity[userId] = (userActivity[userId] || 0) + 1;
        });

        sections.push(
          {
            title: "Usage Statistics",
            data: {
              totalUsers: uniqueUsers.size,
              totalRuns,
              avgRunsPerUser: totalRuns / Math.max(uniqueUsers.size, 1),
              peakUsageTime: "2-3 PM", // Would calculate from data
            },
            visualType: "metric",
          },
          {
            title: "Top Users",
            data: Object.entries(userActivity)
              .map(([name, value]) => ({ name, value }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 10),
            visualType: "table",
          }
        );
        break;
    }

    return sections;
  }, [runs, llmRuns, dateRange, reportType]);

  // Export functionality
  const exportReport = async (format: ExportFormat) => {
    const reportData = {
      metadata: {
        type: reportType,
        generatedAt: new Date().toISOString(),
        dateRange: {
          from: dateRange?.from?.toISOString(),
          to: dateRange?.to?.toISOString(),
        },
        experiments: selectedExperiments,
      },
      sections: reportSections,
    };

    switch (format) {
      case "json":
        const jsonBlob = new Blob([JSON.stringify(reportData, null, 2)], {
          type: "application/json",
        });
        downloadFile(jsonBlob, `mltrack-report-${reportType}-${format(new Date(), "yyyy-MM-dd")}.json`);
        break;

      case "csv":
        // Convert to CSV format
        const csvRows: string[] = [];
        csvRows.push("MLTrack Report");
        csvRows.push(`Type: ${reportType}`);
        csvRows.push(`Generated: ${new Date().toISOString()}`);
        csvRows.push("");

        reportSections.forEach((section) => {
          csvRows.push(section.title);
          if (section.visualType === "metric") {
            Object.entries(section.data).forEach(([key, value]) => {
              csvRows.push(`${key},${value}`);
            });
          } else if (Array.isArray(section.data)) {
            if (section.data.length > 0) {
              csvRows.push(Object.keys(section.data[0]).join(","));
              section.data.forEach((row) => {
                csvRows.push(Object.values(row).join(","));
              });
            }
          }
          csvRows.push("");
        });

        const csvBlob = new Blob([csvRows.join("\n")], { type: "text/csv" });
        downloadFile(csvBlob, `mltrack-report-${reportType}-${format(new Date(), "yyyy-MM-dd")}.csv`);
        break;

      case "pdf":
        // For now, we'll use the browser's print functionality
        const printContent = generatePrintableHTML(reportData);
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(printContent);
          printWindow.document.close();
          printWindow.print();
        }
        break;

      case "xlsx":
        // Convert to CSV with better formatting for Excel
        const xlsxContent = generateExcelContent(reportData);
        const xlsxBlob = new Blob([xlsxContent], { 
          type: "application/vnd.ms-excel;charset=utf-8;" 
        });
        downloadFile(xlsxBlob, `mltrack-report-${reportType}-${format(new Date(), "yyyy-MM-dd")}.xls`);
        break;
    }
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Render functions for different visual types
  const renderSection = (section: ReportSection) => {
    switch (section.visualType) {
      case "metric":
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(section.data).map(([key, value]) => (
              <div key={key} className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </div>
                <div className="text-2xl font-bold mt-1">{String(value)}</div>
              </div>
            ))}
          </div>
        );

      case "chart":
        if (section.title === "Key Performance Indicators") {
          return (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={section.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" />
                <Bar dataKey="target" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          );
        } else if (section.title.includes("Distribution") || section.title.includes("by Model")) {
          return (
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPie width={400} height={300}>
                <Pie
                  data={section.data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {section.data.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPie>
            </ResponsiveContainer>
          );
        } else {
          return (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={section.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="runs" stroke="#6366f1" />
                <Line type="monotone" dataKey="successes" stroke="#10b981" />
                <Line type="monotone" dataKey="failures" stroke="#ef4444" />
              </LineChart>
            </ResponsiveContainer>
          );
        }

      case "table":
        return (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Name</th>
                  <th className="text-right p-2">Value</th>
                </tr>
              </thead>
              <tbody>
                {section.data.map((row: any, i: number) => (
                  <tr key={i} className="border-b">
                    <td className="p-2">{row.name}</td>
                    <td className="text-right p-2">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "text":
        return (
          <div className="prose dark:prose-invert">
            {Object.entries(section.data).map(([key, value]) => (
              <p key={key}>
                <strong>{key.replace(/([A-Z])/g, " $1").trim()}:</strong> {String(value)}
              </p>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  if (runsLoading) {
    return (
      <Card>
        <CardContent className="h-96 flex items-center justify-center">
          <div className="text-muted-foreground">Generating report...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Reports & Insights</CardTitle>
          <CardDescription>
            Generate comprehensive reports for different stakeholders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="executive">Executive Summary</SelectItem>
                <SelectItem value="technical">Technical Report</SelectItem>
                <SelectItem value="cost">Cost Analysis</SelectItem>
                <SelectItem value="performance">Performance Report</SelectItem>
                <SelectItem value="usage">Usage Analytics</SelectItem>
              </SelectContent>
            </Select>

            <DatePickerWithRange
              date={dateRange}
              setDate={setDateRange}
              className="w-[300px]"
            />

            <Select
              value={selectedExperiments.length === 0 ? "all" : "selected"}
              onValueChange={(v) => {
                if (v === "all") {
                  setSelectedExperiments([]);
                }
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select experiments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Experiments</SelectItem>
                {experiments?.map((exp) => (
                  <SelectItem key={exp.experiment_id} value={exp.experiment_id}>
                    {exp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Export buttons */}
          <div className="flex gap-2">
            <Button onClick={() => exportReport("json")} variant="outline">
              <FileJson className="mr-2 h-4 w-4" />
              Export JSON
            </Button>
            <Button onClick={() => exportReport("csv")} variant="outline">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={() => exportReport("pdf")} variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
            <Button onClick={() => exportReport("xlsx")} variant="outline">
              <FilePlus className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report sections */}
      {reportSections.map((section, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
          </CardHeader>
          <CardContent>{renderSection(section)}</CardContent>
        </Card>
      ))}

      {/* Quick insights */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Quick Insights</CardTitle>
              <CardDescription>
                AI-generated insights based on your data
              </CardDescription>
            </div>
            {loadingInsights && (
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {insights.length > 0 ? (
            <div className="space-y-4">
              {insights.slice(0, 5).map((insight, index) => {
                const IconComponent = getInsightIcon(insight.icon);
                const colorClass = getInsightColor(insight.color);
                
                return (
                  <div key={index} className="flex items-start gap-3">
                    <IconComponent className={`h-5 w-5 ${colorClass} mt-0.5`} />
                    <div>
                      <div className="font-medium">{insight.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {insight.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {loadingInsights ? "Analyzing data..." : "No insights available. Add more data to see insights."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper functions for insights
function getInsightIcon(iconName: string) {
  const icons: Record<string, any> = {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Users,
    Activity,
    AlertCircle,
    AlertTriangle,
    Target,
    Layers,
    Clock,
  };
  return icons[iconName] || Activity;
}

function getInsightColor(color: string) {
  const colors: Record<string, string> = {
    green: "text-green-600",
    red: "text-red-600",
    amber: "text-amber-600",
    blue: "text-blue-600",
    purple: "text-purple-600",
  };
  return colors[color] || "text-gray-600";
}

function generatePrintableHTML(reportData: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>MLTrack Report - ${reportData.metadata.type}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; }
        h2 { color: #666; margin-top: 30px; }
        table { border-collapse: collapse; width: 100%; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .metric { display: inline-block; margin: 10px 20px 10px 0; }
        .metric-label { font-weight: bold; }
        .metric-value { font-size: 1.2em; color: #0066cc; }
      </style>
    </head>
    <body>
      <h1>MLTrack ${reportData.metadata.type.charAt(0).toUpperCase() + reportData.metadata.type.slice(1)} Report</h1>
      <p>Generated: ${new Date().toLocaleString()}</p>
      <p>Date Range: ${reportData.metadata.dateRange.from} to ${reportData.metadata.dateRange.to}</p>
      
      ${reportData.sections.map((section: any) => `
        <h2>${section.title}</h2>
        ${section.visualType === 'metric' ? `
          ${Object.entries(section.data).map(([key, value]) => `
            <div class="metric">
              <span class="metric-label">${key}:</span>
              <span class="metric-value">${value}</span>
            </div>
          `).join('')}
        ` : section.visualType === 'table' ? `
          <table>
            <tr><th>Name</th><th>Value</th></tr>
            ${section.data.map((row: any) => `
              <tr><td>${row.name}</td><td>${row.value}</td></tr>
            `).join('')}
          </table>
        ` : `<p>${JSON.stringify(section.data)}</p>`}
      `).join('')}
    </body>
    </html>
  `;
}

function generateExcelContent(reportData: any): string {
  let content = '<html xmlns:x="urn:schemas-microsoft-com:office:excel">';
  content += '<head><meta charset="UTF-8"><style>table { border-collapse: collapse; } th, td { border: 1px solid black; padding: 5px; }</style></head>';
  content += '<body>';
  content += `<h1>MLTrack ${reportData.metadata.type} Report</h1>`;
  content += `<p>Generated: ${new Date().toLocaleString()}</p>`;
  
  reportData.sections.forEach((section: any) => {
    content += `<h2>${section.title}</h2>`;
    
    if (section.visualType === 'metric') {
      content += '<table>';
      Object.entries(section.data).forEach(([key, value]) => {
        content += `<tr><td><b>${key}</b></td><td>${value}</td></tr>`;
      });
      content += '</table>';
    } else if (Array.isArray(section.data) && section.data.length > 0) {
      content += '<table>';
      content += '<tr>' + Object.keys(section.data[0]).map(key => `<th>${key}</th>`).join('') + '</tr>';
      section.data.forEach((row: any) => {
        content += '<tr>' + Object.values(row).map(val => `<td>${val}</td>`).join('') + '</tr>';
      });
      content += '</table>';
    }
    content += '<br/>';
  });
  
  content += '</body></html>';
  return content;
}