"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
  Handle,
  NodeProps,
  getBezierPath,
  EdgeProps,
} from "reactflow";
import "reactflow/dist/style.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileIcon,
  DatabaseIcon,
  CloudIcon,
  GitBranchIcon,
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  LayersIcon,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Node types
const nodeTypes = {
  dataSource: DataSourceNode,
  transformation: TransformationNode,
  run: RunNode,
};

// Custom node components
function DataSourceNode({ data }: NodeProps) {
  const Icon = getDataSourceIcon(data.sourceType);
  
  return (
    <div className={cn(
      "px-4 py-3 rounded-lg border-2 bg-background",
      "hover:shadow-lg transition-shadow",
      data.isInput ? "border-blue-500" : "border-green-500"
    )}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3"
        style={{ background: "#6366f1" }}
      />
      
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <div>
          <div className="font-medium text-sm">{data.label}</div>
          <div className="text-xs text-muted-foreground">{data.format || data.sourceType}</div>
          {data.size && (
            <div className="text-xs text-muted-foreground">{formatBytes(data.size)}</div>
          )}
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3"
        style={{ background: "#10b981" }}
      />
    </div>
  );
}

function TransformationNode({ data }: NodeProps) {
  return (
    <div className="px-4 py-3 rounded-lg border-2 border-purple-500 bg-background hover:shadow-lg transition-shadow">
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3"
        style={{ background: "#8b5cf6" }}
      />
      
      <div className="flex items-center gap-2">
        <LayersIcon className="h-5 w-5 text-purple-600" />
        <div>
          <div className="font-medium text-sm">{data.label}</div>
          <div className="text-xs text-muted-foreground">{data.transformType}</div>
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3"
        style={{ background: "#8b5cf6" }}
      />
    </div>
  );
}

function RunNode({ data }: NodeProps) {
  const StatusIcon = data.status === "FINISHED" ? CheckCircleIcon : 
                     data.status === "FAILED" ? XCircleIcon : 
                     data.status === "RUNNING" ? PlayIcon : ClockIcon;
  
  const statusColor = data.status === "FINISHED" ? "text-green-600" : 
                      data.status === "FAILED" ? "text-red-600" : 
                      data.status === "RUNNING" ? "text-blue-600" : "text-gray-600";
  
  return (
    <div className="px-4 py-3 rounded-lg border-2 border-orange-500 bg-background hover:shadow-lg transition-shadow min-w-[200px]">
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3"
        style={{ background: "#f97316" }}
      />
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="font-medium text-sm">{data.label}</div>
          <StatusIcon className={cn("h-4 w-4", statusColor)} />
        </div>
        
        <div className="text-xs text-muted-foreground">
          {data.experimentName}
        </div>
        
        {data.metrics && (
          <div className="flex gap-2 flex-wrap">
            {Object.entries(data.metrics).slice(0, 3).map(([key, value]) => (
              <Badge key={key} variant="secondary" className="text-xs">
                {key}: {typeof value === "number" ? value.toFixed(3) : value}
              </Badge>
            ))}
          </div>
        )}
        
        <div className="text-xs text-muted-foreground">
          {format(new Date(data.startTime), "MMM d, HH:mm")}
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3"
        style={{ background: "#f97316" }}
      />
    </div>
  );
}

// Helper functions
function getDataSourceIcon(sourceType: string) {
  switch (sourceType) {
    case "file":
      return FileIcon;
    case "database":
      return DatabaseIcon;
    case "s3":
    case "gcs":
    case "azure_blob":
      return CloudIcon;
    default:
      return FileIcon;
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

interface LineageData {
  run_id: string;
  inputs: Array<{
    source_id: string;
    source_type: string;
    location: string;
    format?: string;
    size_bytes?: number;
  }>;
  outputs: Array<{
    source_id: string;
    source_type: string;
    location: string;
    format?: string;
  }>;
  transformations: Array<{
    transform_id: string;
    transform_type: string;
    name: string;
    description?: string;
  }>;
  parent_runs: string[];
  child_runs: string[];
}

interface DataLineageGraphProps {
  runId: string;
  runData?: any;
  onRunClick?: (runId: string) => void;
}

export function DataLineageGraph({ runId, runData, onRunClick }: DataLineageGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [lineageData, setLineageData] = useState<LineageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch lineage data
  useEffect(() => {
    async function fetchLineage() {
      try {
        setLoading(true);
        // In a real app, this would fetch from the API
        // For now, we'll simulate with the runData
        
        if (runData?.data?.artifacts?.["lineage/lineage.json"]) {
          // Simulate fetching the lineage artifact
          const mockLineage: LineageData = {
            run_id: runId,
            inputs: [
              {
                source_id: "src1",
                source_type: "file",
                location: "data/raw_data.csv",
                format: "csv",
                size_bytes: 1024000,
              },
            ],
            outputs: [
              {
                source_id: "out1",
                source_type: "file",
                location: "models/model.pkl",
                format: "pkl",
              },
            ],
            transformations: [
              {
                transform_id: "t1",
                transform_type: "preprocessing",
                name: "clean_data",
                description: "Remove missing values",
              },
              {
                transform_id: "t2",
                transform_type: "feature_engineering",
                name: "create_features",
                description: "Generate derived features",
              },
            ],
            parent_runs: runData?.data?.tags?.["mltrack.lineage.parent_runs"]?.split(",") || [],
            child_runs: runData?.data?.tags?.["mltrack.lineage.child_runs"]?.split(",") || [],
          };
          
          setLineageData(mockLineage);
        }
      } catch (err) {
        setError("Failed to load lineage data");
      } finally {
        setLoading(false);
      }
    }

    fetchLineage();
  }, [runId, runData]);

  // Build graph from lineage data
  useEffect(() => {
    if (!lineageData) return;

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    let yOffset = 0;

    // Add input nodes
    lineageData.inputs.forEach((input, idx) => {
      newNodes.push({
        id: input.source_id,
        type: "dataSource",
        position: { x: idx * 250, y: yOffset },
        data: {
          label: input.location.split("/").pop(),
          sourceType: input.source_type,
          format: input.format,
          size: input.size_bytes,
          isInput: true,
        },
      });
    });

    yOffset += 150;

    // Add transformation nodes
    lineageData.transformations.forEach((transform, idx) => {
      const nodeId = transform.transform_id;
      newNodes.push({
        id: nodeId,
        type: "transformation",
        position: { x: idx * 250, y: yOffset },
        data: {
          label: transform.name,
          transformType: transform.transform_type,
          description: transform.description,
        },
      });

      // Connect inputs to first transformation
      if (idx === 0) {
        lineageData.inputs.forEach((input) => {
          newEdges.push({
            id: `${input.source_id}-${nodeId}`,
            source: input.source_id,
            target: nodeId,
            animated: true,
            style: { stroke: "#6366f1" },
          });
        });
      }

      // Connect transformations
      if (idx > 0) {
        const prevTransform = lineageData.transformations[idx - 1];
        newEdges.push({
          id: `${prevTransform.transform_id}-${nodeId}`,
          source: prevTransform.transform_id,
          target: nodeId,
          animated: true,
          style: { stroke: "#8b5cf6" },
        });
      }
    });

    yOffset += 150;

    // Add current run node
    const runNode: Node = {
      id: runId,
      type: "run",
      position: { x: 100, y: yOffset },
      data: {
        label: runData?.info?.run_name || "Current Run",
        status: runData?.info?.status,
        experimentName: runData?.experiment?.name,
        metrics: runData?.data?.metrics,
        startTime: runData?.info?.start_time,
      },
    };
    newNodes.push(runNode);

    // Connect last transformation to run
    if (lineageData.transformations.length > 0) {
      const lastTransform = lineageData.transformations[lineageData.transformations.length - 1];
      newEdges.push({
        id: `${lastTransform.transform_id}-${runId}`,
        source: lastTransform.transform_id,
        target: runId,
        animated: true,
        style: { stroke: "#f97316" },
      });
    }

    yOffset += 150;

    // Add output nodes
    lineageData.outputs.forEach((output, idx) => {
      newNodes.push({
        id: output.source_id,
        type: "dataSource",
        position: { x: idx * 250, y: yOffset },
        data: {
          label: output.location.split("/").pop(),
          sourceType: output.source_type,
          format: output.format,
          isInput: false,
        },
      });

      // Connect run to outputs
      newEdges.push({
        id: `${runId}-${output.source_id}`,
        source: runId,
        target: output.source_id,
        animated: true,
        style: { stroke: "#10b981" },
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [lineageData, runId, runData, setNodes, setEdges]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (node.type === "run" && onRunClick) {
      onRunClick(node.id);
    }
  }, [onRunClick]);

  if (loading) {
    return (
      <Card>
        <CardContent className="h-96 flex items-center justify-center">
          <div className="text-muted-foreground">Loading lineage graph...</div>
        </CardContent>
      </Card>
    );
  }

  if (error || !lineageData) {
    return (
      <Card>
        <CardContent className="h-96 flex items-center justify-center">
          <div className="text-center space-y-2">
            <GitBranchIcon className="h-12 w-12 text-muted-foreground mx-auto" />
            <div className="text-muted-foreground">
              {error || "No lineage data available for this run"}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Data Lineage</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[600px] border rounded-lg">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
          >
            <Background />
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                if (node.type === "dataSource") {
                  return node.data.isInput ? "#3b82f6" : "#10b981";
                }
                if (node.type === "transformation") return "#8b5cf6";
                if (node.type === "run") return "#f97316";
                return "#6b7280";
              }}
            />
          </ReactFlow>
        </div>

        {/* Legend */}
        <div className="mt-4 flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500" />
            <span>Input Data</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-purple-500" />
            <span>Transformation</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-orange-500" />
            <span>Run</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500" />
            <span>Output Data</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}