'use client';

import { useRuns, useExperiments } from '@/lib/hooks/use-mlflow';
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
import { CheckCircle, XCircle, Clock, Play, Download, FileJson } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { exportRunsToCSV, exportExperimentSummary } from '@/lib/export-utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { extractRunTags, getRunType, getModelInfo } from '@/lib/utils/mlflow-tags';

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
  const { data: experiments } = useExperiments();
  
  const currentExperiment = experiments?.find(
    exp => exp.experiment_id === selectedExperiment
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

  const handleExportCSV = () => {
    if (runs && currentExperiment) {
      exportRunsToCSV(runs, currentExperiment.name);
    }
  };

  const handleExportJSON = () => {
    if (runs && currentExperiment) {
      exportExperimentSummary(currentExperiment, runs);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {runs.length} runs found
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportJSON}>
              <FileJson className="h-4 w-4 mr-2" />
              Export as JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-md border">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Run ID</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Started</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Metrics</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run, index) => {
            const Icon = StatusIcon[run.info.status as keyof typeof StatusIcon] || Clock;
            const colorClass = StatusColor[run.info.status as keyof typeof StatusColor] || 'text-gray-600';
            const duration = run.info.end_time
              ? `${Math.round((run.info.end_time - run.info.start_time) / 1000)}s`
              : 'Running...';
            const started = formatDistanceToNow(new Date(run.info.start_time), {
              addSuffix: true,
            });

            // Extract model type information from tags using our helper
            const tags = extractRunTags(run);
            const runType = getRunType(tags);
            const { algorithm: modelAlgorithm, framework: modelFramework, task: modelTask } = getModelInfo(tags);

            // Determine run type badge variant
            const getTypeBadgeVariant = (type: string) => {
              switch (type) {
                case 'llm': return 'secondary';
                case 'ml': return 'default';
                default: return 'outline';
              }
            };

            return (
              <TableRow key={run.info.run_id}>
                <TableCell className="font-mono text-sm">
                  {run.info.run_id.slice(0, 8)}...
                </TableCell>
                <TableCell>
                  <Badge variant={getTypeBadgeVariant(runType)} className="text-xs">
                    {runType.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col space-y-1">
                    {modelAlgorithm !== '-' && (
                      <Badge variant="outline" className="text-xs w-fit">
                        {modelAlgorithm}
                      </Badge>
                    )}
                    <div className="flex gap-1">
                      {modelFramework !== '-' && (
                        <span className="text-xs text-muted-foreground">{modelFramework}</span>
                      )}
                      {modelTask !== '-' && (
                        <span className="text-xs text-muted-foreground">• {modelTask}</span>
                      )}
                    </div>
                  </div>
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
                    {Object.entries(run.data.metrics || {}).slice(0, 3).map(([key, value]) => {
                      const displayValue = typeof value === 'object' && value.value !== undefined 
                        ? value.value 
                        : value;
                      return (
                        <Badge key={key} variant="secondary" className="text-xs">
                          {key}: {typeof displayValue === 'number' ? displayValue.toFixed(4) : displayValue}
                        </Badge>
                      );
                    })}
                    {Object.keys(run.data.metrics || {}).length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{Object.keys(run.data.metrics).length - 3} more
                      </Badge>
                    )}
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
    </div>
  );
}