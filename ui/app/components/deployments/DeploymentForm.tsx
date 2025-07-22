'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Rocket } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface DeploymentFormProps {
  runId: string
  modelName: string
  onSuccess?: () => void
}

interface DeploymentConfig {
  app_name: string
  model_name: string
  model_version: string
  cpu: number
  memory: number
  gpu?: string
  min_replicas: number
  max_replicas: number
  environment_vars?: Record<string, string>
  requirements?: string[]
  python_version: string
}

const GPU_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'T4', label: 'NVIDIA T4' },
  { value: 'A10G', label: 'NVIDIA A10G' },
  { value: 'A100', label: 'NVIDIA A100' },
  { value: 'H100', label: 'NVIDIA H100' }
]

export function DeploymentForm({ runId, modelName, onSuccess }: DeploymentFormProps) {
  const [deploying, setDeploying] = useState(false)
  const [useGpu, setUseGpu] = useState(false)
  const { toast } = useToast()
  
  const [config, setConfig] = useState<DeploymentConfig>({
    app_name: modelName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    model_name: modelName,
    model_version: '1.0.0',
    cpu: 1.0,
    memory: 512,
    min_replicas: 1,
    max_replicas: 5,
    python_version: '3.11'
  })

  const [envVars, setEnvVars] = useState('')
  const [requirements, setRequirements] = useState('')

  const handleDeploy = async () => {
    setDeploying(true)
    
    try {
      // Parse environment variables
      const environmentVars: Record<string, string> = {}
      if (envVars.trim()) {
        envVars.split('\n').forEach(line => {
          const [key, ...valueParts] = line.split('=')
          if (key && valueParts.length > 0) {
            environmentVars[key.trim()] = valueParts.join('=').trim()
          }
        })
      }
      
      // Parse requirements
      const requirementsList = requirements
        .split('\n')
        .map(req => req.trim())
        .filter(req => req.length > 0)
      
      const deploymentConfig = {
        runId,
        appName: config.app_name,
        modelName: config.model_name,
        modelVersion: config.model_version,
        cpu: config.cpu,
        memory: config.memory,
        gpu: useGpu ? config.gpu : undefined,
        minReplicas: config.min_replicas,
        maxReplicas: config.max_replicas,
        environmentVars: Object.keys(environmentVars).length > 0 ? environmentVars : undefined,
        requirements: requirementsList.length > 0 ? requirementsList : undefined,
        pythonVersion: config.python_version
      }
      
      const response = await fetch('/api/deployments/modal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deploymentConfig)
      })
      
      if (!response.ok) {
        const error = await response.text()
        throw new Error(error)
      }
      
      const result = await response.json()
      
      toast({
        title: 'Deployment Started',
        description: `${modelName} is being deployed to Modal`
      })
      
      onSuccess?.()
    } catch (error) {
      toast({
        title: 'Deployment Failed',
        description: error instanceof Error ? error.message : 'Failed to deploy model',
        variant: 'destructive'
      })
    } finally {
      setDeploying(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deploy Model</CardTitle>
        <CardDescription>
          Deploy {modelName} to Modal for API serving
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="app_name">App Name</Label>
            <Input
              id="app_name"
              value={config.app_name}
              onChange={(e) => setConfig({ ...config, app_name: e.target.value })}
              placeholder="my-model-app"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="model_version">Model Version</Label>
            <Input
              id="model_version"
              value={config.model_version}
              onChange={(e) => setConfig({ ...config, model_version: e.target.value })}
              placeholder="1.0.0"
            />
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>CPU Cores</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[config.cpu]}
                onValueChange={(value) => setConfig({ ...config, cpu: value[0] })}
                max={8}
                min={0.25}
                step={0.25}
                className="flex-1"
              />
              <span className="w-12 text-sm text-muted-foreground">{config.cpu}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Memory (MB)</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[config.memory]}
                onValueChange={(value) => setConfig({ ...config, memory: value[0] })}
                max={8192}
                min={256}
                step={256}
                className="flex-1"
              />
              <span className="w-16 text-sm text-muted-foreground">{config.memory}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="use-gpu">Use GPU</Label>
            <Switch
              id="use-gpu"
              checked={useGpu}
              onCheckedChange={setUseGpu}
            />
          </div>
          
          {useGpu && (
            <div className="space-y-2">
              <Label htmlFor="gpu">GPU Type</Label>
              <Select
                value={config.gpu || ''}
                onValueChange={(value) => setConfig({ ...config, gpu: value || undefined })}
              >
                <SelectTrigger id="gpu">
                  <SelectValue placeholder="Select GPU type" />
                </SelectTrigger>
                <SelectContent>
                  {GPU_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="min_replicas">Min Replicas</Label>
            <Input
              id="min_replicas"
              type="number"
              value={config.min_replicas}
              onChange={(e) => setConfig({ ...config, min_replicas: parseInt(e.target.value) || 1 })}
              min={1}
              max={10}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="max_replicas">Max Replicas</Label>
            <Input
              id="max_replicas"
              type="number"
              value={config.max_replicas}
              onChange={(e) => setConfig({ ...config, max_replicas: parseInt(e.target.value) || 5 })}
              min={1}
              max={100}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="python_version">Python Version</Label>
          <Select
            value={config.python_version}
            onValueChange={(value) => setConfig({ ...config, python_version: value })}
          >
            <SelectTrigger id="python_version">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3.9">Python 3.9</SelectItem>
              <SelectItem value="3.10">Python 3.10</SelectItem>
              <SelectItem value="3.11">Python 3.11</SelectItem>
              <SelectItem value="3.12">Python 3.12</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="requirements">Additional Requirements</Label>
          <Textarea
            id="requirements"
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            placeholder="pandas&#10;numpy&#10;custom-package==1.0.0"
            className="font-mono text-sm"
            rows={4}
          />
          <p className="text-sm text-muted-foreground">
            One package per line. Common ML packages are included automatically.
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="env_vars">Environment Variables</Label>
          <Textarea
            id="env_vars"
            value={envVars}
            onChange={(e) => setEnvVars(e.target.value)}
            placeholder="API_KEY=your-api-key&#10;DEBUG=true"
            className="font-mono text-sm"
            rows={4}
          />
          <p className="text-sm text-muted-foreground">
            One per line in KEY=VALUE format
          </p>
        </div>
        
        <Button
          onClick={handleDeploy}
          disabled={deploying || !config.app_name || !config.model_version}
          className="w-full"
        >
          {deploying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Deploying...
            </>
          ) : (
            <>
              <Rocket className="mr-2 h-4 w-4" />
              Deploy to Modal
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}