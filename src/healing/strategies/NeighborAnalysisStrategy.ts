/**
 * Neighbor Analysis Strategy
 * 
 * This strategy attempts to recover from locator failures by analyzing
 * nearby elements and their relationships. It's particularly useful for
 * dynamic content and when elements don't have stable identifiers.
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
 * Configuration for neighbor analysis strategy
 */
export interface NeighborAnalysisConfig {
  /** Whether to analyze sibling elements */
  enableSiblingAnalysis: boolean;
  
  /** Whether to analyze parent-child relationships */
  enableParentChildAnalysis: boolean;
  
  /** Whether to analyze text-based relationships */
  enableTextBasedAnalysis: boolean;
  
  /** Whether to analyze attribute-based relationships */
  enableAttributeBasedAnalysis: boolean;
  
  /** Maximum number of neighbor variations to try */
  maxVariations: number;
  
  /** Maximum distance to search for neighbors */
  maxSearchDistance: number;
  
  /** Common text patterns to look for */
  commonTextPatterns: string[];
  
  /** Common attribute patterns to look for */
  commonAttributePatterns: string[];
}

/**
 * Neighbor Analysis Strategy
 * 
 * This strategy attempts to recover from element not found failures by
 * analyzing nearby elements and their relationships. It implements several techniques:
 * 
 * 1. Sibling element analysis
 * 2. Parent-child relationship analysis
 * 3. Text-based relationship analysis
 * 4. Attribute-based relationship analysis
 * 5. Contextual element discovery
 */
export class NeighborAnalysisStrategy extends HealingStrategy {
  private config: NeighborAnalysisConfig;
  
  constructor(config: Partial<NeighborAnalysisConfig> = {}) {
    super(
      'neighbor-analysis',
      '1.0.0',
      ['element_not_found', 'timeout']
    );
    
    this.config = {
      enableSiblingAnalysis: true,
      enableParentChildAnalysis: true,
      enableTextBasedAnalysis: true,
      enableAttributeBasedAnalysis: true,
      maxVariations: 5,
      maxSearchDistance: 3,
      commonTextPatterns: ['button', 'submit', 'click', 'login', 'sign in', 'register', 'save', 'cancel', 'delete', 'edit', 'next', 'previous', 'continue'],
      commonAttributePatterns: ['data-testid', 'data-test', 'data-cy', 'data-qa', 'name', 'type', 'value', 'placeholder', 'title', 'alt'],
      ...config
    };
    
    logger.info('NeighborAnalysisStrategy initialized', { config: this.config });
  }
  
  /**
   * Attempt to heal using neighbor analysis
   */
  protected async doHeal(failure: TestFailure, context: HealingContext): Promise<HealingResult> {
    logger.info(`Neighbor analysis strategy attempting to heal: ${failure.id}`);
    
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
      
      // Analyze the context and generate neighbor-based candidates
      const neighborCandidates = await this.generateNeighborCandidates(originalSelector, context);
      
      for (const candidate of neighborCandidates) {
        const action = await this.tryNeighborLocator(candidate, context);
        actions.push(action);
        
        if (action.result === 'success') {
          const duration = Date.now() - startTime.getTime();
          const confidence = this.calculateNeighborConfidence(candidate, originalSelector);
          
          logger.info(`Neighbor analysis successful with candidate: ${candidate}`, {
            originalSelector,
            confidence,
            duration
          });
          
          return this.createSuccessResult(
            healingId,
            actions,
            confidence,
            duration,
            `Successfully healed using neighbor analysis: ${candidate}`
          );
        }
      }
      
      // If no neighbor candidates worked, try contextual analysis
      const contextualAction = await this.tryContextualAnalysis(originalSelector, context);
      actions.push(contextualAction);
      
      if (contextualAction.result === 'success') {
        const duration = Date.now() - startTime.getTime();
        const confidence = 0.4; // Lower confidence for contextual analysis
        
        return this.createSuccessResult(
          healingId,
          actions,
          confidence,
          duration,
          `Successfully healed using contextual analysis`
        );
      }
      
      const duration = Date.now() - startTime.getTime();
      return this.createFailureResult(
        healingId,
        'No neighbor-based locators were successful',
        duration
      );
      
    } catch (error) {
      const duration = Date.now() - startTime.getTime();
      logger.error(`Neighbor analysis strategy failed: ${failure.id}`, error);
      return this.createFailureResult(
        healingId,
        `Neighbor analysis strategy failed: ${error}`,
        duration
      );
    }
  }
  
  /**
   * Calculate confidence for neighbor-based healing
   */
  protected async doCalculateConfidence(failure: TestFailure, context: HealingContext): Promise<number> {
    const originalSelector = this.extractSelector(failure);
    if (!originalSelector) {
      return 0;
    }
    
    let baseConfidence = 0.4; // Neighbor analysis is less reliable than direct selectors
    
    // Adjust confidence based on selector type
    if (originalSelector.includes('text()') || originalSelector.includes('contains(text()')) {
      baseConfidence = 0.5; // Text-based selectors work well with neighbor analysis
    } else if (originalSelector.includes('@')) {
      baseConfidence = 0.3; // Attribute selectors are less suitable for neighbor analysis
    } else if (originalSelector.includes('#')) {
      baseConfidence = 0.2; // ID selectors should use ID strategy instead
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
   * Generate neighbor-based candidates
   */
  private async generateNeighborCandidates(originalSelector: string, _context: HealingContext): Promise<string[]> {
    const candidates: string[] = [];
    
    // Extract components from original selector
    const components = this.extractSelectorComponents(originalSelector);
    
    // Try sibling analysis
    if (this.config.enableSiblingAnalysis) {
      candidates.push(...this.generateSiblingCandidates(components));
    }
    
    // Try parent-child analysis
    if (this.config.enableParentChildAnalysis) {
      candidates.push(...this.generateParentChildCandidates(components));
    }
    
    // Try text-based analysis
    if (this.config.enableTextBasedAnalysis) {
      candidates.push(...this.generateTextBasedCandidates(components));
    }
    
    // Try attribute-based analysis
    if (this.config.enableAttributeBasedAnalysis) {
      candidates.push(...this.generateAttributeBasedCandidates(components));
    }
    
    return candidates.slice(0, this.config.maxVariations);
  }
  
  /**
   * Extract components from selector
   */
  private extractSelectorComponents(selector: string): NeighborComponents {
    const components: NeighborComponents = {
      tag: null,
      text: null,
      attributes: [],
      classes: [],
      id: null,
      context: null
    };
    
    // Extract tag
    const tagMatch = selector.match(/^([a-zA-Z][a-zA-Z0-9]*)/);
    if (tagMatch && tagMatch[1]) {
      components.tag = tagMatch[1];
    }
    
    // Extract text content
    const textMatch = selector.match(/text\(\)\s*=\s*['"]([^'"]+)['"]/);
    if (textMatch && textMatch[1]) {
      components.text = textMatch[1];
    }
    
    // Extract attributes
    const attrMatches = selector.match(/\[([^=]+)(?:=([^\]]+))?\]/g);
    if (attrMatches) {
      components.attributes = attrMatches.map(match => {
        const [name, value] = match.replace(/[\[\]]/g, '').split('=');
        const cleanValue = value?.replace(/['"]/g, '');
        return cleanValue ? { name: name || '', value: cleanValue } : { name: name || '' };
      });
    }
    
    // Extract classes
    const classMatches = selector.match(/\\.([a-zA-Z][a-zA-Z0-9_-]*)/g);
    if (classMatches) {
      components.classes = classMatches.map(match => match.substring(1));
    }
    
    // Extract ID
    const idMatch = selector.match(/#([a-zA-Z][a-zA-Z0-9_-]*)/);
    if (idMatch && idMatch[1]) {
      components.id = idMatch[1];
    }
    
    // Extract context (parent elements)
    const contextMatch = selector.match(/([^\s]+)\s+([^\s]+)/);
    if (contextMatch && contextMatch[1]) {
      components.context = contextMatch[1];
    }
    
    return components;
  }
  
  /**
   * Generate sibling-based candidates
   */
  private generateSiblingCandidates(components: NeighborComponents): string[] {
    const candidates: string[] = [];
    
    // Try sibling relationships
    if (components.tag) {
      candidates.push(`//${components.tag}/following-sibling::*[1]`);
      candidates.push(`//${components.tag}/preceding-sibling::*[1]`);
      candidates.push(`//${components.tag}/following-sibling::*[2]`);
      candidates.push(`//${components.tag}/preceding-sibling::*[2]`);
    }
    
    // Try with classes
    for (const className of components.classes) {
      candidates.push(`//*[@class="${className}"]/following-sibling::*[1]`);
      candidates.push(`//*[@class="${className}"]/preceding-sibling::*[1]`);
    }
    
    // Try common sibling patterns
    candidates.push('//button/following-sibling::button[1]');
    candidates.push('//input/following-sibling::button[1]');
    candidates.push('//label/following-sibling::input[1]');
    candidates.push('//div[@class="form-group"]/following-sibling::div[@class="form-group"]//button');
    
    return candidates;
  }
  
  /**
   * Generate parent-child candidates
   */
  private generateParentChildCandidates(components: NeighborComponents): string[] {
    const candidates: string[] = [];
    
    // Try parent-child relationships
    if (components.tag) {
      candidates.push(`//*//${components.tag}`);
      candidates.push(`//div//${components.tag}`);
      candidates.push(`//form//${components.tag}`);
      candidates.push(`//section//${components.tag}`);
    }
    
    // Try with classes
    for (const className of components.classes) {
      candidates.push(`//*[@class="${className}"]//*`);
      candidates.push(`//*[contains(@class, "${className}")]//*`);
    }
    
    // Try common parent-child patterns
    candidates.push('//form//button');
    candidates.push('//div[@class="button-group"]//button');
    candidates.push('//div[@class="form-group"]//input');
    candidates.push('//div[@class="modal"]//button');
    candidates.push('//div[@class="dialog"]//button');
    
    return candidates;
  }
  
  /**
   * Generate text-based candidates
   */
  private generateTextBasedCandidates(components: NeighborComponents): string[] {
    const candidates: string[] = [];
    
    if (components.text) {
      // Try text-based relationships
      candidates.push(`//*[contains(text(), "${components.text}")]/following-sibling::*[1]`);
      candidates.push(`//*[contains(text(), "${components.text}")]/preceding-sibling::*[1]`);
      candidates.push(`//*[contains(text(), "${components.text}")]/parent::*//button`);
      candidates.push(`//*[contains(text(), "${components.text}")]/ancestor::*//button`);
    }
    
    // Try common text patterns
    for (const pattern of this.config.commonTextPatterns) {
      candidates.push(`//*[contains(text(), "${pattern}")]/following-sibling::*[1]`);
      candidates.push(`//*[contains(text(), "${pattern}")]/parent::*//button`);
      candidates.push(`//*[contains(text(), "${pattern}")]/ancestor::*//button`);
    }
    
    return candidates;
  }
  
  /**
   * Generate attribute-based candidates
   */
  private generateAttributeBasedCandidates(components: NeighborComponents): string[] {
    const candidates: string[] = [];
    
    // Try attribute-based relationships
    for (const attr of this.config.commonAttributePatterns) {
      if (components.text) {
        candidates.push(`//*[@${attr}="${components.text}"]/following-sibling::*[1]`);
        candidates.push(`//*[@${attr}="${components.text}"]/preceding-sibling::*[1]`);
        candidates.push(`//*[@${attr}="${components.text}"]/parent::*//button`);
      }
      
      if (components.id) {
        candidates.push(`//*[@${attr}="${components.id}"]/following-sibling::*[1]`);
        candidates.push(`//*[@${attr}="${components.id}"]/preceding-sibling::*[1]`);
        candidates.push(`//*[@${attr}="${components.id}"]/parent::*//button`);
      }
    }
    
    // Try existing attributes
    for (const attr of components.attributes) {
      if (attr.value) {
        candidates.push(`//*[@${attr.name}="${attr.value}"]/following-sibling::*[1]`);
        candidates.push(`//*[@${attr.name}="${attr.value}"]/preceding-sibling::*[1]`);
        candidates.push(`//*[@${attr.name}="${attr.value}"]/parent::*//button`);
      }
    }
    
    return candidates;
  }
  
  /**
   * Try contextual analysis
   */
  private async tryContextualAnalysis(originalSelector: string, context: HealingContext): Promise<HealingAction> {
    try {
      // Try contextual patterns based on common UI patterns
      const contextualPatterns = [
        '//form//button[contains(text(), "Submit")]',
        '//form//button[contains(text(), "Save")]',
        '//form//input[@type="submit"]',
        '//div[@class="modal"]//button[contains(text(), "OK")]',
        '//div[@class="modal"]//button[contains(text(), "Cancel")]',
        '//div[@class="dialog"]//button[contains(text(), "OK")]',
        '//div[@class="dialog"]//button[contains(text(), "Cancel")]',
        '//div[@class="button-group"]//button[1]',
        '//div[@class="button-group"]//button[last()]',
        '//div[@class="form-group"]//input[1]',
        '//div[@class="form-group"]//button[1]'
      ];
      
      for (const pattern of contextualPatterns) {
        const elementFound = await this.simulateElementLookup(pattern, context);
        if (elementFound) {
          return this.createHealingAction(
            'update_selector',
            `Updated locator using contextual analysis: ${pattern}`,
            { 
              originalSelector,
              newSelector: pattern,
              strategy: 'neighbor-analysis-contextual'
            },
            'success',
            `Element found using contextual analysis: ${pattern}`
          );
        }
      }
      
      return this.createHealingAction(
        'fallback_strategy',
        'Attempted contextual analysis',
        { originalSelector, strategy: 'neighbor-analysis-contextual' },
        'failure',
        'No elements found with contextual analysis'
      );
    } catch (error) {
      return this.createHealingAction(
        'fallback_strategy',
        'Failed to try contextual analysis',
        { originalSelector, error: String(error) },
        'failure',
        `Error in contextual analysis: ${error}`
      );
    }
  }
  
  /**
   * Try a specific neighbor locator
   */
  private async tryNeighborLocator(locator: string, context: HealingContext): Promise<HealingAction> {
    try {
      // Simulate element lookup (in real implementation, this would use the browser API)
      const elementFound = await this.simulateElementLookup(locator, context);
      
      if (elementFound) {
        return this.createHealingAction(
          'update_selector',
          `Updated locator using neighbor analysis: ${locator}`,
          { 
            originalSelector: 'unknown',
            newSelector: locator,
            strategy: 'neighbor-analysis'
          },
          'success',
          `Element found using neighbor analysis: ${locator}`
        );
      } else {
        return this.createHealingAction(
          'fallback_strategy',
          `Attempted neighbor locator: ${locator}`,
          { selector: locator, strategy: 'neighbor-analysis' },
          'failure',
          `Element not found with neighbor locator: ${locator}`
        );
      }
    } catch (error) {
      return this.createHealingAction(
        'fallback_strategy',
        `Failed to try neighbor locator: ${locator}`,
        { selector: locator, error: String(error) },
        'failure',
        `Error trying neighbor locator: ${error}`
      );
    }
  }
  
  /**
   * Simulate element lookup (placeholder for real implementation)
   */
  private async simulateElementLookup(locator: string, _context: HealingContext): Promise<boolean> {
    // In a real implementation, this would use the browser API to check if element exists
    // For now, we'll simulate with some logic based on locator patterns
    
    // Simulate some delay
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Simulate success for certain patterns (for demo purposes)
    if (locator.includes('following-sibling') || locator.includes('preceding-sibling')) {
      return Math.random() > 0.4; // 60% success rate for sibling relationships
    }
    
    if (locator.includes('parent::') || locator.includes('ancestor::')) {
      return Math.random() > 0.5; // 50% success rate for parent relationships
    }
    
    if (locator.includes('form//button') || locator.includes('form//input')) {
      return Math.random() > 0.3; // 70% success rate for form elements
    }
    
    if (locator.includes('modal') || locator.includes('dialog')) {
      return Math.random() > 0.4; // 60% success rate for modal elements
    }
    
    // Default success rate
    return Math.random() > 0.6; // 40% success rate
  }
  
  /**
   * Calculate confidence for neighbor-based healing
   */
  private calculateNeighborConfidence(candidate: string, _originalSelector: string): number {
    let confidence = 0.4; // Base confidence for neighbor analysis
    
    // Increase confidence for sibling relationships
    if (candidate.includes('following-sibling') || candidate.includes('preceding-sibling')) {
      confidence = 0.5;
    }
    
    // Increase confidence for parent-child relationships
    if (candidate.includes('parent::') || candidate.includes('ancestor::')) {
      confidence = 0.6;
    }
    
    // Increase confidence for form-based relationships
    if (candidate.includes('form//')) {
      confidence = 0.7;
    }
    
    // Increase confidence for modal-based relationships
    if (candidate.includes('modal') || candidate.includes('dialog')) {
      confidence = 0.6;
    }
    
    // Decrease confidence for complex XPath
    if (candidate.split('//').length > 3) {
      confidence -= 0.1;
    }
    
    return Math.min(1, Math.max(0, confidence));
  }
}

/**
 * Interface for neighbor components
 */
interface NeighborComponents {
  tag: string | null;
  text: string | null;
  attributes: Array<{ name: string; value?: string }>;
  classes: string[];
  id: string | null;
  context: string | null;
}
