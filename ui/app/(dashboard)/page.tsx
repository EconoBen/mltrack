'use client';

import { useEffect } from 'react';
import { useMLflowStore } from '@/lib/store/mlflow-store';
import { DashboardOverview } from '@/components/dashboard-overview';

export default function DashboardPage() {
  const { initialize, clearSelection } = useMLflowStore();

  useEffect(() => {
    // Clear any selected experiment when returning to dashboard
    clearSelection();
    initialize();
  }, [initialize, clearSelection]);

  return (
    <main className="container mx-auto px-4 py-8">
      <DashboardOverview />
    </main>
  );
}
