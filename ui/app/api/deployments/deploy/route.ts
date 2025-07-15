import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { model_name, port = 8000 } = await request.json();
    
    if (!model_name) {
      return NextResponse.json(
        { error: 'Model name is required' },
        { status: 400 }
      );
    }
    
    // Run ml serve command
    const command = `ml serve ${model_name} --port ${port} -d`;
    
    try {
      const { stdout, stderr } = await execAsync(command, {
        env: { ...process.env, PATH: `/Users/blabaschin/Documents/GitHub/mltrack/bin:${process.env.PATH}` }
      });
      
      // Wait a bit for container to start
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check if container is running
      const { stdout: psOutput } = await execAsync(`docker ps --filter "name=mltrack-${model_name}" --format "{{.Names}}"`);
      
      if (psOutput.includes(`mltrack-${model_name}`)) {
        return NextResponse.json({
          success: true,
          message: `${model_name} deployed successfully`,
          port,
        });
      } else {
        return NextResponse.json(
          { error: 'Container failed to start', details: stderr },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error('Deployment error:', error);
      return NextResponse.json(
        { error: 'Failed to deploy model', details: error.message },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}