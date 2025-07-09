import { NextResponse } from 'next/server';

export async function GET() {
  // Return configuration for the UI
  return NextResponse.json({
    mlflowUrl: process.env.NEXT_PUBLIC_MLFLOW_URL || '/api/mlflow',
    features: {
      llmTracking: true,
      costAnalysis: true,
      teamFeatures: true,
      realTimeUpdates: true,
    },
    theme: {
      defaultMode: 'light',
      enableDarkMode: true,
    },
  });
}