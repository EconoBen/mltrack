'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Rocket, Shield, Activity, BarChart3, Package, 
  FlaskConical, Zap, Users, ArrowRight, Code
} from 'lucide-react';

const features = [
  {
    icon: FlaskConical,
    title: 'Experiment Tracking',
    description: 'Track ML experiments with automatic logging and versioning',
  },
  {
    icon: BarChart3,
    title: 'Advanced Analytics',
    description: 'Visualize metrics, compare runs, and generate insights',
  },
  {
    icon: Package,
    title: 'Model Registry',
    description: 'Version, tag, and deploy models with confidence',
  },
  {
    icon: Rocket,
    title: 'One-Click Deploy',
    description: 'Deploy to Modal, AWS, or Docker with a single command',
  },
];

export default function WelcomePage() {
  const router = useRouter();
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user has already made a choice
    const authChoice = localStorage.getItem('mltrack-auth-choice');
    const skipWelcome = localStorage.getItem('mltrack-skip-welcome');
    
    if (skipWelcome === 'true' || authChoice) {
      // Redirect based on previous choice
      if (authChoice === 'development') {
        router.push('/');
      } else if (authChoice === 'production') {
        router.push('/setup');
      } else {
        router.push('/');
      }
    } else {
      setIsLoading(false);
    }
  }, [router]);

  const handleChoice = (mode: 'development' | 'production') => {
    // Always set the choice, not just when "don't show again" is checked
    localStorage.setItem('mltrack-auth-choice', mode);
    
    if (dontShowAgain) {
      localStorage.setItem('mltrack-skip-welcome', 'true');
    }
    
    if (mode === 'development') {
      localStorage.setItem('mltrack-auth-mode', 'development');
      // Use window.location for a full page reload to ensure auth state updates
      window.location.href = '/';
    } else {
      router.push('/setup');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">
          <Activity className="h-12 w-12 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <Activity className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-5xl font-bold mb-4">Welcome to MLTrack</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            The universal ML tracking tool that unifies experiment tracking, model management, and deployment
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="border-muted">
                <CardHeader className="pb-3">
                  <Icon className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Choice Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Demo Mode Card */}
          <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-colors">
            <div className="absolute top-0 right-0 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-4 py-1 text-sm font-medium">
              Quick Start
            </div>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Zap className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <CardTitle className="text-2xl">Try Demo Mode</CardTitle>
              </div>
              <CardDescription className="text-base">
                Get started immediately with mock authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Code className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>Explore all features without setup</span>
                </li>
                <li className="flex items-start gap-2">
                  <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>Use mock users and data</span>
                </li>
                <li className="flex items-start gap-2">
                  <Rocket className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>Perfect for evaluation and development</span>
                </li>
              </ul>
              <Button 
                onClick={() => handleChoice('development')}
                className="w-full"
                size="lg"
                variant="secondary"
              >
                Start in Demo Mode
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                You can configure authentication later
              </p>
            </CardContent>
          </Card>

          {/* Production Setup Card */}
          <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-colors">
            <div className="absolute top-0 right-0 bg-green-500/10 text-green-600 dark:text-green-400 px-4 py-1 text-sm font-medium">
              Recommended
            </div>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="text-2xl">Configure Authentication</CardTitle>
              </div>
              <CardDescription className="text-base">
                Set up secure authentication for production use
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>Secure user authentication</span>
                </li>
                <li className="flex items-start gap-2">
                  <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>GitHub or email login options</span>
                </li>
                <li className="flex items-start gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>Ready for team collaboration</span>
                </li>
              </ul>
              <Button 
                onClick={() => handleChoice('production')}
                className="w-full"
                size="lg"
              >
                Configure Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Takes about 5 minutes to set up
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Don't show again option */}
        <div className="flex items-center justify-center space-x-2">
          <Checkbox 
            id="dontShow" 
            checked={dontShowAgain}
            onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
          />
          <label
            htmlFor="dontShow"
            className="text-sm text-muted-foreground cursor-pointer"
          >
            Don't show this page again
          </label>
        </div>
      </div>
    </div>
  );
}