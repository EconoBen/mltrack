'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Package, Rocket, Archive, Upload, Code, Info, Clock, GitBranch, Download } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useMLflowStore } from '@/lib/store/mlflow-store';
import { useRuns } from '@/lib/hooks/use-mlflow';

interface Model {
  model_name: string;
  version: string;
  stage: string;
  registered_at: string;
  framework: string;
  description?: string;
  metrics?: Record<string, number>;
  params?: Record<string, string>;
  s3_location?: string;
  git_commit?: string;
  user?: string;
  run_id: string;
}

async function fetchModels(stage?: string): Promise<Model[]> {
  const url = stage 
    ? `/api/models/list?stage=${stage}`
    : '/api/models/list';
  
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch models');
  
  const data = await response.json();
  return data.models || [];
}

async function registerModel(data: {
  runId: string;
  name: string;
  path?: string;
  stage?: string;
  description?: string;
  s3Bucket?: string;
}): Promise<Model> {
  const response = await fetch('/api/models/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) throw new Error('Failed to register model');
  return response.json();
}

async function transitionModel(data: {
  modelName: string;
  version: string;
  stage: string;
  archiveExisting?: boolean;
}): Promise<Model> {
  const response = await fetch('/api/models/transition', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) throw new Error('Failed to transition model');
  return response.json();
}

export function ModelRegistry() {
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const { selectedExperiment } = useMLflowStore();
  const queryClient = useQueryClient();

  // Fetch models
  const { data: models, isLoading } = useQuery({
    queryKey: ['models', selectedStage],
    queryFn: () => fetchModels(selectedStage === 'all' ? undefined : selectedStage),
  });

  // Fetch runs for current experiment
  const { data: runs } = useRuns(selectedExperiment ? [selectedExperiment] : []);

  // Register model mutation
  const registerMutation = useMutation({
    mutationFn: registerModel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
      setRegisterDialogOpen(false);
      toast.success('Model registered successfully');
    },
    onError: (error: Error) => {
      toast.error(`Registration failed: ${error.message}`);
    },
  });

  // Transition model mutation
  const transitionMutation = useMutation({
    mutationFn: transitionModel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
      toast.success('Model stage updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Transition failed: ${error.message}`);
    },
  });

  const stageColors = {
    staging: 'bg-yellow-500',
    production: 'bg-green-500',
    archived: 'bg-gray-500',
  };

  const stageIcons = {
    staging: Package,
    production: Rocket,
    archived: Archive,
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Model Registry</h2>
          <p className="text-muted-foreground">
            Manage and deploy your trained models
          </p>
        </div>
        <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Register Model
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <RegisterModelDialog
              runs={runs || []}
              onRegister={(data) => registerMutation.mutate(data)}
              isLoading={registerMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stage Tabs */}
      <Tabs defaultValue="all" value={selectedStage} onValueChange={setSelectedStage}>
        <TabsList>
          <TabsTrigger value="all">All Models</TabsTrigger>
          <TabsTrigger value="staging" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Staging
          </TabsTrigger>
          <TabsTrigger value="production" className="flex items-center gap-2">
            <Rocket className="h-4 w-4" />
            Production
          </TabsTrigger>
          <TabsTrigger value="archived" className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Archived
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedStage} className="mt-6">
          {!models || models.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No models found</h3>
                <p className="text-muted-foreground">
                  {selectedStage === 'all' 
                    ? 'Register your first model to get started'
                    : `No models in ${selectedStage} stage`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {models.map((model) => (
                <ModelCard
                  key={`${model.model_name}-${model.version}`}
                  model={model}
                  onTransition={(stage) => {
                    transitionMutation.mutate({
                      modelName: model.model_name,
                      version: model.version,
                      stage,
                    });
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ModelCard({ 
  model, 
  onTransition 
}: { 
  model: Model; 
  onTransition: (stage: string) => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const StageIcon = stageIcons[model.stage as keyof typeof stageIcons] || Package;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{model.model_name}</CardTitle>
              <CardDescription>Version: {model.version}</CardDescription>
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <StageIcon className="h-3 w-3" />
              {model.stage}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(model.registered_at), { addSuffix: true })}
            </div>
            {model.framework && (
              <div className="flex items-center gap-2">
                <Code className="h-3 w-3" />
                {model.framework}
              </div>
            )}
          </div>

          {model.description && (
            <p className="text-sm">{model.description}</p>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDetailsOpen(true)}
            >
              <Info className="mr-2 h-4 w-4" />
              Details
            </Button>
            {model.stage !== 'production' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onTransition('production')}
              >
                Deploy
              </Button>
            )}
            {model.stage === 'production' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onTransition('archived')}
              >
                Archive
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <ModelDetailsDialog model={model} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function RegisterModelDialog({
  runs,
  onRegister,
  isLoading,
}: {
  runs: any[];
  onRegister: (data: any) => void;
  isLoading: boolean;
}) {
  const [selectedRun, setSelectedRun] = useState('');
  const [modelName, setModelName] = useState('');
  const [modelPath, setModelPath] = useState('model');
  const [stage, setStage] = useState('staging');
  const [description, setDescription] = useState('');
  const [s3Bucket, setS3Bucket] = useState('');

  const handleSubmit = () => {
    if (!selectedRun || !modelName) return;

    onRegister({
      runId: selectedRun,
      name: modelName,
      path: modelPath,
      stage,
      description,
      s3Bucket: s3Bucket || undefined,
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Register Model</DialogTitle>
        <DialogDescription>
          Select a run and provide details to register a model
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="run">Select Run</Label>
          <Select value={selectedRun} onValueChange={setSelectedRun}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a run..." />
            </SelectTrigger>
            <SelectContent>
              {runs.map((run) => (
                <SelectItem key={run.info.run_id} value={run.info.run_id}>
                  <div className="flex items-center gap-2">
                    <code className="text-xs">{run.info.run_id.slice(0, 8)}</code>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(run.info.start_time), { addSuffix: true })}
                    </span>
                    {run.info.status === 'FINISHED' && (
                      <Badge variant="outline" className="text-xs">
                        Finished
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="name">Model Name</Label>
          <Input
            id="name"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            placeholder="e.g., customer-churn-predictor"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="path">Model Path in Artifacts</Label>
          <Input
            id="path"
            value={modelPath}
            onChange={(e) => setModelPath(e.target.value)}
            placeholder="model"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="stage">Initial Stage</Label>
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="staging">Staging</SelectItem>
              <SelectItem value="production">Production</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this model does..."
            rows={3}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="s3bucket">S3 Bucket (optional)</Label>
          <Input
            id="s3bucket"
            value={s3Bucket}
            onChange={(e) => setS3Bucket(e.target.value)}
            placeholder="my-model-bucket"
          />
        </div>
      </div>

      <DialogFooter>
        <Button
          onClick={handleSubmit}
          disabled={!selectedRun || !modelName || isLoading}
        >
          {isLoading ? 'Registering...' : 'Register Model'}
        </Button>
      </DialogFooter>
    </>
  );
}

function ModelDetailsDialog({ model }: { model: Model }) {
  const [loadingCode, setLoadingCode] = useState('');
  
  const fetchLoadingCode = async () => {
    try {
      const response = await fetch(`/api/models/code/${model.model_name}?version=${model.version}`);
      const data = await response.json();
      setLoadingCode(data.code);
    } catch (error) {
      console.error('Failed to fetch loading code:', error);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{model.model_name}</DialogTitle>
        <DialogDescription>Version: {model.version}</DialogDescription>
      </DialogHeader>

      <Tabs defaultValue="overview" className="mt-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="code" onClick={fetchLoadingCode}>
            Loading Code
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Stage</Label>
              <p className="font-medium">{model.stage}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Framework</Label>
              <p className="font-medium">{model.framework || 'Unknown'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Registered</Label>
              <p className="font-medium">
                {new Date(model.registered_at).toLocaleString()}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">User</Label>
              <p className="font-medium">{model.user || 'Unknown'}</p>
            </div>
          </div>

          {model.description && (
            <div>
              <Label className="text-muted-foreground">Description</Label>
              <p className="mt-1">{model.description}</p>
            </div>
          )}

          {model.git_commit && (
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-muted-foreground" />
              <code className="text-sm">{model.git_commit}</code>
            </div>
          )}

          {model.s3_location && (
            <div>
              <Label className="text-muted-foreground">S3 Location</Label>
              <code className="text-sm block mt-1">{model.s3_location}</code>
            </div>
          )}
        </TabsContent>

        <TabsContent value="metrics">
          {model.metrics && Object.keys(model.metrics).length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead>Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(model.metrics).map(([key, value]) => (
                  <TableRow key={key}>
                    <TableCell className="font-mono text-sm">{key}</TableCell>
                    <TableCell>
                      {typeof value === 'number' ? value.toFixed(4) : value}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No metrics available
            </p>
          )}
        </TabsContent>

        <TabsContent value="code">
          {loadingCode ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Python code to load and use this model
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(loadingCode);
                    toast.success('Code copied to clipboard');
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Copy Code
                </Button>
              </div>
              <ScrollArea className="h-[400px] w-full rounded border p-4">
                <pre className="text-sm">
                  <code>{loadingCode}</code>
                </pre>
              </ScrollArea>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading code...</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}