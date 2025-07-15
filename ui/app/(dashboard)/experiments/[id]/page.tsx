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
  Home, Play, ArrowLeft, RefreshCw, Download, Share2,
  Package, FolderOpen, Settings
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
          <div className="flex items-start justify-between">
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
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={refetchRuns}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-1" />
                Share
              </Button>
              <Button size="sm" onClick={handleNewRun}>
                <Play className="h-4 w-4 mr-1" />
                New Run
              </Button>
            </div>
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
              <TabsTrigger value="models" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Models
              </TabsTrigger>
              <TabsTrigger value="artifacts" className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Artifacts
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
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

            <TabsContent value="models" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Registered Models</CardTitle>
                  <CardDescription>
                    Models trained in this experiment that have been registered to the model registry
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No models registered from this experiment yet</p>
                    <Button variant="outline" className="mt-4">
                      Register a Model
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="artifacts" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Experiment Artifacts</CardTitle>
                  <CardDescription>
                    Browse and download artifacts from experiment runs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FolderOpen className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">models/</p>
                          <p className="text-sm text-muted-foreground">12 items</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FolderOpen className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">metrics/</p>
                          <p className="text-sm text-muted-foreground">24 items</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FolderOpen className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">plots/</p>
                          <p className="text-sm text-muted-foreground">8 items</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Experiment Settings</CardTitle>
                  <CardDescription>
                    Configure experiment properties and permissions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Experiment Name</h3>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={experiment.name}
                        className="flex-1 px-3 py-2 border rounded-md"
                        readOnly
                      />
                      <Button variant="outline">Edit</Button>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">Description</h3>
                    <textarea 
                      className="w-full px-3 py-2 border rounded-md"
                      rows={3}
                      placeholder="Add a description for this experiment..."
                      defaultValue={experiment.tags?.description || ''}
                    />
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">Lifecycle Stage</h3>
                    <select className="px-3 py-2 border rounded-md">
                      <option value="active">Active</option>
                      <option value="deleted">Deleted</option>
                    </select>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <Button>Save Changes</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
  );
}