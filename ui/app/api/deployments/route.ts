import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  try {
    // Get list of registered models
    const modelsResponse = await fetch(`${process.env.MLFLOW_TRACKING_URI || 'http://localhost:5000'}/api/2.0/mlflow/registered-models/list`);
    const modelsData = await modelsResponse.json();
    
    // Get running containers
    const { stdout: containerList } = await execAsync('docker ps --format "{{.Names}}\t{{.Status}}\t{{.Ports}}" --filter "name=mltrack-"');
    
    const runningContainers = new Map();
    containerList.split('\n').filter(Boolean).forEach(line => {
      const [name, status, ports] = line.split('\t');
      const modelName = name.replace('mltrack-', '').replace(/-\d+$/, '');
      const port = ports.match(/:(\d+)->8000/)?.[1] || '8000';
      
      runningContainers.set(modelName, {
        status: 'running',
        port: parseInt(port),
        container: name,
      });
    });
    
    // Get model metadata from registry
    const deployments = [];
    
    // Read from local registry
    const fs = require('fs');
    const path = require('path');
    const registryPath = path.join(process.env.HOME || '', '.mltrack', 'registry');
    
    if (fs.existsSync(registryPath)) {
      const files = fs.readdirSync(registryPath);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const modelData = JSON.parse(fs.readFileSync(path.join(registryPath, file), 'utf8'));
          const modelName = file.replace('.json', '');
          
          for (const model of modelData.models || []) {
            const running = runningContainers.get(modelName);
            
            deployments.push({
              model_name: modelName,
              version: model.version,
              status: running ? 'running' : 'stopped',
              container: model.container,
              api: running ? {
                url: `http://localhost:${running.port}`,
                port: running.port,
                health: await checkHealth(`http://localhost:${running.port}`),
              } : undefined,
              framework: model.framework || 'unknown',
              task_type: model.task_type || 'unknown',
              stage: model.stage || 'none',
            });
          }
        }
      }
    }
    
    return NextResponse.json({ deployments });
  } catch (error) {
    console.error('Error fetching deployments:', error);
    return NextResponse.json({ deployments: [] });
  }
}

async function checkHealth(url: string): Promise<'healthy' | 'unhealthy' | 'checking'> {
  try {
    const response = await fetch(`${url}/health`, { 
      method: 'GET',
      signal: AbortSignal.timeout(2000) // 2s timeout
    });
    return response.ok ? 'healthy' : 'unhealthy';
  } catch {
    return 'unhealthy';
  }
}