'use client';

import { useExperiments } from '@/lib/hooks/use-mlflow';
import { useMLflowStore } from '@/lib/store/mlflow-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Folder, RefreshCw, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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
                    <span className="font-medium truncate">
                      {experiment.name}
                    </span>
                    {experiment.lifecycle_stage === 'deleted' && (
                      <Badge variant="destructive" className="text-xs">
                        Deleted
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{lastUpdated}</span>
                  </div>
                  {experiment.tags && Object.keys(experiment.tags).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.entries(experiment.tags).slice(0, 3).map(([key, value]) => (
                        <Badge key={key} variant="outline" className="text-xs">
                          {key}: {value}
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