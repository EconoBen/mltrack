import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { deploymentId: string } }
) {
  const deploymentId = params.deploymentId;
  
  // Generate mock metrics for demonstration
  // In production, this would fetch from Prometheus, DataDog, etc.
  const now = new Date();
  const latencyHistory = [];
  const throughputHistory = [];
  
  // Generate last hour of data
  for (let i = 59; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60000);
    latencyHistory.push({
      time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      value: Math.floor(Math.random() * 50) + 30,
    });
    throughputHistory.push({
      time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      value: Math.floor(Math.random() * 100) + 50,
    });
  }
  
  const totalRequests = Math.floor(Math.random() * 100000) + 10000;
  const errorRate = Math.random() * 0.05; // 0-5% error rate
  const successfulRequests = Math.floor(totalRequests * (1 - errorRate));
  
  const metrics = {
    latency_p50: Math.floor(Math.random() * 30) + 20,
    latency_p95: Math.floor(Math.random() * 50) + 50,
    latency_p99: Math.floor(Math.random() * 100) + 80,
    requests_per_minute: Math.floor(Math.random() * 100) + 50,
    error_rate: errorRate,
    uptime_percentage: 99.5 + Math.random() * 0.49,
    total_requests: totalRequests,
    successful_requests: successfulRequests,
    failed_requests: totalRequests - successfulRequests,
    avg_tokens_per_request: Math.floor(Math.random() * 100) + 50,
    latency_history: latencyHistory,
    throughput_history: throughputHistory,
  };
  
  return NextResponse.json(metrics);
}