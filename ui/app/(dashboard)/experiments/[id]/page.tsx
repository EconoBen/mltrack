'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useMLflowStore } from '@/lib/store/mlflow-store';
import { useExperimentType, useRuns } from '@/lib/hooks/use-mlflow';
import { RunsTable } from '@/components/runs-table';
import { MetricsChart } from '@/components/metrics-chart';
import { LLMCostDashboard } from '@/components/llm-cost-dashboard';
import { RunComparison } from '@/components/run-comparison';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/breadcrumb';
import { 
  Activity, Brain, DollarSign, BarChart, GitCompare, 
  Home, Play, ArrowLeft, RefreshCw, Download, Share2
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { MLflowClient } from '@/lib/api/mlflow';
import { useEffect } from 'react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ExperimentDetailPage({ params }: PageProps) {
  const { id: experimentId } = use(params);
  const router = useRouter();
  const { selectExperiment } = useMLflowStore();
  const { data: experimentType } = useExperimentType(experimentId);
  const { data: runs, refetch: refetchRuns } = useRuns([experimentId]);
  
  // Get experiment details
  const { data: experiment } = useQuery({
    queryKey: ['experiment', experimentId],
    queryFn: async () => {
      const client = new MLflowClient({ baseUrl: process.env.NEXT_PUBLIC_MLFLOW_URL || '/api/mlflow' });
      return client.getExperiment(experimentId);
    },
  });

  // Get experiment stats
  const { data: stats } = useQuery({
    queryKey: ['experiment-stats', experimentId],
    queryFn: async () => {
      const client = new MLflowClient({ baseUrl: process.env.NEXT_PUBLIC_MLFLOW_URL || '/api/mlflow' });
      return client.getExperimentStats(experimentId);
    },
  });

  // Update store when component mounts
  useEffect(() => {
    selectExperiment(experimentId);
    return () => selectExperiment(null);
  }, [experimentId, selectExperiment]);

  const handleNewRun = () => {
    // TODO: Implement new run functionality
    console.log('New run');
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export');
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    console.log('Share');
  };

  if (!experiment) {
    return <div>Loading...</div>;
  }

  return (
    <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Experiment Header */}
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              {experimentType === 'llm' && <Brain className="h-8 w-8 text-purple-600" />}
              {experimentType === 'ml' && <BarChart className="h-8 w-8 text-blue-600" />}
              {experiment.name}
            </h1>
            <p className="text-muted-foreground mt-2">
              {experiment.tags?.description || 'No description available'}
            </p>
          </div>

          {/* Stats Overview */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalRuns}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.activeRuns > 0 && `${stats.activeRuns} active`}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {stats.totalRuns > 0 
                      ? Math.round((stats.completedRuns / stats.totalRuns) * 100) 
                      : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats.completedRuns} completed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Failed Runs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{stats.failedRuns}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalRuns > 0 
                      ? `${Math.round((stats.failedRuns / stats.totalRuns) * 100)}% failure rate`
                      : 'No runs yet'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Experiment Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold capitalize">{experimentType || 'ML'}</div>
                  <p className="text-xs text-muted-foreground">
                    {experimentType === 'llm' ? 'Language Model' : 
                     experimentType === 'mixed' ? 'ML + LLM' : 'Machine Learning'}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="runs" className="space-y-4">
            <TabsList>
              <TabsTrigger value="runs" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Runs
              </TabsTrigger>
              <TabsTrigger value="metrics" className="flex items-center gap-2">
                <BarChart className="h-4 w-4" />
                Metrics
              </TabsTrigger>
              <TabsTrigger value="compare" className="flex items-center gap-2">
                <GitCompare className="h-4 w-4" />
                Compare
              </TabsTrigger>
              {(experimentType === 'llm' || experimentType === 'mixed') && (
                <TabsTrigger value="llm-costs" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  LLM Costs
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="runs" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Experiment Runs</CardTitle>
                  <CardDescription>
                    All runs for this experiment with their parameters and metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RunsTable />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="metrics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Metrics Visualization</CardTitle>
                  <CardDescription>
                    Track metrics over time and across runs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MetricsChart />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="compare" className="space-y-4">
              <RunComparison />
            </TabsContent>

            {(experimentType === 'llm' || experimentType === 'mixed') && (
              <TabsContent value="llm-costs" className="space-y-4">
                <LLMCostDashboard />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>
  );
}