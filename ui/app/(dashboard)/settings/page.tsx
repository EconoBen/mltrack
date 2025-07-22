'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Users, 
  Palette,
  Globe,
  Key,
  Database,
  Zap,
  AlertCircle,
  Check
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useSession } from 'next-auth/react'

export default function SettingsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()

  const handleSave = (section: string) => {
    toast({
      title: 'Settings Saved',
      description: `Your ${section} settings have been updated.`
    })
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs defaultValue="account" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* Account Settings */}
        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Update your account details and profile information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" defaultValue={session?.user?.name || ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue={session?.user?.email || ''} disabled />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" defaultValue={session?.user?.username || ''} />
                <p className="text-sm text-muted-foreground">
                  This is your unique identifier across MLTrack
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Default Experiment Visibility</Label>
                <Select defaultValue="private">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="team">Team Only</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={() => handleSave('account')}>Save Changes</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>
                Customize your MLTrack experience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => router.push('/settings/preferences')}
              >
                <Palette className="h-4 w-4 mr-2" />
                Manage UI Preferences
                <span className="ml-auto text-muted-foreground">→</span>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>
                Configure when you want to receive email notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Experiment Completion</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when your experiments finish running
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Deployment Status</Label>
                  <p className="text-sm text-muted-foreground">
                    Updates about your model deployments
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Error Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Immediate alerts for failed runs or deployments
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Weekly Summary</Label>
                  <p className="text-sm text-muted-foreground">
                    Weekly digest of your ML activities
                  </p>
                </div>
                <Switch />
              </div>

              <Separator />

              <Button onClick={() => handleSave('notifications')}>Save Preferences</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your account security and authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <p className="font-medium">Password</p>
                    <p className="text-sm text-muted-foreground">
                      {session?.user?.email ? 'Using email authentication' : 'Using OAuth provider'}
                    </p>
                  </div>
                  <Button variant="outline" disabled={!session?.user?.email}>
                    Change Password
                  </Button>
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">
                      Add an extra layer of security
                    </p>
                  </div>
                  <Button variant="outline">Enable 2FA</Button>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">Active Sessions</p>
                    <p className="text-sm text-muted-foreground">
                      Manage devices with access to your account
                    </p>
                  </div>
                  <Button variant="outline">View All Sessions</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Manage programmatic access to MLTrack
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => router.push('/profile#api-keys')}
              >
                <Key className="h-4 w-4 mr-2" />
                Manage API Keys
                <span className="ml-auto text-muted-foreground">→</span>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team */}
        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Management</CardTitle>
              <CardDescription>
                Manage your team members and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You are currently on the individual plan. Upgrade to a team plan to invite members.
                </AlertDescription>
              </Alert>

              <div className="mt-6 space-y-4">
                <Button className="w-full">Upgrade to Team Plan</Button>
                
                <div className="text-center text-sm text-muted-foreground">
                  <p>Team features include:</p>
                  <ul className="mt-2 space-y-1">
                    <li>• Unlimited team members</li>
                    <li>• Role-based access control</li>
                    <li>• Shared experiments and models</li>
                    <li>• Team analytics dashboard</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Connected Services</CardTitle>
              <CardDescription>
                Manage third-party integrations and services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between py-3 border-b">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded bg-black flex items-center justify-center">
                      <Globe className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">GitHub</p>
                      <p className="text-sm text-muted-foreground">Source code integration</p>
                    </div>
                  </div>
                  <Badge variant="secondary">Connected</Badge>
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded bg-orange-500 flex items-center justify-center">
                      <Database className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">AWS S3</p>
                      <p className="text-sm text-muted-foreground">Model storage</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded bg-purple-500 flex items-center justify-center">
                      <Zap className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">Modal</p>
                      <p className="text-sm text-muted-foreground">Model deployment</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">Connect</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced */}
        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>
                Manage your data and storage settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Default Storage Backend</Label>
                <Select defaultValue="local">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">Local Storage</SelectItem>
                    <SelectItem value="s3">Amazon S3</SelectItem>
                    <SelectItem value="gcs">Google Cloud Storage</SelectItem>
                    <SelectItem value="azure">Azure Blob Storage</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data Retention</Label>
                <Select defaultValue="forever">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30days">30 days</SelectItem>
                    <SelectItem value="90days">90 days</SelectItem>
                    <SelectItem value="1year">1 year</SelectItem>
                    <SelectItem value="forever">Forever</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  How long to keep experiment data and artifacts
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Danger Zone</h4>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    These actions are irreversible. Please be certain.
                  </AlertDescription>
                </Alert>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Export All Data</p>
                    <p className="text-sm text-muted-foreground">
                      Download all your experiments and models
                    </p>
                  </div>
                  <Button variant="outline">Export</Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-destructive">Delete Account</p>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete your account and all data
                    </p>
                  </div>
                  <Button variant="destructive">Delete Account</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}