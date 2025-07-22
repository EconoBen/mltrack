import { NextRequest, NextResponse } from "next/server";

interface ReportData {
  type: string;
  dateRange: {
    from: string;
    to: string;
  };
  runs: any[];
  metrics: any;
}

export async function POST(request: NextRequest) {
  try {
    const data: ReportData = await request.json();
    const { type, runs, metrics } = data;

    // Generate insights based on report type and data
    const insights = generateInsights(type, runs, metrics);

    return NextResponse.json({ insights });
  } catch (error) {
    console.error("Error generating insights:", error);
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    );
  }
}

function generateInsights(type: string, runs: any[], metrics: any): any[] {
  const insights = [];

  // Calculate basic statistics
  const totalRuns = runs.length;
  const successfulRuns = runs.filter(r => r.info.status === "FINISHED").length;
  const failedRuns = runs.filter(r => r.info.status === "FAILED").length;
  const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;

  // Analyze trends
  const sortedRuns = [...runs].sort((a, b) => a.info.start_time - b.info.start_time);
  const recentRuns = sortedRuns.slice(-10);
  const olderRuns = sortedRuns.slice(0, -10);
  
  const recentSuccessRate = recentRuns.length > 0 
    ? (recentRuns.filter(r => r.info.status === "FINISHED").length / recentRuns.length) * 100 
    : 0;
  const olderSuccessRate = olderRuns.length > 0
    ? (olderRuns.filter(r => r.info.status === "FINISHED").length / olderRuns.length) * 100
    : 0;

  // Performance insights
  if (recentSuccessRate > olderSuccessRate + 10) {
    insights.push({
      type: "improvement",
      icon: "TrendingUp",
      color: "green",
      title: "Performance Improvement",
      description: `Success rate improved by ${(recentSuccessRate - olderSuccessRate).toFixed(1)}% in recent runs`,
      priority: 1
    });
  } else if (recentSuccessRate < olderSuccessRate - 10) {
    insights.push({
      type: "warning",
      icon: "TrendingDown",
      color: "red",
      title: "Performance Degradation",
      description: `Success rate decreased by ${(olderSuccessRate - recentSuccessRate).toFixed(1)}% in recent runs`,
      priority: 1
    });
  }

  // Cost insights for executive and cost reports
  if (["executive", "cost"].includes(type)) {
    const totalCost = metrics.totalCost || 0;
    const avgCostPerRun = totalRuns > 0 ? totalCost / totalRuns : 0;
    
    // Analyze cost by model
    const costByModel: Record<string, number> = {};
    runs.forEach(run => {
      const model = run.data.tags?.["llm.model"] || "Unknown";
      const cost = run.data.metrics?.["llm.cost_usd"] || 0;
      const costValue = typeof cost === "object" ? cost.value : cost;
      costByModel[model] = (costByModel[model] || 0) + costValue;
    });

    const sortedModels = Object.entries(costByModel).sort((a, b) => b[1] - a[1]);
    if (sortedModels.length > 1) {
      const [expensiveModel, expensiveCost] = sortedModels[0];
      const [cheaperModel, cheaperCost] = sortedModels[1];
      
      if (expensiveCost > cheaperCost * 2) {
        const savings = ((expensiveCost - cheaperCost) / expensiveCost * 100).toFixed(0);
        insights.push({
          type: "optimization",
          icon: "DollarSign",
          color: "amber",
          title: "Cost Optimization Opportunity",
          description: `Switching from ${expensiveModel} to ${cheaperModel} could save ~${savings}% on costs`,
          priority: 2
        });
      }
    }

    // High cost warning
    if (avgCostPerRun > 0.5) {
      insights.push({
        type: "warning",
        icon: "AlertCircle",
        color: "amber",
        title: "High Average Cost",
        description: `Average cost per run ($${avgCostPerRun.toFixed(2)}) exceeds recommended threshold`,
        priority: 2
      });
    }
  }

  // Usage insights
  const uniqueUsers = new Set(runs.map(r => 
    r.data.tags?.["mltrack.user.id"] || r.data.tags?.["mlflow.user"] || "unknown"
  )).size;

  const dailyRuns = totalRuns / 30; // Assuming 30-day period
  if (dailyRuns > 100) {
    insights.push({
      type: "info",
      icon: "Activity",
      color: "blue",
      title: "High Usage Volume",
      description: `Processing ${dailyRuns.toFixed(0)} runs per day across ${uniqueUsers} users`,
      priority: 3
    });
  }

  // Model diversity
  const modelTypes = new Set(runs.map(r => 
    r.data.tags?.["model.type"] || r.data.tags?.["llm.model"] || "unknown"
  ));
  if (modelTypes.size > 5) {
    insights.push({
      type: "info",
      icon: "Layers",
      color: "purple",
      title: "Diverse Model Portfolio",
      description: `Using ${modelTypes.size} different model types - consider standardization`,
      priority: 4
    });
  }

  // Error patterns
  if (failedRuns > 0) {
    const errorMessages = runs
      .filter(r => r.info.status === "FAILED")
      .map(r => r.data.tags?.["error"] || "Unknown error");
    
    const errorCounts: Record<string, number> = {};
    errorMessages.forEach(msg => {
      const category = categorizeError(msg);
      errorCounts[category] = (errorCounts[category] || 0) + 1;
    });

    const topError = Object.entries(errorCounts).sort((a, b) => b[1] - a[1])[0];
    if (topError) {
      insights.push({
        type: "error",
        icon: "AlertTriangle",
        color: "red",
        title: "Common Error Pattern",
        description: `${topError[0]} accounts for ${topError[1]} failures - investigate root cause`,
        priority: 2
      });
    }
  }

  // Technical insights
  if (type === "technical") {
    // Analyze accuracy trends
    const accuracyMetrics = runs
      .filter(r => r.data.metrics?.accuracy || r.data.metrics?.test_accuracy)
      .map(r => {
        const acc = r.data.metrics?.accuracy || r.data.metrics?.test_accuracy;
        return typeof acc === "object" ? acc.value : acc;
      });

    if (accuracyMetrics.length > 5) {
      const recentAccuracy = accuracyMetrics.slice(-5).reduce((a, b) => a + b, 0) / 5;
      const overallAccuracy = accuracyMetrics.reduce((a, b) => a + b, 0) / accuracyMetrics.length;

      if (recentAccuracy > overallAccuracy + 0.05) {
        insights.push({
          type: "improvement",
          icon: "Target",
          color: "green",
          title: "Model Accuracy Improving",
          description: `Recent models show ${((recentAccuracy - overallAccuracy) * 100).toFixed(1)}% accuracy improvement`,
          priority: 1
        });
      }
    }

    // Training time analysis
    const trainingTimes = runs
      .filter(r => r.info.end_time)
      .map(r => (r.info.end_time - r.info.start_time) / 1000);

    if (trainingTimes.length > 0) {
      const avgTime = trainingTimes.reduce((a, b) => a + b, 0) / trainingTimes.length;
      const recentAvgTime = trainingTimes.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, trainingTimes.length);

      if (recentAvgTime > avgTime * 1.5) {
        insights.push({
          type: "warning",
          icon: "Clock",
          color: "amber",
          title: "Training Time Increasing",
          description: `Recent runs taking ${((recentAvgTime / avgTime - 1) * 100).toFixed(0)}% longer than average`,
          priority: 3
        });
      }
    }
  }

  // Sort insights by priority
  return insights.sort((a, b) => a.priority - b.priority);
}

function categorizeError(errorMessage: string): string {
  const message = errorMessage.toLowerCase();
  
  if (message.includes("timeout")) return "Timeout Errors";
  if (message.includes("memory") || message.includes("oom")) return "Memory Errors";
  if (message.includes("api") || message.includes("rate limit")) return "API Errors";
  if (message.includes("connection") || message.includes("network")) return "Network Errors";
  if (message.includes("permission") || message.includes("access")) return "Permission Errors";
  if (message.includes("gpu") || message.includes("cuda")) return "GPU Errors";
  
  return "Other Errors";
}