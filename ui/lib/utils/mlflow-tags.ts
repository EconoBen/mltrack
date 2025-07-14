/**
 * Helper functions for extracting tags from MLflow runs.
 * Handles different tag formats that may come from the MLflow API.
 */

export interface RunTags {
  category?: string;
  type?: string;
  framework?: string;
  task?: string;
  algorithm?: string;
  [key: string]: string | undefined;
}

/**
 * Extract MLtrack tags from a run object.
 * Handles both nested (run.data.tags) and flattened (run.tags) formats.
 */
export function extractRunTags(run: any): RunTags {
  const tags: RunTags = {};
  
  // Check multiple possible locations for tags
  const tagSources = [
    run?.data?.tags,
    run?.tags,
    run,  // In case tags are at the root level
  ];
  
  // MLtrack tag keys we're interested in
  const mltrackKeys = ['category', 'type', 'framework', 'task', 'algorithm'];
  
  for (const source of tagSources) {
    if (!source) continue;
    
    // Handle array format: [{key: 'mltrack.category', value: 'llm'}, ...]
    if (Array.isArray(source)) {
      for (const tag of source) {
        if (tag.key && tag.key.startsWith('mltrack.')) {
          const tagName = tag.key.substring(8); // Remove 'mltrack.' prefix
          if (mltrackKeys.includes(tagName)) {
            tags[tagName as keyof RunTags] = tag.value;
          }
        }
      }
      continue;
    }
    
    // Handle object/dictionary format
    if (typeof source === 'object') {
      for (const [key, value] of Object.entries(source)) {
        // Direct match (e.g., tags['mltrack.category'])
        if (key.startsWith('mltrack.')) {
          const tagName = key.substring(8); // Remove 'mltrack.' prefix
          if (mltrackKeys.includes(tagName)) {
            tags[tagName as keyof RunTags] = value as string;
          }
        }
        
        // Flattened format (e.g., 'tags.mltrack.category')
        if (key.startsWith('tags.mltrack.')) {
          const tagName = key.substring(13); // Remove 'tags.mltrack.' prefix
          if (mltrackKeys.includes(tagName)) {
            tags[tagName as keyof RunTags] = value as string;
          }
        }
      }
    }
  }
  
  return tags;
}

/**
 * Get the run type (ml, llm, or mixed) from tags.
 */
export function getRunType(tags: RunTags): 'ml' | 'llm' | 'mixed' {
  // Check category first, then type for backward compatibility
  const type = tags.category || tags.type;
  
  if (type === 'llm') return 'llm';
  if (type === 'ml') return 'ml';
  
  // Default to 'ml' if no type is specified
  return 'ml';
}

/**
 * Extract model information from tags.
 */
export function getModelInfo(tags: RunTags): {
  algorithm: string;
  framework: string;
  task: string;
} {
  return {
    algorithm: tags.algorithm || '-',
    framework: tags.framework || '-',
    task: tags.task || '-',
  };
}