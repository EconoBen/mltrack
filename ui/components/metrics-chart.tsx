'use client';

import { useState } from 'react';
import { useRuns } from '@/lib/hooks/use-mlflow';
import { useMLflowStore } from '@/lib/store/mlflow-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, BarChart3 } from 'lucide-react';

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3">
        <p className="font-medium">{`Run: ${label}`}</p>
        <p className="text-sm text-muted-foreground">
          {`${payload[0].name}: ${typeof payload[0].value === 'number' ? payload[0].value.toFixed(4) : payload[0].value}`}
        </p>
      </div>
    );
  }
  return null;
};

export function MetricsChart() {
  const { selectedExperiment } = useMLflowStore();
  const { data: runs } = useRuns(selectedExperiment ? [selectedExperiment] : []);
  const [selectedMetric, setSelectedMetric] = useState<string>('');

  // Extract all unique metrics
  const allMetrics = new Set<string>();
  runs?.forEach((run) => {
    Object.keys(run.data.metrics || {}).forEach((metric) => {
      allMetrics.add(metric);
    });
  });

  const metricsList = Array.from(allMetrics).sort();

  // Prepare data for charts
  const chartData = runs?.map((run) => {
    // Handle both simple values and object metrics
    const metricValue = run.data.metrics[selectedMetric];
    const value = typeof metricValue === 'object' && metricValue !== null 
      ? metricValue.value || 0 
      : metricValue || 0;
    
    return {
      runId: run.info.run_id.slice(0, 8),
      value: value,
      status: run.info.status,
    };
  }) || [];

  // Time series data (for runs that have timestamps)
  const timeSeriesData = runs
    ?.filter((run) => run.info.start_time)
    .map((run) => {
      const metricValue = run.data.metrics[selectedMetric];
      const value = typeof metricValue === 'object' && metricValue !== null 
        ? metricValue.value || 0 
        : metricValue || 0;
      
      return {
        time: new Date(run.info.start_time).toLocaleString(),
        value: value,
        runId: run.info.run_id.slice(0, 8),
      };
    })
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()) || [];

  if (!runs || runs.length === 0) {
    return (
      <div className="text-center py-8">
        <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground">No metrics to visualize</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Select value={selectedMetric} onValueChange={setSelectedMetric}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Select a metric to visualize" />
          </SelectTrigger>
          <SelectContent>
            {metricsList.map((metric) => (
              <SelectItem key={metric} value={metric}>
                {metric}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedMetric && (
        <Tabs defaultValue="comparison" className="space-y-4">
          <TabsList>
            <TabsTrigger value="comparison">Run Comparison</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="comparison">
            <Card>
              <CardHeader>
                <CardTitle>Run Comparison</CardTitle>
                <CardDescription>
                  Compare {selectedMetric} across different runs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="runId" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="value" fill="#8884d8" name={selectedMetric} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle>Metric Timeline</CardTitle>
                <CardDescription>
                  Track {selectedMetric} over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#8884d8"
                      name={selectedMetric}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}