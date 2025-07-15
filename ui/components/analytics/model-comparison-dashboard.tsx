'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, Scatter, ComposedChart, Treemap
} from 'recharts';
import { 
  Brain, DollarSign, Clock, Zap, TrendingUp, TrendingDown,
  Award, AlertCircle, Info, GitCompare, Package, Sparkles,
  Activity, BarChart3, Filter, ChevronRight, Shield, Gauge
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { MLflowClient } from '@/lib/api/mlflow';
import { motion } from 'framer-motion';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#ec4899', '#06b6d4'];

interface ModelComparisonData {
  models: ModelStats[];
  comparisons: ComparisonMetrics;
  timeSeriesData: TimeSeriesPoint[];
  correlations: CorrelationData;
  recommendations: Recommendation[];
}

interface ModelStats {
  name: string;
  provider: string;
  totalRuns: number;
  avgLatency: number;
  avgCost: number;
  avgTokens: number;
  successRate: number;
  avgQualityScore: number;
  p95Latency: number;
  p99Latency: number;
  costPerToken: number;
  errorRate: number;
  usage: number; // percentage of total runs
}

interface ComparisonMetrics {
  costEfficiency: Record<string, number>;
  performanceScore: Record<string, number>;
  qualityScore: Record<string, number>;
  reliabilityScore: Record<string, number>;
  overallScore: Record<string, number>;
}

interface TimeSeriesPoint {
  date: string;
  [model: string]: string | number;
}

interface CorrelationData {
  costVsQuality: Array<{ model: string; cost: number; quality: number }>;
  latencyVsTokens: Array<{ model: string; latency: number; tokens: number }>;
  costVsLatency: Array<{ model: string; cost: number; latency: number }>;
}

interface Recommendation {
  type: 'cost' | 'performance' | 'quality' | 'reliability';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  models: string[];
}

export function ModelComparisonDashboard({ experimentIds }: { experimentIds?: string[] }) {
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [comparisonMetric, setComparisonMetric] = useState<string>('overall');
  const [timeRange, setTimeRange] = useState<string>('30d');

  const { data: comparisonData, isLoading } = useQuery<ModelComparisonData>({
    queryKey: ['model-comparison', experimentIds, timeRange],
    queryFn: async () => {
      const client = new MLflowClient({ 
        baseUrl: process.env.NEXT_PUBLIC_MLFLOW_URL || '/api/mlflow' 
      });
      
      // Get all runs
      const runs = await client.searchRuns(experimentIds || []);
      
      // Process model statistics
      const modelStats: Record<string, any> = {};
      const timeSeriesMap: Record<string, Record<string, any>> = {};
      
      runs.forEach(run => {
        const tags = run.data.tags || [];
        const metrics = run.data.metrics || [];
        
        // Extract model info
        const model = tags.find((t: any) => t.key === 'llm.model')?.value || 
                     tags.find((t: any) => t.key === 'mltrack.algorithm')?.value || 
                     'Unknown';
        const provider = tags.find((t: any) => t.key === 'mltrack.provider')?.value || 
                        tags.find((t: any) => t.key === 'llm.provider')?.value || 
                        detectProviderFromModel(model);
        
        // Initialize model stats if needed
        if (!modelStats[model]) {
          modelStats[model] = {
            name: model,
            provider,
            runs: [],
            latencies: [],
            costs: [],
            tokens: [],
            successCount: 0,
            totalCount: 0,
            qualityScores: [],
            errors: 0
          };
        }
        
        // Extract metrics
        const latency = metrics.find((m: any) => 
          m.key === 'llm.latency_ms' || m.key === 'latency_ms'
        )?.value || 0;
        
        const cost = metrics.find((m: any) => 
          m.key === 'llm.cost_usd' || m.key === 'llm.total_cost'
        )?.value || 0;
        
        const totalTokens = metrics.find((m: any) => 
          m.key === 'llm.tokens.total_tokens' || m.key === 'llm.total_tokens' || m.key === 'total_tokens'
        )?.value || 0;
        
        // Quality score (could be custom metric or derived)
        const qualityScore = metrics.find((m: any) => 
          m.key === 'quality_score' || m.key === 'llm.quality_score'
        )?.value || (run.info.status === 'FINISHED' ? 0.8 : 0.5);
        
        // Update stats
        modelStats[model].runs.push(run);
        modelStats[model].latencies.push(latency);
        modelStats[model].costs.push(cost);
        modelStats[model].tokens.push(totalTokens);
        modelStats[model].qualityScores.push(qualityScore);
        modelStats[model].totalCount++;
        
        if (run.info.status === 'FINISHED') {
          modelStats[model].successCount++;
        } else if (run.info.status === 'FAILED') {
          modelStats[model].errors++;
        }
        
        // Time series data
        const date = format(new Date(run.info.start_time), 'yyyy-MM-dd');
        if (!timeSeriesMap[date]) {
          timeSeriesMap[date] = { date };
        }
        if (!timeSeriesMap[date][`${model}_runs`]) {
          timeSeriesMap[date][`${model}_runs`] = 0;
          timeSeriesMap[date][`${model}_cost`] = 0;
          timeSeriesMap[date][`${model}_latency`] = 0;
        }
        timeSeriesMap[date][`${model}_runs`]++;
        timeSeriesMap[date][`${model}_cost`] += cost;
        timeSeriesMap[date][`${model}_latency`] += latency;
      });
      
      // Calculate final statistics
      const models: ModelStats[] = Object.values(modelStats).map((stats: any) => {
        const avgLatency = average(stats.latencies);
        const avgCost = average(stats.costs);
        const avgTokens = average(stats.tokens);
        const avgQuality = average(stats.qualityScores);
        
        return {
          name: stats.name,
          provider: stats.provider,
          totalRuns: stats.totalCount,
          avgLatency,
          avgCost,
          avgTokens,
          successRate: stats.totalCount > 0 ? (stats.successCount / stats.totalCount) * 100 : 0,
          avgQualityScore: avgQuality,
          p95Latency: percentile(stats.latencies, 0.95),
          p99Latency: percentile(stats.latencies, 0.99),
          costPerToken: avgTokens > 0 ? avgCost / avgTokens * 1000 : 0,
          errorRate: stats.totalCount > 0 ? (stats.errors / stats.totalCount) * 100 : 0,
          usage: 0 // Will calculate after
        };
      });
      
      // Calculate usage percentages
      const totalRuns = models.reduce((sum, m) => sum + m.totalRuns, 0);
      models.forEach(model => {
        model.usage = totalRuns > 0 ? (model.totalRuns / totalRuns) * 100 : 0;
      });
      
      // Calculate comparison metrics
      const comparisons = calculateComparisonMetrics(models);
      
      // Prepare time series data
      const timeSeriesData = Object.values(timeSeriesMap).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      // Calculate correlations
      const correlations = calculateCorrelations(models);
      
      // Generate recommendations
      const recommendations = generateRecommendations(models, comparisons);
      
      return {
        models: models.sort((a, b) => b.totalRuns - a.totalRuns),
        comparisons,
        timeSeriesData,
        correlations,
        recommendations
      };
    },
    enabled: !!experimentIds || experimentIds === undefined,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 w-48 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!comparisonData || comparisonData.models.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No model data available for comparison</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Select top models by default
  if (selectedModels.length === 0 && comparisonData.models.length > 0) {
    setSelectedModels(comparisonData.models.slice(0, 5).map(m => m.name));
  }

  const filteredModels = comparisonData.models.filter(m => 
    selectedModels.length === 0 || selectedModels.includes(m.name)
  );

  // Prepare radar chart data
  const radarData = prepareRadarData(filteredModels, comparisonData.comparisons);

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Model Comparison Dashboard
          </CardTitle>
          <CardDescription>
            Compare AI models across performance, cost, quality, and reliability metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Select Models</label>
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                {comparisonData.models.map(model => (
                  <label key={model.name} className="flex items-center space-x-2 cursor-pointer">
                    <Checkbox
                      checked={selectedModels.includes(model.name)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedModels([...selectedModels, model.name]);
                        } else {
                          setSelectedModels(selectedModels.filter(m => m !== model.name));
                        }
                      }}
                    />
                    <span className="text-sm">{model.name}</span>
                    <Badge variant="outline" className="ml-auto">
                      {model.totalRuns} runs
                    </Badge>
                  </label>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Comparison Metric</label>
              <Select value={comparisonMetric} onValueChange={setComparisonMetric}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overall">Overall Score</SelectItem>
                  <SelectItem value="cost">Cost Efficiency</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="quality">Quality</SelectItem>
                  <SelectItem value="reliability">Reliability</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Time Range</label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7 days</SelectItem>
                  <SelectItem value="30d">30 days</SelectItem>
                  <SelectItem value="90d">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredModels.slice(0, 4).map((model, idx) => (
          <motion.div
            key={model.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.1 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  {model.name}
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardTitle>
                <Badge variant="outline" className="w-fit">
                  {model.provider}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Overall Score</span>
                    <span className="font-semibold">
                      {(comparisonData.comparisons.overallScore[model.name] || 0).toFixed(1)}
                    </span>
                  </div>
                  <Progress 
                    value={comparisonData.comparisons.overallScore[model.name] || 0} 
                    className="h-2"
                  />
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Avg Cost:</span>
                      <span className="ml-1 font-medium">${model.avgCost.toFixed(3)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Latency:</span>
                      <span className="ml-1 font-medium">{model.avgLatency.toFixed(0)}ms</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Comparison Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="cost">Cost Analysis</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="recommendations">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Radar Chart Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Multi-Dimensional Comparison</CardTitle>
              <CardDescription>
                Compare models across all key metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={radarData}>
                  <PolarGrid strokeDasharray="3 3" />
                  <PolarAngleAxis dataKey="metric" className="text-xs" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  {filteredModels.map((model, idx) => (
                    <Radar
                      key={model.name}
                      name={model.name}
                      dataKey={model.name}
                      stroke={COLORS[idx % COLORS.length]}
                      fill={COLORS[idx % COLORS.length]}
                      fillOpacity={0.3}
                    />
                  ))}
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Model Usage Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Usage Distribution</CardTitle>
                <CardDescription>
                  Percentage of runs by model
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={filteredModels}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, usage }) => `${name} ${usage.toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="usage"
                    >
                      {filteredModels.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => `${value.toFixed(1)}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Comparison</CardTitle>
                <CardDescription>
                  Side-by-side metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredModels.slice(0, 5).map(model => (
                    <div key={model.name} className="p-3 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{model.name}</span>
                        <Badge variant={model.successRate > 95 ? "default" : "secondary"}>
                          {model.successRate.toFixed(1)}% success
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Cost/1K:</span>
                          <span className="ml-1">${(model.costPerToken * 1000).toFixed(3)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">P95 Latency:</span>
                          <span className="ml-1">{model.p95Latency.toFixed(0)}ms</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Quality:</span>
                          <span className="ml-1">{(model.avgQualityScore * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {/* Latency Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Latency Comparison</CardTitle>
              <CardDescription>
                Average, P95, and P99 latencies by model
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={filteredModels}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip formatter={(value: any) => `${value.toFixed(0)}ms`} />
                  <Legend />
                  <Bar dataKey="avgLatency" fill="#6366f1" name="Average" />
                  <Bar dataKey="p95Latency" fill="#f59e0b" name="P95" />
                  <Bar dataKey="p99Latency" fill="#ef4444" name="P99" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Latency vs Tokens Scatter */}
          <Card>
            <CardHeader>
              <CardTitle>Latency vs Token Count</CardTitle>
              <CardDescription>
                Explore the relationship between response time and token usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="tokens" 
                    name="Avg Tokens" 
                    unit=" tokens"
                    domain={['dataMin - 100', 'dataMax + 100']}
                  />
                  <YAxis 
                    dataKey="latency" 
                    name="Avg Latency" 
                    unit="ms"
                    domain={['dataMin - 50', 'dataMax + 50']}
                  />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Legend />
                  {comparisonData.correlations.latencyVsTokens.map((data, idx) => (
                    <Scatter
                      key={data.model}
                      name={data.model}
                      data={[data]}
                      fill={COLORS[idx % COLORS.length]}
                    />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cost" className="space-y-4">
          {/* Cost Efficiency */}
          <Card>
            <CardHeader>
              <CardTitle>Cost Analysis</CardTitle>
              <CardDescription>
                Compare cost per run and cost per token
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={filteredModels}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis yAxisId="left" orientation="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    formatter={(value: any, name: string) => {
                      if (name === 'Avg Cost') return `$${value.toFixed(3)}`;
                      return `$${value.toFixed(4)}`;
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="avgCost" fill="#6366f1" name="Avg Cost" />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="costPerToken" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    name="Cost per Token"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cost vs Quality Scatter */}
          <Card>
            <CardHeader>
              <CardTitle>Cost vs Quality Trade-off</CardTitle>
              <CardDescription>
                Find the sweet spot between cost and quality
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="cost" 
                    name="Avg Cost" 
                    unit="$"
                    tickFormatter={(v) => `$${v.toFixed(3)}`}
                  />
                  <YAxis 
                    dataKey="quality" 
                    name="Quality Score" 
                    domain={[0, 1]}
                    tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                  />
                  <Tooltip 
                    formatter={(value: any, name: string) => {
                      if (name === 'Avg Cost') return `$${value.toFixed(3)}`;
                      return `${(value * 100).toFixed(0)}%`;
                    }}
                  />
                  <Legend />
                  {comparisonData.correlations.costVsQuality.map((data, idx) => (
                    <Scatter
                      key={data.model}
                      name={data.model}
                      data={[data]}
                      fill={COLORS[idx % COLORS.length]}
                    />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          {/* Quality Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Quality & Reliability Metrics</CardTitle>
              <CardDescription>
                Success rate, error rate, and quality scores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredModels.map((model, idx) => (
                  <div key={model.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" style={{ backgroundColor: COLORS[idx % COLORS.length] + '20' }}>
                          {model.name}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {model.provider}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          <span>{model.successRate.toFixed(1)}% success</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          <span>{model.errorRate.toFixed(1)}% errors</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Success Rate</span>
                          <span>{model.successRate.toFixed(1)}%</span>
                        </div>
                        <Progress value={model.successRate} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Quality Score</span>
                          <span>{(model.avgQualityScore * 100).toFixed(0)}%</span>
                        </div>
                        <Progress 
                          value={model.avgQualityScore * 100} 
                          className="h-2 [&>div]:bg-green-500"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Reliability</span>
                          <span>{((100 - model.errorRate) * 0.95).toFixed(0)}%</span>
                        </div>
                        <Progress 
                          value={(100 - model.errorRate) * 0.95} 
                          className="h-2 [&>div]:bg-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          {/* Usage Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Model Usage Over Time</CardTitle>
              <CardDescription>
                Track how model usage changes over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={comparisonData.timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {filteredModels.map((model, idx) => (
                    <Area
                      key={model.name}
                      type="monotone"
                      dataKey={`${model.name}_runs`}
                      stackId="1"
                      stroke={COLORS[idx % COLORS.length]}
                      fill={COLORS[idx % COLORS.length]}
                      fillOpacity={0.6}
                      name={model.name}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cost Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Cost Trends</CardTitle>
              <CardDescription>
                Daily cost by model
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={comparisonData.timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(v) => `$${v.toFixed(2)}`} />
                  <Tooltip formatter={(v: any) => `$${v.toFixed(2)}`} />
                  <Legend />
                  {filteredModels.map((model, idx) => (
                    <Line
                      key={model.name}
                      type="monotone"
                      dataKey={`${model.name}_cost`}
                      stroke={COLORS[idx % COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      name={model.name}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          {/* Recommendations */}
          {comparisonData.recommendations.map((rec, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.1 }}
            >
              <Card className={
                rec.impact === 'high' ? 'border-red-500/50 bg-red-500/5' :
                rec.impact === 'medium' ? 'border-amber-500/50 bg-amber-500/5' :
                'border-blue-500/50 bg-blue-500/5'
              }>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {rec.type === 'cost' && <DollarSign className="h-5 w-5" />}
                    {rec.type === 'performance' && <Gauge className="h-5 w-5" />}
                    {rec.type === 'quality' && <Award className="h-5 w-5" />}
                    {rec.type === 'reliability' && <Shield className="h-5 w-5" />}
                    {rec.title}
                    <Badge variant={
                      rec.impact === 'high' ? 'destructive' :
                      rec.impact === 'medium' ? 'default' :
                      'secondary'
                    }>
                      {rec.impact} impact
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-3">{rec.description}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Recommended models:</span>
                    {rec.models.map(model => (
                      <Badge key={model} variant="outline">{model}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {/* Best Model for Use Case */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Best Model by Use Case
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Cost-Optimized Tasks</div>
                      <div className="text-sm text-muted-foreground">
                        Simple queries, high volume operations
                      </div>
                    </div>
                    <Badge variant="default">
                      {getBestModelForMetric(comparisonData.models, 'costPerToken', true)}
                    </Badge>
                  </div>
                </div>
                
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Real-time Applications</div>
                      <div className="text-sm text-muted-foreground">
                        Low latency requirements
                      </div>
                    </div>
                    <Badge variant="default">
                      {getBestModelForMetric(comparisonData.models, 'avgLatency', true)}
                    </Badge>
                  </div>
                </div>
                
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Quality-Critical Tasks</div>
                      <div className="text-sm text-muted-foreground">
                        Complex reasoning, creative work
                      </div>
                    </div>
                    <Badge variant="default">
                      {getBestModelForMetric(comparisonData.models, 'avgQualityScore', false)}
                    </Badge>
                  </div>
                </div>
                
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Mission-Critical Systems</div>
                      <div className="text-sm text-muted-foreground">
                        High reliability requirements
                      </div>
                    </div>
                    <Badge variant="default">
                      {getBestModelForMetric(comparisonData.models, 'successRate', false)}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper functions
function detectProviderFromModel(model: string): string {
  const modelLower = model.toLowerCase();
  if (modelLower.includes('gpt')) return 'OpenAI';
  if (modelLower.includes('claude')) return 'Anthropic';
  if (modelLower.includes('llama')) return 'Meta';
  if (modelLower.includes('gemini')) return 'Google';
  if (modelLower.includes('mistral')) return 'Mistral';
  return 'Unknown';
}

function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * p) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

function calculateComparisonMetrics(models: ModelStats[]): ComparisonMetrics {
  const metrics: ComparisonMetrics = {
    costEfficiency: {},
    performanceScore: {},
    qualityScore: {},
    reliabilityScore: {},
    overallScore: {}
  };

  // Find min/max for normalization
  const minCost = Math.min(...models.map(m => m.costPerToken));
  const maxCost = Math.max(...models.map(m => m.costPerToken));
  const minLatency = Math.min(...models.map(m => m.avgLatency));
  const maxLatency = Math.max(...models.map(m => m.avgLatency));

  models.forEach(model => {
    // Cost efficiency (inverted - lower is better)
    metrics.costEfficiency[model.name] = maxCost > minCost
      ? ((maxCost - model.costPerToken) / (maxCost - minCost)) * 100
      : 100;

    // Performance score (inverted - lower is better)
    metrics.performanceScore[model.name] = maxLatency > minLatency
      ? ((maxLatency - model.avgLatency) / (maxLatency - minLatency)) * 100
      : 100;

    // Quality score
    metrics.qualityScore[model.name] = model.avgQualityScore * 100;

    // Reliability score
    metrics.reliabilityScore[model.name] = model.successRate;

    // Overall score (weighted average)
    metrics.overallScore[model.name] = (
      metrics.costEfficiency[model.name] * 0.25 +
      metrics.performanceScore[model.name] * 0.25 +
      metrics.qualityScore[model.name] * 0.3 +
      metrics.reliabilityScore[model.name] * 0.2
    );
  });

  return metrics;
}

function calculateCorrelations(models: ModelStats[]): CorrelationData {
  return {
    costVsQuality: models.map(m => ({
      model: m.name,
      cost: m.avgCost,
      quality: m.avgQualityScore
    })),
    latencyVsTokens: models.map(m => ({
      model: m.name,
      latency: m.avgLatency,
      tokens: m.avgTokens
    })),
    costVsLatency: models.map(m => ({
      model: m.name,
      cost: m.avgCost,
      latency: m.avgLatency
    }))
  };
}

function generateRecommendations(
  models: ModelStats[], 
  comparisons: ComparisonMetrics
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Find most cost-effective model
  const costEfficient = Object.entries(comparisons.costEfficiency)
    .sort(([,a], [,b]) => b - a)[0];
  
  if (costEfficient) {
    recommendations.push({
      type: 'cost',
      title: 'Cost Optimization Opportunity',
      description: `Consider using ${costEfficient[0]} for cost-sensitive tasks. It offers ${costEfficient[1].toFixed(0)}% cost efficiency compared to other models.`,
      impact: 'high',
      models: [costEfficient[0]]
    });
  }

  // Find underperforming models
  const poorPerformers = models.filter(m => m.successRate < 90);
  if (poorPerformers.length > 0) {
    recommendations.push({
      type: 'reliability',
      title: 'Reliability Concerns',
      description: `${poorPerformers.map(m => m.name).join(', ')} have success rates below 90%. Consider investigating error patterns or switching models.`,
      impact: 'high',
      models: models.filter(m => m.successRate >= 95).map(m => m.name).slice(0, 3)
    });
  }

  // Latency optimization
  const fastModels = models.filter(m => m.avgLatency < 1000).sort((a, b) => a.avgLatency - b.avgLatency);
  if (fastModels.length > 0) {
    recommendations.push({
      type: 'performance',
      title: 'Speed Optimization',
      description: `For latency-sensitive applications, ${fastModels[0].name} provides the fastest response times at ${fastModels[0].avgLatency.toFixed(0)}ms average.`,
      impact: 'medium',
      models: fastModels.slice(0, 3).map(m => m.name)
    });
  }

  // Quality vs cost trade-off
  const qualityPerDollar = models.map(m => ({
    model: m.name,
    value: m.avgQualityScore / (m.avgCost + 0.001)
  })).sort((a, b) => b.value - a.value);

  if (qualityPerDollar.length > 0) {
    recommendations.push({
      type: 'quality',
      title: 'Best Quality per Dollar',
      description: `${qualityPerDollar[0].model} provides the best quality-to-cost ratio, making it ideal for balanced workloads.`,
      impact: 'medium',
      models: qualityPerDollar.slice(0, 3).map(q => q.model)
    });
  }

  return recommendations;
}

function prepareRadarData(models: ModelStats[], comparisons: ComparisonMetrics): any[] {
  const metrics = [
    { metric: 'Cost Efficiency', key: 'costEfficiency' },
    { metric: 'Performance', key: 'performanceScore' },
    { metric: 'Quality', key: 'qualityScore' },
    { metric: 'Reliability', key: 'reliabilityScore' },
    { metric: 'Overall', key: 'overallScore' }
  ];

  return metrics.map(({ metric, key }) => {
    const data: any = { metric };
    models.forEach(model => {
      data[model.name] = comparisons[key as keyof ComparisonMetrics][model.name] || 0;
    });
    return data;
  });
}

function getBestModelForMetric(models: ModelStats[], metric: keyof ModelStats, ascending: boolean): string {
  const sorted = [...models].sort((a, b) => {
    const aVal = a[metric] as number;
    const bVal = b[metric] as number;
    return ascending ? aVal - bVal : bVal - aVal;
  });
  return sorted[0]?.name || 'N/A';
}