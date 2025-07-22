"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/lib/hooks/use-debounce";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  FlaskConical,
  Activity,
  Brain,
  BarChart,
  Clock,
  FileText,
  Tag,
  User,
  Calendar,
  TrendingUp,
  ChevronRight,
  Loader2,
  Command,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { MLflowClient } from "@/lib/api/mlflow";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

type SearchResultType = 
  | "experiment" 
  | "run" 
  | "model" 
  | "metric" 
  | "tag" 
  | "user"
  | "artifact";

interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  metadata?: Record<string, any>;
  relevance: number;
  icon: React.ComponentType<{ className?: string }>;
  url: string;
}

interface SearchGroup {
  type: SearchResultType;
  label: string;
  results: SearchResult[];
}

const typeConfig: Record<SearchResultType, {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
}> = {
  experiment: {
    icon: FlaskConical,
    label: "Experiments",
    color: "text-blue-600 bg-blue-100 dark:bg-blue-900/20",
  },
  run: {
    icon: Activity,
    label: "Runs",
    color: "text-green-600 bg-green-100 dark:bg-green-900/20",
  },
  model: {
    icon: Brain,
    label: "Models",
    color: "text-purple-600 bg-purple-100 dark:bg-purple-900/20",
  },
  metric: {
    icon: TrendingUp,
    label: "Metrics",
    color: "text-orange-600 bg-orange-100 dark:bg-orange-900/20",
  },
  tag: {
    icon: Tag,
    label: "Tags",
    color: "text-cyan-600 bg-cyan-100 dark:bg-cyan-900/20",
  },
  user: {
    icon: User,
    label: "Users",
    color: "text-pink-600 bg-pink-100 dark:bg-pink-900/20",
  },
  artifact: {
    icon: FileText,
    label: "Artifacts",
    color: "text-gray-600 bg-gray-100 dark:bg-gray-900/20",
  },
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const debouncedQuery = useDebounce(query, 300);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Search query
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["global-search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return [];

      const client = new MLflowClient({ 
        baseUrl: process.env.NEXT_PUBLIC_MLFLOW_URL || "/api/mlflow" 
      });

      const results: SearchResult[] = [];
      const searchLower = debouncedQuery.toLowerCase();

      try {
        // Search experiments
        const experiments = await client.searchExperiments();
        experiments.forEach((exp) => {
          const relevance = calculateRelevance(exp.name, searchLower);
          if (relevance > 0) {
            results.push({
              id: exp.experiment_id,
              type: "experiment",
              title: exp.name,
              subtitle: `Created ${formatDistanceToNow(new Date(exp.creation_time))} ago`,
              metadata: {
                runCount: exp.latest_runs?.length || 0,
                lastActive: exp.last_update_time,
              },
              relevance,
              icon: FlaskConical,
              url: `/experiments/${exp.experiment_id}`,
            });
          }
        });

        // Search runs (from all experiments)
        const allRuns = await client.searchRuns(
          experiments.map(e => e.experiment_id)
        );
        
        allRuns.forEach((run) => {
          // Search in run ID, tags, and metrics
          let relevance = 0;
          
          // Check run ID
          if (run.info.run_id.toLowerCase().includes(searchLower)) {
            relevance = 0.8;
          }
          
          // Check tags
          Object.entries(run.data.tags || {}).forEach(([key, value]) => {
            if (
              key.toLowerCase().includes(searchLower) || 
              value.toLowerCase().includes(searchLower)
            ) {
              relevance = Math.max(relevance, 0.7);
            }
          });
          
          // Check metrics
          Object.keys(run.data.metrics || {}).forEach((metricName) => {
            if (metricName.toLowerCase().includes(searchLower)) {
              relevance = Math.max(relevance, 0.6);
            }
          });
          
          if (relevance > 0) {
            const experiment = experiments.find(
              e => e.experiment_id === run.info.experiment_id
            );
            
            results.push({
              id: run.info.run_id,
              type: "run",
              title: run.info.run_id.slice(0, 8) + "...",
              subtitle: `${experiment?.name || "Unknown"} • ${formatDistanceToNow(
                new Date(run.info.start_time)
              )} ago`,
              metadata: {
                status: run.info.status,
                experimentName: experiment?.name,
                duration: run.info.end_time 
                  ? run.info.end_time - run.info.start_time 
                  : null,
              },
              relevance,
              icon: Activity,
              url: `/experiments/${run.info.experiment_id}/runs/${run.info.run_id}`,
            });
          }
        });

        // Search models (from tags)
        const modelSet = new Set<string>();
        allRuns.forEach((run) => {
          const modelName = run.data.tags?.["mlflow.source.name"] || 
                           run.data.tags?.["model.name"] ||
                           run.data.tags?.["llm.model"];
          if (modelName && modelName.toLowerCase().includes(searchLower)) {
            modelSet.add(modelName);
          }
        });
        
        modelSet.forEach((modelName) => {
          results.push({
            id: modelName,
            type: "model",
            title: modelName,
            subtitle: "Registered model",
            relevance: calculateRelevance(modelName, searchLower),
            icon: Brain,
            url: `/models/${encodeURIComponent(modelName)}`,
          });
        });

        // Search metrics
        const metricSet = new Set<string>();
        allRuns.forEach((run) => {
          Object.keys(run.data.metrics || {}).forEach((metricName) => {
            if (metricName.toLowerCase().includes(searchLower)) {
              metricSet.add(metricName);
            }
          });
        });
        
        metricSet.forEach((metricName) => {
          results.push({
            id: metricName,
            type: "metric",
            title: metricName,
            subtitle: "Tracked metric",
            relevance: calculateRelevance(metricName, searchLower) * 0.8,
            icon: TrendingUp,
            url: `/search?metric=${encodeURIComponent(metricName)}`,
          });
        });

        // Search users
        const userSet = new Set<string>();
        allRuns.forEach((run) => {
          const userId = run.data.tags?.["mltrack.user.id"] || 
                        run.data.tags?.["mlflow.user"];
          if (userId && userId.toLowerCase().includes(searchLower)) {
            userSet.add(userId);
          }
        });
        
        userSet.forEach((userId) => {
          results.push({
            id: userId,
            type: "user",
            title: userId,
            subtitle: "User",
            relevance: calculateRelevance(userId, searchLower) * 0.7,
            icon: User,
            url: `/users/${encodeURIComponent(userId)}`,
          });
        });

      } catch (error) {
        console.error("Search error:", error);
      }

      // Sort by relevance and group by type
      return results.sort((a, b) => b.relevance - a.relevance);
    },
    enabled: debouncedQuery.length >= 2,
  });

  // Group results by type
  const groupedResults = useCallback(() => {
    if (!searchResults || searchResults.length === 0) return [];

    const groups: Record<SearchResultType, SearchResult[]> = {
      experiment: [],
      run: [],
      model: [],
      metric: [],
      tag: [],
      user: [],
      artifact: [],
    };

    searchResults.forEach((result) => {
      groups[result.type].push(result);
    });

    return Object.entries(groups)
      .filter(([_, results]) => results.length > 0)
      .map(([type, results]) => ({
        type: type as SearchResultType,
        label: typeConfig[type as SearchResultType].label,
        results: results.slice(0, 5), // Limit to 5 per group
      }));
  }, [searchResults]);

  // Calculate total results for navigation
  const flatResults = groupedResults().flatMap(group => group.results);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) {
        // Global shortcut to open search
        if ((e.metaKey || e.ctrlKey) && e.key === "k") {
          e.preventDefault();
          setOpen(true);
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => 
            prev < flatResults.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => 
            prev > 0 ? prev - 1 : flatResults.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (flatResults[selectedIndex]) {
            handleSelect(flatResults[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setOpen(false);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, selectedIndex, flatResults]);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current && flatResults.length > 0) {
      const selectedElement = resultsRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      selectedElement?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, flatResults.length]);

  const handleSelect = (result: SearchResult) => {
    router.push(result.url);
    setOpen(false);
  };

  return (
    <>
      {/* Search Trigger */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted/50 hover:bg-muted rounded-md transition-colors"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-background border rounded">
          <Command className="h-3 w-3" />K
        </kbd>
      </button>

      {/* Search Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-0 gap-0">
          <DialogHeader className="px-4 py-3 border-b">
            <DialogTitle className="sr-only">Search MLTrack</DialogTitle>
            <div className="flex items-center gap-3">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search experiments, runs, models, metrics..."
                className="flex-1 border-0 bg-transparent p-0 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              {isLoading && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[400px]">
            <div ref={resultsRef} className="p-2">
              {query.length < 2 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <p className="text-sm">Type at least 2 characters to search</p>
                  <div className="mt-4 space-y-2">
                    <p className="text-xs">Try searching for:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <Badge variant="secondary">experiment names</Badge>
                      <Badge variant="secondary">run IDs</Badge>
                      <Badge variant="secondary">model types</Badge>
                      <Badge variant="secondary">metrics</Badge>
                    </div>
                  </div>
                </div>
              ) : groupedResults().length === 0 && !isLoading ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p className="text-sm">No results found for "{query}"</p>
                  <p className="text-xs mt-2">Try different keywords or check your spelling</p>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    {groupedResults().map((group, groupIndex) => {
                      const groupStartIndex = groupedResults()
                        .slice(0, groupIndex)
                        .reduce((sum, g) => sum + g.results.length, 0);

                      return (
                        <div key={group.type}>
                          <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground">
                            {React.createElement(typeConfig[group.type].icon, {
                              className: "h-3 w-3",
                            })}
                            {group.label}
                          </div>
                          <div className="space-y-1">
                            {group.results.map((result, index) => {
                              const globalIndex = groupStartIndex + index;
                              const isSelected = selectedIndex === globalIndex;
                              
                              return (
                                <button
                                  key={result.id}
                                  data-index={globalIndex}
                                  onClick={() => handleSelect(result)}
                                  className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors",
                                    isSelected
                                      ? "bg-accent text-accent-foreground"
                                      : "hover:bg-accent/50"
                                  )}
                                >
                                  <div className={cn(
                                    "p-1.5 rounded",
                                    typeConfig[result.type].color
                                  )}>
                                    {React.createElement(result.icon, {
                                      className: "h-4 w-4",
                                    })}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">
                                      {result.title}
                                    </div>
                                    {result.subtitle && (
                                      <div className="text-xs text-muted-foreground truncate">
                                        {result.subtitle}
                                      </div>
                                    )}
                                  </div>
                                  {isSelected && (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </ScrollArea>

          {flatResults.length > 0 && (
            <div className="px-4 py-2 border-t text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 bg-muted rounded text-xs">↑↓</kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 bg-muted rounded text-xs">↵</kbd>
                    Open
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 bg-muted rounded text-xs">ESC</kbd>
                    Close
                  </span>
                </div>
                <span>{flatResults.length} results</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Calculate relevance score
function calculateRelevance(text: string, query: string): number {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Exact match
  if (textLower === queryLower) return 1;
  
  // Starts with query
  if (textLower.startsWith(queryLower)) return 0.9;
  
  // Contains query
  if (textLower.includes(queryLower)) return 0.7;
  
  // Fuzzy match (simple implementation)
  const queryChars = queryLower.split("");
  let matchIndex = 0;
  for (const char of textLower) {
    if (char === queryChars[matchIndex]) {
      matchIndex++;
      if (matchIndex === queryChars.length) {
        return 0.5;
      }
    }
  }
  
  return 0;
}