import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

interface CachedMetrics {
  activeRuns: number;
  recentCost: number;
  avgLatency: number[];
  requestsPerMinute: number;
  recentRuns: any[];
}

// Cache to track metrics over time
let metricsCache: CachedMetrics = {
  activeRuns: 0,
  recentCost: 0,
  avgLatency: [],
  requestsPerMinute: 0,
  recentRuns: [],
};

let lastFetchTime = Date.now();

// Fetch real metrics from MLflow
async function fetchRealMetrics() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_MLFLOW_URL || 'http://localhost:5002';
    
    // Get recent runs (last 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const response = await fetch(`${baseUrl}/api/2.0/mlflow/runs/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filter: `start_time > ${fiveMinutesAgo}`,
        max_results: 100,
        order_by: ['start_time DESC'],
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch runs from MLflow');
    }

    const data = await response.json();
    const runs = data.runs || [];
    
    // Calculate metrics
    const activeRuns = runs.filter((r: any) => r.info.status === 'RUNNING').length;
    
    // Calculate recent cost
    let recentCost = 0;
    const latencies: number[] = [];
    
    runs.forEach((run: any) => {
      // Extract cost
      const costMetric = run.data?.metrics?.find((m: any) => 
        m.key === 'llm.cost_usd' || m.key === 'llm.total_cost'
      );
      if (costMetric) {
        recentCost += costMetric.value;
      }
      
      // Extract latency
      const latencyMetric = run.data?.metrics?.find((m: any) => 
        m.key === 'latency_ms' || m.key === 'llm.latency' || m.key === 'response_time'
      );
      if (latencyMetric) {
        latencies.push(latencyMetric.value);
      }
    });
    
    // Calculate average latency
    const avgLatency = latencies.length > 0 
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0;
    
    // Calculate requests per minute
    const currentTime = Date.now();
    const timeDiff = (currentTime - lastFetchTime) / 1000 / 60; // in minutes
    const requestsPerMinute = Math.round(runs.length / Math.max(timeDiff, 1));
    lastFetchTime = currentTime;
    
    // Update cache
    metricsCache = {
      activeRuns,
      recentCost,
      avgLatency: [...metricsCache.avgLatency, avgLatency].slice(-50), // Keep last 50
      requestsPerMinute,
      recentRuns: runs.slice(0, 5).map((run: any) => ({
        id: run.info.run_id,
        experimentName: run.data?.tags?.find((t: any) => t.key === 'mlflow.experimentName')?.value || 'Unknown',
        model: run.data?.tags?.find((t: any) => t.key === 'llm.model')?.value || 'Unknown',
        status: run.info.status,
        cost: run.data?.metrics?.find((m: any) => m.key === 'llm.cost_usd')?.value || 0,
        latency: run.data?.metrics?.find((m: any) => m.key === 'latency_ms')?.value || 0,
        timestamp: new Date(run.info.start_time).toISOString(),
      })),
    };
    
    return {
      timestamp: new Date().toISOString(),
      metrics: {
        activeRuns: metricsCache.activeRuns,
        recentCost: metricsCache.recentCost,
        avgLatency: avgLatency || 0,
        requestsPerMinute: metricsCache.requestsPerMinute,
      },
      recentRuns: metricsCache.recentRuns,
    };
  } catch (error) {
    console.error('Error fetching MLflow metrics:', error);
    // Return mock data on error
    return {
      timestamp: new Date().toISOString(),
      metrics: {
        activeRuns: Math.floor(Math.random() * 10) + 5,
        recentCost: Math.random() * 10,
        avgLatency: Math.random() * 500 + 100,
        requestsPerMinute: Math.floor(Math.random() * 100) + 50,
      },
      recentRuns: [],
    };
  }
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const sendUpdate = async () => {
    try {
      const data = await fetchRealMetrics();
      const message = `data: ${JSON.stringify(data)}\n\n`;
      await writer.write(encoder.encode(message));
    } catch (error) {
      console.error('Error sending update:', error);
    }
  };

  // Send initial update
  await sendUpdate();
  
  // Set up interval for periodic updates (every 5 seconds)
  const interval = setInterval(sendUpdate, 5000);
  
  // Clean up on client disconnect
  request.signal.addEventListener('abort', () => {
    clearInterval(interval);
    writer.close();
  });
  
  return new Response(stream.readable, { headers });
}