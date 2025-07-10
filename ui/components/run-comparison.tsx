'use client';

import { useState } from 'react';
import { useRuns } from '@/lib/hooks/use-mlflow';
import { useMLflowStore } from '@/lib/store/mlflow-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GitBranch, Clock, User, ArrowUpDown, Copy } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export function RunComparison() {
  const { selectedExperiment } = useMLflowStore();
  const { data: runs } = useRuns(selectedExperiment ? [selectedExperiment] : []);
  const [selectedRuns, setSelectedRuns] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'param' | 'metric'>('metric');

  const toggleRunSelection = (runId: string) => {
    const newSelection = new Set(selectedRuns);
    if (newSelection.has(runId)) {
      newSelection.delete(runId);
    } else {
      newSelection.add(runId);
    }
    setSelectedRuns(newSelection);
  };

  const selectedRunsData = runs?.filter(run => selectedRuns.has(run.info.run_id)) || [];

  // Collect all unique metrics and params from selected runs
  const allMetrics = new Set<string>();
  const allParams = new Set<string>();
  
  selectedRunsData.forEach(run => {
    Object.keys(run.data.metrics || {}).forEach(key => allMetrics.add(key));
    Object.keys(run.data.params || {}).forEach(key => allParams.add(key));
  });

  const sortedMetrics = Array.from(allMetrics).sort();
  const sortedParams = Array.from(allParams).sort();

  // Helper to get metric value with comparison
  const getMetricComparison = (metricKey: string) => {
    const values = selectedRunsData
      .map(run => run.data.metrics[metricKey])
      .filter(val => val !== undefined);
    
    if (values.length === 0) return null;
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    
    return { min, max, avg, hasVariance: min !== max };
  };

  return (
    <div className="space-y-6">
      {/* Run Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Runs to Compare</CardTitle>
          <CardDescription>
            Choose 2 or more runs to see a side-by-side comparison
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {runs?.map((run) => {
                const isSelected = selectedRuns.has(run.info.run_id);
                const startTime = formatDistanceToNow(new Date(run.info.start_time), {
                  addSuffix: true,
                });

                return (
                  <div
                    key={run.info.run_id}
                    className={cn(
                      "flex items-center space-x-3 p-3 rounded-lg border transition-colors",
                      isSelected ? "bg-secondary border-primary" : "hover:bg-muted"
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleRunSelection(run.info.run_id)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono">
                          {run.info.run_id.slice(0, 8)}
                        </code>
                        <Badge
                          variant={run.info.status === 'FINISHED' ? 'default' : 'secondary'}
                        >
                          {run.info.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {startTime}
                        </span>
                        {run.data.tags?.['mlflow.user'] && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {run.data.tags['mlflow.user']}
                          </span>
                        )}
                        {run.data.tags?.['mlflow.source.git.commit'] && (
                          <span className="flex items-center gap-1">
                            <GitBranch className="h-3 w-3" />
                            {run.data.tags['mlflow.source.git.commit'].slice(0, 7)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Comparison Table */}
      {selectedRunsData.length >= 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Comparison Results</CardTitle>
                <CardDescription>
                  Comparing {selectedRunsData.length} selected runs
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={sortBy === 'metric' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('metric')}
                >
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  Sort by Metrics
                </Button>
                <Button
                  variant={sortBy === 'param' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('param')}
                >
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  Sort by Params
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 w-[200px]">
                      Property
                    </TableHead>
                    {selectedRunsData.map(run => (
                      <TableHead key={run.info.run_id} className="text-center">
                        <div className="space-y-1">
                          <code className="text-xs">{run.info.run_id.slice(0, 8)}</code>
                          <Badge
                            variant={run.info.status === 'FINISHED' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {run.info.status}
                          </Badge>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Metrics Section */}
                  {sortedMetrics.length > 0 && (
                    <>
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={selectedRunsData.length + 1} className="font-semibold">
                          Metrics
                        </TableCell>
                      </TableRow>
                      {sortedMetrics.map(metricKey => {
                        const comparison = getMetricComparison(metricKey);
                        
                        return (
                          <TableRow key={`metric-${metricKey}`}>
                            <TableCell className="sticky left-0 bg-background z-10 font-mono text-sm">
                              {metricKey}
                            </TableCell>
                            {selectedRunsData.map(run => {
                              const value = run.data.metrics[metricKey];
                              const isMin = comparison && value === comparison.min;
                              const isMax = comparison && value === comparison.max;
                              
                              return (
                                <TableCell key={run.info.run_id} className="text-center">
                                  {value !== undefined ? (
                                    <div className={cn(
                                      "font-mono text-sm p-1 rounded",
                                      isMin && comparison?.hasVariance && "bg-green-500/20 text-green-700 dark:text-green-300",
                                      isMax && comparison?.hasVariance && "bg-red-500/20 text-red-700 dark:text-red-300"
                                    )}>
                                      {typeof value === 'number' ? value.toFixed(4) : value}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })}
                    </>
                  )}

                  {/* Parameters Section */}
                  {sortedParams.length > 0 && (
                    <>
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={selectedRunsData.length + 1} className="font-semibold">
                          Parameters
                        </TableCell>
                      </TableRow>
                      {sortedParams.map(paramKey => (
                        <TableRow key={`param-${paramKey}`}>
                          <TableCell className="sticky left-0 bg-background z-10 font-mono text-sm">
                            {paramKey}
                          </TableCell>
                          {selectedRunsData.map(run => {
                            const value = run.data.params[paramKey];
                            
                            return (
                              <TableCell key={run.info.run_id} className="text-center">
                                {value !== undefined ? (
                                  <code className="text-xs bg-muted px-2 py-1 rounded">
                                    {value}
                                  </code>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </>
                  )}

                  {/* Tags Section */}
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={selectedRunsData.length + 1} className="font-semibold">
                      Run Information
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="sticky left-0 bg-background z-10">Start Time</TableCell>
                    {selectedRunsData.map(run => (
                      <TableCell key={run.info.run_id} className="text-center">
                        <span className="text-sm">
                          {new Date(run.info.start_time).toLocaleString()}
                        </span>
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="sticky left-0 bg-background z-10">Duration</TableCell>
                    {selectedRunsData.map(run => {
                      const duration = run.info.end_time
                        ? run.info.end_time - run.info.start_time
                        : null;
                      
                      return (
                        <TableCell key={run.info.run_id} className="text-center">
                          {duration !== null ? (
                            <span className="text-sm">
                              {(duration / 1000).toFixed(1)}s
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Running</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {selectedRunsData.length < 2 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Copy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Select Runs to Compare</h3>
            <p className="text-muted-foreground">
              Select at least 2 runs from the list above to see a detailed comparison
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}