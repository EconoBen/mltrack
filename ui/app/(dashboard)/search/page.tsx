'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MLflowClient } from '@/lib/api/mlflow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  FlaskConical,
  Activity,
  Brain,
  TrendingUp,
  Tag,
  User,
  FileText,
  Filter,
  ChevronRight,
  Calendar,
  Clock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [activeTab, setActiveTab] = useState('all');

  // Update query when URL changes
  useEffect(() => {
    const urlQuery = searchParams.get('q');
    if (urlQuery) {
      setQuery(urlQuery);
    }
  }, [searchParams]);

  // Search query
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['search-results', query],
    queryFn: async () => {
      if (!query || query.length < 2) return null;

      const client = new MLflowClient({ 
        baseUrl: process.env.NEXT_PUBLIC_MLFLOW_URL || '/api/mlflow' 
      });

      const results = {
        experiments: [] as any[],
        runs: [] as any[],
        models: [] as any[],
        metrics: [] as any[],
        tags: [] as any[],
        users: [] as any[],
      };

      const searchLower = query.toLowerCase();

      try {
        // Search experiments
        const experiments = await client.searchExperiments();
        results.experiments = experiments.filter(exp => 
          exp.name.toLowerCase().includes(searchLower) ||
          exp.experiment_id.includes(searchLower)
        );

        // Search runs
        const allRuns = await client.searchRuns(
          experiments.map(e => e.experiment_id)
        );
        
        results.runs = allRuns.filter(run => {
          // Search in run ID
          if (run.info.run_id.toLowerCase().includes(searchLower)) return true;
          
          // Search in tags
          const matchingTags = Object.entries(run.data.tags || {}).some(
            ([key, value]) => 
              key.toLowerCase().includes(searchLower) || 
              value.toLowerCase().includes(searchLower)
          );
          
          // Search in metrics
          const matchingMetrics = Object.keys(run.data.metrics || {}).some(
            metricName => metricName.toLowerCase().includes(searchLower)
          );
          
          return matchingTags || matchingMetrics;
        });

        // Extract unique models, metrics, tags, and users
        const modelSet = new Set<string>();
        const metricSet = new Set<string>();
        const tagSet = new Set<string>();
        const userSet = new Set<string>();

        allRuns.forEach(run => {
          // Models
          const modelName = run.data.tags?.['mlflow.source.name'] || 
                           run.data.tags?.['model.name'] ||
                           run.data.tags?.['llm.model'];
          if (modelName && modelName.toLowerCase().includes(searchLower)) {
            modelSet.add(modelName);
          }

          // Metrics
          Object.keys(run.data.metrics || {}).forEach(metricName => {
            if (metricName.toLowerCase().includes(searchLower)) {
              metricSet.add(metricName);
            }
          });

          // Tags
          Object.entries(run.data.tags || {}).forEach(([key, value]) => {
            if (key.toLowerCase().includes(searchLower) || value.toLowerCase().includes(searchLower)) {
              tagSet.add(`${key}=${value}`);
            }
          });

          // Users
          const userId = run.data.tags?.['mltrack.user.id'] || run.data.tags?.['mlflow.user'];
          if (userId && userId.toLowerCase().includes(searchLower)) {
            userSet.add(userId);
          }
        });

        results.models = Array.from(modelSet).map(name => ({ name }));
        results.metrics = Array.from(metricSet).map(name => ({ name }));
        results.tags = Array.from(tagSet).map(tag => {
          const [key, value] = tag.split('=');
          return { key, value };
        });
        results.users = Array.from(userSet).map(id => ({ id }));

      } catch (error) {
        console.error('Search error:', error);
      }

      return results;
    },
    enabled: query.length >= 2,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  const totalResults = searchResults
    ? Object.values(searchResults).reduce((sum, arr) => sum + arr.length, 0)
    : 0;

  const getTabCount = (tab: string) => {
    if (!searchResults) return 0;
    if (tab === 'all') return totalResults;
    return searchResults[tab as keyof typeof searchResults]?.length || 0;
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Search Header */}
        <div>
          <h1 className="text-3xl font-bold mb-4">Search Results</h1>
          <form onSubmit={handleSearch} className="flex gap-2 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search experiments, runs, models, metrics..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
          {query && totalResults > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              Found {totalResults} results for "{query}"
            </p>
          )}
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !searchResults || totalResults === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                {query ? `No results found for "${query}"` : 'Enter a search query'}
              </h3>
              <p className="text-muted-foreground">
                {query 
                  ? 'Try different keywords or check your spelling'
                  : 'Search for experiments, runs, models, metrics, and more'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">
                All ({getTabCount('all')})
              </TabsTrigger>
              <TabsTrigger value="experiments">
                Experiments ({getTabCount('experiments')})
              </TabsTrigger>
              <TabsTrigger value="runs">
                Runs ({getTabCount('runs')})
              </TabsTrigger>
              <TabsTrigger value="models">
                Models ({getTabCount('models')})
              </TabsTrigger>
              <TabsTrigger value="metrics">
                Metrics ({getTabCount('metrics')})
              </TabsTrigger>
              <TabsTrigger value="users">
                Users ({getTabCount('users')})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-6">
              {/* Experiments */}
              {searchResults.experiments.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <FlaskConical className="h-5 w-5" />
                    Experiments
                  </h2>
                  <div className="space-y-2">
                    {searchResults.experiments.slice(0, 5).map(exp => (
                      <Card 
                        key={exp.experiment_id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => router.push(`/experiments/${exp.experiment_id}`)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium">{exp.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                Created {formatDistanceToNow(new Date(exp.creation_time))} ago
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Runs */}
              {searchResults.runs.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Runs
                  </h2>
                  <div className="space-y-2">
                    {searchResults.runs.slice(0, 5).map(run => (
                      <Card 
                        key={run.info.run_id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => router.push(`/experiments/${run.info.experiment_id}/runs/${run.info.run_id}`)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium font-mono">
                                {run.info.run_id.slice(0, 8)}...
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant={run.info.status === 'FINISHED' ? 'default' : 'secondary'}>
                                  {run.info.status}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {formatDistanceToNow(new Date(run.info.start_time))} ago
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Models */}
              {searchResults.models.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Models
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {searchResults.models.map(model => (
                      <Card 
                        key={model.name}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <CardContent className="p-4">
                          <h3 className="font-medium">{model.name}</h3>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Individual tabs */}
            <TabsContent value="experiments" className="space-y-2">
              {searchResults.experiments.map(exp => (
                <Card 
                  key={exp.experiment_id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => router.push(`/experiments/${exp.experiment_id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{exp.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          ID: {exp.experiment_id} • Created {formatDistanceToNow(new Date(exp.creation_time))} ago
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="runs" className="space-y-2">
              {searchResults.runs.map(run => (
                <Card 
                  key={run.info.run_id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => router.push(`/experiments/${run.info.experiment_id}/runs/${run.info.run_id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium font-mono">{run.info.run_id}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <Badge variant={run.info.status === 'FINISHED' ? 'default' : 'secondary'}>
                            {run.info.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            <Clock className="inline h-3 w-3 mr-1" />
                            {formatDistanceToNow(new Date(run.info.start_time))} ago
                          </span>
                          {run.info.end_time && (
                            <span className="text-sm text-muted-foreground">
                              Duration: {Math.round((run.info.end_time - run.info.start_time) / 1000)}s
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="models" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {searchResults.models.map(model => (
                <Card key={model.name}>
                  <CardContent className="p-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      {model.name}
                    </h3>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="metrics" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {searchResults.metrics.map(metric => (
                <Card key={metric.name}>
                  <CardContent className="p-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      {metric.name}
                    </h3>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="users" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {searchResults.users.map(user => (
                <Card key={user.id}>
                  <CardContent className="p-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {user.id}
                    </h3>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </main>
  );
}