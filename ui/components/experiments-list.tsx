'use client';

import { useExperiments } from '@/lib/hooks/use-mlflow';
import { useMLflowStore } from '@/lib/store/mlflow-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Folder, RefreshCw, Clock, Brain, BarChart, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { MLflowClient } from '@/lib/api/mlflow';

// Component to show experiment type
function ExperimentTypeBadge({ experimentId }: { experimentId: string }) {
  const { data: stats } = useQuery({
    queryKey: ['experiment-stats', experimentId],
    queryFn: async () => {
      const client = new MLflowClient({ baseUrl: process.env.NEXT_PUBLIC_MLFLOW_URL || '/api/mlflow' });
      return client.getExperimentStats(experimentId);
    },
  });

  if (!stats) return null;

  const typeConfig = {
    ml: { icon: BarChart, label: 'ML', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
    llm: { icon: Brain, label: 'LLM', className: 'bg-purple-500/10 text-purple-700 dark:text-purple-400' },
    mixed: { icon: Sparkles, label: 'Mixed', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  };

  const config = typeConfig[stats.type];
  const Icon = config.icon;

  return (
    <Badge variant="secondary" className={`text-xs ${config.className}`}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}

export function ExperimentsList() {
  const { data: experiments, isLoading, refetch } = useExperiments();
  const { selectedExperiment, selectExperiment } = useMLflowStore();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!experiments || experiments.length === 0) {
    return (
      <div className="text-center py-8">
        <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No experiments found</p>
        <p className="text-xs text-muted-foreground mt-2">
          Make sure MLflow server is running
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => refetch()}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">
          {experiments.length} experiments
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => refetch()}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="h-[600px]">
        <div className="space-y-2">
          {experiments.map((experiment) => {
            const isSelected = selectedExperiment === experiment.experiment_id;
            const lastUpdated = formatDistanceToNow(
              new Date(experiment.last_update_time),
              { addSuffix: true }
            );

            return (
              <Button
                key={experiment.experiment_id}
                variant={isSelected ? 'secondary' : 'ghost'}
                className="w-full justify-start text-left p-3 h-auto"
                onClick={() => selectExperiment(experiment.experiment_id)}
              >
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate flex-1">
                      {experiment.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <ExperimentTypeBadge experimentId={experiment.experiment_id} />
                      {experiment.lifecycle_stage === 'deleted' && (
                        <Badge variant="destructive" className="text-xs">
                          Deleted
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{lastUpdated}</span>
                  </div>
                  {experiment.tags && Object.keys(experiment.tags).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.entries(experiment.tags).slice(0, 3).map(([key, value]) => (
                        <Badge key={key} variant="outline" className="text-xs">
                          {key}: {typeof value === 'object' ? JSON.stringify(value) : value}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </Button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}