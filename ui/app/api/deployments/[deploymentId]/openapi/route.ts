import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deploymentId: string }> }
) {
  try {
    const { deploymentId } = await params;
    
    // Get OpenAPI spec from Python backend
    const specUrl = `${process.env.MLFLOW_TRACKING_URI || 'http://localhost:5001'}/api/2.0/preview/mltrack/deployments/${deploymentId}/openapi`;
    
    const response = await fetch(specUrl);

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Failed to fetch OpenAPI spec: ${error}` },
        { status: response.status }
      );
    }

    const spec = await response.json();
    return NextResponse.json(spec);
  } catch (error) {
    console.error('Error fetching OpenAPI spec:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}