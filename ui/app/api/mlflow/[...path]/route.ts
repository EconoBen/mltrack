import { NextRequest, NextResponse } from 'next/server';

const MLFLOW_BASE_URL = process.env.MLFLOW_TRACKING_URI || 'http://localhost:5000';
const MLFLOW_USERNAME = process.env.MLFLOW_TRACKING_USERNAME;
const MLFLOW_PASSWORD = process.env.MLFLOW_TRACKING_PASSWORD;
const MLFLOW_TOKEN = process.env.MLFLOW_TRACKING_TOKEN;

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params, 'DELETE');
}

async function handleRequest(
  request: NextRequest,
  { path }: { path: string[] },
  method: string
) {
  try {
    // Construct the MLflow API URL
    const apiPath = path.join('/');
    const url = new URL(`/api/2.0/mlflow/${apiPath}`, MLFLOW_BASE_URL);
    
    // Copy query parameters
    request.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.append(key, value);
    });

    // Prepare headers
    const headers = new Headers({
      'Content-Type': 'application/json',
    });

    // Add authentication
    if (MLFLOW_TOKEN) {
      headers.set('Authorization', `Bearer ${MLFLOW_TOKEN}`);
    } else if (MLFLOW_USERNAME && MLFLOW_PASSWORD) {
      const auth = Buffer.from(`${MLFLOW_USERNAME}:${MLFLOW_PASSWORD}`).toString('base64');
      headers.set('Authorization', `Basic ${auth}`);
    }

    // Prepare request options
    const options: RequestInit = {
      method,
      headers,
    };

    // Add body for POST/PUT requests
    if (method === 'POST' || method === 'PUT') {
      const body = await request.json();
      options.body = JSON.stringify(body);
    }

    // Make the request to MLflow
    const response = await fetch(url.toString(), options);

    // Get the response data
    const data = await response.json();

    // Return the response with CORS headers
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('MLflow proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request to MLflow' },
      { status: 500 }
    );
  }
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}