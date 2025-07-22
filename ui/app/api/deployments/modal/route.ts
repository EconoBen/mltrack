import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

// Define deployment configuration interface
interface ModalDeploymentConfig {
  runId: string;
  appName: string;
  modelName: string;
  modelVersion: string;
  cpu?: number;
  memory?: number;
  gpu?: string;
  minReplicas?: number;
  maxReplicas?: number;
  environmentVars?: Record<string, string>;
  requirements?: string[];
  pythonVersion?: string;
}

// Deploy to Modal endpoint
export async function POST(request: NextRequest) {
  try {
    const config: ModalDeploymentConfig = await request.json();
    
    // Validate required fields
    if (!config.runId || !config.appName || !config.modelName) {
      return NextResponse.json(
        { error: 'Missing required fields: runId, appName, modelName' },
        { status: 400 }
      );
    }

    // Prepare Python command to deploy via MLTrack
    const pythonScript = `
import sys
import json
from mltrack.deploy import deploy_to_modal, DeploymentConfig

config_data = json.loads('''${JSON.stringify(config)}''')

# Create deployment configuration
deployment_config = DeploymentConfig(
    app_name=config_data['appName'],
    model_name=config_data['modelName'],
    model_version=config_data.get('modelVersion', '1.0.0'),
    cpu=config_data.get('cpu', 1.0),
    memory=config_data.get('memory', 512),
    gpu=config_data.get('gpu'),
    min_replicas=config_data.get('minReplicas', 1),
    max_replicas=config_data.get('maxReplicas', 5),
    environment_vars=config_data.get('environmentVars', {}),
    requirements=config_data.get('requirements', []),
    python_version=config_data.get('pythonVersion', '3.11')
)

# Deploy to Modal
result = deploy_to_modal(config_data['runId'], deployment_config)
print(json.dumps(result))
`;

    // Execute Python script
    const mltrackPath = path.join(process.cwd(), '..', 'src');
    const { stdout, stderr } = await execAsync(
      `cd ${mltrackPath} && python -c "${pythonScript}"`,
      {
        env: {
          ...process.env,
          PYTHONPATH: mltrackPath,
          MLFLOW_TRACKING_URI: process.env.MLFLOW_TRACKING_URI || 'http://localhost:5001'
        }
      }
    );

    if (stderr && !stderr.includes('WARNING')) {
      console.error('Deployment stderr:', stderr);
      return NextResponse.json(
        { error: `Deployment failed: ${stderr}` },
        { status: 500 }
      );
    }

    // Parse deployment result
    const deploymentInfo = JSON.parse(stdout.trim());
    
    return NextResponse.json({
      success: true,
      deployment: deploymentInfo
    });

  } catch (error) {
    console.error('Modal deployment error:', error);
    return NextResponse.json(
      { error: `Failed to deploy to Modal: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// Get deployment status
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const deploymentId = searchParams.get('deploymentId');
  const modelName = searchParams.get('modelName');

  try {
    let pythonScript: string;
    
    if (deploymentId) {
      // Get specific deployment status
      pythonScript = `
import json
from mltrack.deploy import get_deployment_status

result = get_deployment_status('${deploymentId}')
print(json.dumps(result))
`;
    } else {
      // List all deployments
      pythonScript = `
import json
from mltrack.deploy import list_deployments

model_name = ${modelName ? `'${modelName}'` : 'None'}
result = list_deployments(model_name=model_name)
print(json.dumps(result))
`;
    }

    const mltrackPath = path.join(process.cwd(), '..', 'src');
    const { stdout, stderr } = await execAsync(
      `cd ${mltrackPath} && python -c "${pythonScript}"`,
      {
        env: {
          ...process.env,
          PYTHONPATH: mltrackPath
        }
      }
    );

    if (stderr && !stderr.includes('WARNING')) {
      console.error('Status check stderr:', stderr);
    }

    const result = stdout.trim() === 'null' ? null : JSON.parse(stdout.trim());
    
    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Get deployment status error:', error);
    return NextResponse.json(
      { error: `Failed to get deployment status: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// Stop deployment
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const deploymentId = searchParams.get('deploymentId');
  
  if (!deploymentId) {
    return NextResponse.json(
      { error: 'deploymentId is required' },
      { status: 400 }
    );
  }

  try {
    const pythonScript = `
import json
from mltrack.deploy import stop_deployment

result = stop_deployment('${deploymentId}')
print(json.dumps({'success': result}))
`;

    const mltrackPath = path.join(process.cwd(), '..', 'src');
    const { stdout, stderr } = await execAsync(
      `cd ${mltrackPath} && python -c "${pythonScript}"`,
      {
        env: {
          ...process.env,
          PYTHONPATH: mltrackPath
        }
      }
    );

    if (stderr && !stderr.includes('WARNING')) {
      console.error('Stop deployment stderr:', stderr);
    }

    const result = JSON.parse(stdout.trim());
    
    return NextResponse.json(result);

  } catch (error) {
    console.error('Stop deployment error:', error);
    return NextResponse.json(
      { error: `Failed to stop deployment: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}