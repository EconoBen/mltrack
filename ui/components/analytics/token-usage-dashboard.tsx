'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Scatter, Treemap
} from 'recharts';
import { 
  Coins, TrendingUp, TrendingDown, AlertTriangle, Info,
  DollarSign, Brain, Zap, Package
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { MLflowClient } from '@/lib/api/mlflow';
import { motion } from 'framer-motion';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#ec4899'];

interface TokenUsageData {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  tokensByModel: Record<string, { input: number; output: number; total: number }>;
  tokensByExperiment: Array<{ name: string; tokens: number; cost: number }>;
  tokenTimeline: Array<{ date: string; input: number; output: number; cost: number }>;
  tokenEfficiency: {
    avgTokensPerRun: number;
    avgInputTokens: number;
    avgOutputTokens: number;
    inputOutputRatio: number;
    costPerThousandTokens: number;
  };
  tokenTrend: number;
}

// Token pricing by model (example rates)
const TOKEN_PRICING = {
  'gpt-4': { input: 0.03, output: 0.06 }, // per 1K tokens
  'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'claude-3-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  'llama-3': { input: 0.0001, output: 0.0001 },
  'default': { input: 0.01, output: 0.02 }
};

export function TokenUsageDashboard({ experimentIds }: { experimentIds?: string[] }) {
  const { data: tokenData, isLoading } = useQuery<TokenUsageData>({
    queryKey: ['token-analytics', experimentIds],
    queryFn: async () => {
      const client = new MLflowClient({ 
        baseUrl: process.env.NEXT_PUBLIC_MLFLOW_URL || '/api/mlflow' 
      });
      
      // Get all runs
      const runs = await client.searchRuns(experimentIds || []);
      
      // Process token data
      let totalTokens = 0;
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      const tokensByModel: Record<string, { input: number; output: number; total: number }> = {};
      const tokensByExperiment: Record<string, { tokens: number; cost: number }> = {};
      const tokensByDate: Record<string, { input: number; output: number; cost: number }> = {};
      
      runs.forEach(run => {
        const tags = run.data.tags || [];
        
        // Extract token metrics (based on mltrack's llm.py implementation)
        const inputTokens = run.data.metrics?.find((m: any) => 
          m.key === 'llm.tokens.prompt_tokens' || 
          m.key === 'llm.tokens.input_tokens' ||
          m.key === 'llm.prompt_tokens' ||
          m.key === 'prompt_tokens'
        )?.value || 0;
        
        const outputTokens = run.data.metrics?.find((m: any) => 
          m.key === 'llm.tokens.completion_tokens' || 
          m.key === 'llm.tokens.output_tokens' ||
          m.key === 'llm.completion_tokens' ||
          m.key === 'completion_tokens'
        )?.value || 0;
        
        const totalRunTokens = run.data.metrics?.find((m: any) => 
          m.key === 'llm.tokens.total_tokens' || 
          m.key === 'llm.total_tokens' || 
          m.key === 'total_tokens'
        )?.value || (inputTokens + outputTokens);
        
        totalInputTokens += inputTokens;
        totalOutputTokens += outputTokens;
        totalTokens += totalRunTokens;
        
        // Get model and experiment info
        const model = tags.find((t: any) => t.key === 'llm.model')?.value || 'unknown';
        const experimentName = tags.find((t: any) => t.key === 'mlflow.experimentName')?.value || 'Unknown';
        
        // Calculate cost based on model pricing
        const modelKey = Object.keys(TOKEN_PRICING).find(key => 
          model.toLowerCase().includes(key)
        ) || 'default';
        const pricing = TOKEN_PRICING[modelKey as keyof typeof TOKEN_PRICING];
        const cost = (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output;
        
        // Aggregate by model
        if (!tokensByModel[model]) {
          tokensByModel[model] = { input: 0, output: 0, total: 0 };
        }
        tokensByModel[model].input += inputTokens;
        tokensByModel[model].output += outputTokens;
        tokensByModel[model].total += totalRunTokens;
        
        // Aggregate by experiment
        if (!tokensByExperiment[experimentName]) {
          tokensByExperiment[experimentName] = { tokens: 0, cost: 0 };
        }
        tokensByExperiment[experimentName].tokens += totalRunTokens;
        tokensByExperiment[experimentName].cost += cost;
        
        // Aggregate by date
        const date = format(new Date(run.info.start_time), 'yyyy-MM-dd');
        if (!tokensByDate[date]) {
          tokensByDate[date] = { input: 0, output: 0, cost: 0 };
        }
        tokensByDate[date].input += inputTokens;
        tokensByDate[date].output += outputTokens;
        tokensByDate[date].cost += cost;
      });
      
      // Create timeline data
      const timeline = [];
      for (let i = 29; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        const dayData = tokensByDate[date] || { input: 0, output: 0, cost: 0 };
        timeline.push({
          date: format(subDays(new Date(), i), 'MMM dd'),
          ...dayData
        });
      }
      
      // Calculate efficiency metrics
      const avgTokensPerRun = runs.length > 0 ? totalTokens / runs.length : 0;
      const avgInputTokens = runs.length > 0 ? totalInputTokens / runs.length : 0;
      const avgOutputTokens = runs.length > 0 ? totalOutputTokens / runs.length : 0;
      const inputOutputRatio = totalInputTokens > 0 ? totalOutputTokens / totalInputTokens : 0;
      
      // Calculate total cost
      const totalCost = Object.values(tokensByExperiment).reduce((sum, exp) => sum + exp.cost, 0);
      const costPerThousandTokens = totalTokens > 0 ? (totalCost / (totalTokens / 1000)) : 0;
      
      // Calculate trend
      const last7Days = timeline.slice(-7).reduce((sum, d) => sum + d.input + d.output, 0);
      const prev7Days = timeline.slice(-14, -7).reduce((sum, d) => sum + d.input + d.output, 0);
      const trend = prev7Days > 0 ? ((last7Days - prev7Days) / prev7Days) * 100 : 0;
      
      // Convert experiment data to array
      const experimentArray = Object.entries(tokensByExperiment)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.tokens - a.tokens)
        .slice(0, 10);
      
      return {
        totalTokens,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        tokensByModel,
        tokensByExperiment: experimentArray,
        tokenTimeline: timeline,
        tokenEfficiency: {
          avgTokensPerRun,
          avgInputTokens,
          avgOutputTokens,
          inputOutputRatio,
          costPerThousandTokens
        },
        tokenTrend: trend
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

  if (!tokenData) return null;

  // Prepare data for charts
  const modelData = Object.entries(tokenData.tokensByModel)
    .map(([name, data]) => ({
      name,
      input: data.input,
      output: data.output,
      total: data.total
    }))
    .sort((a, b) => b.total - a.total);

  const inputOutputData = [
    { name: 'Input Tokens', value: tokenData.inputTokens, color: '#6366f1' },
    { name: 'Output Tokens', value: tokenData.outputTokens, color: '#10b981' }
  ];

  return (
    <div className="space-y-4">
      {/* Token Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                Total Tokens
                <Coins className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(tokenData.totalTokens / 1000000).toFixed(2)}M
              </div>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                {tokenData.tokenTrend > 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                )}
                <span className={tokenData.tokenTrend > 0 ? 'text-green-500' : 'text-red-500'}>
                  {Math.abs(tokenData.tokenTrend).toFixed(1)}%
                </span>
                <span className="ml-1">vs last week</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Avg per Run
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(tokenData.tokenEfficiency.avgTokensPerRun).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round(tokenData.tokenEfficiency.avgInputTokens)} in / {Math.round(tokenData.tokenEfficiency.avgOutputTokens)} out
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Input/Output Ratio
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              1:{tokenData.tokenEfficiency.inputOutputRatio.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Output per input token
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Cost per 1K
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${tokenData.tokenEfficiency.costPerThousandTokens.toFixed(3)}
            </div>
            <p className="text-xs text-muted-foreground">
              Average across models
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Token Usage Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Token Usage Over Time</CardTitle>
          <CardDescription>
            Input vs output tokens with cost overlay
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={tokenData.tokenTimeline}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis yAxisId="left" className="text-xs" />
              <YAxis yAxisId="right" orientation="right" className="text-xs" />
              <Tooltip 
                formatter={(value: any, name: string) => {
                  if (name === 'cost') return `$${value.toFixed(2)}`;
                  return `${(value / 1000).toFixed(1)}K`;
                }}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="input"
                stackId="1"
                stroke="#6366f1"
                fill="#6366f1"
                fillOpacity={0.6}
                name="Input Tokens"
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="output"
                stackId="1"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.6}
                name="Output Tokens"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cost"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                name="Cost ($)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Token Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Input vs Output Distribution</CardTitle>
            <CardDescription>
              Token type breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={inputOutputData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {inputOutputData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `${(value / 1000000).toFixed(2)}M tokens`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Progress bars */}
            <div className="space-y-3 mt-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Input Tokens</span>
                  <span>{((tokenData.inputTokens / tokenData.totalTokens) * 100).toFixed(1)}%</span>
                </div>
                <Progress 
                  value={(tokenData.inputTokens / tokenData.totalTokens) * 100} 
                  className="h-2"
                />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Output Tokens</span>
                  <span>{((tokenData.outputTokens / tokenData.totalTokens) * 100).toFixed(1)}%</span>
                </div>
                <Progress 
                  value={(tokenData.outputTokens / tokenData.totalTokens) * 100} 
                  className="h-2 [&>div]:bg-green-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tokens by Model</CardTitle>
            <CardDescription>
              Usage breakdown by AI model
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={modelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="name" type="category" className="text-xs" width={100} />
                <Tooltip 
                  formatter={(value: any) => `${(value / 1000).toFixed(1)}K tokens`}
                />
                <Legend />
                <Bar dataKey="input" stackId="a" fill="#6366f1" name="Input" />
                <Bar dataKey="output" stackId="a" fill="#10b981" name="Output" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Token Consumers */}
      <Card>
        <CardHeader>
          <CardTitle>Top Token Consuming Experiments</CardTitle>
          <CardDescription>
            Experiments with highest token usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {tokenData.tokensByExperiment.map((exp, idx) => (
              <div key={exp.name} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium text-muted-foreground">#{idx + 1}</div>
                  <div>
                    <div className="font-medium">{exp.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {(exp.tokens / 1000).toFixed(0)}K tokens • ${exp.cost.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      {((exp.tokens / tokenData.totalTokens) * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground">of total</div>
                  </div>
                  <Progress 
                    value={(exp.tokens / tokenData.totalTokens) * 100} 
                    className="w-24 h-2"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Token Efficiency Tips */}
      <Card className="border-blue-500/50 bg-blue-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            Token Optimization Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {tokenData.tokenEfficiency.inputOutputRatio > 3 && (
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                <span>Your output/input ratio is {tokenData.tokenEfficiency.inputOutputRatio.toFixed(1)}:1. Consider using more concise prompts to reduce costs.</span>
              </li>
            )}
            {tokenData.tokenEfficiency.avgTokensPerRun > 5000 && (
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                <span>Average tokens per run is high ({Math.round(tokenData.tokenEfficiency.avgTokensPerRun).toLocaleString()}). Consider breaking down long conversations.</span>
              </li>
            )}
            <li className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              <span>Use system prompts efficiently - they're included in every request's token count.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              <span>Implement prompt caching for repeated queries to reduce token usage.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              <span>Consider using smaller models (like GPT-3.5) for simpler tasks to optimize costs.</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}