import axios, { AxiosInstance } from 'axios';
import { extractRunTags, getRunType } from '@/lib/utils/mlflow-tags';

export interface MLflowConfig {
  baseUrl: string;
  username?: string;
  password?: string;
  token?: string;
}

export interface Experiment {
  experiment_id: string;
  name: string;
  artifact_location: string;
  lifecycle_stage: string;
  last_update_time: number;
  creation_time: number;
  tags: Record<string, string>;
}

export interface Run {
  info: {
    run_id: string;
    experiment_id: string;
    user_id: string;
    status: string;
    start_time: number;
    end_time?: number;
    artifact_uri: string;
    lifecycle_stage: string;
  };
  data: {
    metrics: Record<string, number>;
    params: Record<string, string>;
    tags: Record<string, string>;
  };
}

export interface Metric {
  key: string;
  value: number;
  timestamp: number;
  step: number;
}

export class MLflowClient {
  private client: AxiosInstance;

  constructor(config: MLflowConfig) {
    this.client = axios.create({
      baseURL: `${config.baseUrl}/api/2.0/mlflow`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add authentication
    if (config.token) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${config.token}`;
    } else if (config.username && config.password) {
      const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
      this.client.defaults.headers.common['Authorization'] = `Basic ${auth}`;
    }
  }

  // Experiments
  async searchExperiments(filters?: string): Promise<Experiment[]> {
    try {
      const response = await this.client.post('/experiments/search', {
        filter: filters,
        max_results: 1000,
      });
      return response.data.experiments || [];
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 503) {
        console.error('MLflow server is not running');
        return [];
      }
      throw error;
    }
  }

  async getExperiment(experimentId: string): Promise<Experiment> {
    const response = await this.client.get('/experiments/get', {
      params: { experiment_id: experimentId },
    });
    return response.data.experiment;
  }

  // Runs
  async searchRuns(experimentIds: string[], filter?: string): Promise<Run[]> {
    const response = await this.client.post('/runs/search', {
      experiment_ids: experimentIds,
      filter,
      max_results: 1000,
      order_by: ['start_time DESC'],
    });
    return response.data.runs || [];
  }

  async getRun(runId: string): Promise<Run> {
    const response = await this.client.get('/runs/get', {
      params: { run_id: runId },
    });
    return response.data.run;
  }

  // Metrics
  async getMetricHistory(runId: string, metricKey: string): Promise<Metric[]> {
    const response = await this.client.get('/metrics/get-history', {
      params: { run_id: runId, metric_key: metricKey },
    });
    return response.data.metrics || [];
  }

  // Artifacts
  async listArtifacts(runId: string, path?: string): Promise<{
    files: Array<{
      path: string;
      is_dir: boolean;
      file_size?: number;
    }>;
  }> {
    const response = await this.client.get('/artifacts/list', {
      params: { run_id: runId, path: path || '' },
    });
    return response.data;
  }

  // Batch operations
  async getRunsWithMetrics(experimentIds: string[]): Promise<Run[]> {
    const runs = await this.searchRuns(experimentIds);
    
    // For each run, fetch detailed metrics if needed
    const detailedRuns = await Promise.all(
      runs.map(async (run) => {
        // You could fetch additional metrics here if needed
        return run;
      })
    );
    
    return detailedRuns;
  }

  // LLM specific methods
  async searchLLMRuns(experimentIds: string[]): Promise<Run[]> {
    const filter = 'tags."mltrack.type" = "llm"';
    return this.searchRuns(experimentIds, filter);
  }

  async getLLMCostAnalysis(experimentIds: string[]): Promise<{
    totalCost: number;
    byModel: Record<string, number>;
    byProvider: Record<string, number>;
    timeline: Array<{ date: string; cost: number }>;
  }> {
    const runs = await this.searchLLMRuns(experimentIds);
    
    const analysis = {
      totalCost: 0,
      byModel: {} as Record<string, number>,
      byProvider: {} as Record<string, number>,
      timeline: [] as Array<{ date: string; cost: number }>,
    };

    // Process runs for cost analysis
    runs.forEach((run) => {
      // Try different metric names that might be used
      const cost = run.data.metrics['llm.cost_usd'] || 
                   run.data.metrics['llm.total_cost'] || 
                   run.data.metrics['llm.conversation.total_cost'] || 0;
      
      // Extract model and provider from tags
      const model = run.data.tags['llm.model'] || 
                    run.data.params['llm.model'] || 
                    run.data.params['model'] || 
                    'unknown';
      
      const provider = run.data.tags['llm.provider'] || 
                       run.data.params['llm.provider'] || 
                       run.data.tags['provider'] || 
                       'unknown';
      
      analysis.totalCost += cost;
      analysis.byModel[model] = (analysis.byModel[model] || 0) + cost;
      analysis.byProvider[provider] = (analysis.byProvider[provider] || 0) + cost;
    });

    return analysis;
  }

  // Experiment type detection
  async getExperimentType(experimentId: string): Promise<'ml' | 'llm' | 'mixed'> {
    const runs = await this.searchRuns([experimentId]);
    
    if (runs.length === 0) return 'ml'; // Default to ML if no runs
    
    const runTypes = runs.map(run => {
      const tags = extractRunTags(run);
      return getRunType(tags);
    });
    
    const hasLLM = runTypes.includes('llm');
    const hasML = runTypes.includes('ml');
    
    if (hasLLM && hasML) return 'mixed';
    if (hasLLM) return 'llm';
    
    return 'ml'; // Default
  }

  async getExperimentStats(experimentId: string): Promise<{
    totalRuns: number;
    activeRuns: number;
    completedRuns: number;
    failedRuns: number;
    lastRunTime?: number;
    type: 'ml' | 'llm' | 'mixed';
  }> {
    const runs = await this.searchRuns([experimentId]);
    const type = await this.getExperimentType(experimentId);
    
    return {
      totalRuns: runs.length,
      activeRuns: runs.filter(r => r.info.status === 'RUNNING').length,
      completedRuns: runs.filter(r => r.info.status === 'FINISHED').length,
      failedRuns: runs.filter(r => r.info.status === 'FAILED').length,
      lastRunTime: runs.length > 0 ? Math.max(...runs.map(r => r.info.start_time)) : undefined,
      type,
    };
  }
}