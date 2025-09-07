/**
 * ID Fallback Strategy
 * 
 * This strategy attempts to recover from locator failures by trying to find
 * elements using their ID attribute. ID-based locators are generally more
 * reliable and faster than other selector types.
 */

import { 
  TestFailure, 
  HealingResult, 
  HealingContext,
  HealingAction
} from '../../types';
import { HealingStrategy } from '../../core/HealingStrategy';
import { logger } from '../../utils/logger';

/**
 * Configuration for ID fallback strategy
 */
export interface IDFallbackConfig {
  /** Whether to try partial ID matches */
  enablePartialMatches: boolean;
  
  /** Whether to try case-insensitive ID matches */
  enableCaseInsensitive: boolean;
  
  /** Whether to try ID variations (with/without prefixes/suffixes) */
  enableVariations: boolean;
  
  /** Maximum number of ID variations to try */
  maxVariations: number;
  
  /** Common ID prefixes to try */
  commonPrefixes: string[];
  
  /** Common ID suffixes to try */
  commonSuffixes: string[];
}

/**
 * ID Fallback Strategy
 * 
 * This strategy attempts to recover from element not found failures by
 * trying alternative ID-based locators. It implements several techniques:
 * 
 * 1. Direct ID matching
 * 2. Partial ID matching
 * 3. Case-insensitive matching
 * 4. ID variations with common prefixes/suffixes
 * 5. Fuzzy ID matching
 */
export class IDFallbackStrategy extends HealingStrategy {
  private config: IDFallbackConfig;
  private delay: number;
  
  constructor(config: Partial<IDFallbackConfig> = {}, delay: number = 50) {
    super(
      'id-fallback',
      '1.0.0',
      ['element_not_found', 'timeout']
    );
    
    this.config = {
      enablePartialMatches: true,
      enableCaseInsensitive: true,
      enableVariations: true,
      maxVariations: 5,
      commonPrefixes: ['btn', 'button', 'link', 'input', 'field', 'form', 'modal', 'dialog'],
      commonSuffixes: ['-btn', '-button', '-link', '-input', '-field', '-form', '-modal', '-dialog'],
      ...config
    };
    
    this.delay = delay;
    logger.info('IDFallbackStrategy initialized', { config: this.config });
  }
  
  /**
   * Attempt to heal using ID-based locators
   */
  protected async doHeal(failure: TestFailure, context: HealingContext): Promise<HealingResult> {
    logger.info(`ID fallback strategy attempting to heal: ${failure.id}`);
    
    const healingId = this.generateHealingId(failure);
    const startTime = new Date();
    const actions: HealingAction[] = [];
    
    try {
      // Extract original selector information
      const originalSelector = this.extractSelector(failure);
      if (!originalSelector) {
        return this.createFailureResult(
          healingId,
          'No selector information found in failure',
          Date.now() - startTime.getTime()
        );
      }
      
      // Try different ID-based approaches
      const idCandidates = this.generateIDCandidates(originalSelector);
      
      for (const candidate of idCandidates) {
        const action = await this.tryIDLocator(candidate, context);
        actions.push(action);
        
        if (action.result === 'success') {
          const duration = Date.now() - startTime.getTime();
          const confidence = this.calculateIDConfidence(candidate, originalSelector);
          
          logger.info(`ID fallback successful with candidate: ${candidate}`, {
            originalSelector,
            confidence,
            duration
          });
          
          return this.createSuccessResult(
            healingId,
            actions,
            confidence,
            duration,
            `Successfully healed using ID locator: ${candidate}`
          );
        }
      }
      
      // If no ID candidates worked, try fuzzy matching
      if (this.config.enablePartialMatches) {
        const fuzzyAction = await this.tryFuzzyIDMatching(originalSelector, context);
        actions.push(fuzzyAction);
        
        if (fuzzyAction.result === 'success') {
          const duration = Date.now() - startTime.getTime();
          const confidence = 0.6; // Lower confidence for fuzzy matches
          
          return this.createSuccessResult(
            healingId,
            actions,
            confidence,
            duration,
            `Successfully healed using fuzzy ID matching`
          );
        }
      }
      
      const duration = Date.now() - startTime.getTime();
      return this.createFailureResult(
        healingId,
        'No ID-based locators were successful',
        duration
      );
      
    } catch (error) {
      const duration = Date.now() - startTime.getTime();
      logger.error(`ID fallback strategy failed: ${failure.id}`, error);
      return this.createFailureResult(
        healingId,
        `ID fallback strategy failed: ${error}`,
        duration
      );
    }
  }
  
  /**
   * Calculate confidence for ID-based healing
   */
  protected async doCalculateConfidence(failure: TestFailure, context: HealingContext): Promise<number> {
    const originalSelector = this.extractSelector(failure);
    if (!originalSelector) {
      return 0;
    }
    
    let baseConfidence = 0.7; // ID locators are generally reliable
    
    // Adjust confidence based on selector type
    if (originalSelector.includes('#')) {
      baseConfidence = 0.9; // Already an ID selector
    } else if (originalSelector.includes('.')) {
      baseConfidence = 0.6; // CSS class selector
    } else if (originalSelector.includes('[')) {
      baseConfidence = 0.5; // Attribute selector
    } else if (originalSelector.includes('//')) {
      baseConfidence = 0.4; // XPath selector
    }
    
    // Adjust based on system state
    if (context.systemState.load > 0.8) {
      baseConfidence *= 0.9;
    }
    
    // Adjust based on previous success rate
    const stats = this.getStatistics();
    if (stats.successRate > 0.8) {
      baseConfidence *= 1.1;
    } else if (stats.successRate < 0.3) {
      baseConfidence *= 0.8;
    }
    
    return Math.min(1, baseConfidence);
  }
  
  /**
   * Extract selector information from failure
   */
  private extractSelector(failure: TestFailure): string | null {
    // Try to extract selector from failure message
    const selectorMatch = failure.message.match(/selector[:\s]+([^\s]+)/i);
    if (selectorMatch) {
      return selectorMatch[1] || null;
    }
    
    // Try to extract from failure context custom data
    if (failure.context?.custom?.['selector']) {
      return failure.context.custom['selector'];
    }
    
    // Try to extract from locator information
    if (failure.context?.custom?.['locator']) {
      return failure.context.custom['locator'];
    }
    
    return null;
  }
  
  /**
   * Generate ID candidates from original selector
   */
  private generateIDCandidates(originalSelector: string): string[] {
    const candidates: string[] = [];
    
    // Extract potential ID from selector
    const potentialID = this.extractPotentialID(originalSelector);
    if (potentialID) {
      candidates.push(`#${potentialID}`);
    }
    
    // Generate variations if enabled
    if (this.config.enableVariations && potentialID) {
      const variations = this.generateIDVariations(potentialID);
      candidates.push(...variations.map(id => `#${id}`));
    }
    
    // Add case-insensitive variations if enabled
    if (this.config.enableCaseInsensitive && potentialID) {
      candidates.push(`#${potentialID.toLowerCase()}`);
      candidates.push(`#${potentialID.toUpperCase()}`);
    }
    
    return candidates.slice(0, this.config.maxVariations);
  }
  
  /**
   * Extract potential ID from selector
   */
  private extractPotentialID(selector: string): string | null {
    // If it's already an ID selector, extract the ID
    if (selector.startsWith('#')) {
      return selector.substring(1);
    }
    
    // Try to extract from CSS class selector
    const classMatch = selector.match(/\.([a-zA-Z][a-zA-Z0-9_-]*)/);
    if (classMatch && classMatch[1]) {
      return classMatch[1];
    }
    
    // Try to extract from attribute selector
    const attrMatch = selector.match(/\[([a-zA-Z][a-zA-Z0-9_-]*)\]/);
    if (attrMatch && attrMatch[1]) {
      return attrMatch[1];
    }
    
    // Try to extract from XPath
    const xpathMatch = selector.match(/\/\/([a-zA-Z][a-zA-Z0-9_-]*)/);
    if (xpathMatch && xpathMatch[1]) {
      return xpathMatch[1];
    }
    
    // Try to extract from text content
    const textMatch = selector.match(/text\(\)\s*=\s*['"]([^'"]+)['"]/);
    if (textMatch && textMatch[1]) {
      return this.textToID(textMatch[1]);
    }
    
    return null;
  }
  
  /**
   * Generate ID variations with prefixes and suffixes
   */
  private generateIDVariations(baseID: string): string[] {
    const variations: string[] = [];
    
    // Add prefix variations
    for (const prefix of this.config.commonPrefixes) {
      variations.push(`${prefix}-${baseID}`);
      variations.push(`${prefix}_${baseID}`);
      variations.push(`${prefix}${baseID}`);
    }
    
    // Add suffix variations
    for (const suffix of this.config.commonSuffixes) {
      variations.push(`${baseID}${suffix}`);
      variations.push(`${baseID}_${suffix.substring(1)}`);
    }
    
    return variations;
  }
  
  /**
   * Convert text content to potential ID
   */
  private textToID(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  
  /**
   * Try a specific ID locator
   */
  private async tryIDLocator(idSelector: string, context: HealingContext): Promise<HealingAction> {
    try {
      // Simulate element lookup (in real implementation, this would use the browser API)
      const elementFound = await this.simulateElementLookup(idSelector, context);
      
      if (elementFound) {
        return this.createHealingAction(
          'update_selector',
          `Updated locator to ID selector: ${idSelector}`,
          { 
            originalSelector: 'unknown',
            newSelector: idSelector,
            strategy: 'id-fallback'
          },
          'success',
          `Element found using ID selector: ${idSelector}`
        );
      } else {
        return this.createHealingAction(
          'fallback_strategy',
          `Attempted ID selector: ${idSelector}`,
          { selector: idSelector, strategy: 'id-fallback' },
          'failure',
          `Element not found with ID selector: ${idSelector}`
        );
      }
    } catch (error) {
      return this.createHealingAction(
        'fallback_strategy',
        `Failed to try ID selector: ${idSelector}`,
        { selector: idSelector, error: String(error) },
        'failure',
        `Error trying ID selector: ${error}`
      );
    }
  }
  
  /**
   * Try fuzzy ID matching
   */
  private async tryFuzzyIDMatching(originalSelector: string, context: HealingContext): Promise<HealingAction> {
    try {
      // Generate fuzzy candidates based on common patterns
      const fuzzyCandidates = this.generateFuzzyCandidates(originalSelector);
      
      for (const candidate of fuzzyCandidates) {
        const elementFound = await this.simulateElementLookup(candidate, context);
        if (elementFound) {
          return this.createHealingAction(
            'update_selector',
            `Updated locator using fuzzy ID matching: ${candidate}`,
            { 
              originalSelector,
              newSelector: candidate,
              strategy: 'id-fallback-fuzzy'
            },
            'success',
            `Element found using fuzzy ID matching: ${candidate}`
          );
        }
      }
      
      return this.createHealingAction(
        'fallback_strategy',
        'Attempted fuzzy ID matching',
        { originalSelector, strategy: 'id-fallback-fuzzy' },
        'failure',
        'No elements found with fuzzy ID matching'
      );
    } catch (error) {
      return this.createHealingAction(
        'fallback_strategy',
        'Failed to try fuzzy ID matching',
        { originalSelector, error: String(error) },
        'failure',
        `Error in fuzzy ID matching: ${error}`
      );
    }
  }
  
  /**
   * Generate fuzzy ID candidates
   */
  private generateFuzzyCandidates(originalSelector: string): string[] {
    const candidates: string[] = [];
    const potentialID = this.extractPotentialID(originalSelector);
    
    if (potentialID) {
      // Try common variations
      candidates.push(`#${potentialID}-btn`);
      candidates.push(`#${potentialID}-button`);
      candidates.push(`#${potentialID}-link`);
      candidates.push(`#${potentialID}-input`);
      candidates.push(`#${potentialID}-field`);
      
      // Try with common prefixes
      candidates.push('#btn-' + potentialID);
      candidates.push('#button-' + potentialID);
      candidates.push('#link-' + potentialID);
      candidates.push('#input-' + potentialID);
      candidates.push('#field-' + potentialID);
    }
    
    return candidates;
  }
  
  /**
   * Simulate element lookup (placeholder for real implementation)
   */
  private async simulateElementLookup(selector: string, _context: HealingContext): Promise<boolean> {
    // In a real implementation, this would use the browser API to check if element exists
    // For now, we'll simulate with some logic based on selector patterns
    
    // Simulate some delay
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }
    
    // Simulate success for certain patterns (for demo purposes)
    if (selector.includes('btn') || selector.includes('button')) {
      return Math.random() > 0.3; // 70% success rate for button-like selectors
    }
    
    if (selector.includes('input') || selector.includes('field')) {
      return Math.random() > 0.4; // 60% success rate for input-like selectors
    }
    
    // Default success rate
    return Math.random() > 0.5; // 50% success rate
  }
  
  /**
   * Calculate confidence for ID-based healing
   */
  private calculateIDConfidence(candidate: string, originalSelector: string): number {
    let confidence = 0.7; // Base confidence for ID selectors
    
    // Increase confidence for exact matches
    if (candidate.includes(originalSelector.replace(/[#.]/g, ''))) {
      confidence = 0.9;
    }
    
    // Increase confidence for common patterns
    if (candidate.includes('btn') || candidate.includes('button')) {
      confidence += 0.1;
    }
    
    if (candidate.includes('input') || candidate.includes('field')) {
      confidence += 0.1;
    }
    
    // Decrease confidence for fuzzy matches
    if (candidate.includes('-btn') || candidate.includes('-button')) {
      confidence -= 0.1;
    }
    
    return Math.min(1, Math.max(0, confidence));
  }
}
