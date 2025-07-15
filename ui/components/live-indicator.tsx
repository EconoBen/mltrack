'use client';

import { useState, useEffect } from 'react';
import { Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LiveIndicator() {
  const [isLive, setIsLive] = useState(false);
  
  useEffect(() => {
    // Check if we're on a page that has real-time features
    const checkLiveStatus = () => {
      const isAnalyticsPage = window.location.pathname.includes('/analytics');
      setIsLive(isAnalyticsPage);
    };
    
    checkLiveStatus();
    
    // Re-check on navigation
    window.addEventListener('popstate', checkLiveStatus);
    return () => window.removeEventListener('popstate', checkLiveStatus);
  }, []);
  
  if (!isLive) return null;
  
  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
      <Wifi className="h-3 w-3 text-green-500" />
      <span className="text-xs font-medium text-green-600 dark:text-green-400">Live</span>
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
      </span>
    </div>
  );
}