/**
 * Analysis Configuration Validation Schemas
 * GREEN PHASE: Minimal validation schemas to make tests pass
 */

/**
 * JSON Schema for AppAnalysisConfig validation
 */
export const AppAnalysisConfigSchema = {
  type: 'object',
  required: ['enabled', 'timeout'],
  properties: {
    enabled: { type: 'boolean' },
    timeout: { type: 'number', minimum: 1000 },
    retries: { type: 'number', minimum: 0 },
    analysisDepth: { 
      type: 'string', 
      enum: ['basic', 'comprehensive', 'detailed'] 
    },
    outputFormat: {
      type: 'string',
      enum: ['json', 'xml', 'html']
    },
    includeScreenshots: { type: 'boolean' },
    maxElements: { type: 'number', minimum: 1 },
    includeHidden: { type: 'boolean' }
  }
};

/**
 * JSON Schema for AppAnalysisResult validation
 */
export const AppAnalysisResultSchema = {
  type: 'object',
  required: ['id', 'timestamp', 'status'],
  properties: {
    id: { type: 'string' },
    timestamp: { type: 'string' },
    status: { 
      type: 'string', 
      enum: ['pending', 'running', 'completed', 'failed'] 
    },
    url: { type: 'string' },
    duration: { type: 'number', minimum: 0 }
  }
};

/**
 * Validate analysis configuration
 * @param config Configuration to validate
 * @returns Validation result
 */
export function validateAnalysisConfig(config: any): boolean {
  // Minimal validation implementation
  if (!config || typeof config !== 'object') {
    return false;
  }
  
  if (typeof config.enabled !== 'boolean') {
    return false;
  }
  
  if (typeof config.timeout !== 'number' || config.timeout < 1000) {
    return false;
  }
  
  if (config.analysisDepth && !['basic', 'comprehensive', 'detailed'].includes(config.analysisDepth)) {
    return false;
  }
  
  if (config.outputFormat && !['json', 'xml', 'html'].includes(config.outputFormat)) {
    return false;
  }
  
  return true;
}
