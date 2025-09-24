/**
 * TypeScript Strict Mode Compliance Patterns
 * GREEN PHASE: Minimal patterns to make tests pass
 */

/**
 * Patterns for TypeScript strict mode compliance in analysis code
 */
export const StrictModePatterns = {
  // Use bracket notation for Record<string, any> properties
  configAccess: "config.parameters['analysisDepth']",
  
  // Proper optional chaining
  optionalAccess: "element.attributes?.['href']",
  
  // Explicit type casting
  typeAssertion: "config.parameters['url'] as string",
  
  // Proper error handling
  errorHandling: "throw new AnalysisConfigurationError('Invalid config')",
  
  // Array access safety
  arrayAccess: "flows[0]?.complexity",
  
  // Nested property access
  nestedAccess: "result.configuration?.['analysisDepth']"
};
