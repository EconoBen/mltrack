'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Database, 
  HardDrive, 
  Hash, 
  FileText, 
  Download,
  Calendar,
  FileType,
  Layers
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DataReference {
  hash: string;
  storage_path: string;
  size_bytes: number;
  format: string;
  shape?: number[];
  columns?: string[];
  dtype?: string | Record<string, string>;
  created_at: string;
}

interface RunDataInfoProps {
  runId: string;
  runType?: string;
  inputs?: Record<string, DataReference>;
  outputs?: Record<string, DataReference>;
  storageLocations?: string[];
}

export function RunDataInfo({ 
  runId, 
  runType = 'experiment',
  inputs = {},
  outputs = {},
  storageLocations = []
}: RunDataInfoProps) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getRunTypeBadgeVariant = (type: string) => {
    switch (type.toLowerCase()) {
      case 'production': return 'default';
      case 'experiment': return 'secondary';
      case 'evaluation': return 'outline';
      case 'development': return 'secondary';
      default: return 'outline';
    }
  };

  const totalInputSize = Object.values(inputs).reduce((sum, ref) => sum + ref.size_bytes, 0);
  const totalOutputSize = Object.values(outputs).reduce((sum, ref) => sum + ref.size_bytes, 0);

  return (
    <div className="space-y-4">
      {/* Run Type and Storage Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Run Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Run Type</span>
            <Badge variant={getRunTypeBadgeVariant(runType)}>
              {runType.toUpperCase()}
            </Badge>
          </div>
          
          {storageLocations.length > 0 && (
            <div>
              <span className="text-sm text-muted-foreground">Storage Locations</span>
              <div className="mt-1 space-y-1">
                {storageLocations.map((location, idx) => (
                  <div key={idx} className="text-xs font-mono bg-muted p-2 rounded">
                    {location}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Input Data */}
      {Object.keys(inputs).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Input Data
            </CardTitle>
            <CardDescription>
              {Object.keys(inputs).length} datasets • {formatBytes(totalInputSize)} total
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(inputs).map(([name, ref]) => (
                <DataReferenceCard key={name} name={name} reference={ref} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Output Data */}
      {Object.keys(outputs).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Output Data
            </CardTitle>
            <CardDescription>
              {Object.keys(outputs).length} datasets • {formatBytes(totalOutputSize)} total
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(outputs).map(([name, ref]) => (
                <DataReferenceCard key={name} name={name} reference={ref} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DataReferenceCard({ name, reference }: { name: string; reference: DataReference }) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="font-medium flex items-center gap-2">
            <FileType className="h-4 w-4" />
            {name}
          </div>
          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Hash className="h-3 w-3" />
              {reference.hash.slice(0, 8)}...
            </span>
            <span>{formatBytes(reference.size_bytes)}</span>
            <Badge variant="outline" className="text-xs">
              {reference.format.toUpperCase()}
            </Badge>
          </div>
        </div>
        <Button variant="ghost" size="sm">
          <Download className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Additional metadata */}
      <div className="text-xs text-muted-foreground space-y-1">
        {reference.shape && (
          <div>Shape: {reference.shape.join(' × ')}</div>
        )}
        {reference.columns && reference.columns.length > 0 && (
          <div>
            Columns: {reference.columns.slice(0, 3).join(', ')}
            {reference.columns.length > 3 && ` +${reference.columns.length - 3} more`}
          </div>
        )}
        {reference.created_at && (
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Stored {formatDistanceToNow(new Date(reference.created_at), { addSuffix: true })}
          </div>
        )}
      </div>
      
      {/* Storage path indicator */}
      {reference.storage_path.includes('s3://') && (
        <div className="flex items-center gap-1 text-xs text-green-600">
          <Database className="h-3 w-3" />
          Content-addressable storage (deduplicated)
        </div>
      )}
    </div>
  );
}