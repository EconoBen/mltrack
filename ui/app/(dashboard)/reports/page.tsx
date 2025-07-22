'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import { 
  BarChart3, 
  LineChart, 
  PieChart, 
  TrendingUp, 
  Download,
  Calendar,
  Filter,
  Users,
  Zap,
  Brain,
  FlaskConical,
  GitBranch,
  Database,
  Clock,
  AlertCircle
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { AreaChart, Area, BarChart, Bar, LineChart as RechartsLineChart, Line, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'

// Mock data for charts
const experimentsOverTime = [
  { date: '2024-01', ml: 45, llm: 23 },
  { date: '2024-02', ml: 52, llm: 28 },
  { date: '2024-03', ml: 61, llm: 35 },
  { date: '2024-04', ml: 58, llm: 42 },
  { date: '2024-05', ml: 67, llm: 48 },
  { date: '2024-06', ml: 73, llm: 56 },
  { date: '2024-07', ml: 79, llm: 61 },
]

const modelPerformance = [
  { model: 'ResNet50', accuracy: 0.945, latency: 23 },
  { model: 'YOLOv8', accuracy: 0.892, latency: 18 },
  { model: 'BERT', accuracy: 0.923, latency: 45 },
  { model: 'GPT-4', accuracy: 0.967, latency: 120 },
  { model: 'XGBoost', accuracy: 0.878, latency: 8 },
]

const resourceUsage = [
  { name: 'GPU Hours', value: 2456, color: '#8b5cf6' },
  { name: 'CPU Hours', value: 8923, color: '#3b82f6' },
  { name: 'Storage (GB)', value: 1234, color: '#10b981' },
  { name: 'API Calls', value: 45678, color: '#f59e0b' },
]

const teamActivity = [
  { name: 'Sarah Chen', experiments: 23, runs: 145, deployments: 5 },
  { name: 'Alex Kumar', experiments: 19, runs: 98, deployments: 3 },
  { name: 'Maria Garcia', experiments: 31, runs: 203, deployments: 7 },
  { name: 'James Wilson', experiments: 15, runs: 67, deployments: 2 },
  { name: 'Lisa Zhang', experiments: 27, runs: 156, deployments: 4 },
]

const deploymentMetrics = [
  { hour: '00:00', requests: 234, latency: 45 },
  { hour: '04:00', requests: 156, latency: 42 },
  { hour: '08:00', requests: 567, latency: 58 },
  { hour: '12:00', requests: 892, latency: 67 },
  { hour: '16:00', requests: 734, latency: 55 },
  { hour: '20:00', requests: 445, latency: 48 },
]

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to?: Date | undefined } | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  })
  const [selectedTeam, setSelectedTeam] = useState('all')

  // In a real app, this would fetch from your API
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['reports', dateRange, selectedTeam],
    queryFn: async () => {
      // Mock API call
      return {
        summary: {
          totalExperiments: 165,
          totalRuns: 769,
          activeUsers: 12,
          totalDeployments: 21,
          avgAccuracy: 0.912,
          totalCost: 4567.89
        }
      }
    }
  })

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-8">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-[200px]" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive insights into your ML operations
          </p>
        </div>
        <div className="flex items-center gap-4">
          <DatePickerWithRange date={dateRange} setDate={setDateRange} />
          <Select value={selectedTeam} onValueChange={setSelectedTeam}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              <SelectItem value="ml-platform">ML Platform</SelectItem>
              <SelectItem value="nlp-research">NLP Research</SelectItem>
              <SelectItem value="data-science">Data Science</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Experiments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData?.summary.totalExperiments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              +12% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData?.summary.totalRuns}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              +23% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData?.summary.activeUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <Users className="h-3 w-3 inline mr-1" />
              Across 3 teams
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Deployments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData?.summary.totalDeployments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <Zap className="h-3 w-3 inline mr-1" />
              18 active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(reportData?.summary.avgAccuracy * 100).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              +2.3% improvement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${reportData?.summary.totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              Within budget
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="experiments">Experiments</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="lineage">Data Lineage</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Experiments Over Time */}
            <Card>
              <CardHeader>
                <CardTitle>Experiments Over Time</CardTitle>
                <CardDescription>ML vs LLM experiments by month</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={experimentsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="ml" stackId="1" stroke="#3b82f6" fill="#3b82f6" />
                    <Area type="monotone" dataKey="llm" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Deployment Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Deployment Activity</CardTitle>
                <CardDescription>Requests and latency over 24 hours</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsLineChart data={deploymentMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="requests" stroke="#10b981" name="Requests" />
                    <Line yAxisId="right" type="monotone" dataKey="latency" stroke="#f59e0b" name="Latency (ms)" />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Resource Usage */}
          <Card>
            <CardHeader>
              <CardTitle>Resource Usage Distribution</CardTitle>
              <CardDescription>Breakdown of compute and storage resources</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={resourceUsage}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {resourceUsage.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="space-y-4">
                  {resourceUsage.map((resource) => (
                    <div key={resource.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: resource.color }} />
                        <span className="text-sm">{resource.name}</span>
                      </div>
                      <span className="text-sm font-medium">{resource.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="experiments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Experiment Analytics</CardTitle>
              <CardDescription>Detailed breakdown of experiment metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Experiment type distribution */}
                <div>
                  <h4 className="text-sm font-medium mb-4">Experiment Types</h4>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FlaskConical className="h-5 w-5 text-blue-600" />
                            <span>Traditional ML</span>
                          </div>
                          <span className="text-2xl font-bold">68%</span>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Brain className="h-5 w-5 text-purple-600" />
                            <span>LLM</span>
                          </div>
                          <span className="text-2xl font-bold">32%</span>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <GitBranch className="h-5 w-5 text-green-600" />
                            <span>A/B Tests</span>
                          </div>
                          <span className="text-2xl font-bold">15</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Success rate */}
                <div>
                  <h4 className="text-sm font-medium mb-4">Experiment Success Rate</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Successful</span>
                      <span className="text-sm font-medium">87%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '87%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Model Performance Comparison</CardTitle>
              <CardDescription>Accuracy vs latency for deployed models</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={modelPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="model" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="accuracy" fill="#10b981" name="Accuracy" />
                  <Bar yAxisId="right" dataKey="latency" fill="#f59e0b" name="Latency (ms)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Activity</CardTitle>
              <CardDescription>Individual contributions and productivity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamActivity.map((member) => (
                  <div key={member.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium">{member.name.split(' ').map(n => n[0]).join('')}</span>
                      </div>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {member.experiments} experiments • {member.runs} runs
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">{member.deployments} deployments</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Compute Usage Trend</CardTitle>
                <CardDescription>GPU and CPU hours over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={experimentsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="ml" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" name="GPU Hours" />
                    <Area type="monotone" dataKey="llm" stackId="1" stroke="#3b82f6" fill="#3b82f6" name="CPU Hours" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Analysis</CardTitle>
                <CardDescription>Monthly spending breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Compute</span>
                    <span className="text-sm font-medium">$2,345.67</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Storage</span>
                    <span className="text-sm font-medium">$456.78</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">API Calls</span>
                    <span className="text-sm font-medium">$1,234.56</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Data Transfer</span>
                    <span className="text-sm font-medium">$530.88</span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Total</span>
                      <span className="font-medium">$4,567.89</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="lineage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Lineage Tracking</CardTitle>
              <CardDescription>Track data flow through your ML pipeline</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Lineage visualization placeholder */}
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Data Lineage Visualization</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Interactive graph showing data flow from sources to models
                  </p>
                  <Button variant="outline">
                    <GitBranch className="h-4 w-4 mr-2" />
                    View Full Lineage
                  </Button>
                </div>

                {/* Recent data events */}
                <div>
                  <h4 className="text-sm font-medium mb-4">Recent Data Events</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 border rounded-lg">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Dataset Updated</p>
                        <p className="text-xs text-muted-foreground">
                          training_data_v2.csv was updated • 2 hours ago
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 border rounded-lg">
                      <Database className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">New Data Source Added</p>
                        <p className="text-xs text-muted-foreground">
                          Connected to production_db • 5 hours ago
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 border rounded-lg">
                      <Clock className="h-5 w-5 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Pipeline Completed</p>
                        <p className="text-xs text-muted-foreground">
                          feature_engineering_pipeline • 1 day ago
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}