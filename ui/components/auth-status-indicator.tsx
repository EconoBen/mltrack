'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldAlert, ShieldOff } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function AuthStatusIndicator() {
  const [authMode, setAuthMode] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/status')
      .then(res => res.json())
      .then(data => {
        setAuthMode(data.mode);
      })
      .catch(() => {
        setAuthMode('error');
      });
  }, []);

  if (!authMode || authMode === 'production') {
    return null;
  }

  const getStatusConfig = () => {
    switch (authMode) {
      case 'development':
        return {
          icon: ShieldAlert,
          text: 'Dev Mode',
          variant: 'secondary' as const,
          tooltip: 'Running in development mode with mock authentication',
          color: 'text-yellow-500',
        };
      case 'disabled':
        return {
          icon: ShieldOff,
          text: 'Auth Disabled',
          variant: 'destructive' as const,
          tooltip: 'Authentication is not configured. See setup instructions.',
          color: 'text-red-500',
        };
      case 'partial':
        return {
          icon: ShieldAlert,
          text: 'Partial Config',
          variant: 'secondary' as const,
          tooltip: 'Some authentication settings are missing',
          color: 'text-orange-500',
        };
      default:
        return {
          icon: Shield,
          text: 'Unknown',
          variant: 'outline' as const,
          tooltip: 'Authentication status unknown',
          color: 'text-gray-500',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={config.variant} className="gap-1 cursor-help">
            <Icon className={`h-3 w-3 ${config.color}`} />
            <span className="text-xs">{config.text}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{config.tooltip}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Click the warning banner for details
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}