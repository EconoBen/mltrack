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
    
    // Run ml ship command
    const command = `ml ship ${model_name} --optimize`;
    
    try {
      const { stdout, stderr } = await execAsync(command, {
        env: { ...process.env, PATH: `/Users/blabaschin/Documents/GitHub/mltrack/bin:${process.env.PATH}` }
      });
      
      // Parse output for success message
      if (stdout.includes('Container built successfully') || stdout.includes('successfully')) {
        return NextResponse.json({
          success: true,
          message: `${model_name} containerized successfully`,
          output: stdout,
        });
      } else {
        return NextResponse.json(
          { error: 'Container build failed', details: stderr || stdout },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error('Ship error:', error);
      return NextResponse.json(
        { error: 'Failed to ship model', details: error.message },
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