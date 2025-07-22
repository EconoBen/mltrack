'use client';

import { useSession, signOut, signIn } from 'next-auth/react';
import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Settings, LogOut, LogIn, Shield, Code, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function UserMenuEnhanced() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [authMode, setAuthMode] = useState<string | null>(null);

  useEffect(() => {
    // Check if we're in development mode
    fetch('/api/auth/status')
      .then(res => res.json())
      .then(data => {
        setAuthMode(data.mode);
      })
      .catch(() => {
        setAuthMode('unknown');
      });
  }, []);

  const isDemoMode = authMode === 'development' || authMode === 'disabled';

  if (status === 'loading') {
    return (
      <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
    );
  }

  if (!session && !isDemoMode) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => signIn()}
      >
        <LogIn className="h-4 w-4 mr-2" />
        Sign In
      </Button>
    );
  }

  // In demo mode or with session
  const user = session?.user || {
    name: 'Demo User',
    email: 'demo@mltrack.local',
    image: null,
  };

  const initials = user.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || 'DU';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.image || ''} alt={user.name || ''} />
            <AvatarFallback className={isDemoMode ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' : ''}>
              {initials}
            </AvatarFallback>
          </Avatar>
          {isDemoMode && (
            <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-yellow-500 rounded-full border-2 border-background" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              {isDemoMode && (
                <Badge variant="secondary" className="text-xs">
                  Demo
                </Badge>
              )}
            </div>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        
        {isDemoMode && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <div className="rounded-md bg-yellow-500/10 p-2 text-xs text-yellow-700 dark:text-yellow-400">
                <div className="flex items-center gap-1 font-medium mb-1">
                  <Code className="h-3 w-3" />
                  Development Mode Active
                </div>
                <p className="text-muted-foreground">
                  Using mock authentication
                </p>
              </div>
            </div>
          </>
        )}
        
        <DropdownMenuSeparator />
        
        {isDemoMode && (
          <DropdownMenuItem 
            onClick={() => router.push('/setup')}
            className="text-primary"
          >
            <Shield className="mr-2 h-4 w-4" />
            <span>Configure Authentication</span>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem onClick={() => router.push('/profile')}>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => router.push('/settings/preferences')}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Preferences</span>
        </DropdownMenuItem>
        
        {isDemoMode && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => {
                const authChoice = localStorage.getItem('mltrack-auth-choice');
                if (!authChoice) {
                  router.push('/welcome');
                } else {
                  localStorage.removeItem('mltrack-auth-choice');
                  localStorage.removeItem('mltrack-skip-welcome');
                  window.location.href = '/welcome';
                }
              }}
            >
              <Users className="mr-2 h-4 w-4" />
              <span>Switch Auth Mode</span>
            </DropdownMenuItem>
          </>
        )}
        
        {!isDemoMode && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}