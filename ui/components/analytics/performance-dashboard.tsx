'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, ReferenceLine
} from 'recharts';
import { Clock, Zap, AlertTriangle, TrendingUp, Activity } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { MLflowClient } from '@/lib/api/mlflow';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6'];

interface PerformanceData {
  avgLatency: number;
  p50Latency: number;
  p90Latency: number;
  p99Latency: number;
  latencyDistribution: Array<{ range: string; count: number }>;
  latencyTimeline: Array<{ date: string; avg: number; p90: number; p99: number }>;
  errorRate: number;
  errorsByType: Record<string, number>;
  throughput: Array<{ hour: number; requests: number }>;
  slowestEndpoints: Array<{ endpoint: string; avgLatency: number; calls: number }>;
}

export function PerformanceDashboard({ experimentIds }: { experimentIds?: string[] }) {
  const { data: performanceData, isLoading } = useQuery<PerformanceData>({
    queryKey: ['performance-analytics', experimentIds],
    queryFn: async () => {
      const client = new MLflowClient({ 
        baseUrl: process.env.NEXT_PUBLIC_MLFLOW_URL || '/api/mlflow' 
      });
      
      // Get all runs
      const runs = await client.searchRuns(experimentIds || []);
      
      // Process performance data
      const latencies: number[] = [];
      const latencyByDate: Record<string, number[]> = {};
      const errorsByType: Record<string, number> = {};
      const throughputByHour: Record<number, number> = {};
      const latencyByEndpoint: Record<string, { total: number; count: number }> = {};
      
      let totalErrors = 0;
      
      runs.forEach(run => {
        // Extract latency metrics
        const latency = run.data.metrics?.find((m: any) => 
          m.key === 'latency_ms' || 
          m.key === 'response_time' || 
          m.key === 'llm.latency'
        )?.value;
        
        if (latency) {
          latencies.push(latency);
          
          // Group by date
          const date = format(new Date(run.info.start_time), 'yyyy-MM-dd');
          if (!latencyByDate[date]) latencyByDate[date] = [];
          latencyByDate[date].push(latency);
          
          // Track by hour for throughput
          const hour = new Date(run.info.start_time).getHours();
          throughputByHour[hour] = (throughputByHour[hour] || 0) + 1;
          
          // Track by endpoint
          const tags = run.data.tags || [];
          const endpoint = tags.find((t: any) => t.key === 'endpoint' || t.key === 'mlflow.source.name')?.value || 'unknown';
          if (!latencyByEndpoint[endpoint]) {
            latencyByEndpoint[endpoint] = { total: 0, count: 0 };
          }
          latencyByEndpoint[endpoint].total += latency;
          latencyByEndpoint[endpoint].count += 1;
        }
        
        // Track errors
        if (run.info.status === 'FAILED') {
          totalErrors++;
          const errorType = run.data.tags?.find((t: any) => t.key === 'error_type')?.value || 'Unknown';
          errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
        }
      });
      
      // Calculate percentiles
      latencies.sort((a, b) => a - b);
      const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
      const p90 = latencies[Math.floor(latencies.length * 0.9)] || 0;
      const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length || 0;
      
      // Create latency distribution
      const distribution = [
        { range: '0-100ms', count: 0 },
        { range: '100-200ms', count: 0 },
        { range: '200-500ms', count: 0 },
        { range: '500-1000ms', count: 0 },
        { range: '1000ms+', count: 0 },
      ];
      
      latencies.forEach(latency => {
        if (latency < 100) distribution[0].count++;
        else if (latency < 200) distribution[1].count++;
        else if (latency < 500) distribution[2].count++;
        else if (latency < 1000) distribution[3].count++;
        else distribution[4].count++;
      });
      
      // Create timeline data
      const timeline = [];
      for (let i = 29; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        const dayLatencies = latencyByDate[date] || [];
        if (dayLatencies.length > 0) {
          dayLatencies.sort((a, b) => a - b);
          timeline.push({
            date: format(subDays(new Date(), i), 'MMM dd'),
            avg: dayLatencies.reduce((a, b) => a + b, 0) / dayLatencies.length,
            p90: dayLatencies[Math.floor(dayLatencies.length * 0.9)] || 0,
            p99: dayLatencies[Math.floor(dayLatencies.length * 0.99)] || 0,
          });
        }
      }
      
      // Create throughput data
      const throughput = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        requests: throughputByHour[i] || 0
      }));
      
      // Get slowest endpoints
      const slowestEndpoints = Object.entries(latencyByEndpoint)
        .map(([endpoint, data]) => ({
          endpoint,
          avgLatency: data.total / data.count,
          calls: data.count
        }))
        .sort((a, b) => b.avgLatency - a.avgLatency)
        .slice(0, 5);
      
      const errorRate = runs.length > 0 ? (totalErrors / runs.length) * 100 : 0;
      
      return {
        avgLatency,
        p50Latency: p50,
        p90Latency: p90,
        p99Latency: p99,
        latencyDistribution: distribution,
        latencyTimeline: timeline,
        errorRate,
        errorsByType,
        throughput,
        slowestEndpoints
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

  if (!performanceData) return null;

  return (
    <div className="space-y-4">
      {/* Latency Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Latency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceData.avgLatency.toFixed(0)}ms</div>
            <p className="text-xs text-muted-foreground">Mean response time</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">P50 Latency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceData.p50Latency.toFixed(0)}ms</div>
            <p className="text-xs text-muted-foreground">Median (50th percentile)</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">P90 Latency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceData.p90Latency.toFixed(0)}ms</div>
            <p className="text-xs text-muted-foreground">90th percentile</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">P99 Latency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{performanceData.p99Latency.toFixed(0)}ms</div>
            <p className="text-xs text-muted-foreground">99th percentile</p>
          </CardContent>
        </Card>
      </div>

      {/* Latency Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Latency Trends</CardTitle>
          <CardDescription>
            Response time percentiles over the last 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData.latencyTimeline}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                formatter={(value: any) => `${value.toFixed(0)}ms`}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="avg" stroke="#6366f1" strokeWidth={2} dot={false} name="Average" />
              <Line type="monotone" dataKey="p90" stroke="#f59e0b" strokeWidth={2} dot={false} name="P90" />
              <Line type="monotone" dataKey="p99" stroke="#ef4444" strokeWidth={2} dot={false} name="P99" />
              <ReferenceLine y={1000} stroke="#ef4444" strokeDasharray="3 3" label="1s threshold" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Latency Distribution and Throughput */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Latency Distribution</CardTitle>
            <CardDescription>
              Response time breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceData.latencyDistribution}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="range" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {performanceData.latencyDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index < 2 ? '#10b981' : index < 3 ? '#f59e0b' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Request Throughput</CardTitle>
            <CardDescription>
              Requests by hour of day (24h)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={performanceData.throughput}>
                <defs>
                  <linearGradient id="colorThroughput" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="hour" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="requests"
                  stroke="#6366f1"
                  fillOpacity={1}
                  fill="url(#colorThroughput)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Error Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Error Analysis</span>
            <Badge variant={performanceData.errorRate < 1 ? 'success' : performanceData.errorRate < 5 ? 'warning' : 'destructive'}>
              {performanceData.errorRate.toFixed(1)}% error rate
            </Badge>
          </CardTitle>
          <CardDescription>
            Breakdown of failures by error type
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(performanceData.errorsByType).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(performanceData.errorsByType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="font-medium">{type}</span>
                  </div>
                  <Badge variant="destructive">{count}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p>No errors detected!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Slowest Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle>Slowest Endpoints</CardTitle>
          <CardDescription>
            Top 5 endpoints by average latency
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {performanceData.slowestEndpoints.map((endpoint, idx) => (
              <div key={endpoint.endpoint} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium text-muted-foreground">#{idx + 1}</div>
                  <div>
                    <div className="font-medium font-mono text-sm">{endpoint.endpoint}</div>
                    <div className="text-sm text-muted-foreground">
                      {endpoint.calls} calls
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">{endpoint.avgLatency.toFixed(0)}ms</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}