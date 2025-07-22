'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { UserAvatar } from '@/components/user-avatar'
import { 
  User, 
  Mail, 
  Github, 
  Key, 
  Copy, 
  Eye, 
  EyeOff, 
  RefreshCw,
  Shield,
  Calendar,
  Users,
  Activity,
  Settings
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useQuery, useMutation } from '@tanstack/react-query'
import { formatDistanceToNow, format } from 'date-fns'

interface UserStats {
  totalExperiments: number
  totalRuns: number
  activeDeployments: number
  teamMembers: number
  lastActivity: string
}

interface ApiKey {
  id: string
  name: string
  key: string
  createdAt: string
  lastUsed?: string
  permissions: string[]
}

export default function ProfilePage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [showApiKey, setShowApiKey] = useState<string | null>(null)
  const [newKeyName, setNewKeyName] = useState('')

  // Fetch user statistics
  const { data: stats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ['user-stats'],
    queryFn: async () => {
      // This would fetch from your API
      return {
        totalExperiments: 42,
        totalRuns: 1337,
        activeDeployments: 3,
        teamMembers: 5,
        lastActivity: new Date().toISOString()
      }
    }
  })

  // Fetch API keys
  const { data: apiKeys, isLoading: keysLoading, refetch: refetchKeys } = useQuery<ApiKey[]>({
    queryKey: ['api-keys'],
    queryFn: async () => {
      // This would fetch from your API
      return [
        {
          id: '1',
          name: 'Production API Key',
          key: 'mltrack_prod_xxxxxxxxxxxxxxxxxxxx',
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          permissions: ['read', 'write', 'deploy']
        },
        {
          id: '2',
          name: 'CI/CD Pipeline',
          key: 'mltrack_ci_yyyyyyyyyyyyyyyyyyyy',
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          permissions: ['read']
        }
      ]
    }
  })

  // Create new API key mutation
  const createKeyMutation = useMutation({
    mutationFn: async (name: string) => {
      // This would create a key via your API
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })
      return response.json()
    },
    onSuccess: () => {
      toast({
        title: 'API Key Created',
        description: 'Your new API key has been created successfully.'
      })
      setNewKeyName('')
      refetchKeys()
    }
  })

  // Delete API key mutation
  const deleteKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      await fetch(`/api/keys/${keyId}`, { method: 'DELETE' })
    },
    onSuccess: () => {
      toast({
        title: 'API Key Deleted',
        description: 'The API key has been removed.'
      })
      refetchKeys()
    }
  })

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    toast({
      title: 'Copied',
      description: 'API key copied to clipboard'
    })
  }

  const handleCreateKey = () => {
    if (newKeyName.trim()) {
      createKeyMutation.mutate(newKeyName)
    }
  }

  if (!session) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertDescription>
            Please sign in to view your profile.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-6">
          <UserAvatar
            name={session.user?.name || undefined}
            email={session.user?.email || undefined}
            image={session.user?.image || undefined}
            size="lg"
          />
          <div>
            <h1 className="text-3xl font-bold">{session.user?.name || 'User Profile'}</h1>
            <p className="text-muted-foreground mt-1">{session.user?.email}</p>
            <div className="flex items-center gap-4 mt-3">
              {session.user?.username && (
                <Badge variant="secondary" className="gap-1">
                  <Github className="h-3 w-3" />
                  {session.user.username}
                </Badge>
              )}
              {session.user?.role && (
                <Badge variant="outline">{session.user.role}</Badge>
              )}
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={() => window.location.href = '/settings'}>
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Experiments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalExperiments || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalRuns || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Deployments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeDeployments || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {stats?.lastActivity ? formatDistanceToNow(new Date(stats.lastActivity), { addSuffix: true }) : 'Never'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="api-keys" className="space-y-4">
        <TabsList>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Manage your API keys for programmatic access to MLTrack
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Create new key form */}
              <div className="flex gap-2">
                <Input
                  placeholder="Key name (e.g., Production Server)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateKey()}
                />
                <Button 
                  onClick={handleCreateKey}
                  disabled={!newKeyName.trim() || createKeyMutation.isPending}
                >
                  {createKeyMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Key className="h-4 w-4 mr-2" />
                      Create Key
                    </>
                  )}
                </Button>
              </div>

              {/* API Keys list */}
              <div className="space-y-3">
                {apiKeys?.map((apiKey) => (
                  <div key={apiKey.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{apiKey.name}</h4>
                          <div className="flex gap-1">
                            {apiKey.permissions.map(perm => (
                              <Badge key={perm} variant="secondary" className="text-xs">
                                {perm}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Created {formatDistanceToNow(new Date(apiKey.createdAt), { addSuffix: true })}</span>
                          {apiKey.lastUsed && (
                            <span>• Last used {formatDistanceToNow(new Date(apiKey.lastUsed), { addSuffix: true })}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {showApiKey === apiKey.id ? apiKey.key : `${apiKey.key.slice(0, 15)}...`}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowApiKey(showApiKey === apiKey.id ? null : apiKey.id)}
                          >
                            {showApiKey === apiKey.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyKey(apiKey.key)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteKeyMutation.mutate(apiKey.id)}
                        disabled={deleteKeyMutation.isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}

                {(!apiKeys || apiKeys.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Key className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No API keys yet</p>
                    <p className="text-sm">Create your first API key to get started</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Your recent experiments and model deployments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* This would be populated with actual activity data */}
                <div className="flex items-center gap-3 pb-3 border-b">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm">Started experiment <strong>image-classification-v2</strong></p>
                    <p className="text-xs text-muted-foreground">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 pb-3 border-b">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm">Deployed model <strong>sentiment-analyzer</strong> to Modal</p>
                    <p className="text-xs text-muted-foreground">5 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm">Completed run <strong>rf-hyperopt-123</strong> with accuracy 0.943</p>
                    <p className="text-xs text-muted-foreground">1 day ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your account security and access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                  </div>
                  <Button variant="outline">Enable</Button>
                </div>
                
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <p className="font-medium">Active Sessions</p>
                    <p className="text-sm text-muted-foreground">Manage your active sessions across devices</p>
                  </div>
                  <Button variant="outline">View Sessions</Button>
                </div>
                
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">Connected Accounts</p>
                    <p className="text-sm text-muted-foreground">Manage third-party integrations</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <Github className="h-3 w-3" />
                      GitHub Connected
                    </Badge>
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