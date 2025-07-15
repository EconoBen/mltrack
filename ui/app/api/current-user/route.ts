import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  try {
    // Check environment variable first
    const apiKey = process.env.MLTRACK_API_KEY;
    
    if (apiKey) {
      // In a real implementation, this would validate the API key
      // and return user info from the registry
      // For now, we'll return a placeholder
      return NextResponse.json({
        id: 'env-user',
        email: 'user@example.com',
        name: 'Environment User',
      });
    }
    
    // Try to get user from git config
    try {
      const { stdout: email } = await execAsync('git config user.email');
      const { stdout: name } = await execAsync('git config user.name');
      
      if (email && name) {
        // Generate a consistent ID from email
        const id = Buffer.from(email.trim()).toString('base64').slice(0, 12);
        
        return NextResponse.json({
          id,
          email: email.trim(),
          name: name.trim(),
        });
      }
    } catch (gitError) {
      // Git not available or not configured
    }
    
    // Return anonymous user
    return NextResponse.json({
      id: 'anonymous',
      email: 'anonymous@localhost',
      name: 'Anonymous User',
    });
    
  } catch (error) {
    console.error('Failed to get current user:', error);
    return NextResponse.json(
      { error: 'Failed to get current user' },
      { status: 500 }
    );
  }
}