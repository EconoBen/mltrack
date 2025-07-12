'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutGrid, Table, List } from 'lucide-react';

export type ViewMode = 'table' | 'grid' | 'compact';

interface ViewSwitcherProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}

export function ViewSwitcher({ value, onChange }: ViewSwitcherProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as ViewMode)}>
      <TabsList>
        <TabsTrigger value="table" className="gap-2">
          <Table className="h-4 w-4" />
          Table
        </TabsTrigger>
        <TabsTrigger value="grid" className="gap-2">
          <LayoutGrid className="h-4 w-4" />
          Grid
        </TabsTrigger>
        <TabsTrigger value="compact" className="gap-2">
          <List className="h-4 w-4" />
          Compact
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}