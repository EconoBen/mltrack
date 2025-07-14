'use client';

import { use, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ChevronDown, ChevronRight, Brain, BarChart, Clock, 
  User, GitBranch, Package, FileText, Settings,
  Download, Copy, ExternalLink, ArrowLeft, FolderOpen,
  File, Activity, TrendingUp, TrendingDown
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { MLflowClient } from '@/lib/api/mlflow';
import { extractRunTags, getRunType, getModelInfo } from '@/lib/utils/mlflow-tags';
import { formatDistanceToNow } from 'date-fns';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface PageProps {
  params: Promise<{ runId: string }>;
}

export default function RunDetailPage({ params }: PageProps) {
  const { runId } = use(params);
  const router = useRouter();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    parameters: true,
    metrics: true,
    tags: false,
    artifacts: false,
  });

  // Fetch run details
  const { data: run, isLoading } = useQuery({
    queryKey: ['run', runId],
    queryFn: async () => {
      const client = new MLflowClient({ baseUrl: process.env.NEXT_PUBLIC_MLFLOW_URL || '/api/mlflow' });
      const response = await fetch(`/api/mlflow/api/2.0/mlflow/runs/get?run_id=${runId}`);
      if (!response.ok) throw new Error('Failed to fetch run');
      const data = await response.json();
      return data.run;
    },
  });

  // Fetch metric history for charts
  const { data: metricHistories } = useQuery({
    queryKey: ['run-metrics-history', runId, run?.data?.metrics],
    queryFn: async () => {
      if (!run?.data?.metrics) return {};
      const client = new MLflowClient({ baseUrl: process.env.NEXT_PUBLIC_MLFLOW_URL || '/api/mlflow' });
      const histories: Record<string, any[]> = {};
      
      // Get history for each metric
      const metricKeys = run.data.metrics?.map((m: any) => m.key) || [];
      await Promise.all(
        metricKeys.map(async (key: string) => {
          try {
            histories[key] = await client.getMetricHistory(runId, key);
          } catch (e) {
            console.error(`Failed to fetch history for metric ${key}`, e);
            histories[key] = [];
          }
        })
      );
      
      return histories;
    },
    enabled: !!run?.data?.metrics,
  });

  // Fetch artifacts list
  const { data: artifacts } = useQuery({
    queryKey: ['run-artifacts', runId],
    queryFn: async () => {
      const client = new MLflowClient({ baseUrl: process.env.NEXT_PUBLIC_MLFLOW_URL || '/api/mlflow' });
      try {
        return await client.listArtifacts(runId);
      } catch (e) {
        console.error('Failed to fetch artifacts', e);
        return { files: [] };
      }
    },
    enabled: !!runId,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownloadArtifact = (runId: string, path: string) => {
    // MLflow artifact download URL
    const downloadUrl = `${process.env.NEXT_PUBLIC_MLFLOW_URL || '/api/mlflow'}/get-artifact?run_id=${runId}&path=${path}`;
    window.open(downloadUrl, '_blank');
  };

  const handleCopyRunId = () => {
    navigator.clipboard.writeText(run.info.run_id);
  };

  const handleOpenInMLflow = () => {
    const mlflowUrl = process.env.NEXT_PUBLIC_MLFLOW_URL?.replace('/api/mlflow', '') || 'http://localhost:5002';
    window.open(`${mlflowUrl}/#/experiments/${run.info.experiment_id}/runs/${run.info.run_id}`, '_blank');
  };

  if (isLoading || !run) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </main>
    );
  }

  const tags = extractRunTags(run);
  const runType = getRunType(tags);
  const modelInfo = getModelInfo(tags);
  const typeIcon = runType === 'llm' ? Brain : BarChart;
  const TypeIcon = typeIcon;

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Experiment
            </Button>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <TypeIcon className={`h-8 w-8 ${runType === 'llm' ? 'text-purple-600' : 'text-blue-600'}`} />
              {run.data.tags?.find((t: any) => t.key === 'mlflow.runName')?.value || run.info.run_id}
            </h1>
            <p className="text-muted-foreground mt-2">
              Run ID: {run.info.run_id}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyRunId}>
              <Copy className="h-4 w-4 mr-1" />
              Copy ID
            </Button>
            <Button variant="outline" size="sm" onClick={handleOpenInMLflow}>
              <ExternalLink className="h-4 w-4 mr-1" />
              Open in MLflow
            </Button>
          </div>
        </div>

        {/* Status and Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge 
                variant={run.info.status === 'FINISHED' ? 'success' : 
                        run.info.status === 'FAILED' ? 'destructive' : 
                        'secondary'}
              >
                {run.info.status}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Duration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {run.info.end_time 
                    ? `${Math.round((run.info.end_time - run.info.start_time) / 1000)}s`
                    : 'Running...'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">User</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">
                  {tags.user?.name || tags.user?.email || run.info.user_id}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Started</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-sm">
                {formatDistanceToNow(new Date(run.info.start_time), { addSuffix: true })}
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="details" className="space-y-4">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="charts">Charts</TabsTrigger>
            <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
            <TabsTrigger value="code">Code</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            {/* Overview Section */}
            <Card>
              <Collapsible open={expandedSections.overview}>
                <CollapsibleTrigger 
                  className="w-full"
                  onClick={() => toggleSection('overview')}
                >
                  <CardHeader className="cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center justify-between">
                      <CardTitle>Overview</CardTitle>
                      {expandedSections.overview ? 
                        <ChevronDown className="h-5 w-5" /> : 
                        <ChevronRight className="h-5 w-5" />
                      }
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium">Model Type:</span>
                        <p className="text-sm text-muted-foreground">{modelInfo.algorithm}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Framework:</span>
                        <p className="text-sm text-muted-foreground">{modelInfo.framework}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Task:</span>
                        <p className="text-sm text-muted-foreground">{modelInfo.task}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Git Commit:</span>
                        <p className="text-sm text-muted-foreground font-mono">
                          {tags.git?.commit?.slice(0, 8) || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Parameters Section */}
            <Card>
              <Collapsible open={expandedSections.parameters}>
                <CollapsibleTrigger 
                  className="w-full"
                  onClick={() => toggleSection('parameters')}
                >
                  <CardHeader className="cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center justify-between">
                      <CardTitle>
                        Parameters 
                        <Badge variant="secondary" className="ml-2">
                          {Object.keys(run.data.params || {}).length}
                        </Badge>
                      </CardTitle>
                      {expandedSections.parameters ? 
                        <ChevronDown className="h-5 w-5" /> : 
                        <ChevronRight className="h-5 w-5" />
                      }
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    <div className="space-y-2">
                      {run.data.params?.map((param: any) => (
                        <div key={param.key} className="flex justify-between py-1 border-b last:border-0">
                          <span className="text-sm font-medium">{param.key}</span>
                          <span className="text-sm text-muted-foreground font-mono">{param.value}</span>
                        </div>
                      ))}
                      {(!run.data.params || run.data.params.length === 0) && (
                        <p className="text-sm text-muted-foreground">No parameters logged</p>
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Metrics Section */}
            <Card>
              <Collapsible open={expandedSections.metrics}>
                <CollapsibleTrigger 
                  className="w-full"
                  onClick={() => toggleSection('metrics')}
                >
                  <CardHeader className="cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center justify-between">
                      <CardTitle>
                        Metrics
                        <Badge variant="secondary" className="ml-2">
                          {Object.keys(run.data.metrics || {}).length}
                        </Badge>
                      </CardTitle>
                      {expandedSections.metrics ? 
                        <ChevronDown className="h-5 w-5" /> : 
                        <ChevronRight className="h-5 w-5" />
                      }
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    <div className="space-y-2">
                      {run.data.metrics?.map((metric: any) => (
                        <div key={metric.key} className="flex justify-between py-1 border-b last:border-0">
                          <span className="text-sm font-medium">{metric.key}</span>
                          <span className="text-sm text-muted-foreground font-mono">
                            {typeof metric.value === 'number' ? metric.value.toFixed(4) : metric.value}
                          </span>
                        </div>
                      ))}
                      {(!run.data.metrics || run.data.metrics.length === 0) && (
                        <p className="text-sm text-muted-foreground">No metrics logged</p>
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Tags Section */}
            <Card>
              <Collapsible open={expandedSections.tags}>
                <CollapsibleTrigger 
                  className="w-full"
                  onClick={() => toggleSection('tags')}
                >
                  <CardHeader className="cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center justify-between">
                      <CardTitle>
                        Tags
                        <Badge variant="secondary" className="ml-2">
                          {run.data.tags?.length || 0}
                        </Badge>
                      </CardTitle>
                      {expandedSections.tags ? 
                        <ChevronDown className="h-5 w-5" /> : 
                        <ChevronRight className="h-5 w-5" />
                      }
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {run.data.tags?.map((tag: any) => (
                        <div key={tag.key} className="flex justify-between py-1 border-b last:border-0">
                          <span className="text-sm font-medium">{tag.key}</span>
                          <span className="text-sm text-muted-foreground font-mono truncate max-w-[50%]">
                            {tag.value}
                          </span>
                        </div>
                      ))}
                      {(!run.data.tags || run.data.tags.length === 0) && (
                        <p className="text-sm text-muted-foreground">No tags</p>
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          </TabsContent>

          <TabsContent value="charts" className="space-y-4">
            {run?.data?.metrics && run.data.metrics.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {run.data.metrics.map((metric: any) => {
                  const history = metricHistories?.[metric.key] || [];
                  const chartData = {
                    labels: history.map((_, idx) => idx.toString()),
                    datasets: [
                      {
                        label: metric.key,
                        data: history.map((h: any) => h.value),
                        borderColor: 'rgb(99, 102, 241)',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        tension: 0.1,
                      },
                    ],
                  };

                  const options = {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                      title: {
                        display: true,
                        text: metric.key,
                      },
                    },
                    scales: {
                      x: {
                        title: {
                          display: true,
                          text: 'Step',
                        },
                      },
                      y: {
                        title: {
                          display: true,
                          text: 'Value',
                        },
                      },
                    },
                  };

                  return (
                    <Card key={metric.key}>
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base">{metric.key}</CardTitle>
                            <CardDescription className="text-sm">
                              Current: {typeof metric.value === 'number' ? metric.value.toFixed(4) : metric.value}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            {history.length > 1 && (
                              <>
                                {history[history.length - 1].value > history[0].value ? (
                                  <TrendingUp className="h-4 w-4 text-green-500" />
                                ) : (
                                  <TrendingDown className="h-4 w-4 text-red-500" />
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          {history.length > 0 ? (
                            <Line data={chartData} options={options} />
                          ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground">
                              <div className="text-center">
                                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>Single value metric</p>
                                <p className="text-2xl font-bold mt-2">
                                  {typeof metric.value === 'number' ? metric.value.toFixed(4) : metric.value}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Metrics Visualization</CardTitle>
                  <CardDescription>
                    No metrics logged for this run
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <BarChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No metrics to display</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="artifacts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Run Artifacts</CardTitle>
                <CardDescription>
                  Files and models logged during this run
                </CardDescription>
              </CardHeader>
              <CardContent>
                {artifacts?.files && artifacts.files.length > 0 ? (
                  <div className="space-y-2">
                    {artifacts.files.map((artifact: any) => {
                      const isDirectory = artifact.is_dir;
                      const Icon = isDirectory ? FolderOpen : 
                                   artifact.path.endsWith('.pkl') || artifact.path.endsWith('.pth') ? Package :
                                   artifact.path.endsWith('.txt') || artifact.path.endsWith('.json') ? FileText : 
                                   File;
                      
                      return (
                        <div key={artifact.path} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                          <div className="flex items-center gap-2">
                            <Icon className="h-5 w-5 text-muted-foreground" />
                            <span className="font-mono text-sm">{artifact.path}</span>
                            {artifact.file_size && (
                              <span className="text-xs text-muted-foreground">
                                ({formatFileSize(artifact.file_size)})
                              </span>
                            )}
                          </div>
                          {!isDirectory && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDownloadArtifact(runId, artifact.path)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No artifacts logged for this run</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="code" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Source Code</CardTitle>
                <CardDescription>
                  Code version and environment information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Git Information</h4>
                    <div className="space-y-1 text-sm">
                      <div>Branch: <span className="font-mono">{tags.git?.branch || 'N/A'}</span></div>
                      <div>Commit: <span className="font-mono">{tags.git?.commit || 'N/A'}</span></div>
                      <div>Dirty: <span className="font-mono">{tags.git?.dirty || 'N/A'}</span></div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Entry Point</h4>
                    <pre className="bg-muted p-3 rounded text-sm">
{run.data.tags?.find((t: any) => t.key === 'mlflow.source.name')?.value || 'Not specified'}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}