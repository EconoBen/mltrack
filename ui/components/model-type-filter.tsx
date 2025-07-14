'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Filter, X } from 'lucide-react';

interface ModelTypeFilterProps {
  selectedTypes: string[];
  selectedFrameworks: string[];
  selectedTasks: string[];
  onTypesChange: (types: string[]) => void;
  onFrameworksChange: (frameworks: string[]) => void;
  onTasksChange: (tasks: string[]) => void;
  availableTypes?: string[];
  availableFrameworks?: string[];
  availableTasks?: string[];
}

export function ModelTypeFilter({
  selectedTypes,
  selectedFrameworks,
  selectedTasks,
  onTypesChange,
  onFrameworksChange,
  onTasksChange,
  availableTypes = ['ml', 'llm'],
  availableFrameworks = ['sklearn', 'xgboost', 'lightgbm', 'catboost', 'pytorch', 'tensorflow', 'openai', 'anthropic'],
  availableTasks = ['classification', 'regression', 'clustering', 'generation', 'embedding'],
}: ModelTypeFilterProps) {
  const activeFilters = [...selectedTypes, ...selectedFrameworks, ...selectedTasks];
  const hasFilters = activeFilters.length > 0;

  const clearAllFilters = () => {
    onTypesChange([]);
    onFrameworksChange([]);
    onTasksChange([]);
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <Filter className="h-4 w-4 mr-2" />
            Filter
            {hasFilters && (
              <Badge variant="secondary" className="ml-2 h-5 px-1">
                {activeFilters.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Model Types</DropdownMenuLabel>
          {availableTypes.map((type) => (
            <DropdownMenuCheckboxItem
              key={type}
              checked={selectedTypes.includes(type)}
              onCheckedChange={(checked) => {
                if (checked) {
                  onTypesChange([...selectedTypes, type]);
                } else {
                  onTypesChange(selectedTypes.filter((t) => t !== type));
                }
              }}
            >
              {type.toUpperCase()}
            </DropdownMenuCheckboxItem>
          ))}
          
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Frameworks</DropdownMenuLabel>
          {availableFrameworks.map((framework) => (
            <DropdownMenuCheckboxItem
              key={framework}
              checked={selectedFrameworks.includes(framework)}
              onCheckedChange={(checked) => {
                if (checked) {
                  onFrameworksChange([...selectedFrameworks, framework]);
                } else {
                  onFrameworksChange(selectedFrameworks.filter((f) => f !== framework));
                }
              }}
            >
              {framework}
            </DropdownMenuCheckboxItem>
          ))}
          
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Tasks</DropdownMenuLabel>
          {availableTasks.map((task) => (
            <DropdownMenuCheckboxItem
              key={task}
              checked={selectedTasks.includes(task)}
              onCheckedChange={(checked) => {
                if (checked) {
                  onTasksChange([...selectedTasks, task]);
                } else {
                  onTasksChange(selectedTasks.filter((t) => t !== task));
                }
              }}
            >
              {task}
            </DropdownMenuCheckboxItem>
          ))}
          
          {hasFilters && (
            <>
              <DropdownMenuSeparator />
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={clearAllFilters}
              >
                <X className="h-4 w-4 mr-2" />
                Clear all filters
              </Button>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {hasFilters && (
        <div className="flex flex-wrap gap-1">
          {selectedTypes.map((type) => (
            <Badge key={type} variant="secondary" className="text-xs">
              {type.toUpperCase()}
              <button
                className="ml-1 hover:text-destructive"
                onClick={() => onTypesChange(selectedTypes.filter((t) => t !== type))}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {selectedFrameworks.map((framework) => (
            <Badge key={framework} variant="outline" className="text-xs">
              {framework}
              <button
                className="ml-1 hover:text-destructive"
                onClick={() => onFrameworksChange(selectedFrameworks.filter((f) => f !== framework))}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {selectedTasks.map((task) => (
            <Badge key={task} variant="outline" className="text-xs">
              {task}
              <button
                className="ml-1 hover:text-destructive"
                onClick={() => onTasksChange(selectedTasks.filter((t) => t !== task))}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}