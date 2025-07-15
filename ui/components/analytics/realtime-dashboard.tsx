'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRealtimeAnalytics } from '@/lib/hooks/use-realtime-analytics';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Activity, Zap, DollarSign, Clock, Wifi, WifiOff,
  TrendingUp, TrendingDown, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

export function RealtimeDashboard() {
  const { isConnected, lastUpdate, recentUpdates } = useRealtimeAnalytics();

  // Transform recent updates for time series charts
  const timeSeriesData = recentUpdates.map(update => ({
    time: format(new Date(update.timestamp), 'HH:mm:ss'),
    activeRuns: update.metrics.activeRuns,
    requestsPerMinute: update.metrics.requestsPerMinute,
    avgLatency: update.metrics.avgLatency,
    cost: update.metrics.recentCost,
  })).reverse();

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Real-time Monitoring</h2>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <Wifi className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-500">Live</span>
              <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-500">Disconnected</span>
            </>
          )}
        </div>
      </div>

      {/* Live Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          key={`active-runs-${lastUpdate?.timestamp}`}
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                Active Runs
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {lastUpdate?.metrics.activeRuns || 0}
              </div>
              <p className="text-xs text-muted-foreground">Currently running</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          key={`requests-${lastUpdate?.timestamp}`}
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                Requests/min
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {lastUpdate?.metrics.requestsPerMinute || 0}
              </div>
              <p className="text-xs text-muted-foreground">Last minute</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          key={`latency-${lastUpdate?.timestamp}`}
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                Avg Latency
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {lastUpdate?.metrics.avgLatency.toFixed(0) || 0}ms
              </div>
              <p className="text-xs text-muted-foreground">Rolling average</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          key={`cost-${lastUpdate?.timestamp}`}
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                Recent Cost
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${lastUpdate?.metrics.recentCost.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">Last 5 minutes</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Live Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Request Volume</CardTitle>
            <CardDescription>
              Live request throughput (updates every 5 seconds)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={timeSeriesData}>
                <defs>
                  <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="time" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="requestsPerMinute"
                  stroke="#6366f1"
                  fillOpacity={1}
                  fill="url(#colorRequests)"
                  animationDuration={300}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latency Trend</CardTitle>
            <CardDescription>
              Real-time latency monitoring
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="time" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="avgLatency"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  animationDuration={300}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Run Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Run Activity</CardTitle>
          <CardDescription>
            Live feed of experiment runs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <AnimatePresence>
              {lastUpdate?.recentRuns.map((run, index) => (
                <motion.div
                  key={run.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                    <div>
                      <div className="font-medium">{run.experimentName}</div>
                      <div className="text-sm text-muted-foreground">
                        {run.model} • {format(new Date(run.timestamp), 'HH:mm:ss')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={run.status === 'FINISHED' ? 'success' : 'destructive'}>
                      {run.status}
                    </Badge>
                    <div className="text-sm">
                      <span className="font-medium">${run.cost.toFixed(2)}</span>
                      <span className="text-muted-foreground"> • </span>
                      <span className="text-muted-foreground">{run.latency.toFixed(0)}ms</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {lastUpdate && lastUpdate.metrics.avgLatency > 800 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600">
                <AlertCircle className="h-5 w-5" />
                Performance Alert
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Average latency is above 800ms. Consider investigating slow endpoints or scaling resources.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}