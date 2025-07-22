'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  RefreshCw, 
  ExternalLink, 
  StopCircle, 
  Search,
  Rocket,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { DataTable } from '@/components/ui/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { useRouter } from 'next/navigation'

interface DeploymentConfig {
  app_name: string
  model_name: string
  model_version: string
  cpu: number
  memory: number
  gpu?: string
  min_replicas: number
  max_replicas: number
}

interface Deployment {
  deployment_id: string
  run_id: string
  config: DeploymentConfig
  s3_uri: string
  endpoint_url: string
  started_at: string
  status: 'pending' | 'building' | 'deploying' | 'running' | 'failed' | 'stopped'
  error?: string
}

const statusIcons = {
  pending: <Clock className="h-4 w-4" />,
  building: <AlertCircle className="h-4 w-4" />,
  deploying: <Rocket className="h-4 w-4" />,
  running: <CheckCircle className="h-4 w-4" />,
  failed: <XCircle className="h-4 w-4" />,
  stopped: <StopCircle className="h-4 w-4" />
}

const statusVariants = {
  pending: 'secondary',
  building: 'secondary',
  deploying: 'secondary',
  running: 'default',
  failed: 'destructive',
  stopped: 'outline'
} as const

export function DeploymentsList() {
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const { toast } = useToast()
  const router = useRouter()

  const fetchDeployments = async () => {
    try {
      const response = await fetch('/api/deployments/modal')
      if (!response.ok) throw new Error('Failed to fetch deployments')
      const result = await response.json()
      if (result.success && result.data) {
        setDeployments(result.data)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch deployments',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDeployments()
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchDeployments, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleStop = async (deploymentId: string) => {
    try {
      const response = await fetch(`/api/deployments/modal?deploymentId=${deploymentId}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to stop deployment')
      
      const result = await response.json()
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Deployment stopped successfully'
        })
      } else {
        throw new Error('Failed to stop deployment')
      }
      
      await fetchDeployments()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to stop deployment',
        variant: 'destructive'
      })
    }
  }

  const columns: ColumnDef<Deployment>[] = [
    {
      accessorKey: 'config.model_name',
      header: 'Model',
      cell: ({ row }) => (
        <button
          onClick={() => router.push(`/deployments/${row.original.deployment_id}`)}
          className="font-medium hover:underline text-left"
        >
          {row.original.config.model_name}
        </button>
      )
    },
    {
      accessorKey: 'config.model_version',
      header: 'Version',
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          {row.original.config.model_version}
        </div>
      )
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status
        return (
          <Badge variant={statusVariants[status]} className="flex items-center gap-1 w-fit">
            {statusIcons[status]}
            {status}
          </Badge>
        )
      }
    },
    {
      accessorKey: 'config',
      header: 'Resources',
      cell: ({ row }) => {
        const config = row.original.config
        return (
          <div className="text-sm">
            <div>CPU: {config.cpu}</div>
            <div>Memory: {config.memory}MB</div>
            {config.gpu && <div>GPU: {config.gpu}</div>}
          </div>
        )
      }
    },
    {
      accessorKey: 'config.min_replicas',
      header: 'Replicas',
      cell: ({ row }) => {
        const config = row.original.config
        return (
          <div className="text-sm">
            {config.min_replicas} - {config.max_replicas}
          </div>
        )
      }
    },
    {
      accessorKey: 'started_at',
      header: 'Started',
      cell: ({ row }) => {
        const date = new Date(row.original.started_at)
        return <div className="text-sm">{date.toLocaleString()}</div>
      }
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const deployment = row.original
        const isRunning = deployment.status === 'running'
        
        return (
          <div className="flex items-center gap-2">
            {isRunning && deployment.endpoint_url && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(deployment.endpoint_url, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
            {(isRunning || deployment.status === 'deploying') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStop(deployment.deployment_id)}
              >
                <StopCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
        )
      }
    }
  ]

  const filteredDeployments = deployments.filter(deployment =>
    deployment.config.model_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deployment.config.model_version.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Deployments</CardTitle>
            <CardDescription>
              Manage your deployed models on Modal
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchDeployments}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search deployments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        
        <DataTable
          columns={columns}
          data={filteredDeployments}
          loading={loading}
        />
      </CardContent>
    </Card>
  )
}