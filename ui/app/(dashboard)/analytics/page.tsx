'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, Clock, Activity, 
  Users, Brain, BarChart3, AlertCircle, Zap, Calendar,
  Download, Filter, RefreshCw, GitBranch, Package, Sparkles,
  FlaskConical
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format, subDays, startOfDay } from 'date-fns';
import { CostDashboard } from '@/components/analytics/cost-dashboard';
import { PerformanceDashboard } from '@/components/analytics/performance-dashboard';
import { RealtimeDashboard } from '@/components/analytics/realtime-dashboard';
import { TokenUsageDashboard } from '@/components/analytics/token-usage-dashboard';
import { ModelComparisonDashboard } from '@/components/analytics/model-comparison-dashboard';
import { TimeSeriesDashboard } from '@/components/analytics/time-series-dashboard';
import { UserActivityHeatmap } from '@/components/analytics/user-activity-heatmap';
import { ReportsDashboard } from '@/components/analytics/reports-dashboard';
import { useExperiments } from '@/lib/hooks/use-mlflow';
import { MLflowClient } from '@/lib/api/mlflow';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6'];

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedExperiment, setSelectedExperiment] = useState<string>('all');
  const { data: experiments } = useExperiments();

  // Fetch overview metrics
  const { data: overviewData, isLoading: overviewLoading, refetch } = useQuery({
    queryKey: ['analytics-overview', selectedExperiment, timeRange],
    queryFn: async () => {
      const client = new MLflowClient({ 
        baseUrl: process.env.NEXT_PUBLIC_MLFLOW_URL || '/api/mlflow' 
      });
      
      // Get experiment IDs to query
      const experimentIds = selectedExperiment === 'all' 
        ? experiments?.map(e => e.experiment_id) || []
        : [selectedExperiment];
      
      // Get all runs
      const runs = await client.searchRuns(experimentIds);
      
      // Calculate metrics
      let totalCost = 0;
      let totalRequests = runs.length;
      let totalTokens = 0;
      let successfulRuns = 0;
      const uniqueUsers = new Set<string>();
      const modelCounts: Record<string, number> = {};
      
      runs.forEach(run => {
        // Cost
        const cost = run.data.metrics?.find((m: any) => 
          m.key === 'llm.cost_usd' || m.key === 'llm.total_cost'
        )?.value || 0;
        totalCost += cost;
        
        // Tokens
        const tokens = run.data.metrics?.find((m: any) => 
          m.key === 'llm.total_tokens' || m.key === 'total_tokens'
        )?.value || 0;
        totalTokens += tokens;
        
        // Success rate
        if (run.info.status === 'FINISHED') {
          successfulRuns++;
        }
        
        // Users
        const userId = run.data.tags?.find((t: any) => 
          t.key === 'mltrack.user.id' || t.key === 'mlflow.user'
        )?.value;
        if (userId) uniqueUsers.add(userId);
        
        // Models
        const model = run.data.tags?.find((t: any) => 
          t.key === 'llm.model' || t.key === 'mlflow.source.name'
        )?.value || 'Unknown';
        modelCounts[model] = (modelCounts[model] || 0) + 1;
      });
      
      // Calculate trends (mock for now)
      const costTrend = Math.random() * 20 - 10;
      const requestsTrend = Math.random() * 30 - 5;
      const tokensTrend = Math.random() * 25 - 5;
      const successTrend = Math.random() * 10 - 5;
      const usersTrend = Math.random() * 15;
      
      const successRate = totalRequests > 0 ? (successfulRuns / totalRequests) * 100 : 0;
      
      return {
        totalCost,
        costTrend,
        totalRequests,
        requestsTrend,
        totalTokens,
        tokensTrend,
        successRate,
        successTrend,
        activeUsers: uniqueUsers.size,
        usersTrend,
        modelDistribution: Object.entries(modelCounts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5),
        experimentCount: experimentIds.length,
      };
    },
    enabled: !!experiments,
  });

  // Metric card component
  const MetricCard = ({ 
    title, 
    value, 
    trend, 
    icon: Icon, 
    format: formatFn = (v: any) => v 
  }: { 
    title: string; 
    value: number | string; 
    trend?: number; 
    icon: any;
    format?: (value: any) => string;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatFn(value)}</div>
          {trend !== undefined && (
            <div className="flex items-center text-xs text-muted-foreground">
              {trend > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={trend > 0 ? 'text-green-500' : 'text-red-500'}>
                {Math.abs(trend).toFixed(1)}%
              </span>
              <span className="ml-1">from last period</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics & Insights</h1>
            <p className="text-muted-foreground mt-2">
              Monitor performance, costs, and usage patterns across all experiments
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedExperiment} onValueChange={setSelectedExperiment}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Experiments</SelectItem>
                {experiments?.map(exp => (
                  <SelectItem key={exp.experiment_id} value={exp.experiment_id}>
                    {exp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Overview Metrics */}
        {overviewData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <MetricCard
              title="Total Cost"
              value={overviewData.totalCost}
              trend={overviewData.costTrend}
              icon={DollarSign}
              format={(v) => `$${v.toFixed(2)}`}
            />
            <MetricCard
              title="Total Runs"
              value={overviewData.totalRequests}
              trend={overviewData.requestsTrend}
              icon={Activity}
              format={(v) => v.toLocaleString()}
            />
            <MetricCard
              title="Success Rate"
              value={overviewData.successRate}
              trend={overviewData.successTrend}
              icon={Zap}
              format={(v) => `${v.toFixed(1)}%`}
            />
            <MetricCard
              title="Active Users"
              value={overviewData.activeUsers}
              trend={overviewData.usersTrend}
              icon={Users}
              format={(v) => v.toString()}
            />
            <MetricCard
              title="Total Tokens"
              value={overviewData.totalTokens}
              trend={overviewData.tokensTrend}
              icon={Brain}
              format={(v) => `${(v / 1000).toFixed(0)}K`}
            />
            <MetricCard
              title="Experiments"
              value={overviewData.experimentCount}
              icon={FlaskConical}
              format={(v) => v.toString()}
            />
          </div>
        )}

        {/* Main Charts */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 md:grid-cols-5 lg:grid-cols-9">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="timeseries">Time Series</TabsTrigger>
            <TabsTrigger value="realtime">Real-time</TabsTrigger>
            <TabsTrigger value="cost">Cost</TabsTrigger>
            <TabsTrigger value="tokens">Tokens</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="models">Models</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Model Distribution */}
            {overviewData && overviewData.modelDistribution.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Model Usage Distribution</CardTitle>
                    <CardDescription>
                      Runs by model type
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={overviewData.modelDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {overviewData.modelDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Stats</CardTitle>
                    <CardDescription>
                      Key insights at a glance
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-muted-foreground" />
                        <span>Most Used Model</span>
                      </div>
                      <span className="font-semibold">
                        {overviewData.modelDistribution[0]?.name || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-muted-foreground" />
                        <span>Avg Cost per Run</span>
                      </div>
                      <span className="font-semibold">
                        ${overviewData.totalRequests > 0 
                          ? (overviewData.totalCost / overviewData.totalRequests).toFixed(3)
                          : '0.00'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-muted-foreground" />
                        <span>Avg Tokens per Run</span>
                      </div>
                      <span className="font-semibold">
                        {overviewData.totalRequests > 0 
                          ? Math.round(overviewData.totalTokens / overviewData.totalRequests).toLocaleString()
                          : '0'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <span>Runs per User</span>
                      </div>
                      <span className="font-semibold">
                        {overviewData.activeUsers > 0 
                          ? Math.round(overviewData.totalRequests / overviewData.activeUsers)
                          : '0'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Alert for high costs */}
            {overviewData && overviewData.totalCost > 100 && (
              <Card className="border-amber-500/50 bg-amber-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    Cost Alert
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    Your LLM costs have exceeded $100 in the selected period. 
                    Consider reviewing the Cost Analysis tab for optimization opportunities.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="timeseries" className="space-y-4">
            <TimeSeriesDashboard />
          </TabsContent>

          <TabsContent value="realtime" className="space-y-4">
            <RealtimeDashboard />
          </TabsContent>

          <TabsContent value="cost" className="space-y-4">
            <CostDashboard 
              experimentIds={selectedExperiment === 'all' 
                ? experiments?.map(e => e.experiment_id) 
                : [selectedExperiment]
              } 
            />
          </TabsContent>

          <TabsContent value="tokens" className="space-y-4">
            <TokenUsageDashboard 
              experimentIds={selectedExperiment === 'all' 
                ? experiments?.map(e => e.experiment_id) 
                : [selectedExperiment]
              } 
            />
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <PerformanceDashboard 
              experimentIds={selectedExperiment === 'all' 
                ? experiments?.map(e => e.experiment_id) 
                : [selectedExperiment]
              } 
            />
          </TabsContent>

          <TabsContent value="models" className="space-y-4">
            <ModelComparisonDashboard 
              experimentIds={selectedExperiment === 'all' 
                ? experiments?.map(e => e.experiment_id) 
                : [selectedExperiment]
              } 
            />
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <UserActivityHeatmap />
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <ReportsDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}