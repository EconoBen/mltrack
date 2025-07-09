'use client';

import { useRuns } from '@/lib/hooks/use-mlflow';
import { useMLflowStore } from '@/lib/store/mlflow-store';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, Clock, Play } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const StatusIcon = {
  FINISHED: CheckCircle,
  FAILED: XCircle,
  RUNNING: Play,
  SCHEDULED: Clock,
};

const StatusColor = {
  FINISHED: 'text-green-600',
  FAILED: 'text-red-600',
  RUNNING: 'text-blue-600',
  SCHEDULED: 'text-yellow-600',
};

export function RunsTable() {
  const { selectedExperiment } = useMLflowStore();
  const { data: runs, isLoading } = useRuns(
    selectedExperiment ? [selectedExperiment] : []
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!runs || runs.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No runs found for this experiment</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Run ID</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Started</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Metrics</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => {
            const Icon = StatusIcon[run.info.status as keyof typeof StatusIcon] || Clock;
            const colorClass = StatusColor[run.info.status as keyof typeof StatusColor] || 'text-gray-600';
            const duration = run.info.end_time
              ? `${Math.round((run.info.end_time - run.info.start_time) / 1000)}s`
              : 'Running...';
            const started = formatDistanceToNow(new Date(run.info.start_time), {
              addSuffix: true,
            });

            return (
              <TableRow key={run.info.run_id}>
                <TableCell className="font-mono text-sm">
                  {run.info.run_id.slice(0, 8)}...
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${colorClass}`} />
                    <span className={`text-sm ${colorClass}`}>
                      {run.info.status}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{started}</TableCell>
                <TableCell className="text-sm">{duration}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(run.data.metrics || {}).slice(0, 3).map(([key, value]) => (
                      <Badge key={key} variant="secondary" className="text-xs">
                        {key}: {typeof value === 'number' ? value.toFixed(4) : value}
                      </Badge>
                    ))}
                    {Object.keys(run.data.metrics || {}).length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{Object.keys(run.data.metrics).length - 3} more
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(run.data.tags || {})
                      .filter(([key]) => !key.startsWith('mlflow.'))
                      .slice(0, 2)
                      .map(([key, value]) => (
                        <Badge key={key} variant="outline" className="text-xs">
                          {key}: {value}
                        </Badge>
                      ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}