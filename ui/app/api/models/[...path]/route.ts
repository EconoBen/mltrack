import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

// Helper to run Python code directly
async function runPythonCode(code: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonPath = process.env.PYTHON_PATH || 'python3';
    const mltrackPath = path.join(process.cwd(), '..', 'src');
    
    const pythonProcess = spawn(pythonPath, ['-c', code], {
      env: {
        ...process.env,
        PYTHONPATH: mltrackPath,
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
        reject(new Error(stderr || 'Python process failed'));
      } else {
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          reject(new Error('Failed to parse Python output'));
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
      
      const code = `
import json
from mltrack.model_registry import ModelRegistry
registry = ModelRegistry(s3_bucket=${s3Bucket ? `"${s3Bucket}"` : 'None'})
model_info = registry.register_model(
    run_id="${runId}",
    model_name="${name}",
    model_path="${modelPath || 'model'}",
    stage="${stage || 'staging'}",
    description=${description ? `"${description}"` : 'None'}
)
print(json.dumps(model_info))
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