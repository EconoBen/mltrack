'use client';

import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
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
import { 
  FlaskConical, 
  Brain, 
  ChevronRight, 
  BarChart, 
  Clock,
  Tag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { extractRunTags, getRunType, getModelInfo } from '@/lib/utils/mlflow-tags';
import { UserInfo, extractUserInfo } from '@/components/user-info';

interface ExperimentsTableProps {
  experiments: any[];
  isLoading?: boolean;
  showUsers?: boolean;
}

export function ExperimentsTable({ experiments, isLoading, showUsers = true }: ExperimentsTableProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Models</TableHead>
            {showUsers && <TableHead>Users</TableHead>}
            <TableHead>Runs</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(5)].map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-48" /></TableCell>
              <TableCell><Skeleton className="h-6 w-12" /></TableCell>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              {showUsers && <TableCell><Skeleton className="h-8 w-24" /></TableCell>}
              <TableCell><Skeleton className="h-4 w-8" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-6 w-16" /></TableCell>
              <TableCell><Skeleton className="h-8 w-8" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  const getExperimentType = (exp: any) => {
    // Check if experiment has type metadata
    if (exp.tags?.['mltrack.type']) {
      return exp.tags['mltrack.type'];
    }
    // Check runs for type using new category tag
    const runs = exp.latest_runs || [];
    
    const hasLLM = runs.some((r: any) => {
      const tags = extractRunTags(r);
      const runType = getRunType(tags);
      return runType === 'llm';
    });
    
    const hasML = runs.some((r: any) => {
      const tags = extractRunTags(r);
      const runType = getRunType(tags);
      return runType === 'ml';
    });
    
    if (hasLLM && hasML) return 'mixed';
    if (hasLLM) return 'llm';
    return 'ml';
  };
  
  const getExperimentModels = (exp: any) => {
    const runs = exp.latest_runs || [];
    const models = new Set<string>();
    
    runs.forEach((run: any) => {
      const tags = extractRunTags(run);
      const { algorithm } = getModelInfo(tags);
      if (algorithm && algorithm !== '-') {
        models.add(algorithm);
      }
    });
    
    return Array.from(models).slice(0, 3); // Show first 3 models
  };

  const getExperimentUsers = (exp: any) => {
    const runs = exp.latest_runs || [];
    const usersMap = new Map<string, any>();
    
    runs.forEach((run: any) => {
      const tags = extractRunTags(run);
      const userInfo = extractUserInfo(tags);
      if (userInfo.userId && !usersMap.has(userInfo.userId)) {
        usersMap.set(userInfo.userId, userInfo);
      }
    });
    
    return Array.from(usersMap.values()).slice(0, 3); // Show first 3 users
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return 'bg-blue-500';
      case 'FINISHED':
        return 'bg-green-500';
      case 'FAILED':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Models</TableHead>
          {showUsers && <TableHead>Users</TableHead>}
          <TableHead>Runs</TableHead>
          <TableHead>Last Updated</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {experiments.map((experiment) => {
          const type = getExperimentType(experiment);
          const models = getExperimentModels(experiment);
          const users = showUsers ? getExperimentUsers(experiment) : [];
          const latestRun = experiment.latest_runs?.[0];
          const runCount = experiment.latest_runs?.length || 0;
          const lastUpdateTime = latestRun?.info?.end_time || latestRun?.info?.start_time;
          const status = latestRun?.info?.status || 'NO RUNS';

          return (
            <TableRow 
              key={experiment.experiment_id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => router.push(`/experiments/${experiment.experiment_id}`)}
            >
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {type === 'llm' ? (
                    <Brain className="h-4 w-4 text-purple-600" />
                  ) : (
                    <FlaskConical className="h-4 w-4 text-blue-600" />
                  )}
                  <span>{experiment.name}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={type === 'llm' ? 'secondary' : 'default'} className="text-xs">
                  {type.toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {models.map((model) => (
                    <Badge key={model} variant="outline" className="text-xs">
                      {model}
                    </Badge>
                  ))}
                  {models.length === 0 && (
                    <span className="text-xs text-muted-foreground">No models</span>
                  )}
                </div>
              </TableCell>
              {showUsers && (
                <TableCell>
                  <div className="flex items-center gap-2">
                    {users.map((user, idx) => (
                      <UserInfo
                        key={user.userId || idx}
                        userId={user.userId}
                        userName={user.userName}
                        userEmail={user.userEmail}
                        userTeam={user.userTeam}
                        avatarSize="xs"
                      />
                    ))}
                    {users.length === 0 && (
                      <span className="text-xs text-muted-foreground">No users</span>
                    )}
                  </div>
                </TableCell>
              )}
              <TableCell>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <BarChart className="h-3 w-3" />
                  <span>{runCount}</span>
                </div>
              </TableCell>
              <TableCell>
                {lastUpdateTime ? (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatDistanceToNow(new Date(lastUpdateTime))} ago</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Never</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className={cn('h-2 w-2 rounded-full', getStatusColor(status))} />
                  <span className="text-sm">{status}</span>
                </div>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/experiments/${experiment.experiment_id}`);
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}