'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Clock, Zap, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DeploymentMetricsProps {
  deployment: {
    model_name: string;
    version: string;
    api?: {
      url: string;
      port: number;
    };
  };
}

interface Metrics {
  latency_p50: number;
  latency_p95: number;
  latency_p99: number;
  requests_per_minute: number;
  error_rate: number;
  uptime_percentage: number;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  avg_tokens_per_request?: number;
  latency_history: Array<{ time: string; value: number }>;
  throughput_history: Array<{ time: string; value: number }>;
}

export function DeploymentMetrics({ deployment }: DeploymentMetricsProps) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, [deployment]);

  const fetchMetrics = async () => {
    try {
      const response = await fetch(`/api/deployments/${deployment.id}/metrics`);
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !metrics) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatLatency = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getHealthStatus = () => {
    if (metrics.error_rate > 0.05) return 'critical';
    if (metrics.error_rate > 0.01) return 'warning';
    return 'healthy';
  };

  const healthColors = {
    healthy: 'text-green-500',
    warning: 'text-yellow-500',
    critical: 'text-red-500',
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.uptime_percentage.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Median Latency</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatLatency(metrics.latency_p50)}</div>
            <p className="text-xs text-muted-foreground">
              P50 response time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Throughput</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.requests_per_minute}</div>
            <p className="text-xs text-muted-foreground">
              Requests per minute
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_requests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Since deployment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics.error_rate * 100).toFixed(2)}%</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={getHealthStatus() === 'healthy' ? 'success' : getHealthStatus() === 'warning' ? 'secondary' : 'destructive'}>
                {getHealthStatus()}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((metrics.successful_requests / metrics.total_requests) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.successful_requests.toLocaleString()} successful
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Latency Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Latency Distribution</CardTitle>
          <CardDescription>Response time percentiles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">P50 (Median)</span>
              <span className="text-sm text-muted-foreground">{formatLatency(metrics.latency_p50)}</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full" 
                style={{ width: `${Math.min((metrics.latency_p50 / metrics.latency_p99) * 100, 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">P95</span>
              <span className="text-sm text-muted-foreground">{formatLatency(metrics.latency_p95)}</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full" 
                style={{ width: `${Math.min((metrics.latency_p95 / metrics.latency_p99) * 100, 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">P99</span>
              <span className="text-sm text-muted-foreground">{formatLatency(metrics.latency_p99)}</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div className="bg-primary h-2 rounded-full" style={{ width: '100%' }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Latency Trend</CardTitle>
            <CardDescription>Response time over the last hour</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.latency_history}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="time" 
                    className="text-xs"
                    stroke="currentColor"
                  />
                  <YAxis 
                    className="text-xs"
                    stroke="currentColor"
                    tickFormatter={(value) => `${value}ms`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Throughput</CardTitle>
            <CardDescription>Requests per minute over the last hour</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.throughput_history}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="time" 
                    className="text-xs"
                    stroke="currentColor"
                  />
                  <YAxis 
                    className="text-xs"
                    stroke="currentColor"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}