'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useExperiments } from '@/lib/hooks/use-mlflow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart, Brain, Sparkles, Clock, Activity, TrendingUp,
  Play, CheckCircle, XCircle, ArrowRight, Filter
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { MLflowClient } from '@/lib/api/mlflow';
import { useMLflowStore } from '@/lib/store/mlflow-store';
import { useRouter } from 'next/navigation';
import { ExperimentsTable } from './experiments-table';
import { ViewSwitcher, type ViewMode } from './view-switcher';

interface ExperimentCardProps {
  experiment: any;
  onSelect: (experimentId: string) => void;
}

function ExperimentCard({ experiment, onSelect }: ExperimentCardProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['experiment-stats', experiment.experiment_id],
    queryFn: async () => {
      const client = new MLflowClient({ baseUrl: process.env.NEXT_PUBLIC_MLFLOW_URL || '/api/mlflow' });
      return client.getExperimentStats(experiment.experiment_id);
    },
  });

  const typeConfig = {
    ml: { 
      icon: BarChart, 
      label: 'Machine Learning', 
      className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
      iconClass: 'text-blue-600 dark:text-blue-400'
    },
    llm: { 
      icon: Brain, 
      label: 'Large Language Model', 
      className: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
      iconClass: 'text-purple-600 dark:text-purple-400'
    },
    mixed: { 
      icon: Sparkles, 
      label: 'Mixed ML/LLM', 
      className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
      iconClass: 'text-amber-600 dark:text-amber-400'
    },
  };

  const config = stats ? typeConfig[stats.type] : typeConfig.ml;
  const Icon = config.icon;

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const lastUpdated = stats?.lastRunTime 
    ? formatDistanceToNow(new Date(stats.lastRunTime), { addSuffix: true })
    : 'No runs yet';

  return (
    <Card className={`h-full hover:shadow-lg transition-shadow cursor-pointer ${config.className}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Icon className={`h-5 w-5 ${config.iconClass}`} />
              {experiment.name}
            </CardTitle>
            <CardDescription className="mt-1">
              {config.label} • Updated {lastUpdated}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats && (
          <>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{stats.totalRuns}</div>
                <div className="text-xs text-muted-foreground">Total Runs</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {stats.completedRuns}
                </div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {stats.failedRuns}
                </div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
            </div>

            {stats.activeRuns > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4 text-green-500 animate-pulse" />
                <span className="text-green-600 dark:text-green-400">
                  {stats.activeRuns} run{stats.activeRuns !== 1 ? 's' : ''} in progress
                </span>
              </div>
            )}
          </>
        )}

        <Button 
          className="w-full" 
          variant="secondary"
          onClick={() => onSelect(experiment.experiment_id)}
        >
          View Details
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

export function DashboardOverview() {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: experiments, isLoading } = useExperiments();
  const { selectExperiment } = useMLflowStore();
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  
  const handleExperimentSelect = (experimentId: string) => {
    router.push(`/experiments/${experimentId}`);
  };

  // Separate experiments by type
  const experimentsByType = experiments?.reduce((acc, exp) => {
    // We'll fetch the type for each experiment
    return acc;
  }, { ml: [], llm: [], mixed: [] } as Record<string, any[]>) || { ml: [], llm: [], mixed: [] };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!experiments || experiments.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Activity className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Experiments Found</h3>
          <p className="text-muted-foreground text-center">
            Start tracking your ML experiments to see them here
          </p>
        </CardContent>
      </Card>
    );
  }

  // Summary stats
  const totalExperiments = experiments.length;
  const activeExperiments = experiments.filter(e => e.lifecycle_stage !== 'deleted').length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Experiments</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExperiments}</div>
            <p className="text-xs text-muted-foreground">
              {activeExperiments} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ML Experiments</CardTitle>
            <BarChart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {experiments.filter(e => e.name.includes('fraud') || e.name.includes('revenue') || e.name.includes('customer')).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Traditional ML models
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">LLM Experiments</CardTitle>
            <Brain className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {experiments.filter(e => e.name.includes('llm')).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Language model tracking
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Today</div>
            <p className="text-xs text-muted-foreground">
              Last experiment update
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Experiments Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">All Experiments</h2>
          <div className="flex items-center gap-2">
            <ViewSwitcher value={viewMode} onChange={setViewMode} />
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Experiments</TabsTrigger>
            <TabsTrigger value="ml" className="flex items-center gap-2">
              <BarChart className="h-4 w-4" />
              ML Only
            </TabsTrigger>
            <TabsTrigger value="llm" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              LLM Only
            </TabsTrigger>
            {session && (
              <TabsTrigger value="mine" className="flex items-center gap-2">
                My Experiments
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {viewMode === 'table' ? (
              <ExperimentsTable experiments={experiments} isLoading={isLoading} />
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {experiments.map((experiment) => (
                  <ExperimentCard
                    key={experiment.experiment_id}
                    experiment={experiment}
                    onSelect={handleExperimentSelect}
                  />
                ))}
              </div>
            ) : (
              // Compact view - simple list
              <div className="space-y-2">
                {experiments.map((experiment) => (
                  <Card 
                    key={experiment.experiment_id} 
                    className="p-4 cursor-pointer hover:bg-muted/50"
                    onClick={() => handleExperimentSelect(experiment.experiment_id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <BarChart className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{experiment.name}</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ml" className="space-y-4">
            {viewMode === 'table' ? (
              <ExperimentsTable 
                experiments={experiments.filter(e => !e.name.includes('llm'))} 
                isLoading={isLoading} 
              />
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {experiments
                  .filter(e => !e.name.includes('llm'))
                  .map((experiment) => (
                    <ExperimentCard
                      key={experiment.experiment_id}
                      experiment={experiment}
                      onSelect={handleExperimentSelect}
                    />
                  ))}
              </div>
            ) : (
              <div className="space-y-2">
                {experiments
                  .filter(e => !e.name.includes('llm'))
                  .map((experiment) => (
                    <Card 
                      key={experiment.experiment_id} 
                      className="p-4 cursor-pointer hover:bg-muted/50"
                      onClick={() => handleExperimentSelect(experiment.experiment_id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <BarChart className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">{experiment.name}</span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="llm" className="space-y-4">
            {viewMode === 'table' ? (
              <ExperimentsTable 
                experiments={experiments.filter(e => e.name.includes('llm'))} 
                isLoading={isLoading} 
              />
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {experiments
                  .filter(e => e.name.includes('llm'))
                  .map((experiment) => (
                    <ExperimentCard
                      key={experiment.experiment_id}
                      experiment={experiment}
                      onSelect={handleExperimentSelect}
                    />
                  ))}
              </div>
            ) : (
              <div className="space-y-2">
                {experiments
                  .filter(e => e.name.includes('llm'))
                  .map((experiment) => (
                    <Card 
                      key={experiment.experiment_id} 
                      className="p-4 cursor-pointer hover:bg-muted/50"
                      onClick={() => handleExperimentSelect(experiment.experiment_id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Brain className="h-4 w-4 text-purple-600" />
                          <span className="font-medium">{experiment.name}</span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>

          {session && (
            <TabsContent value="mine" className="space-y-4">
              <div className="text-center text-muted-foreground py-8">
                <p>User-specific filtering will be available once experiments are associated with users.</p>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}