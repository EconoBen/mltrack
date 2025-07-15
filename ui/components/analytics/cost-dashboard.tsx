'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Treemap
} from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { MLflowClient } from '@/lib/api/mlflow';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#ec4899', '#f97316'];

interface CostData {
  totalCost: number;
  costByModel: Record<string, number>;
  costByProvider: Record<string, number>;
  costByExperiment: Array<{ name: string; cost: number }>;
  costTimeline: Array<{ date: string; cost: number }>;
  costTrend: number;
}

export function CostDashboard({ experimentIds }: { experimentIds?: string[] }) {
  // Fetch cost analytics data
  const { data: costData, isLoading } = useQuery<CostData>({
    queryKey: ['cost-analytics', experimentIds],
    queryFn: async () => {
      const client = new MLflowClient({ 
        baseUrl: process.env.NEXT_PUBLIC_MLFLOW_URL || '/api/mlflow' 
      });
      
      // Get all runs
      const runs = await client.searchRuns(experimentIds || []);
      
      // Process cost data
      const costByModel: Record<string, number> = {};
      const costByProvider: Record<string, number> = {};
      const costByExperiment: Record<string, number> = {};
      const costByDate: Record<string, number> = {};
      let totalCost = 0;
      
      runs.forEach(run => {
        // Extract cost from metrics (try different possible names)
        const cost = run.data.metrics?.find((m: any) => 
          m.key === 'llm.cost_usd' || 
          m.key === 'llm.total_cost' || 
          m.key === 'llm.conversation.total_cost'
        )?.value || 0;
        
        totalCost += cost;
        
        // Extract model and provider from tags
        const tags = run.data.tags || [];
        const model = tags.find((t: any) => t.key === 'llm.model')?.value || 'Unknown';
        const provider = tags.find((t: any) => t.key === 'llm.provider')?.value || 'Unknown';
        const experimentName = tags.find((t: any) => t.key === 'mlflow.experimentName')?.value || 'Unknown';
        
        // Aggregate by model
        costByModel[model] = (costByModel[model] || 0) + cost;
        
        // Aggregate by provider
        costByProvider[provider] = (costByProvider[provider] || 0) + cost;
        
        // Aggregate by experiment
        costByExperiment[experimentName] = (costByExperiment[experimentName] || 0) + cost;
        
        // Aggregate by date
        const date = format(new Date(run.info.start_time), 'yyyy-MM-dd');
        costByDate[date] = (costByDate[date] || 0) + cost;
      });
      
      // Create timeline data for the last 30 days
      const timeline = [];
      for (let i = 29; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        timeline.push({
          date: format(subDays(new Date(), i), 'MMM dd'),
          cost: costByDate[date] || 0
        });
      }
      
      // Calculate trend (compare last 7 days to previous 7 days)
      const last7Days = timeline.slice(-7).reduce((sum, d) => sum + d.cost, 0);
      const prev7Days = timeline.slice(-14, -7).reduce((sum, d) => sum + d.cost, 0);
      const trend = prev7Days > 0 ? ((last7Days - prev7Days) / prev7Days) * 100 : 0;
      
      // Convert experiment costs to array and sort
      const experimentCosts = Object.entries(costByExperiment)
        .map(([name, cost]) => ({ name, cost }))
        .sort((a, b) => b.cost - a.cost)
        .slice(0, 10); // Top 10 experiments
      
      return {
        totalCost,
        costByModel,
        costByProvider,
        costByExperiment: experimentCosts,
        costTimeline: timeline,
        costTrend: trend
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

  if (!costData) return null;

  // Prepare data for charts
  const modelData = Object.entries(costData.costByModel)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
    
  const providerData = Object.entries(costData.costByProvider)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-4">
      {/* Cost Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Total Cost</span>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">${costData.totalCost.toFixed(2)}</div>
          <div className="flex items-center text-sm text-muted-foreground mt-2">
            {costData.costTrend > 0 ? (
              <TrendingUp className="h-4 w-4 text-red-500 mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 text-green-500 mr-1" />
            )}
            <span className={costData.costTrend > 0 ? 'text-red-500' : 'text-green-500'}>
              {Math.abs(costData.costTrend).toFixed(1)}%
            </span>
            <span className="ml-1">vs last week</span>
          </div>
        </CardContent>
      </Card>

      {/* Cost Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Trend (30 Days)</CardTitle>
          <CardDescription>
            Daily spending on LLM API calls
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={costData.costTimeline}>
              <defs>
                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                formatter={(value: any) => `$${value.toFixed(2)}`}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
              <Area
                type="monotone"
                dataKey="cost"
                stroke="#6366f1"
                fillOpacity={1}
                fill="url(#colorCost)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cost by Model and Provider */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Cost by Model</CardTitle>
            <CardDescription>
              Spending breakdown by AI model
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
                <Tooltip formatter={(value: any) => `$${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cost by Provider</CardTitle>
            <CardDescription>
              Spending breakdown by LLM provider
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={providerData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="name" type="category" className="text-xs" width={80} />
                <Tooltip formatter={(value: any) => `$${value.toFixed(2)}`} />
                <Bar dataKey="value" fill="#10b981" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Expensive Experiments */}
      <Card>
        <CardHeader>
          <CardTitle>Top Experiments by Cost</CardTitle>
          <CardDescription>
            Experiments with highest LLM spending
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {costData.costByExperiment.map((exp, idx) => (
              <div key={exp.name} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium text-muted-foreground">#{idx + 1}</div>
                  <div>
                    <div className="font-medium">{exp.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {((exp.cost / costData.totalCost) * 100).toFixed(1)}% of total
                    </div>
                  </div>
                </div>
                <div className="text-lg font-semibold">${exp.cost.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cost Optimization Tips */}
      {costData.totalCost > 100 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Cost Optimization Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>• Consider using GPT-3.5-turbo for non-critical tasks (70% cheaper than GPT-4)</li>
              <li>• Implement caching for repeated queries to reduce API calls</li>
              <li>• Use streaming responses to reduce time-to-first-token costs</li>
              <li>• Monitor and set budget alerts for experiments</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}