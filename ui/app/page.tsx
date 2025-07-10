'use client';

import { useEffect } from 'react';
import { useMLflowStore } from '@/lib/store/mlflow-store';
import { ExperimentsList } from '@/components/experiments-list';
import { RunsTable } from '@/components/runs-table';
import { MetricsChart } from '@/components/metrics-chart';
import { LLMCostDashboard } from '@/components/llm-cost-dashboard';
import { RunComparison } from '@/components/run-comparison';
import { ModelRegistry } from '@/components/model-registry';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Brain, DollarSign, BarChart, GitCompare, Package } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function DashboardPage() {
  const { initialize, selectedExperiment } = useMLflowStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">MLtrack Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground">
                Modern UI for MLflow Experiment Tracking
              </p>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Experiments Sidebar */}
          <div className="col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Experiments</CardTitle>
                <CardDescription>Select an experiment to view runs</CardDescription>
              </CardHeader>
              <CardContent>
                <ExperimentsList />
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="col-span-9">
            {selectedExperiment ? (
              <Tabs defaultValue="runs" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="runs" className="flex items-center gap-2">
                    <BarChart className="h-4 w-4" />
                    Runs
                  </TabsTrigger>
                  <TabsTrigger value="compare" className="flex items-center gap-2">
                    <GitCompare className="h-4 w-4" />
                    Compare
                  </TabsTrigger>
                  <TabsTrigger value="metrics" className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Metrics
                  </TabsTrigger>
                  <TabsTrigger value="llm-costs" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    LLM Costs
                  </TabsTrigger>
                  <TabsTrigger value="models" className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Models
                  </TabsTrigger>
                  <TabsTrigger value="insights" className="flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Insights
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="runs" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Experiment Runs</CardTitle>
                      <CardDescription>
                        View and compare runs in this experiment
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <RunsTable />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="compare" className="space-y-4">
                  <RunComparison />
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

                <TabsContent value="llm-costs" className="space-y-4">
                  <LLMCostDashboard />
                </TabsContent>

                <TabsContent value="models" className="space-y-4">
                  <ModelRegistry />
                </TabsContent>

                <TabsContent value="insights" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>AI Insights</CardTitle>
                      <CardDescription>
                        Coming soon: AI-powered experiment analysis
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        This feature will provide intelligent insights about your experiments,
                        including performance trends, anomaly detection, and optimization suggestions.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Brain className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Experiment Selected</h3>
                  <p className="text-muted-foreground text-center">
                    Select an experiment from the sidebar to view its runs and metrics
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
