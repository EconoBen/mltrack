import { NextResponse } from 'next/server';

interface EnvVarCheck {
  name: string;
  description: string;
  example: string;
  required: boolean;
  isSet: boolean;
}

export async function GET() {
  // Check all environment variables
  const envChecks: EnvVarCheck[] = [
    {
      name: 'NEXTAUTH_SECRET',
      description: 'Secret key for encrypting session tokens. Required for production.',
      example: 'NEXTAUTH_SECRET=your-generated-secret-here',
      required: true,
      isSet: !!process.env.NEXTAUTH_SECRET,
    },
    {
      name: 'NEXTAUTH_URL',
      description: 'The URL where your app is hosted. Required for authentication callbacks.',
      example: 'NEXTAUTH_URL=http://localhost:3000',
      required: true,
      isSet: !!process.env.NEXTAUTH_URL,
    },
    {
      name: 'GITHUB_ID',
      description: 'GitHub OAuth App Client ID. Required if using GitHub login.',
      example: 'GITHUB_ID=your_github_client_id_here',
      required: false,
      isSet: !!process.env.GITHUB_ID,
    },
    {
      name: 'GITHUB_SECRET',
      description: 'GitHub OAuth App Client Secret. Required if using GitHub login.',
      example: 'GITHUB_SECRET=your_github_client_secret_here',
      required: false,
      isSet: !!process.env.GITHUB_SECRET,
    },
    {
      name: 'EMAIL_SERVER_HOST',
      description: 'SMTP server host for sending magic link emails.',
      example: 'EMAIL_SERVER_HOST=smtp.gmail.com',
      required: false,
      isSet: !!process.env.EMAIL_SERVER_HOST,
    },
    {
      name: 'DATABASE_URL',
      description: 'Database connection string. Defaults to SQLite if not set.',
      example: 'DATABASE_URL="file:./mltrack.db"',
      required: false,
      isSet: !!process.env.DATABASE_URL,
    },
  ];

  // Determine auth mode
  let mode: 'production' | 'development' | 'disabled' | 'partial';
  const requiredVarsSet = envChecks.filter(v => v.required && v.isSet).length;
  const totalRequiredVars = envChecks.filter(v => v.required).length;
  const hasAnyProvider = process.env.GITHUB_ID || process.env.EMAIL_SERVER_HOST;

  if (requiredVarsSet === totalRequiredVars && hasAnyProvider) {
    mode = 'production';
  } else if (process.env.NODE_ENV === 'development' && !process.env.NEXTAUTH_SECRET) {
    mode = 'development';
  } else if (requiredVarsSet < totalRequiredVars) {
    mode = 'disabled';
  } else {
    mode = 'partial';
  }

  // Get missing variables
  const missingVars = envChecks
    .filter(v => !v.isSet)
    .map(({ name, description, example, required }) => ({
      name,
      description,
      example,
      required,
    }));

  return NextResponse.json({
    mode,
    configured: mode === 'production',
    missingVars,
    summary: {
      totalRequired: totalRequiredVars,
      requiredSet: requiredVarsSet,
      hasProvider: hasAnyProvider,
    },
  });
}