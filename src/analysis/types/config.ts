/**
 * Analysis Configuration Types
 * REFACTOR PHASE: Enhanced interfaces with comprehensive documentation and validation
 * 
 * These interfaces define the configuration schema for the App Analysis Engine,
 * providing type safety and validation for all analysis operations.
 */

import { TestEngineConfig } from '../../config/schemas';

/**
 * Comprehensive configuration interface for App Analysis Engine
 * 
 * Extends the base TestEngineConfig with analysis-specific options for:
 * - DOM extraction and UI element identification
 * - User flow detection and test scenario generation  
 * - AI-powered test generation capabilities
 * - Browser automation and screenshot capture
 * - Output formatting and artifact management
 * 
 * @example
 * ```typescript
 * const config: AppAnalysisConfig = {
 *   enabled: true,
 *   timeout: 30000,
 *   analysisDepth: 'comprehensive',
 *   outputFormat: 'json',
 *   includeScreenshots: true,
 *   ai: {
 *     enabled: true,
 *     provider: 'openai',
 *     model: 'gpt-4'
 *   }
 * };
 * ```
 */
export interface AppAnalysisConfig extends TestEngineConfig {
  /**
   * Analysis depth configuration
   * - 'basic': Fast analysis with core elements only
   * - 'comprehensive': Balanced analysis with most elements and flows
   * - 'detailed': Deep analysis with all elements, flows, and edge cases
   * @default 'comprehensive'
   */
  analysisDepth?: 'basic' | 'comprehensive' | 'detailed';

  /**
   * Output format for analysis results
   * - 'json': Machine-readable JSON format
   * - 'xml': Structured XML format
   * - 'html': Human-readable HTML report
   * @default 'json'
   */
  outputFormat?: 'json' | 'xml' | 'html';

  /**
   * Whether to capture screenshots during analysis
   * Useful for visual verification and debugging
   * @default true
   */
  includeScreenshots?: boolean;

  /**
   * Maximum number of UI elements to analyze
   * Higher values increase analysis time but improve coverage
   * @default 1000
   */
  maxElements?: number;

  /**
   * Whether to include hidden elements in analysis
   * Hidden elements may be revealed by user interactions
   * @default false
   */
  includeHidden?: boolean;
  
  /**
   * Browser automation configuration
   */
  browser?: {
    /** Run browser in headless mode for faster execution */
    headless?: boolean;
    /** Browser viewport size for consistent screenshots */
    viewport?: { width: number; height: number };
    /** Custom user agent string for request identification */
    userAgent?: string;
  };
  
  /**
   * Analysis capabilities configuration
   * Allows selective enabling/disabling of analysis features
   */
  capabilities?: {
    /** Extract DOM structure and element hierarchy */
    domExtraction?: boolean;
    /** Identify and categorize UI elements */
    uiElementIdentification?: boolean;
    /** Detect user workflows and journeys */
    userFlowDetection?: boolean;
    /** Generate Playwright test scenarios */
    testScenarioGeneration?: boolean;
    /** Use AI for intelligent test generation */
    aiTestGeneration?: boolean;
  };
  
  /**
   * AI service configuration for intelligent test generation
   */
  ai?: {
    /** Enable AI-powered test generation */
    enabled?: boolean;
    /** AI service provider */
    provider?: 'openai' | 'claude' | 'local';
    /** AI model to use for generation */
    model?: string;
    /** Temperature for AI creativity (0.0-1.0) */
    temperature?: number;
    /** Maximum tokens for AI response */
    maxTokens?: number;
    /** Timeout for AI service requests (ms) */
    timeout?: number;
  };
  
  /**
   * Output and artifact configuration
   */
  output?: {
    /** Base directory for analysis artifacts */
    artifactsDir?: string;
    /** Directory for screenshot files */
    screenshotsDir?: string;
    /** Directory for analysis reports */
    reportsDir?: string;
    /** Include metadata in output files */
    includeMetadata?: boolean;
  };
  
  /**
   * Analysis validation rules
   */
  validation?: {
    /** Required elements that must be present */
    requiredElements?: string[];
    /** Maximum DOM depth to analyze */
    maxDepth?: number;
    /** Timeout for element detection (ms) */
    timeout?: number;
  };
}
