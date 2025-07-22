'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Github, 
  Mail, 
  AlertCircle, 
  Loader2,
  FlaskConical,
  Brain,
  BarChart3,
  Rocket,
  Lock,
  Users,
  Zap,
  Cloud
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [error, setError] = useState('');
  
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const errorType = searchParams.get('error');

  // Map specific error types to user-friendly messages
  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'Configuration':
        return 'Server configuration error. Please contact support.';
      case 'AccessDenied':
        return 'Access denied. You may not have permission to sign in.';
      case 'Verification':
        return 'The sign in link is no longer valid. Please request a new one.';
      default:
        return 'Authentication failed. Please try again.';
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const result = await signIn('email', {
        email,
        redirect: false,
        callbackUrl,
      });
      
      if (result?.error) {
        setError('Failed to send email. Please try again.');
      } else {
        router.push('/auth/verify-request');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGithubSignIn = () => {
    setGithubLoading(true);
    signIn('github', { callbackUrl });
  };

  const features = [
    { icon: FlaskConical, label: 'Track ML Experiments', color: 'text-blue-600' },
    { icon: Brain, label: 'LLM & Traditional ML', color: 'text-purple-600' },
    { icon: BarChart3, label: 'Beautiful Analytics', color: 'text-green-600' },
    { icon: Rocket, label: 'One-Click Deploy', color: 'text-orange-600' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left side - Sign in form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Logo and Title */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                <Activity className="h-16 w-16 text-primary relative" />
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-lg text-muted-foreground">
              Sign in to your MLTrack account
            </p>
          </div>

          {/* Sign in card */}
          <Card className="border-0 shadow-xl">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl text-center">Sign in</CardTitle>
              <CardDescription className="text-center">
                Choose your preferred authentication method
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(error || errorType) && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {error || getErrorMessage(errorType)}
                  </AlertDescription>
                </Alert>
              )}
              
              {/* GitHub Sign In */}
              <Button
                variant="outline"
                className="w-full h-11 font-medium"
                onClick={handleGithubSignIn}
                disabled={isLoading || githubLoading}
              >
                {githubLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Github className="mr-2 h-4 w-4" />
                )}
                Continue with GitHub
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>
              
              {/* Email Sign In */}
              <form onSubmit={handleEmailSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading || githubLoading}
                    required
                    className="h-11"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-11 font-medium" 
                  disabled={isLoading || githubLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="mr-2 h-4 w-4" />
                  )}
                  Continue with Email
                </Button>
              </form>

              {/* Security badges */}
              <div className="flex items-center justify-center gap-4 pt-4">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  <span>Secure</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Zap className="h-3 w-3" />
                  <span>Fast</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Cloud className="h-3 w-3" />
                  <span>Reliable</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2 text-center">
              <p className="text-xs text-muted-foreground">
                By signing in, you agree to our{' '}
                <Link href="/terms" className="underline hover:text-primary">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="underline hover:text-primary">
                  Privacy Policy
                </Link>
              </p>
            </CardFooter>
          </Card>

          {/* Additional links */}
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              New to MLTrack?{' '}
              <Link href="/signup" className="font-medium text-primary hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Feature showcase */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-8 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5">
        <div className="max-w-lg space-y-8">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold">
              The Complete ML Platform
            </h2>
            <p className="text-lg text-muted-foreground">
              Track experiments, deploy models, and collaborate with your team - all in one place.
            </p>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="space-y-2">
                <div className={`inline-flex p-3 rounded-lg bg-background shadow-sm ${feature.color}`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="font-medium">{feature.label}</h3>
                <p className="text-sm text-muted-foreground">
                  {index === 0 && "Zero-config tracking for all your ML experiments"}
                  {index === 1 && "Support for both LLMs and traditional ML models"}
                  {index === 2 && "Interactive dashboards and real-time insights"}
                  {index === 3 && "Deploy to Modal, AWS, or any cloud provider"}
                </p>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <p className="italic text-muted-foreground mb-4">
                "MLTrack transformed how our team manages ML experiments. The deployment feature alone saved us weeks of work."
              </p>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Sarah Chen</p>
                  <p className="text-sm text-muted-foreground">ML Engineer at TechCorp</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="flex items-center justify-around text-center">
            <div>
              <p className="text-3xl font-bold">10K+</p>
              <p className="text-sm text-muted-foreground">Experiments</p>
            </div>
            <Separator orientation="vertical" className="h-12" />
            <div>
              <p className="text-3xl font-bold">500+</p>
              <p className="text-sm text-muted-foreground">Teams</p>
            </div>
            <Separator orientation="vertical" className="h-12" />
            <div>
              <p className="text-3xl font-bold">99.9%</p>
              <p className="text-sm text-muted-foreground">Uptime</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}