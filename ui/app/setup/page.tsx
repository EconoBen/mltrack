'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

export default function SetupPage() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const envExample = `# NextAuth.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-please-change-in-production

# GitHub OAuth (Optional - for GitHub login)
# Get these from https://github.com/settings/developers
GITHUB_ID=your_github_client_id_here
GITHUB_SECRET=your_github_client_secret_here

# Email Provider (Optional - for magic link login)
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
EMAIL_FROM=noreply@mltrack.local`;

  const devEnv = `# Development Mode - No external services needed
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=development-secret-only`;

  return (
    <div className="container mx-auto py-10 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-3xl">Welcome to MLTrack! 🚀</CardTitle>
              <CardDescription className="text-lg">
                Let's set up authentication for your MLTrack instance
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                localStorage.setItem('mltrack-auth-mode', 'development');
                localStorage.setItem('mltrack-auth-choice', 'development');
                window.location.href = '/';
              }}
            >
              Continue in Dev Mode →
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Not Configured</AlertTitle>
            <AlertDescription>
              MLTrack requires authentication to be configured. Follow the steps below to get started.
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="quick" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="quick">Quick Start (Development)</TabsTrigger>
              <TabsTrigger value="production">Production Setup</TabsTrigger>
            </TabsList>

            <TabsContent value="quick" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">1. Create a .env.local file</h3>
                <p className="text-sm text-muted-foreground">
                  Create a file named <code className="bg-muted px-1 py-0.5 rounded">.env.local</code> in the <code className="bg-muted px-1 py-0.5 rounded">ui</code> directory:
                </p>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{devEnv}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(devEnv, 'dev')}
                  >
                    {copiedSection === 'dev' ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>

                <h3 className="text-lg font-semibold">2. Generate a secret key</h3>
                <p className="text-sm text-muted-foreground">Run this command to generate a secure secret:</p>
                <div className="bg-muted p-4 rounded-lg">
                  <code className="text-sm">openssl rand -base64 32</code>
                </div>

                <h3 className="text-lg font-semibold">3. Restart the development server</h3>
                <p className="text-sm text-muted-foreground">
                  After creating the .env.local file, restart your development server:
                </p>
                <div className="bg-muted p-4 rounded-lg">
                  <code className="text-sm">npm run dev</code>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="production" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Production Environment Variables</h3>
                <p className="text-sm text-muted-foreground">
                  For production, you'll need to configure authentication providers:
                </p>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{envExample}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(envExample, 'prod')}
                  >
                    {copiedSection === 'prod' ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Setting up GitHub OAuth:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>
                      Go to{' '}
                      <a
                        href="https://github.com/settings/developers"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center"
                      >
                        GitHub Developer Settings
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </li>
                    <li>Click "New OAuth App"</li>
                    <li>
                      Set Authorization callback URL to:{' '}
                      <code className="bg-muted px-1 py-0.5 rounded">
                        http://localhost:3000/api/auth/callback/github
                      </code>
                    </li>
                    <li>Copy the Client ID and Client Secret to your .env.local file</li>
                  </ol>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Security Note</AlertTitle>
                  <AlertDescription>
                    Never commit your .env.local file to version control. Make sure it's listed in your .gitignore file.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>
          </Tabs>

          <div className="pt-4 border-t">
            <h3 className="text-lg font-semibold mb-2">Need Help?</h3>
            <p className="text-sm text-muted-foreground">
              Check out the{' '}
              <a
                href="https://github.com/EconoBen/mltrack/blob/main/docs/authentication.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center"
              >
                authentication documentation
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>{' '}
              for more detailed instructions.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}