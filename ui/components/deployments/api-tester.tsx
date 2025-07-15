'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Copy, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ApiTesterProps {
  deployment: {
    model_name: string;
    version: string;
    task_type: string;
    api?: {
      url: string;
      port: number;
    };
  };
}

export function ApiTester({ deployment }: ApiTesterProps) {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestTime, setRequestTime] = useState<number | null>(null);

  // Classification state
  const [classificationData, setClassificationData] = useState('[[1.0, 2.0, 3.0, 4.0]]');
  const [returnProba, setReturnProba] = useState(false);

  // Regression state
  const [regressionData, setRegressionData] = useState('[[1.0, 2.0, 3.0, 4.0]]');

  // LLM state
  const [prompt, setPrompt] = useState('Hello, how can you help me today?');
  const [maxTokens, setMaxTokens] = useState(100);
  const [temperature, setTemperature] = useState(0.7);

  const apiUrl = deployment.api?.url || `http://localhost:${deployment.api?.port || 8000}`;

  const sendRequest = async (endpoint: string, payload: any) => {
    setLoading(true);
    setError(null);
    setResponse(null);

    const startTime = Date.now();

    try {
      const res = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const endTime = Date.now();
      setRequestTime(endTime - startTime);

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Request failed');
      }

      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClassificationTest = () => {
    try {
      const data = JSON.parse(classificationData);
      sendRequest('/predict', {
        data,
        return_proba: returnProba,
      });
    } catch (err) {
      toast.error('Invalid JSON data');
    }
  };

  const handleRegressionTest = () => {
    try {
      const data = JSON.parse(regressionData);
      sendRequest('/predict', { data });
    } catch (err) {
      toast.error('Invalid JSON data');
    }
  };

  const handleLLMTest = () => {
    sendRequest('/generate', {
      prompt,
      max_tokens: maxTokens,
      temperature,
    });
  };

  const copyResponse = () => {
    if (response) {
      navigator.clipboard.writeText(JSON.stringify(response, null, 2));
      toast.success('Response copied to clipboard');
    }
  };

  const downloadResponse = () => {
    if (response) {
      const blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${deployment.model_name}-response.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const getCurlCommand = () => {
    let endpoint = '';
    let payload = {};

    if (deployment.task_type === 'classification') {
      endpoint = '/predict';
      payload = {
        data: JSON.parse(classificationData),
        return_proba: returnProba,
      };
    } else if (deployment.task_type === 'regression') {
      endpoint = '/predict';
      payload = { data: JSON.parse(regressionData) };
    } else if (deployment.task_type === 'llm') {
      endpoint = '/generate';
      payload = { prompt, max_tokens: maxTokens, temperature };
    }

    return `curl -X POST ${apiUrl}${endpoint} \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(payload, null, 2)}'`;
  };

  const renderTestInterface = () => {
    switch (deployment.task_type) {
      case 'classification':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="class-data">Input Data (JSON Array)</Label>
              <Textarea
                id="class-data"
                value={classificationData}
                onChange={(e) => setClassificationData(e.target.value)}
                placeholder="[[1.0, 2.0, 3.0, 4.0]]"
                className="font-mono h-24"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="return-proba"
                checked={returnProba}
                onCheckedChange={setReturnProba}
              />
              <Label htmlFor="return-proba">Return Probabilities</Label>
            </div>
            <Button onClick={handleClassificationTest} disabled={loading} className="w-full">
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Test Prediction
            </Button>
          </div>
        );

      case 'regression':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reg-data">Input Data (JSON Array)</Label>
              <Textarea
                id="reg-data"
                value={regressionData}
                onChange={(e) => setRegressionData(e.target.value)}
                placeholder="[[1.0, 2.0, 3.0, 4.0]]"
                className="font-mono h-24"
              />
            </div>
            <Button onClick={handleRegressionTest} disabled={loading} className="w-full">
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Test Prediction
            </Button>
          </div>
        );

      case 'llm':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your prompt here..."
                className="h-24"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-tokens">Max Tokens: {maxTokens}</Label>
              <Slider
                id="max-tokens"
                value={[maxTokens]}
                onValueChange={(value) => setMaxTokens(value[0])}
                min={10}
                max={500}
                step={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature: {temperature}</Label>
              <Slider
                id="temperature"
                value={[temperature]}
                onValueChange={(value) => setTemperature(value[0])}
                min={0}
                max={2}
                step={0.1}
              />
            </div>
            <Button onClick={handleLLMTest} disabled={loading} className="w-full">
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Generate Text
            </Button>
          </div>
        );

      default:
        return <p className="text-muted-foreground">Unsupported model type for testing</p>;
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="test" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="test">Test</TabsTrigger>
          <TabsTrigger value="response">Response</TabsTrigger>
          <TabsTrigger value="curl">cURL</TabsTrigger>
        </TabsList>

        <TabsContent value="test" className="mt-4">
          {renderTestInterface()}
        </TabsContent>

        <TabsContent value="response" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {requestTime && (
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="secondary">
                    Response Time: {requestTime}ms
                  </Badge>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={copyResponse}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={downloadResponse}>
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              {error ? (
                <div className="text-destructive">
                  <p className="font-semibold">Error:</p>
                  <p className="text-sm">{error}</p>
                </div>
              ) : response ? (
                <SyntaxHighlighter
                  language="json"
                  style={tomorrow}
                  customStyle={{
                    margin: 0,
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                  }}
                >
                  {JSON.stringify(response, null, 2)}
                </SyntaxHighlighter>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Make a request to see the response
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="curl" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  Copy this command to test from terminal
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(getCurlCommand());
                    toast.success('Command copied to clipboard');
                  }}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
              </div>
              <SyntaxHighlighter
                language="bash"
                style={tomorrow}
                customStyle={{
                  margin: 0,
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                }}
              >
                {getCurlCommand()}
              </SyntaxHighlighter>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}