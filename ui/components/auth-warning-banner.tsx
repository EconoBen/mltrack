'use client';

import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MissingEnvVar {
  name: string;
  description: string;
  example: string;
  required: boolean;
}

export function AuthWarningBanner() {
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<string | null>(null);
  const [missingVars, setMissingVars] = useState<MissingEnvVar[]>([]);

  useEffect(() => {
    // Check auth status
    fetch('/api/auth/status')
      .then(res => res.json())
      .then(data => {
        setAuthMode(data.mode);
        if (data.mode === 'development' || data.mode === 'disabled') {
          setMissingVars(data.missingVars || []);
        } else {
          setIsVisible(false);
        }
      })
      .catch(() => {
        setAuthMode('error');
      });
  }, []);

  const copyToClipboard = (text: string, varName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedVar(varName);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  if (!isVisible || authMode === 'production') {
    return null;
  }

  const isDevelopmentMode = authMode === 'development' || authMode === 'disabled';

  return (
    <div className="relative z-40 p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <Alert className={cn(
        "relative",
        isDevelopmentMode ? "border-yellow-500/50 bg-yellow-500/10" : "border-destructive/50 bg-destructive/10"
      )}>
        <AlertTriangle className="h-4 w-4 text-yellow-500" />
        <AlertTitle className="pr-8">
          {isDevelopmentMode ? '⚠️ Development Mode Active' : '❌ Authentication Error'}
        </AlertTitle>
        <AlertDescription>
          <div className="space-y-2">
            <p className="text-sm">
              {isDevelopmentMode 
                ? 'MLTrack is running with mock authentication. Configure environment variables for production use.'
                : 'Authentication configuration error detected.'}
            </p>
            
            {missingVars.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-2"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Show Missing Variables ({missingVars.filter(v => v.required).length} required, {missingVars.filter(v => !v.required).length} optional)
                  </>
                )}
              </Button>
            )}

            {isExpanded && missingVars.length > 0 && (
              <div className="mt-4 space-y-3 border-t pt-4">
                <p className="text-sm font-semibold">Missing Environment Variables:</p>
                {missingVars.map((envVar) => (
                  <div key={envVar.name} className="bg-background/50 p-3 rounded-md space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                            {envVar.name}
                          </code>
                          {envVar.required && (
                            <span className="text-xs bg-red-500/20 text-red-500 px-2 py-0.5 rounded">
                              Required
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {envVar.description}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(envVar.example, envVar.name)}
                      >
                        {copiedVar === envVar.name ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    <div className="bg-muted/50 p-2 rounded text-xs font-mono">
                      {envVar.example}
                    </div>
                  </div>
                ))}
                
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-semibold mb-2">Quick Setup:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Create a file named <code className="bg-muted px-1 py-0.5 rounded">.env.local</code> in the <code className="bg-muted px-1 py-0.5 rounded">ui</code> directory</li>
                    <li>Copy the missing variables above into the file</li>
                    <li>Generate a secret: <code className="bg-muted px-1 py-0.5 rounded">openssl rand -base64 32</code></li>
                    <li>Restart the development server</li>
                  </ol>
                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => window.location.href = '/setup'}
                    >
                      Configure Now
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        localStorage.removeItem('mltrack-auth-choice');
                        localStorage.removeItem('mltrack-skip-welcome');
                        window.location.href = '/welcome';
                      }}
                    >
                      Change Auth Mode
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </AlertDescription>
        
        <Button
          size="sm"
          variant="ghost"
          className="absolute top-2 right-2"
          onClick={() => setIsVisible(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </Alert>
    </div>
  );
}