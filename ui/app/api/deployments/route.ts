import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { runId, config } = body;

    if (!runId || !config) {
      return NextResponse.json(
        { error: 'Missing required fields: runId and config' },
        { status: 400 }
      );
    }

    // Call Python backend to deploy model
    const deploymentUrl = `${process.env.MLFLOW_TRACKING_URI || 'http://localhost:5001'}/api/2.0/preview/mltrack/deploy`;
    
    const response = await fetch(deploymentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        run_id: runId,
        config: config,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Deployment failed: ${error}` },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Deployment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const modelName = searchParams.get('model_name');
    const status = searchParams.get('status');

    // Build query parameters
    const params = new URLSearchParams();
    if (modelName) params.append('model_name', modelName);
    if (status) params.append('status', status);

    // Get deployments from backend
    const deploymentsUrl = `${process.env.MLFLOW_TRACKING_URI || 'http://localhost:5001'}/api/2.0/preview/mltrack/deployments?${params}`;
    
    const response = await fetch(deploymentsUrl);

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Failed to fetch deployments: ${error}` },
        { status: response.status }
      );
    }

    const deployments = await response.json();
    return NextResponse.json(deployments);
  } catch (error) {
    console.error('Error fetching deployments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deploymentId = searchParams.get('deployment_id');

    if (!deploymentId) {
      return NextResponse.json(
        { error: 'Missing deployment_id parameter' },
        { status: 400 }
      );
    }

    // Call Python backend to stop deployment
    const stopUrl = `${process.env.MLFLOW_TRACKING_URI || 'http://localhost:5001'}/api/2.0/preview/mltrack/deployments/${deploymentId}/stop`;
    
    const response = await fetch(stopUrl, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Failed to stop deployment: ${error}` },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error stopping deployment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}