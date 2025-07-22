'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Rocket } from 'lucide-react'
import { DeploymentForm } from './DeploymentForm'

interface DeployButtonProps {
  runId: string
  modelName: string
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

export function DeployButton({ 
  runId, 
  modelName, 
  variant = 'default',
  size = 'default',
  className 
}: DeployButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button 
        variant={variant} 
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Rocket className="mr-2 h-4 w-4" />
        Deploy
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Deploy Model</DialogTitle>
            <DialogDescription>
              Configure and deploy your model to Modal for API serving
            </DialogDescription>
          </DialogHeader>
          
          <DeploymentForm 
            runId={runId}
            modelName={modelName}
            onSuccess={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}