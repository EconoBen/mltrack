'use client';

import { useEffect } from 'react';
import { useMLflowStore } from '@/lib/store/mlflow-store';
import { DashboardOverview } from '@/components/dashboard-overview';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const { initialize, selectedExperiment } = useMLflowStore();
  
  // Redirect to experiment detail page if an experiment is selected
  useEffect(() => {
    if (selectedExperiment) {
      router.push(`/experiments/${selectedExperiment}`);
    }
  }, [selectedExperiment, router]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Always show dashboard overview since we redirect when experiment is selected */}
      <DashboardOverview />
    </main>
  );
}
