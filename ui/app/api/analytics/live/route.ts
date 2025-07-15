import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

// This is a Server-Sent Events (SSE) endpoint for real-time updates
// WebSockets are not natively supported in Next.js App Router yet
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  
  // Create a TransformStream for streaming responses
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  
  // Set up SSE headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable Nginx buffering
  });

  // Simulate real-time data updates
  const sendUpdate = async () => {
    try {
      // In a real implementation, this would fetch latest metrics from MLflow
      const data = {
        timestamp: new Date().toISOString(),
        metrics: {
          activeRuns: Math.floor(Math.random() * 10) + 5,
          recentCost: Math.random() * 10,
          avgLatency: Math.random() * 500 + 100,
          requestsPerMinute: Math.floor(Math.random() * 100) + 50,
        },
        recentRuns: [
          {
            id: `run_${Date.now()}`,
            experimentName: `Experiment ${Math.floor(Math.random() * 5) + 1}`,
            model: ['GPT-4', 'Claude 3', 'GPT-3.5'][Math.floor(Math.random() * 3)],
            status: Math.random() > 0.1 ? 'FINISHED' : 'FAILED',
            cost: Math.random() * 5,
            latency: Math.random() * 1000 + 200,
            timestamp: new Date().toISOString(),
          }
        ]
      };
      
      const message = `data: ${JSON.stringify(data)}\n\n`;
      await writer.write(encoder.encode(message));
    } catch (error) {
      console.error('Error sending update:', error);
    }
  };

  // Send initial update
  await sendUpdate();
  
  // Set up interval for periodic updates
  const interval = setInterval(sendUpdate, 5000); // Update every 5 seconds
  
  // Clean up on client disconnect
  request.signal.addEventListener('abort', () => {
    clearInterval(interval);
    writer.close();
  });
  
  return new Response(stream.readable, { headers });
}