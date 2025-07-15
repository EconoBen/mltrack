'use client';

import React, { useState } from 'react';
import { useExperiments } from '@/lib/hooks/use-mlflow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb } from '@/components/breadcrumb';
import { ModelTypeFilter } from '@/components/model-type-filter';
import { UserFilter } from '@/components/user-filter';
import { 
  Activity, Search, Filter, Grid3X3, List, Calendar,
  BarChart, Brain, Sparkles, Home, RefreshCw
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { MLflowClient } from '@/lib/api/mlflow';
import { useUsers } from '@/lib/hooks/use-users';

type ViewMode = 'grid' | 'list';
type ExperimentType = 'all' | 'ml' | 'llm' | 'mixed';

export default function ExperimentsPage() {
  const router = useRouter();
  const { data: experiments, isLoading, refetch } = useExperiments();
  const { data: usersData } = useUsers();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ExperimentType>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('recent');
  
  // Model type filters
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  
  // User filters
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [showOnlyMyRuns, setShowOnlyMyRuns] = useState(false);

  // Filter experiments with user information
  const filteredExperiments = experiments?.filter(exp => {
    // Search filter
    if (searchQuery && !exp.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Status filter
    if (statusFilter !== 'all' && exp.lifecycle_stage !== statusFilter) {
      return false;
    }
    
    // User/Team filter will be applied at the component level since we need run data
    // For now, we'll pass all experiments and let the components handle user filtering
    return true;
  }) || [];

  // Sort experiments
  const sortedExperiments = [...filteredExperiments].sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return b.last_update_time - a.last_update_time;
      case 'oldest':
        return a.last_update_time - b.last_update_time;
      case 'name':
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  const handleExperimentClick = (experimentId: string) => {
    router.push(`/experiments/${experimentId}`);
  };

  return (
    <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Page Header */}
          <div>
            <h1 className="text-3xl font-bold">Experiments</h1>
            <p className="text-muted-foreground mt-2">
              Manage and explore all your ML experiments in one place
            </p>
          </div>

          {/* Filters and Controls */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search experiments..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2 items-center">
                  <ModelTypeFilter
                    selectedTypes={selectedTypes}
                    selectedFrameworks={selectedFrameworks}
                    selectedTasks={selectedTasks}
                    onTypesChange={setSelectedTypes}
                    onFrameworksChange={setSelectedFrameworks}
                    onTasksChange={setSelectedTasks}
                  />

                  <UserFilter
                    selectedUsers={selectedUsers}
                    selectedTeams={selectedTeams}
                    onUsersChange={setSelectedUsers}
                    onTeamsChange={setSelectedTeams}
                    availableUsers={usersData?.users || []}
                    showOnlyMyRuns={showOnlyMyRuns}
                    onToggleMyRuns={setShowOnlyMyRuns}
                  />

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="deleted">Deleted</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Most Recent</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="name">Name (A-Z)</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* View Mode Toggle */}
                  <div className="flex gap-1 border rounded-md p-1">
                    <Button
                      variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="h-6 w-6 p-0"
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="h-6 w-6 p-0"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Summary */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {viewMode === 'grid' ? (
                <>Showing experiments ({sortedExperiments.length} total)</>
              ) : (
                <>Showing {sortedExperiments.length} of {experiments?.length || 0} experiments</>
              )}
              {(selectedUsers.length > 0 || selectedTeams.length > 0 || showOnlyMyRuns) && (
                <span className="text-primary"> • Filtered by user</span>
              )}
            </p>
          </div>

          {/* Experiments Display */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="h-6 w-3/4 bg-muted animate-pulse rounded" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-20 bg-muted animate-pulse rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedExperiments.map((experiment) => (
                    <ExperimentCard
                      key={experiment.experiment_id}
                      experiment={experiment}
                      onClick={() => handleExperimentClick(experiment.experiment_id)}
                      selectedUsers={selectedUsers}
                      selectedTeams={selectedTeams}
                      showOnlyMyRuns={showOnlyMyRuns}
                    />
                  ))}
                </div>
              ) : (
                <ExperimentList
                  experiments={sortedExperiments}
                  onExperimentClick={handleExperimentClick}
                  selectedUsers={selectedUsers}
                  selectedTeams={selectedTeams}
                  showOnlyMyRuns={showOnlyMyRuns}
                />
              )}
            </>
          )}
        </div>
      </main>
  );
}

// Experiment Card Component
function ExperimentCard({ 
  experiment, 
  onClick, 
  selectedUsers,
  selectedTeams,
  showOnlyMyRuns 
}: { 
  experiment: any; 
  onClick: () => void;
  selectedUsers: string[];
  selectedTeams: string[];
  showOnlyMyRuns: boolean;
}) {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['experiment-stats', experiment.experiment_id],
    queryFn: async () => {
      const client = new MLflowClient({ baseUrl: process.env.NEXT_PUBLIC_MLFLOW_URL || '/api/mlflow' });
      return client.getExperimentStats(experiment.experiment_id);
    },
  });

  // Fetch run data to check user information
  const { data: runData, isLoading: runDataLoading } = useQuery({
    queryKey: ['experiment-runs-users', experiment.experiment_id],
    queryFn: async () => {
      const response = await fetch('/api/mlflow/api/2.0/mlflow/runs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experiment_ids: [experiment.experiment_id],
          max_results: 100,
        }),
      });
      if (!response.ok) throw new Error('Failed to fetch runs');
      const data = await response.json();
      return data.runs || [];
    },
    enabled: selectedUsers.length > 0 || selectedTeams.length > 0 || showOnlyMyRuns,
  });

  // Check if experiment should be shown based on user filters
  const shouldShow = React.useMemo(() => {
    if (!selectedUsers.length && !selectedTeams.length && !showOnlyMyRuns) {
      return true;
    }

    // If filters are active but data is still loading, hide the experiment
    // This prevents flashing of experiments that will be filtered out
    if (runDataLoading || !runData) {
      return false;
    }
    
    // If no runs in experiment, hide it when filters are active
    if (runData.length === 0) {
      return false;
    }

    // Get current user ID from localStorage
    const currentUserId = (() => {
      try {
        const storedUser = localStorage.getItem('mltrack_current_user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          return user.id;
        }
      } catch (e) {}
      return null;
    })();

    // Check if any run matches the filter
    return runData.some((run: any) => {
      const tags = run.data?.tags || [];
      let userTags: Record<string, string> = {};
      
      // Extract user tags
      if (Array.isArray(tags)) {
        for (const tag of tags) {
          if (tag.key?.startsWith('mltrack.user.') || tag.key === 'user') {
            userTags[tag.key] = tag.value;
          }
        }
      }
      
      const userId = userTags['mltrack.user.id'];
      const userTeam = userTags['mltrack.user.team'];
      
      // Check filters
      if (showOnlyMyRuns && userId !== currentUserId) {
        return false;
      }
      if (selectedUsers.length > 0 && !selectedUsers.includes(userId)) {
        return false;
      }
      if (selectedTeams.length > 0 && (!userTeam || !selectedTeams.includes(userTeam))) {
        return false;
      }
      
      return true;
    });
  }, [runData, selectedUsers, selectedTeams, showOnlyMyRuns, runDataLoading]);

  // Show loading state while checking user filters
  if ((selectedUsers.length > 0 || selectedTeams.length > 0 || showOnlyMyRuns) && runDataLoading) {
    return (
      <Card className="opacity-50 animate-pulse">
        <CardHeader>
          <div className="h-6 w-3/4 bg-muted rounded" />
          <div className="h-4 w-1/2 bg-muted rounded mt-2" />
        </CardHeader>
        <CardContent>
          <div className="h-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!shouldShow) {
    return null;
  }

  const typeConfig = {
    ml: { icon: BarChart, color: 'text-blue-600', bg: 'bg-blue-500/10' },
    llm: { icon: Brain, color: 'text-purple-600', bg: 'bg-purple-500/10' },
    mixed: { icon: Sparkles, color: 'text-amber-600', bg: 'bg-amber-500/10' },
  };

  const config = stats ? typeConfig[stats.type] : typeConfig.ml;
  const Icon = config.icon;

  return (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={onClick}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Icon className={`h-5 w-5 ${config.color}`} />
              {experiment.name}
            </CardTitle>
            <CardDescription className="mt-1">
              Updated {formatDistanceToNow(new Date(experiment.last_update_time), { addSuffix: true })}
            </CardDescription>
          </div>
          {experiment.lifecycle_stage === 'deleted' && (
            <Badge variant="destructive" className="text-xs">Deleted</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {stats && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-2xl font-bold">{stats.totalRuns}</div>
              <div className="text-xs text-muted-foreground">Runs</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.completedRuns}</div>
              <div className="text-xs text-muted-foreground">Success</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{stats.failedRuns}</div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Experiment List Component
function ExperimentList({ 
  experiments, 
  onExperimentClick,
  selectedUsers,
  selectedTeams,
  showOnlyMyRuns
}: { 
  experiments: any[]; 
  onExperimentClick: (id: string) => void;
  selectedUsers: string[];
  selectedTeams: string[];
  showOnlyMyRuns: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full">
          <thead className="border-b">
            <tr>
              <th className="text-left p-4">Name</th>
              <th className="text-left p-4">Type</th>
              <th className="text-left p-4">Status</th>
              <th className="text-left p-4">Last Updated</th>
              <th className="text-center p-4">Runs</th>
            </tr>
          </thead>
          <tbody>
            {experiments.map((experiment) => (
              <ExperimentListRow
                key={experiment.experiment_id}
                experiment={experiment}
                onClick={() => onExperimentClick(experiment.experiment_id)}
                selectedUsers={selectedUsers}
                selectedTeams={selectedTeams}
                showOnlyMyRuns={showOnlyMyRuns}
              />
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function ExperimentListRow({ 
  experiment, 
  onClick,
  selectedUsers,
  selectedTeams,
  showOnlyMyRuns
}: { 
  experiment: any; 
  onClick: () => void;
  selectedUsers: string[];
  selectedTeams: string[];
  showOnlyMyRuns: boolean;
}) {
  const { data: stats } = useQuery({
    queryKey: ['experiment-stats', experiment.experiment_id],
    queryFn: async () => {
      const client = new MLflowClient({ baseUrl: process.env.NEXT_PUBLIC_MLFLOW_URL || '/api/mlflow' });
      return client.getExperimentStats(experiment.experiment_id);
    },
  });

  // Fetch run data to check user information (same logic as ExperimentCard)
  const { data: runData, isLoading: runDataLoading } = useQuery({
    queryKey: ['experiment-runs-users', experiment.experiment_id],
    queryFn: async () => {
      const response = await fetch('/api/mlflow/api/2.0/mlflow/runs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experiment_ids: [experiment.experiment_id],
          max_results: 100,
        }),
      });
      if (!response.ok) throw new Error('Failed to fetch runs');
      const data = await response.json();
      return data.runs || [];
    },
    enabled: selectedUsers.length > 0 || selectedTeams.length > 0 || showOnlyMyRuns,
  });

  // Check if experiment should be shown based on user filters
  const shouldShow = React.useMemo(() => {
    if (!selectedUsers.length && !selectedTeams.length && !showOnlyMyRuns) {
      return true;
    }

    // If filters are active but data is still loading, hide the experiment
    // This prevents flashing of experiments that will be filtered out
    if (runDataLoading || !runData) {
      return false;
    }
    
    // If no runs in experiment, hide it when filters are active
    if (runData.length === 0) {
      return false;
    }

    // Get current user ID from localStorage
    const currentUserId = (() => {
      try {
        const storedUser = localStorage.getItem('mltrack_current_user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          return user.id;
        }
      } catch (e) {}
      return null;
    })();

    // Check if any run matches the filter
    return runData.some((run: any) => {
      const tags = run.data?.tags || [];
      let userTags: Record<string, string> = {};
      
      // Extract user tags
      if (Array.isArray(tags)) {
        for (const tag of tags) {
          if (tag.key?.startsWith('mltrack.user.') || tag.key === 'user') {
            userTags[tag.key] = tag.value;
          }
        }
      }
      
      const userId = userTags['mltrack.user.id'];
      const userTeam = userTags['mltrack.user.team'];
      
      // Check filters
      if (showOnlyMyRuns && userId !== currentUserId) {
        return false;
      }
      if (selectedUsers.length > 0 && !selectedUsers.includes(userId)) {
        return false;
      }
      if (selectedTeams.length > 0 && (!userTeam || !selectedTeams.includes(userTeam))) {
        return false;
      }
      
      return true;
    });
  }, [runData, selectedUsers, selectedTeams, showOnlyMyRuns, runDataLoading]);

  // For list view, just hide the row during loading
  if ((selectedUsers.length > 0 || selectedTeams.length > 0 || showOnlyMyRuns) && runDataLoading) {
    return null;
  }

  if (!shouldShow) {
    return null;
  }

  const typeConfig = {
    ml: { icon: BarChart, label: 'ML' },
    llm: { icon: Brain, label: 'LLM' },
    mixed: { icon: Sparkles, label: 'Mixed' },
  };

  const config = stats ? typeConfig[stats.type] : typeConfig.ml;
  const Icon = config.icon;

  return (
    <tr
      className="border-b hover:bg-muted/50 cursor-pointer"
      onClick={onClick}
    >
      <td className="p-4 font-medium">{experiment.name}</td>
      <td className="p-4">
        <Badge variant="secondary" className="gap-1">
          <Icon className="h-3 w-3" />
          {config.label}
        </Badge>
      </td>
      <td className="p-4">
        <Badge variant={experiment.lifecycle_stage === 'deleted' ? 'destructive' : 'default'}>
          {experiment.lifecycle_stage}
        </Badge>
      </td>
      <td className="p-4 text-muted-foreground">
        {formatDistanceToNow(new Date(experiment.last_update_time), { addSuffix: true })}
      </td>
      <td className="p-4 text-center">{stats?.totalRuns || 0}</td>
    </tr>
  );
}