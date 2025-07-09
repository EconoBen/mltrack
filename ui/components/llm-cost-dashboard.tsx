'use client';

import { useLLMCostAnalysis } from '@/lib/hooks/use-mlflow';
import { useMLflowStore } from '@/lib/store/mlflow-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, Zap, Brain } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function LLMCostDashboard() {
  const { selectedExperiment } = useMLflowStore();
  const { data: costAnalysis, isLoading } = useLLMCostAnalysis(
    selectedExperiment ? [selectedExperiment] : []
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!costAnalysis) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Brain className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No LLM Usage Data</h3>
          <p className="text-muted-foreground text-center">
            This experiment doesn't contain any LLM tracking data
          </p>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for charts
  const modelData = Object.entries(costAnalysis.byModel).map(([model, cost]) => ({
    name: model,
    value: cost,
  }));

  const providerData = Object.entries(costAnalysis.byProvider).map(([provider, cost]) => ({
    name: provider,
    value: cost,
  }));

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${costAnalysis.totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Across all LLM API calls
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Models Used</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(costAnalysis.byModel).length}</div>
            <p className="text-xs text-muted-foreground">
              Different models tracked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Providers</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(costAnalysis.byProvider).length}</div>
            <p className="text-xs text-muted-foreground">
              LLM providers used
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Cost by Model</CardTitle>
            <CardDescription>
              Breakdown of costs across different models
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={modelData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {modelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cost by Provider</CardTitle>
            <CardDescription>
              Compare costs across LLM providers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={providerData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                <Bar dataKey="value" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Cost Breakdown</CardTitle>
          <CardDescription>
            Individual model costs and usage statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(costAnalysis.byModel).map(([model, cost]) => (
              <div key={model} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="font-medium">{model}</span>
                </div>
                <span className="text-lg font-semibold">${cost.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}