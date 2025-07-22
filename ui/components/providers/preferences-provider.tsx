'use client';

import { useEffect } from 'react';
import { usePreferences } from '@/lib/hooks/use-preferences';

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const { preferences } = usePreferences();

  // Apply theme preference
  useEffect(() => {
    if (preferences.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        document.documentElement.classList.toggle('dark', e.matches);
      };
      
      document.documentElement.classList.toggle('dark', mediaQuery.matches);
      mediaQuery.addEventListener('change', handleChange);
      
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      document.documentElement.classList.toggle('dark', preferences.theme === 'dark');
    }
  }, [preferences.theme]);

  // Apply animation preference
  useEffect(() => {
    if (!preferences.display.animationsEnabled) {
      document.documentElement.style.setProperty('--animation-duration', '0s');
      document.documentElement.classList.add('no-animations');
    } else {
      document.documentElement.style.removeProperty('--animation-duration');
      document.documentElement.classList.remove('no-animations');
    }
  }, [preferences.display.animationsEnabled]);

  return <>{children}</>;
}