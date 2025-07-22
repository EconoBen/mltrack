'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Copy, 
  ExternalLink, 
  FileJson,
  Terminal,
  Code,
  Loader2
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface OpenAPIViewerProps {
  deploymentId: string
  endpointUrl: string
}

interface OpenAPISpec {
  openapi: string
  info: {
    title: string
    version: string
    description?: string
  }
  paths: Record<string, any>
  components?: {
    schemas?: Record<string, any>
  }
}

const methodColors = {
  get: 'bg-blue-500',
  post: 'bg-green-500',
  put: 'bg-yellow-500',
  delete: 'bg-red-500',
  patch: 'bg-purple-500',
}

export function OpenAPIViewer({ deploymentId, endpointUrl }: OpenAPIViewerProps) {
  const [spec, setSpec] = useState<OpenAPISpec | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchOpenAPISpec()
  }, [deploymentId])

  const fetchOpenAPISpec = async () => {
    try {
      const response = await fetch(`/api/deployments/${deploymentId}/openapi`)
      if (!response.ok) throw new Error('Failed to fetch OpenAPI spec')
      const data = await response.json()
      setSpec(data)
      
      // Select first endpoint by default
      if (data.paths && Object.keys(data.paths).length > 0) {
        setSelectedEndpoint(Object.keys(data.paths)[0])
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load OpenAPI specification',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied',
      description: 'Copied to clipboard'
    })
  }

  const generateCurlExample = (path: string, method: string, body?: any) => {
    const url = `${endpointUrl}${path}`
    let curl = `curl -X ${method.toUpperCase()} "${url}"`
    
    if (method !== 'get' && body) {
      curl += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(body, null, 2)}'`
    }
    
    return curl
  }

  const generatePythonExample = (path: string, method: string, body?: any) => {
    const url = `${endpointUrl}${path}`
    let code = `import requests\n\n`
    
    if (method === 'get') {
      code += `response = requests.get("${url}")\n`
    } else {
      code += `response = requests.${method}(\n    "${url}",\n`
      if (body) {
        code += `    json=${JSON.stringify(body, null, 8).replace(/^/gm, '    ').trim()}\n`
      }
      code += `)\n`
    }
    
    code += `\nprint(response.json())`
    return code
  }

  const generateJavaScriptExample = (path: string, method: string, body?: any) => {
    const url = `${endpointUrl}${path}`
    let code = ''
    
    if (method === 'get') {
      code = `fetch("${url}")\n  .then(response => response.json())\n  .then(data => console.log(data))`
    } else {
      code = `fetch("${url}", {\n  method: "${method.toUpperCase()}",\n  headers: {\n    "Content-Type": "application/json"\n  },\n`
      if (body) {
        code += `  body: JSON.stringify(${JSON.stringify(body, null, 4).replace(/^/gm, '  ').trim()})\n`
      }
      code += `})\n  .then(response => response.json())\n  .then(data => console.log(data))`
    }
    
    return code
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (!spec) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <FileJson className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No OpenAPI specification available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{spec.info.title}</CardTitle>
            <CardDescription>
              Version {spec.info.version}
              {spec.info.description && ` - ${spec.info.description}`}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`${endpointUrl}/docs`, '_blank')}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Interactive Docs
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-12 gap-6">
          {/* Endpoints List */}
          <div className="col-span-4">
            <h3 className="text-sm font-medium mb-3">Endpoints</h3>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-2">
                {Object.entries(spec.paths).map(([path, methods]) => (
                  <div key={path} className="space-y-1">
                    {Object.entries(methods).map(([method, details]: [string, any]) => (
                      <button
                        key={`${path}-${method}`}
                        onClick={() => setSelectedEndpoint(`${path}:${method}`)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedEndpoint === `${path}:${method}`
                            ? 'bg-secondary border-primary'
                            : 'hover:bg-muted border-border'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Badge 
                            className={`${methodColors[method as keyof typeof methodColors]} text-white`}
                          >
                            {method.toUpperCase()}
                          </Badge>
                          <span className="text-sm font-mono flex-1 truncate">{path}</span>
                        </div>
                        {details.summary && (
                          <p className="text-xs text-muted-foreground mt-1">{details.summary}</p>
                        )}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Endpoint Details */}
          <div className="col-span-8">
            {selectedEndpoint && (() => {
              const [path, method] = selectedEndpoint.split(':')
              const endpoint = spec.paths[path][method]
              const requestBody = endpoint.requestBody?.content?.['application/json']
              const responseBody = endpoint.responses?.['200']?.content?.['application/json']
              
              // Generate example request body
              const exampleBody = requestBody?.schema && spec.components?.schemas ? 
                generateExampleFromSchema(requestBody.schema, spec.components.schemas) : null

              return (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{endpoint.summary || 'Endpoint'}</h3>
                    <div className="flex items-center gap-2 mb-4">
                      <Badge className={`${methodColors[method as keyof typeof methodColors]} text-white`}>
                        {method.toUpperCase()}
                      </Badge>
                      <code className="text-sm bg-muted px-2 py-1 rounded">{path}</code>
                    </div>
                    {endpoint.description && (
                      <p className="text-sm text-muted-foreground">{endpoint.description}</p>
                    )}
                  </div>

                  <Tabs defaultValue="example" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="example">Example</TabsTrigger>
                      <TabsTrigger value="curl">cURL</TabsTrigger>
                      <TabsTrigger value="python">Python</TabsTrigger>
                      <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                    </TabsList>

                    <TabsContent value="example" className="space-y-4">
                      {requestBody && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium">Request Body</h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(JSON.stringify(exampleBody, null, 2))}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <SyntaxHighlighter
                            language="json"
                            style={vscDarkPlus}
                            customStyle={{
                              margin: 0,
                              borderRadius: '0.5rem',
                              fontSize: '0.875rem',
                            }}
                          >
                            {JSON.stringify(exampleBody, null, 2)}
                          </SyntaxHighlighter>
                        </div>
                      )}

                      {responseBody && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Response</h4>
                          <SyntaxHighlighter
                            language="json"
                            style={vscDarkPlus}
                            customStyle={{
                              margin: 0,
                              borderRadius: '0.5rem',
                              fontSize: '0.875rem',
                            }}
                          >
                            {JSON.stringify(
                              generateExampleFromSchema(responseBody.schema, spec.components?.schemas || {}),
                              null,
                              2
                            )}
                          </SyntaxHighlighter>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="curl">
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => copyToClipboard(generateCurlExample(path, method, exampleBody))}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <SyntaxHighlighter
                          language="bash"
                          style={vscDarkPlus}
                          customStyle={{
                            margin: 0,
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem',
                          }}
                        >
                          {generateCurlExample(path, method, exampleBody)}
                        </SyntaxHighlighter>
                      </div>
                    </TabsContent>

                    <TabsContent value="python">
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => copyToClipboard(generatePythonExample(path, method, exampleBody))}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <SyntaxHighlighter
                          language="python"
                          style={vscDarkPlus}
                          customStyle={{
                            margin: 0,
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem',
                          }}
                        >
                          {generatePythonExample(path, method, exampleBody)}
                        </SyntaxHighlighter>
                      </div>
                    </TabsContent>

                    <TabsContent value="javascript">
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => copyToClipboard(generateJavaScriptExample(path, method, exampleBody))}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <SyntaxHighlighter
                          language="javascript"
                          style={vscDarkPlus}
                          customStyle={{
                            margin: 0,
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem',
                          }}
                        >
                          {generateJavaScriptExample(path, method, exampleBody)}
                        </SyntaxHighlighter>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )
            })()}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Helper function to generate example data from OpenAPI schema
function generateExampleFromSchema(schema: any, definitions: Record<string, any>): any {
  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop()
    return generateExampleFromSchema(definitions[refName], definitions)
  }

  if (schema.type === 'object') {
    const example: any = {}
    if (schema.properties) {
      Object.entries(schema.properties).forEach(([key, prop]: [string, any]) => {
        example[key] = generateExampleFromSchema(prop, definitions)
      })
    }
    return example
  }

  if (schema.type === 'array') {
    return [generateExampleFromSchema(schema.items, definitions)]
  }

  // Return example values based on type
  switch (schema.type) {
    case 'string':
      return schema.example || 'string'
    case 'number':
    case 'integer':
      return schema.example || 0
    case 'boolean':
      return schema.example ?? true
    default:
      return null
  }
}