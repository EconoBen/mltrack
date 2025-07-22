import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Mail, 
  Activity, 
  CheckCircle, 
  ArrowLeft, 
  Clock,
  Shield,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';

export default function VerifyRequestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-primary/5">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center justify-center">
            <Activity className="h-12 w-12 text-primary" />
          </Link>
        </div>

        {/* Main Card */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-1 text-center pb-8">
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full animate-pulse" />
                <div className="rounded-full bg-gradient-to-br from-green-500/10 to-green-600/10 p-4 relative">
                  <Mail className="h-12 w-12 text-green-600" />
                  <CheckCircle className="h-6 w-6 text-green-600 absolute -bottom-1 -right-1 bg-background rounded-full" />
                </div>
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">Check your email</CardTitle>
            <CardDescription className="text-lg">
              We've sent a magic link to your inbox
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Instructions */}
            <div className="space-y-4 text-center">
              <p className="text-muted-foreground">
                Click the secure link in your email to sign in to MLTrack.
              </p>
              
              {/* Security info */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Secure magic link sent</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  The link will expire in 10 minutes for your security
                </p>
              </div>
            </div>

            <Separator />

            {/* Tips */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-center">While you wait:</p>
              <div className="space-y-2">
                <div className="flex items-start gap-3 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">
                      The email should arrive within 1-2 minutes
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">
                      Check your spam folder if you don't see it
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Sparkles className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">
                      Add noreply@mltrack.io to your contacts
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <Button asChild variant="outline" className="w-full">
                <Link href="/auth/signin">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to sign in
                </Link>
              </Button>
              
              <p className="text-xs text-center text-muted-foreground">
                Didn't receive the email?{' '}
                <Link href="/auth/signin" className="font-medium text-primary hover:underline">
                  Try again
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            Having trouble? Contact{' '}
            <a href="mailto:support@mltrack.io" className="font-medium text-primary hover:underline">
              support@mltrack.io
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}