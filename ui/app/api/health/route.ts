import { NextResponse } from 'next/server';

export async function GET() {
  const authConfigured = !!(process.env.NEXTAUTH_SECRET || process.env.NODE_ENV === 'development');
  
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    auth: {
      configured: authConfigured,
      mode: authConfigured ? 'enabled' : 'disabled',
    },
  });
}