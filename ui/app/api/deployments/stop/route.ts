import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { model_name } = await request.json();
    
    if (!model_name) {
      return NextResponse.json(
        { error: 'Model name is required' },
        { status: 400 }
      );
    }
    
    // Find running container
    const { stdout: containerName } = await execAsync(
      `docker ps --filter "name=mltrack-${model_name}" --format "{{.Names}}" | head -1`
    );
    
    if (!containerName.trim()) {
      return NextResponse.json(
        { error: 'No running container found for this model' },
        { status: 404 }
      );
    }
    
    // Stop container
    await execAsync(`docker stop ${containerName.trim()}`);
    
    // Remove container
    await execAsync(`docker rm ${containerName.trim()}`);
    
    return NextResponse.json({
      success: true,
      message: `${model_name} stopped successfully`,
    });
  } catch (error) {
    console.error('Stop deployment error:', error);
    return NextResponse.json(
      { error: 'Failed to stop deployment', details: error.message },
      { status: 500 }
    );
  }
}