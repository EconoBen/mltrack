'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Code2, 
  Send, 
  Copy, 
  CheckCircle,
  ExternalLink,
  Loader2,
  Terminal,
  FileJson,
  Zap
} from 'lucide-react'
import { DeploymentStatusTracker } from '@/app/components/deployments/DeploymentStatusTracker'

interface Deployment {
  deployment_id: string
  status: string
  endpoint_url: string
  config: {
    model_name: string
    model_version: string
  }
}

interface ApiEndpoint {
  path: string
  method: string
  summary: string
  requestBody?: any
  responses: any
}

export default function DeploymentDetailPage() {
  const params = useParams()
  const deploymentId = params.deploymentId as string
  
  const [deployment, setDeployment] = useState<Deployment | null>(null)
  const [loading, setLoading] = useState(true)
  const [testLoading, setTestLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  
  // API testing state
  const [selectedEndpoint, setSelectedEndpoint] = useState('/predict')
  const [requestBody, setRequestBody] = useState(JSON.stringify({
    data: [[5.1, 3.5, 1.4, 0.2]],
    return_proba: true
  }, null, 2))
  const [response, setResponse] = useState<any>(null)
  const [responseTime, setResponseTime] = useState<number | null>(null)

  useEffect(() => {
    fetchDeployment()
  }, [deploymentId])

  const fetchDeployment = async () => {
    try {
      const res = await fetch(`/api/deployments/modal?deploymentId=${deploymentId}`)
      if (!res.ok) throw new Error('Failed to fetch deployment')
      const result = await res.json()
      if (result.success && result.data) {
        setDeployment(result.data)
      }
    } catch (error) {
      console.error('Error fetching deployment:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTest = async (endpoint: string, method: string = 'GET') => {
    if (!deployment?.endpoint_url) return
    
    setTestLoading(true)
    setResponse(null)
    setResponseTime(null)
    
    const startTime = Date.now()
    
    try {
      const options: RequestInit = {
        method,
        headers: method === 'POST' ? {
          'Content-Type': 'application/json'
        } : undefined,
        body: method === 'POST' ? requestBody : undefined
      }
      
      const res = await fetch(`${deployment.endpoint_url}${endpoint}`, options)
      const endTime = Date.now()
      setResponseTime(endTime - startTime)
      
      const data = await res.json()
      setResponse({
        status: res.status,
        statusText: res.statusText,
        data,
        headers: Object.fromEntries(res.headers.entries())
      })
    } catch (error) {
      setResponse({
        error: error instanceof Error ? error.message : 'Request failed'
      })
    } finally {
      setTestLoading(false)
    }
  }

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  const endpoints: ApiEndpoint[] = [
    {
      path: '/predict',
      method: 'POST',
      summary: 'Make predictions with the model',
      requestBody: {
        description: 'Input data for prediction',
        example: {
          data: [[5.1, 3.5, 1.4, 0.2]],
          return_proba: true
        }
      },
      responses: {
        200: {
          description: 'Successful prediction',
          example: {
            predictions: [0],
            probabilities: [[0.98, 0.01, 0.01]],
            model_name: "Iris Classifier",
            model_version: "1.0.0"
          }
        }
      }
    },
    {
      path: '/health',
      method: 'GET',
      summary: 'Check if the service is healthy',
      responses: {
        200: {
          description: 'Service is healthy',
          example: {
            status: "healthy",
            model: "Iris Classifier",
            version: "1.0.0"
          }
        }
      }
    },
    {
      path: '/info',
      method: 'GET',
      summary: 'Get model information',
      responses: {
        200: {
          description: 'Model information',
          example: {
            name: "Iris Classifier",
            version: "1.0.0",
            type: "RandomForestClassifier"
          }
        }
      }
    }
  ]

  const generateCurlCommand = (endpoint: ApiEndpoint) => {
    if (!deployment?.endpoint_url) return ''
    
    if (endpoint.method === 'GET') {
      return `curl ${deployment.endpoint_url}${endpoint.path}`
    }
    
    return `curl -X POST ${deployment.endpoint_url}${endpoint.path} \\
  -H "Content-Type: application/json" \\
  -d '${requestBody.replace(/\n/g, '')}'`
  }

  const generatePythonCode = (endpoint: ApiEndpoint) => {
    if (!deployment?.endpoint_url) return ''
    
    if (endpoint.method === 'GET') {
      return `import requests

response = requests.get("${deployment.endpoint_url}${endpoint.path}")
print(response.json())`
    }
    
    return `import requests

data = ${requestBody}

response = requests.post(
    "${deployment.endpoint_url}${endpoint.path}",
    json=data
)

print(response.json())`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!deployment) {
    return (
      <Alert>
        <AlertDescription>Deployment not found</AlertDescription>
      </Alert>
    )
  }

  const selectedEndpointData = endpoints.find(e => e.path === selectedEndpoint)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{deployment.config.model_name}</h1>
          <p className="text-muted-foreground">Version {deployment.config.model_version}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={deployment.status === 'running' ? 'default' : 'secondary'}>
            {deployment.status}
          </Badge>
          {deployment.endpoint_url && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`${deployment.endpoint_url}/docs`, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              API Docs
            </Button>
          )}
        </div>
      </div>

      {/* Status Tracker */}
      <DeploymentStatusTracker
        deploymentId={deploymentId}
        initialStatus={deployment.status}
      />

      {/* API Interface */}
      {deployment.status === 'running' && deployment.endpoint_url && (
        <Card>
          <CardHeader>
            <CardTitle>API Endpoints</CardTitle>
            <CardDescription>
              Test your deployed model's API endpoints
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedEndpoint} onValueChange={setSelectedEndpoint}>
              <TabsList className="grid grid-cols-3 w-full">
                {endpoints.map(endpoint => (
                  <TabsTrigger key={endpoint.path} value={endpoint.path}>
                    <Badge variant="outline" className="mr-2 text-xs">
                      {endpoint.method}
                    </Badge>
                    {endpoint.path}
                  </TabsTrigger>
                ))}
              </TabsList>

              {endpoints.map(endpoint => (
                <TabsContent key={endpoint.path} value={endpoint.path} className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">{endpoint.summary}</h3>
                    <div className="flex items-center gap-2">
                      <Badge variant={endpoint.method === 'GET' ? 'secondary' : 'default'}>
                        {endpoint.method}
                      </Badge>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {deployment.endpoint_url}{endpoint.path}
                      </code>
                    </div>
                  </div>

                  {/* Request Body */}
                  {endpoint.method === 'POST' && (
                    <div className="space-y-2">
                      <Label>Request Body</Label>
                      <Textarea
                        value={requestBody}
                        onChange={(e) => setRequestBody(e.target.value)}
                        className="font-mono text-sm"
                        rows={8}
                      />
                    </div>
                  )}

                  {/* Test Button */}
                  <Button
                    onClick={() => handleTest(endpoint.path, endpoint.method)}
                    disabled={testLoading}
                  >
                    {testLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Test Endpoint
                      </>
                    )}
                  </Button>

                  {/* Response */}
                  {response && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Response</Label>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {responseTime && (
                            <>
                              <Zap className="h-3 w-3" />
                              {responseTime}ms
                            </>
                          )}
                          {response.status && (
                            <Badge variant={response.status === 200 ? 'default' : 'destructive'}>
                              {response.status} {response.statusText}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96">
                        <code className="text-sm">
                          {JSON.stringify(response.error || response.data, null, 2)}
                        </code>
                      </pre>
                    </div>
                  )}

                  {/* Code Examples */}
                  <Tabs defaultValue="curl" className="mt-6">
                    <TabsList>
                      <TabsTrigger value="curl">
                        <Terminal className="h-4 w-4 mr-2" />
                        cURL
                      </TabsTrigger>
                      <TabsTrigger value="python">
                        <Code2 className="h-4 w-4 mr-2" />
                        Python
                      </TabsTrigger>
                      <TabsTrigger value="response">
                        <FileJson className="h-4 w-4 mr-2" />
                        Response Example
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="curl" className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>cURL Command</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(generateCurlCommand(endpoint), 'curl')}
                        >
                          {copied === 'curl' ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <pre className="bg-muted p-4 rounded-lg overflow-auto">
                        <code className="text-sm">{generateCurlCommand(endpoint)}</code>
                      </pre>
                    </TabsContent>

                    <TabsContent value="python" className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Python Code</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(generatePythonCode(endpoint), 'python')}
                        >
                          {copied === 'python' ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <pre className="bg-muted p-4 rounded-lg overflow-auto">
                        <code className="text-sm">{generatePythonCode(endpoint)}</code>
                      </pre>
                    </TabsContent>

                    <TabsContent value="response" className="space-y-2">
                      <Label>Example Response</Label>
                      <pre className="bg-muted p-4 rounded-lg overflow-auto">
                        <code className="text-sm">
                          {JSON.stringify(endpoint.responses[200]?.example || {}, null, 2)}
                        </code>
                      </pre>
                    </TabsContent>
                  </Tabs>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}