'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenuEnhanced } from '@/components/user-menu-enhanced';
import { LiveIndicator } from '@/components/live-indicator';
import { GlobalSearch } from '@/components/global-search';
import { AuthStatusIndicator } from '@/components/auth-status-indicator';
import { 
  Activity, Home, FlaskConical, Package, Rocket, 
  FileBarChart, Settings, BarChart3 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', href: '/', icon: Home },
  { label: 'Experiments', href: '/experiments', icon: FlaskConical },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Models', href: '/models', icon: Package },
  { label: 'Deployments', href: '/deployments', icon: Rocket },
  { label: 'Reports', href: '/reports', icon: FileBarChart },
];

export function GlobalNav() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center gap-8">
            <button
              onClick={() => router.push('/')}
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
            >
              <Activity className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">MLtrack</h1>
            </button>

            {/* Main Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || 
                  (item.href !== '/' && pathname.startsWith(item.href));
                
                return (
                  <Button
                    key={item.href}
                    variant={isActive ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => router.push(item.href)}
                    className={cn(
                      "gap-2",
                      isActive && "bg-secondary"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                );
              })}
            </nav>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            <AuthStatusIndicator />
            <LiveIndicator />
            <GlobalSearch />
            <ThemeToggle />
            <div className="w-px h-6 bg-border" />
            <UserMenuEnhanced />
          </div>
        </div>
      </div>
    </header>
  );
}