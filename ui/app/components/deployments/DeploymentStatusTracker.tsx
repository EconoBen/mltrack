'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  Rocket,
  Package,
  CloudUpload,
  Server
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface DeploymentStatusTrackerProps {
  deploymentId: string
  initialStatus?: string
  onStatusChange?: (status: string) => void
}

interface StatusStep {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  status: 'pending' | 'in-progress' | 'completed' | 'failed'
}

const statusSteps: Record<string, StatusStep> = {
  pending: {
    id: 'pending',
    label: 'Queued',
    description: 'Deployment queued for processing',
    icon: <Clock className="h-5 w-5" />,
    status: 'pending'
  },
  building: {
    id: 'building',
    label: 'Building',
    description: 'Building deployment container',
    icon: <Package className="h-5 w-5" />,
    status: 'in-progress'
  },
  uploading: {
    id: 'uploading',
    label: 'Uploading',
    description: 'Uploading model to cloud storage',
    icon: <CloudUpload className="h-5 w-5" />,
    status: 'in-progress'
  },
  deploying: {
    id: 'deploying',
    label: 'Deploying',
    description: 'Deploying to Modal infrastructure',
    icon: <Rocket className="h-5 w-5" />,
    status: 'in-progress'
  },
  running: {
    id: 'running',
    label: 'Running',
    description: 'Deployment is live and serving requests',
    icon: <Server className="h-5 w-5" />,
    status: 'completed'
  },
  failed: {
    id: 'failed',
    label: 'Failed',
    description: 'Deployment failed',
    icon: <XCircle className="h-5 w-5" />,
    status: 'failed'
  },
  stopped: {
    id: 'stopped',
    label: 'Stopped',
    description: 'Deployment has been stopped',
    icon: <AlertCircle className="h-5 w-5" />,
    status: 'failed'
  }
}

const statusOrder = ['pending', 'building', 'uploading', 'deploying', 'running']

export function DeploymentStatusTracker({ 
  deploymentId, 
  initialStatus = 'pending',
  onStatusChange 
}: DeploymentStatusTrackerProps) {
  const [currentStatus, setCurrentStatus] = useState(initialStatus)
  const [statusHistory, setStatusHistory] = useState<Array<{
    status: string
    timestamp: Date
    message?: string
  }>>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Poll for status updates
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/deployments/modal?deploymentId=${deploymentId}`)
        if (!response.ok) throw new Error('Failed to fetch deployment status')
        
        const result = await response.json()
        const deployment = result.success ? result.data : null
        
        if (deployment && deployment.status !== currentStatus) {
          setCurrentStatus(deployment.status)
          setStatusHistory(prev => [...prev, {
            status: deployment.status,
            timestamp: new Date(),
            message: deployment.error
          }])
          
          if (deployment.error) {
            setError(deployment.error)
          }
          
          onStatusChange?.(deployment.status)
          
          // Stop polling if deployment is complete or failed
          if (['running', 'failed', 'stopped'].includes(deployment.status)) {
            clearInterval(interval)
          }
        }
      } catch (error) {
        console.error('Failed to fetch deployment status:', error)
      }
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(interval)
  }, [deploymentId, currentStatus, onStatusChange])

  const getProgress = () => {
    const currentIndex = statusOrder.indexOf(currentStatus)
    if (currentIndex === -1) return 0
    return ((currentIndex + 1) / statusOrder.length) * 100
  }

  const getStepStatus = (stepId: string): StatusStep['status'] => {
    const currentIndex = statusOrder.indexOf(currentStatus)
    const stepIndex = statusOrder.indexOf(stepId)
    
    if (currentStatus === 'failed' || currentStatus === 'stopped') {
      if (stepIndex <= currentIndex) return 'failed'
      return 'pending'
    }
    
    if (stepIndex < currentIndex) return 'completed'
    if (stepIndex === currentIndex) return 'in-progress'
    return 'pending'
  }

  const isDeploymentActive = !['running', 'failed', 'stopped'].includes(currentStatus)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Deployment Status</CardTitle>
            <CardDescription>
              Track the progress of your model deployment
            </CardDescription>
          </div>
          <Badge variant={
            currentStatus === 'running' ? 'default' :
            currentStatus === 'failed' || currentStatus === 'stopped' ? 'destructive' :
            'secondary'
          }>
            {currentStatus}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        {isDeploymentActive && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progress</span>
              <span>{Math.round(getProgress())}%</span>
            </div>
            <Progress value={getProgress()} className="h-2" />
          </div>
        )}

        {/* Status Steps */}
        <div className="space-y-4">
          {statusOrder.map((stepId, index) => {
            const step = statusSteps[stepId]
            const stepStatus = getStepStatus(stepId)
            
            return (
              <div key={stepId} className="flex items-start gap-4">
                <div className={`mt-0.5 ${
                  stepStatus === 'completed' ? 'text-green-600' :
                  stepStatus === 'in-progress' ? 'text-blue-600' :
                  stepStatus === 'failed' ? 'text-red-600' :
                  'text-muted-foreground'
                }`}>
                  {stepStatus === 'completed' ? <CheckCircle className="h-5 w-5" /> :
                   stepStatus === 'in-progress' ? <Loader2 className="h-5 w-5 animate-spin" /> :
                   stepStatus === 'failed' ? <XCircle className="h-5 w-5" /> :
                   step.icon}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className={`font-medium ${
                      stepStatus === 'pending' ? 'text-muted-foreground' : ''
                    }`}>
                      {step.label}
                    </p>
                    {stepStatus === 'in-progress' && (
                      <Badge variant="outline" className="text-xs">
                        In Progress
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
                {index < statusOrder.length - 1 && (
                  <div className={`absolute left-[26px] mt-8 h-8 w-0.5 ${
                    stepStatus === 'completed' ? 'bg-green-600' :
                    stepStatus === 'in-progress' ? 'bg-blue-600' :
                    stepStatus === 'failed' ? 'bg-red-600' :
                    'bg-border'
                  }`} />
                )}
              </div>
            )
          })}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Status History */}
        {statusHistory.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">History</h4>
            <div className="space-y-2">
              {statusHistory.map((entry, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {entry.status}
                    </Badge>
                    {entry.message && (
                      <span className="text-muted-foreground">{entry.message}</span>
                    )}
                  </div>
                  <span className="text-muted-foreground">
                    {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}