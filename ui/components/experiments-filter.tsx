"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Filter,
  X,
  RotateCcw,
  Search,
  Calendar,
  User,
  Tag,
  Activity,
  Brain,
  BarChart,
  FlaskConical,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { DateRange } from "react-day-picker";
import { subDays, startOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

export interface ExperimentFilters {
  search: string;
  type: string[]; // ml, llm, mixed
  status: string[]; // active, archived
  dateRange?: DateRange;
  runStatus: string[]; // finished, failed, running
  minRuns: number;
  maxRuns: number;
  users: string[];
  tags: Record<string, string[]>;
  metrics: Record<string, { min?: number; max?: number }>;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

interface ExperimentFilterProps {
  filters: ExperimentFilters;
  onFiltersChange: (filters: ExperimentFilters) => void;
  availableUsers?: string[];
  availableTags?: Record<string, string[]>;
  availableMetrics?: string[];
}

const defaultFilters: ExperimentFilters = {
  search: "",
  type: [],
  status: ["active"],
  dateRange: undefined,
  runStatus: [],
  minRuns: 0,
  maxRuns: 1000,
  users: [],
  tags: {},
  metrics: {},
  sortBy: "updated",
  sortOrder: "desc",
};

export function ExperimentFilter({
  filters,
  onFiltersChange,
  availableUsers = [],
  availableTags = {},
  availableMetrics = [],
}: ExperimentFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<ExperimentFilters>(filters);

  const activeFilterCount = () => {
    let count = 0;
    if (localFilters.search) count++;
    if (localFilters.type.length > 0) count++;
    if (localFilters.status.length !== 1 || localFilters.status[0] !== "active") count++;
    if (localFilters.dateRange) count++;
    if (localFilters.runStatus.length > 0) count++;
    if (localFilters.minRuns > 0 || localFilters.maxRuns < 1000) count++;
    if (localFilters.users.length > 0) count++;
    if (Object.keys(localFilters.tags).length > 0) count++;
    if (Object.keys(localFilters.metrics).length > 0) count++;
    return count;
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const handleReset = () => {
    setLocalFilters(defaultFilters);
    onFiltersChange(defaultFilters);
  };

  const dateRangePresets = [
    {
      label: "Last 7 days",
      value: () => ({
        from: subDays(new Date(), 7),
        to: new Date(),
      }),
    },
    {
      label: "Last 30 days",
      value: () => ({
        from: subDays(new Date(), 30),
        to: new Date(),
      }),
    },
    {
      label: "This month",
      value: () => ({
        from: startOfMonth(new Date()),
        to: new Date(),
      }),
    },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          Filter
          {activeFilterCount() > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
              {activeFilterCount()}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filter Experiments</SheetTitle>
          <SheetDescription>
            Narrow down experiments based on various criteria
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by name or ID..."
                value={localFilters.search}
                onChange={(e) =>
                  setLocalFilters({ ...localFilters, search: e.target.value })
                }
                className="pl-8"
              />
            </div>
          </div>

          <Separator />

          {/* Experiment Type */}
          <div className="space-y-3">
            <Label>Experiment Type</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="type-ml"
                  checked={localFilters.type.includes("ml")}
                  onCheckedChange={(checked) => {
                    const types = checked
                      ? [...localFilters.type, "ml"]
                      : localFilters.type.filter((t) => t !== "ml");
                    setLocalFilters({ ...localFilters, type: types });
                  }}
                />
                <label
                  htmlFor="type-ml"
                  className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  <BarChart className="h-4 w-4 text-blue-600" />
                  Machine Learning
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="type-llm"
                  checked={localFilters.type.includes("llm")}
                  onCheckedChange={(checked) => {
                    const types = checked
                      ? [...localFilters.type, "llm"]
                      : localFilters.type.filter((t) => t !== "llm");
                    setLocalFilters({ ...localFilters, type: types });
                  }}
                />
                <label
                  htmlFor="type-llm"
                  className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  <Brain className="h-4 w-4 text-purple-600" />
                  Large Language Model
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="type-mixed"
                  checked={localFilters.type.includes("mixed")}
                  onCheckedChange={(checked) => {
                    const types = checked
                      ? [...localFilters.type, "mixed"]
                      : localFilters.type.filter((t) => t !== "mixed");
                    setLocalFilters({ ...localFilters, type: types });
                  }}
                />
                <label
                  htmlFor="type-mixed"
                  className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  <FlaskConical className="h-4 w-4 text-green-600" />
                  Mixed/Other
                </label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Status */}
          <div className="space-y-3">
            <Label>Status</Label>
            <RadioGroup
              value={localFilters.status[0] || "active"}
              onValueChange={(value) =>
                setLocalFilters({ ...localFilters, status: [value] })
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="active" id="status-active" />
                <label htmlFor="status-active" className="text-sm font-medium">
                  Active
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="archived" id="status-archived" />
                <label htmlFor="status-archived" className="text-sm font-medium">
                  Archived
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="status-all" />
                <label htmlFor="status-all" className="text-sm font-medium">
                  All
                </label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Date Range */}
          <div className="space-y-2">
            <Label>Created Date</Label>
            <DatePickerWithRange
              date={localFilters.dateRange}
              setDate={(range) =>
                setLocalFilters({ ...localFilters, dateRange: range })
              }
              className="w-full"
            />
          </div>

          <Separator />

          {/* Run Status */}
          <div className="space-y-3">
            <Label>Run Status</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="run-finished"
                  checked={localFilters.runStatus.includes("finished")}
                  onCheckedChange={(checked) => {
                    const statuses = checked
                      ? [...localFilters.runStatus, "finished"]
                      : localFilters.runStatus.filter((s) => s !== "finished");
                    setLocalFilters({ ...localFilters, runStatus: statuses });
                  }}
                />
                <label
                  htmlFor="run-finished"
                  className="flex items-center gap-2 text-sm font-medium leading-none"
                >
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Has Successful Runs
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="run-failed"
                  checked={localFilters.runStatus.includes("failed")}
                  onCheckedChange={(checked) => {
                    const statuses = checked
                      ? [...localFilters.runStatus, "failed"]
                      : localFilters.runStatus.filter((s) => s !== "failed");
                    setLocalFilters({ ...localFilters, runStatus: statuses });
                  }}
                />
                <label
                  htmlFor="run-failed"
                  className="flex items-center gap-2 text-sm font-medium leading-none"
                >
                  <XCircle className="h-4 w-4 text-red-600" />
                  Has Failed Runs
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="run-running"
                  checked={localFilters.runStatus.includes("running")}
                  onCheckedChange={(checked) => {
                    const statuses = checked
                      ? [...localFilters.runStatus, "running"]
                      : localFilters.runStatus.filter((s) => s !== "running");
                    setLocalFilters({ ...localFilters, runStatus: statuses });
                  }}
                />
                <label
                  htmlFor="run-running"
                  className="flex items-center gap-2 text-sm font-medium leading-none"
                >
                  <Clock className="h-4 w-4 text-blue-600" />
                  Has Running Runs
                </label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Run Count Range */}
          <div className="space-y-3">
            <Label>Number of Runs</Label>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>{localFilters.minRuns}</span>
                <span>{localFilters.maxRuns === 1000 ? "1000+" : localFilters.maxRuns}</span>
              </div>
              <Slider
                value={[localFilters.minRuns, localFilters.maxRuns]}
                onValueChange={([min, max]) =>
                  setLocalFilters({ ...localFilters, minRuns: min, maxRuns: max })
                }
                min={0}
                max={1000}
                step={10}
                className="w-full"
              />
            </div>
          </div>

          <Separator />

          {/* Users */}
          {availableUsers.length > 0 && (
            <>
              <div className="space-y-3">
                <Label>Users</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {availableUsers.map((user) => (
                    <div key={user} className="flex items-center space-x-2">
                      <Checkbox
                        id={`user-${user}`}
                        checked={localFilters.users.includes(user)}
                        onCheckedChange={(checked) => {
                          const users = checked
                            ? [...localFilters.users, user]
                            : localFilters.users.filter((u) => u !== user);
                          setLocalFilters({ ...localFilters, users });
                        }}
                      />
                      <label
                        htmlFor={`user-${user}`}
                        className="text-sm font-medium leading-none"
                      >
                        {user}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Sort */}
          <div className="space-y-3">
            <Label>Sort By</Label>
            <Select
              value={localFilters.sortBy}
              onValueChange={(value) =>
                setLocalFilters({ ...localFilters, sortBy: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="created">Created Date</SelectItem>
                <SelectItem value="updated">Last Updated</SelectItem>
                <SelectItem value="runs">Run Count</SelectItem>
              </SelectContent>
            </Select>
            <RadioGroup
              value={localFilters.sortOrder}
              onValueChange={(value) =>
                setLocalFilters({
                  ...localFilters,
                  sortOrder: value as "asc" | "desc",
                })
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="asc" id="sort-asc" />
                <label htmlFor="sort-asc" className="text-sm font-medium">
                  Ascending
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="desc" id="sort-desc" />
                <label htmlFor="sort-desc" className="text-sm font-medium">
                  Descending
                </label>
              </div>
            </RadioGroup>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleApply}>
              Apply Filters
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}