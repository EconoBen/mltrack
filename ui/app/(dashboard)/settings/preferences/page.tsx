'use client';

import { useState } from 'react';
import { usePreferences } from '@/lib/hooks/use-preferences';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import {
  Palette,
  Bell,
  Monitor,
  FlaskConical,
  Activity,
  BarChart3,
  Shield,
  Download,
  Upload,
  RotateCcw,
  Save,
} from 'lucide-react';

export default function PreferencesPage() {
  const { preferences, updateSection, resetPreferences, exportPreferences, importPreferences } = usePreferences();
  const { toast } = useToast();
  const [hasChanges, setHasChanges] = useState(false);

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    updateSection('theme', theme);
    setHasChanges(true);
    
    // Apply theme immediately
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      document.documentElement.classList.toggle('dark', systemTheme === 'dark');
    } else {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  };

  const handleSave = () => {
    toast({
      title: 'Preferences saved',
      description: 'Your preferences have been updated successfully.',
    });
    setHasChanges(false);
  };

  const handleReset = () => {
    resetPreferences();
    toast({
      title: 'Preferences reset',
      description: 'Your preferences have been reset to defaults.',
    });
    setHasChanges(false);
  };

  const handleExport = () => {
    const json = exportPreferences();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mltrack-preferences.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        importPreferences(json);
        toast({
          title: 'Preferences imported',
          description: 'Your preferences have been imported successfully.',
        });
        setHasChanges(false);
      } catch (error) {
        toast({
          title: 'Import failed',
          description: 'Invalid preferences file format.',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Preferences</h1>
            <p className="text-muted-foreground mt-2">
              Customize your MLTrack experience
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Label htmlFor="import-file" className="cursor-pointer">
              <Button variant="outline" asChild>
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  Import
                </span>
              </Button>
              <Input
                id="import-file"
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImport}
              />
            </Label>
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
            {hasChanges && (
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            )}
          </div>
        </div>

        {/* Preferences Tabs */}
        <Tabs defaultValue="appearance" className="space-y-4">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="display">Display</TabsTrigger>
            <TabsTrigger value="experiments">Experiments</TabsTrigger>
            <TabsTrigger value="runs">Runs</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
          </TabsList>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Theme
                </CardTitle>
                <CardDescription>
                  Choose your preferred color theme
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={preferences.theme}
                  onValueChange={handleThemeChange}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Settings
                </CardTitle>
                <CardDescription>
                  Configure how you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <Switch
                    id="email-notifications"
                    checked={preferences.notifications.email}
                    onCheckedChange={(checked) => {
                      updateSection('notifications', { email: checked });
                      setHasChanges(true);
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="in-app-notifications">In-App Notifications</Label>
                  <Switch
                    id="in-app-notifications"
                    checked={preferences.notifications.inApp}
                    onCheckedChange={(checked) => {
                      updateSection('notifications', { inApp: checked });
                      setHasChanges(true);
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="run-complete">Run Complete Notifications</Label>
                  <Switch
                    id="run-complete"
                    checked={preferences.notifications.runComplete}
                    onCheckedChange={(checked) => {
                      updateSection('notifications', { runComplete: checked });
                      setHasChanges(true);
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="run-failed">Run Failed Notifications</Label>
                  <Switch
                    id="run-failed"
                    checked={preferences.notifications.runFailed}
                    onCheckedChange={(checked) => {
                      updateSection('notifications', { runFailed: checked });
                      setHasChanges(true);
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="daily-summary">Daily Summary</Label>
                  <Switch
                    id="daily-summary"
                    checked={preferences.notifications.dailySummary}
                    onCheckedChange={(checked) => {
                      updateSection('notifications', { dailySummary: checked });
                      setHasChanges(true);
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Display Tab */}
          <TabsContent value="display" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Display Settings
                </CardTitle>
                <CardDescription>
                  Customize the user interface
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Default Time Range</Label>
                  <Select
                    value={preferences.display.defaultTimeRange}
                    onValueChange={(value: any) => {
                      updateSection('display', { defaultTimeRange: value });
                      setHasChanges(true);
                    }}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                      <SelectItem value="365d">Last year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Default Chart Type</Label>
                  <Select
                    value={preferences.display.defaultChartType}
                    onValueChange={(value: any) => {
                      updateSection('display', { defaultChartType: value });
                      setHasChanges(true);
                    }}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="line">Line Chart</SelectItem>
                      <SelectItem value="bar">Bar Chart</SelectItem>
                      <SelectItem value="area">Area Chart</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="compact-view">Compact View</Label>
                  <Switch
                    id="compact-view"
                    checked={preferences.display.compactView}
                    onCheckedChange={(checked) => {
                      updateSection('display', { compactView: checked });
                      setHasChanges(true);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="show-trends">Show Metric Trends</Label>
                  <Switch
                    id="show-trends"
                    checked={preferences.display.showMetricTrends}
                    onCheckedChange={(checked) => {
                      updateSection('display', { showMetricTrends: checked });
                      setHasChanges(true);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="animations">Enable Animations</Label>
                  <Switch
                    id="animations"
                    checked={preferences.display.animationsEnabled}
                    onCheckedChange={(checked) => {
                      updateSection('display', { animationsEnabled: checked });
                      setHasChanges(true);
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Experiments Tab */}
          <TabsContent value="experiments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FlaskConical className="h-5 w-5" />
                  Experiment Settings
                </CardTitle>
                <CardDescription>
                  Configure experiment display options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Default View</Label>
                  <Select
                    value={preferences.experiments.defaultView}
                    onValueChange={(value: any) => {
                      updateSection('experiments', { defaultView: value });
                      setHasChanges(true);
                    }}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grid">Grid View</SelectItem>
                      <SelectItem value="list">List View</SelectItem>
                      <SelectItem value="table">Table View</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="show-archived">Show Archived</Label>
                  <Switch
                    id="show-archived"
                    checked={preferences.experiments.showArchived}
                    onCheckedChange={(checked) => {
                      updateSection('experiments', { showArchived: checked });
                      setHasChanges(true);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="group-by-type">Group by Type</Label>
                  <Switch
                    id="group-by-type"
                    checked={preferences.experiments.groupByType}
                    onCheckedChange={(checked) => {
                      updateSection('experiments', { groupByType: checked });
                      setHasChanges(true);
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Sort By</Label>
                  <div className="flex gap-2">
                    <Select
                      value={preferences.experiments.sortBy}
                      onValueChange={(value: any) => {
                        updateSection('experiments', { sortBy: value });
                        setHasChanges(true);
                      }}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="created">Created Date</SelectItem>
                        <SelectItem value="updated">Updated Date</SelectItem>
                        <SelectItem value="runs">Run Count</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={preferences.experiments.sortOrder}
                      onValueChange={(value: any) => {
                        updateSection('experiments', { sortOrder: value });
                        setHasChanges(true);
                      }}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">Ascending</SelectItem>
                        <SelectItem value="desc">Descending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Runs Tab */}
          <TabsContent value="runs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Runs Settings
                </CardTitle>
                <CardDescription>
                  Configure run display and behavior
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="page-size">Page Size</Label>
                  <Input
                    id="page-size"
                    type="number"
                    min="10"
                    max="100"
                    value={preferences.runs.pageSize}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value) && value >= 10 && value <= 100) {
                        updateSection('runs', { pageSize: value });
                        setHasChanges(true);
                      }
                    }}
                    className="w-[120px]"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="show-failed">Show Failed Only</Label>
                  <Switch
                    id="show-failed"
                    checked={preferences.runs.showFailedOnly}
                    onCheckedChange={(checked) => {
                      updateSection('runs', { showFailedOnly: checked });
                      setHasChanges(true);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-refresh">Auto Refresh</Label>
                  <Switch
                    id="auto-refresh"
                    checked={preferences.runs.autoRefresh}
                    onCheckedChange={(checked) => {
                      updateSection('runs', { autoRefresh: checked });
                      setHasChanges(true);
                    }}
                  />
                </div>

                {preferences.runs.autoRefresh && (
                  <div className="space-y-2">
                    <Label htmlFor="refresh-interval">Refresh Interval (seconds)</Label>
                    <Input
                      id="refresh-interval"
                      type="number"
                      min="5"
                      max="300"
                      value={preferences.runs.refreshInterval}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value) && value >= 5 && value <= 300) {
                          updateSection('runs', { refreshInterval: value });
                          setHasChanges(true);
                        }
                      }}
                      className="w-[120px]"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Analytics Settings
                </CardTitle>
                <CardDescription>
                  Configure analytics and reporting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Default Dashboard</Label>
                  <Select
                    value={preferences.analytics.defaultDashboard}
                    onValueChange={(value: any) => {
                      updateSection('analytics', { defaultDashboard: value });
                      setHasChanges(true);
                    }}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="overview">Overview</SelectItem>
                      <SelectItem value="cost">Cost Analysis</SelectItem>
                      <SelectItem value="performance">Performance</SelectItem>
                      <SelectItem value="usage">Usage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="cost-alerts">Show Cost Alerts</Label>
                  <Switch
                    id="cost-alerts"
                    checked={preferences.analytics.showCostAlerts}
                    onCheckedChange={(checked) => {
                      updateSection('analytics', { showCostAlerts: checked });
                      setHasChanges(true);
                    }}
                  />
                </div>

                {preferences.analytics.showCostAlerts && (
                  <div className="space-y-2">
                    <Label htmlFor="cost-threshold">Cost Alert Threshold ($)</Label>
                    <Input
                      id="cost-threshold"
                      type="number"
                      min="0"
                      step="10"
                      value={preferences.analytics.costAlertThreshold}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value) && value >= 0) {
                          updateSection('analytics', { costAlertThreshold: value });
                          setHasChanges(true);
                        }
                      }}
                      className="w-[120px]"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Export Format</Label>
                  <Select
                    value={preferences.analytics.exportFormat}
                    onValueChange={(value: any) => {
                      updateSection('analytics', { exportFormat: value });
                      setHasChanges(true);
                    }}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="xlsx">Excel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Privacy Settings
                </CardTitle>
                <CardDescription>
                  Control your data and privacy
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="telemetry">Allow Telemetry</Label>
                    <p className="text-sm text-muted-foreground">
                      Help improve MLTrack by sending anonymous usage data
                    </p>
                  </div>
                  <Switch
                    id="telemetry"
                    checked={preferences.privacy.allowTelemetry}
                    onCheckedChange={(checked) => {
                      updateSection('privacy', { allowTelemetry: checked });
                      setHasChanges(true);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="share-usage">Share Usage Data</Label>
                    <p className="text-sm text-muted-foreground">
                      Share aggregated usage data with your organization
                    </p>
                  </div>
                  <Switch
                    id="share-usage"
                    checked={preferences.privacy.shareUsageData}
                    onCheckedChange={(checked) => {
                      updateSection('privacy', { shareUsageData: checked });
                      setHasChanges(true);
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}