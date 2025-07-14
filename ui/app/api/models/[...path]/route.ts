import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

// Helper to run Python code directly
async function runPythonCode(code: string): Promise<any> {
  return new Promise((resolve, reject) => {
    // Use the virtual environment's Python if available
    const venvPath = path.join(process.cwd(), '..', '.venv', 'bin', 'python');
    const pythonPath = process.env.PYTHON_PATH || venvPath;
    const mltrackPath = path.join(process.cwd(), '..', 'src');
    const mlrunsPath = path.join(process.cwd(), '..', 'mlruns');
    
    const pythonProcess = spawn(pythonPath, ['-c', code], {
      cwd: path.join(process.cwd(), '..'),  // Set working directory to project root
      env: {
        ...process.env,
        PYTHONPATH: mltrackPath,
        MLFLOW_TRACKING_URI: `file://${mlrunsPath}`,
        PYTHONUNBUFFERED: '1'
      }
    });
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python stderr:', stderr);
        reject(new Error(stderr || 'Python process failed'));
      } else {
        try {
          // Extract JSON from stdout - look for the last valid JSON object
          const lines = stdout.trim().split('\n');
          let jsonStr = '';
          
          // Try to find JSON in the output
          for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i].trim();
            if (line.startsWith('{') || line.startsWith('[')) {
              jsonStr = lines.slice(i).join('\n');
              break;
            }
          }
          
          if (!jsonStr) {
            throw new Error('No JSON found in output');
          }
          
          resolve(JSON.parse(jsonStr));
        } catch (e) {
          console.error('Failed to parse Python output:', stdout);
          reject(new Error('Failed to parse Python output: ' + (e instanceof Error ? e.message : String(e))));
        }
      }
    });
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  const path = resolvedParams.path;
  
  try {
    if (path[0] === 's3-buckets') {
      // Get list of S3 buckets
      const code = `
import json
import boto3
from botocore.exceptions import ClientError

try:
    s3 = boto3.client('s3')
    response = s3.list_buckets()
    buckets = [b['Name'] for b in response.get('Buckets', [])]
    print(json.dumps({"buckets": buckets}))
except Exception as e:
    print(json.dumps({"buckets": [], "error": str(e)}))
`;
      const result = await runPythonCode(code);
      return NextResponse.json(result);
    }
    
    if (path[0] === 'list') {
      // Get list of models
      const stage = request.nextUrl.searchParams.get('stage');
      const code = `
import json
from mltrack.model_registry import ModelRegistry
registry = ModelRegistry()
models = registry.list_models(stage=${stage ? `"${stage}"` : 'None'})
print(json.dumps(models))
`;
      const models = await runPythonCode(code);
      return NextResponse.json({ models });
    }
    
    if (path[0] === 'info' && path[1]) {
      // Get model info
      const modelName = path[1];
      const version = request.nextUrl.searchParams.get('version');
      const code = `
import json
from mltrack.model_registry import ModelRegistry
registry = ModelRegistry()
model = registry.get_model("${modelName}", ${version ? `"${version}"` : 'None'})
print(json.dumps(model))
`;
      const info = await runPythonCode(code);
      return NextResponse.json(info);
    }
    
    if (path[0] === 'code' && path[1]) {
      // Generate loading code
      const modelName = path[1];
      const version = request.nextUrl.searchParams.get('version');
      const pythonCode = `
import json
from mltrack.model_registry import ModelRegistry
registry = ModelRegistry()
code = registry.generate_loading_code("${modelName}", ${version ? `"${version}"` : 'None'})
print(json.dumps({"code": code}))
`;
      const result = await runPythonCode(pythonCode);
      return NextResponse.json(result);
    }
    
    return NextResponse.json(
      { error: 'Invalid endpoint' },
      { status: 404 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  const path = resolvedParams.path;
  
  try {
    if (path[0] === 'register') {
      // Register a new model
      const body = await request.json();
      const { runId, name, path: modelPath, stage, description, s3Bucket } = body;
      
      // Escape strings to prevent injection
      const escapeString = (str: string) => str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
      
      const code = `
import json
import sys
import os
import mlflow

# Use the tracking URI from environment

from mltrack.model_registry import ModelRegistry

try:
    registry = ModelRegistry(s3_bucket=${s3Bucket ? `"${escapeString(s3Bucket)}"` : 'None'})
    model_info = registry.register_model(
        run_id="${escapeString(runId)}",
        model_name="${escapeString(name)}",
        model_path="${escapeString(modelPath || 'model')}",
        stage="${escapeString(stage || 'staging')}",
        description=${description ? `"${escapeString(description)}"` : 'None'}
    )
    print(json.dumps(model_info))
except Exception as e:
    print(json.dumps({"error": str(e)}), file=sys.stderr)
    sys.exit(1)
`;
      const result = await runPythonCode(code);
      return NextResponse.json(result);
    }
    
    if (path[0] === 'transition') {
      // Transition model stage
      const body = await request.json();
      const { modelName, version, stage, archiveExisting } = body;
      
      const code = `
import json
from mltrack.model_registry import ModelRegistry
registry = ModelRegistry()
updated = registry.transition_model_stage(
    model_name="${modelName}",
    version="${version}",
    stage="${stage}",
    archive_existing=${archiveExisting !== false ? 'True' : 'False'}
)
print(json.dumps(updated))
`;
      const result = await runPythonCode(code);
      return NextResponse.json(result);
    }
    
    return NextResponse.json(
      { error: 'Invalid endpoint' },
      { status: 404 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}