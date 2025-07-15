'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Square, 
  RefreshCw, 
  Package, 
  Globe, 
  Terminal,
  Rocket,
  AlertCircle,
  CheckCircle,
  Clock,
  Copy,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { ApiTester } from '@/components/deployments/api-tester';
import { DeploymentMetrics } from '@/components/deployments/deployment-metrics';

interface Deployment {
  model_name: string;
  version: string;
  status: 'running' | 'stopped' | 'building' | 'error';
  container?: {
    image: string;
    built_at: string;
    size: string;
    pushed: boolean;
  };
  api?: {
    url: string;
    port: number;
    health: 'healthy' | 'unhealthy' | 'checking';
    uptime?: string;
  };
  framework: string;
  task_type: string;
  stage: string;
}

export default function DeploymentsPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);

  useEffect(() => {
    fetchDeployments();
    const interval = setInterval(fetchDeployments, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  const fetchDeployments = async () => {
    try {
      const response = await fetch('/api/deployments');
      const data = await response.json();
      setDeployments(data.deployments || []);
    } catch (error) {
      console.error('Failed to fetch deployments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async (modelName: string) => {
    toast.info(`Deploying ${modelName}...`);
    try {
      const response = await fetch('/api/deployments/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_name: modelName }),
      });
      
      if (response.ok) {
        toast.success(`${modelName} deployed successfully!`);
        fetchDeployments();
      } else {
        toast.error('Deployment failed');
      }
    } catch (error) {
      toast.error('Failed to deploy model');
    }
  };

  const handleStop = async (modelName: string) => {
    try {
      const response = await fetch('/api/deployments/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_name: modelName }),
      });
      
      if (response.ok) {
        toast.success(`${modelName} stopped`);
        fetchDeployments();
      }
    } catch (error) {
      toast.error('Failed to stop deployment');
    }
  };

  const copyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
    toast.success('Command copied to clipboard');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'stopped':
        return <Square className="h-4 w-4 text-gray-500" />;
      case 'building':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getHealthBadge = (health?: string) => {
    if (!health) return null;
    
    const variants: Record<string, 'default' | 'success' | 'destructive'> = {
      healthy: 'success',
      unhealthy: 'destructive',
      checking: 'default',
    };
    
    return (
      <Badge variant={variants[health] || 'default'}>
        {health}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Deployments</h1>
          <p className="text-muted-foreground">
            Manage your deployed models and APIs
          </p>
        </div>
        <Button onClick={() => window.location.href = '/models'}>
          <Package className="mr-2 h-4 w-4" />
          Deploy New Model
        </Button>
      </div>

      {deployments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 text-center">
            <Rocket className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No deployments yet</h3>
            <p className="text-muted-foreground mb-4">
              Deploy your first model to see it here
            </p>
            <Button onClick={() => window.location.href = '/models'}>
              Browse Models
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {deployments.map((deployment) => (
            <Card key={`${deployment.model_name}-${deployment.version}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{deployment.model_name}</CardTitle>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(deployment.status)}
                    <Badge variant="outline">{deployment.stage}</Badge>
                  </div>
                </div>
                <CardDescription>
                  {deployment.framework} • {deployment.task_type}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Version:</span>
                    <span className="font-mono">{deployment.version}</span>
                  </div>
                  
                  {deployment.container && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Image Size:</span>
                        <span>{deployment.container.size}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Built:</span>
                        <span>{new Date(deployment.container.built_at).toLocaleDateString()}</span>
                      </div>
                    </>
                  )}
                  
                  {deployment.api && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">API Status:</span>
                        {getHealthBadge(deployment.api.health)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Port:</span>
                        <span>{deployment.api.port}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-2">
                  {deployment.status === 'stopped' ? (
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleDeploy(deployment.model_name)}
                    >
                      <Play className="mr-1 h-3 w-3" />
                      Deploy
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleStop(deployment.model_name)}
                    >
                      <Square className="mr-1 h-3 w-3" />
                      Stop
                    </Button>
                  )}
                  
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setSelectedDeployment(deployment)}
                  >
                    <Terminal className="mr-1 h-3 w-3" />
                    Test
                  </Button>
                </div>

                {deployment.api?.url && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <Globe className="h-3 w-3 text-muted-foreground" />
                      <code className="text-xs flex-1">{deployment.api.url}</code>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => copyCommand(`curl ${deployment.api.url}/health`)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => window.open(`${deployment.api.url}/docs`, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedDeployment && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Test {selectedDeployment.model_name}</CardTitle>
            <CardDescription>
              Interactive API testing for your deployed model
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="tester" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="tester">API Tester</TabsTrigger>
                <TabsTrigger value="metrics">Metrics</TabsTrigger>
              </TabsList>
              
              <TabsContent value="tester" className="space-y-4">
                <ApiTester deployment={selectedDeployment} />
              </TabsContent>
              
              <TabsContent value="metrics" className="space-y-4">
                <DeploymentMetrics deployment={selectedDeployment} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}