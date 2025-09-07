/**
 * CSS Fallback Strategy
 * 
 * This strategy attempts to recover from locator failures by trying alternative
 * CSS selectors. It implements various CSS selector techniques including
 * attribute selectors, pseudo-selectors, and structural selectors.
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
 * Configuration for CSS fallback strategy
 */
export interface CSSFallbackConfig {
  /** Whether to try attribute-based selectors */
  enableAttributeSelectors: boolean;
  
  /** Whether to try pseudo-selectors */
  enablePseudoSelectors: boolean;
  
  /** Whether to try structural selectors (nth-child, etc.) */
  enableStructuralSelectors: boolean;
  
  /** Whether to try text-based selectors */
  enableTextSelectors: boolean;
  
  /** Maximum number of CSS variations to try */
  maxVariations: number;
  
  /** Common attributes to try */
  commonAttributes: string[];
  
  /** Common CSS classes to try */
  commonClasses: string[];
}

/**
 * CSS Fallback Strategy
 * 
 * This strategy attempts to recover from element not found failures by
 * trying alternative CSS selectors. It implements several techniques:
 * 
 * 1. Attribute-based selectors
 * 2. Pseudo-selectors (:nth-child, :first-child, etc.)
 * 3. Structural selectors (parent > child, sibling + sibling)
 * 4. Text-based selectors
 * 5. Class-based selectors with variations
 */
export class CSSFallbackStrategy extends HealingStrategy {
  private config: CSSFallbackConfig;
  
  constructor(config: Partial<CSSFallbackConfig> = {}) {
    super(
      'css-fallback',
      '1.0.0',
      ['element_not_found', 'timeout']
    );
    
    this.config = {
      enableAttributeSelectors: true,
      enablePseudoSelectors: true,
      enableStructuralSelectors: true,
      enableTextSelectors: true,
      maxVariations: 8,
      commonAttributes: ['data-testid', 'data-test', 'data-cy', 'data-qa', 'name', 'type', 'value', 'placeholder'],
      commonClasses: ['btn', 'button', 'link', 'input', 'field', 'form', 'modal', 'dialog', 'container', 'wrapper'],
      ...config
    };
    
    logger.info('CSSFallbackStrategy initialized', { config: this.config });
  }
  
  /**
   * Attempt to heal using CSS-based locators
   */
  protected async doHeal(failure: TestFailure, context: HealingContext): Promise<HealingResult> {
    logger.info(`CSS fallback strategy attempting to heal: ${failure.id}`);
    
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
      
      // Try different CSS-based approaches
      const cssCandidates = this.generateCSSCandidates(originalSelector);
      
      for (const candidate of cssCandidates) {
        const action = await this.tryCSSLocator(candidate, context);
        actions.push(action);
        
        if (action.result === 'success') {
          const duration = Date.now() - startTime.getTime();
          const confidence = this.calculateCSSConfidence(candidate, originalSelector);
          
          logger.info(`CSS fallback successful with candidate: ${candidate}`, {
            originalSelector,
            confidence,
            duration
          });
          
          return this.createSuccessResult(
            healingId,
            actions,
            confidence,
            duration,
            `Successfully healed using CSS selector: ${candidate}`
          );
        }
      }
      
      // If no CSS candidates worked, try advanced techniques
      const advancedAction = await this.tryAdvancedCSSTechniques(originalSelector, context);
      actions.push(advancedAction);
      
      if (advancedAction.result === 'success') {
        const duration = Date.now() - startTime.getTime();
        const confidence = 0.6; // Lower confidence for advanced techniques
        
        return this.createSuccessResult(
          healingId,
          actions,
          confidence,
          duration,
          `Successfully healed using advanced CSS techniques`
        );
      }
      
      const duration = Date.now() - startTime.getTime();
      return this.createFailureResult(
        healingId,
        'No CSS-based locators were successful',
        duration
      );
      
    } catch (error) {
      const duration = Date.now() - startTime.getTime();
      logger.error(`CSS fallback strategy failed: ${failure.id}`, error);
      return this.createFailureResult(
        healingId,
        `CSS fallback strategy failed: ${error}`,
        duration
      );
    }
  }
  
  /**
   * Calculate confidence for CSS-based healing
   */
  protected async doCalculateConfidence(failure: TestFailure, context: HealingContext): Promise<number> {
    const originalSelector = this.extractSelector(failure);
    if (!originalSelector) {
      return 0;
    }
    
    let baseConfidence = 0.6; // CSS selectors are moderately reliable
    
    // Adjust confidence based on selector type
    if (originalSelector.includes('.')) {
      baseConfidence = 0.7; // CSS class selector
    } else if (originalSelector.includes('[')) {
      baseConfidence = 0.8; // Attribute selector
    } else if (originalSelector.includes('#')) {
      baseConfidence = 0.5; // ID selector (should use ID strategy instead)
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
   * Generate CSS candidates from original selector
   */
  private generateCSSCandidates(originalSelector: string): string[] {
    const candidates: string[] = [];
    
    // Extract components from original selector
    const components = this.extractSelectorComponents(originalSelector);
    
    // Try attribute-based selectors
    if (this.config.enableAttributeSelectors) {
      candidates.push(...this.generateAttributeSelectors(components));
    }
    
    // Try class-based selectors
    candidates.push(...this.generateClassSelectors(components));
    
    // Try pseudo-selectors
    if (this.config.enablePseudoSelectors) {
      candidates.push(...this.generatePseudoSelectors(components));
    }
    
    // Try structural selectors
    if (this.config.enableStructuralSelectors) {
      candidates.push(...this.generateStructuralSelectors(components));
    }
    
    // Try text-based selectors
    if (this.config.enableTextSelectors) {
      candidates.push(...this.generateTextSelectors(components));
    }
    
    return candidates.slice(0, this.config.maxVariations);
  }
  
  /**
   * Extract components from selector
   */
  private extractSelectorComponents(selector: string): SelectorComponents {
    const components: SelectorComponents = {
      tag: null,
      classes: [],
      attributes: [],
      text: null,
      id: null
    };
    
    // Extract tag
    const tagMatch = selector.match(/^([a-zA-Z][a-zA-Z0-9]*)/);
    if (tagMatch && tagMatch[1]) {
      components.tag = tagMatch[1];
    }
    
    // Extract classes
    const classMatches = selector.match(/\\.([a-zA-Z][a-zA-Z0-9_-]*)/g);
    if (classMatches) {
      components.classes = classMatches.map(match => match.substring(1));
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
    
    // Extract ID
    const idMatch = selector.match(/#([a-zA-Z][a-zA-Z0-9_-]*)/);
    if (idMatch && idMatch[1]) {
      components.id = idMatch[1];
    }
    
    // Extract text content
    const textMatch = selector.match(/text\(\)\s*=\s*['"]([^'"]+)['"]/);
    if (textMatch && textMatch[1]) {
      components.text = textMatch[1];
    }
    
    return components;
  }
  
  /**
   * Generate attribute-based selectors
   */
  private generateAttributeSelectors(components: SelectorComponents): string[] {
    const selectors: string[] = [];
    
    // Try common attributes
    for (const attr of this.config.commonAttributes) {
      if (components.text) {
        selectors.push(`[${attr}*="${components.text}"]`);
        selectors.push(`[${attr}="${components.text}"]`);
      }
      
      if (components.id) {
        selectors.push(`[${attr}*="${components.id}"]`);
        selectors.push(`[${attr}="${components.id}"]`);
      }
    }
    
    // Try existing attributes with variations
    for (const attr of components.attributes) {
      if (attr.value) {
        selectors.push(`[${attr.name}*="${attr.value}"]`);
        selectors.push(`[${attr.name}="${attr.value}"]`);
      }
    }
    
    return selectors;
  }
  
  /**
   * Generate class-based selectors
   */
  private generateClassSelectors(components: SelectorComponents): string[] {
    const selectors: string[] = [];
    
    // Try existing classes
    for (const className of components.classes) {
      selectors.push(`.${className}`);
    }
    
    // Try common classes
    for (const commonClass of this.config.commonClasses) {
      selectors.push(`.${commonClass}`);
    }
    
    // Try combinations
    if (components.classes.length > 0) {
      for (const commonClass of this.config.commonClasses) {
        selectors.push(`.${components.classes[0]}.${commonClass}`);
      }
    }
    
    return selectors;
  }
  
  /**
   * Generate pseudo-selectors
   */
  private generatePseudoSelectors(components: SelectorComponents): string[] {
    const selectors: string[] = [];
    
    // Try common pseudo-selectors
    const pseudoSelectors = [':first-child', ':last-child', ':nth-child(1)', ':nth-child(2)'];
    
    for (const pseudo of pseudoSelectors) {
      if (components.tag) {
        selectors.push(`${components.tag}${pseudo}`);
      }
      
      if (components.classes.length > 0) {
        selectors.push(`.${components.classes[0]}${pseudo}`);
      }
    }
    
    return selectors;
  }
  
  /**
   * Generate structural selectors
   */
  private generateStructuralSelectors(components: SelectorComponents): string[] {
    const selectors: string[] = [];
    
    // Try parent-child relationships
    if (components.tag) {
      selectors.push(`* > ${components.tag}`);
      selectors.push(`div > ${components.tag}`);
      selectors.push(`form > ${components.tag}`);
    }
    
    // Try sibling relationships
    if (components.classes.length > 0) {
      selectors.push(`* + .${components.classes[0]}`);
      selectors.push(`.${components.classes[0]} + *`);
    }
    
    return selectors;
  }
  
  /**
   * Generate text-based selectors
   */
  private generateTextSelectors(components: SelectorComponents): string[] {
    const selectors: string[] = [];
    
    if (components.text) {
      // Try different text-based approaches
      selectors.push(`*:contains("${components.text}")`);
      selectors.push(`[title*="${components.text}"]`);
      selectors.push(`[alt*="${components.text}"]`);
      selectors.push(`[placeholder*="${components.text}"]`);
    }
    
    return selectors;
  }
  
  /**
   * Try advanced CSS techniques
   */
  private async tryAdvancedCSSTechniques(originalSelector: string, context: HealingContext): Promise<HealingAction> {
    try {
      // Try wildcard selectors
      const wildcardSelectors = [
        '*[class*="btn"]',
        '*[class*="button"]',
        '*[class*="link"]',
        '*[class*="input"]',
        '*[data-testid]',
        '*[data-test]'
      ];
      
      for (const selector of wildcardSelectors) {
        const elementFound = await this.simulateElementLookup(selector, context);
        if (elementFound) {
          return this.createHealingAction(
            'update_selector',
            `Updated locator using advanced CSS technique: ${selector}`,
            { 
              originalSelector,
              newSelector: selector,
              strategy: 'css-fallback-advanced'
            },
            'success',
            `Element found using advanced CSS technique: ${selector}`
          );
        }
      }
      
      return this.createHealingAction(
        'fallback_strategy',
        'Attempted advanced CSS techniques',
        { originalSelector, strategy: 'css-fallback-advanced' },
        'failure',
        'No elements found with advanced CSS techniques'
      );
    } catch (error) {
      return this.createHealingAction(
        'fallback_strategy',
        'Failed to try advanced CSS techniques',
        { originalSelector, error: String(error) },
        'failure',
        `Error in advanced CSS techniques: ${error}`
      );
    }
  }
  
  /**
   * Try a specific CSS locator
   */
  private async tryCSSLocator(cssSelector: string, context: HealingContext): Promise<HealingAction> {
    try {
      // Simulate element lookup (in real implementation, this would use the browser API)
      const elementFound = await this.simulateElementLookup(cssSelector, context);
      
      if (elementFound) {
        return this.createHealingAction(
          'update_selector',
          `Updated locator to CSS selector: ${cssSelector}`,
          { 
            originalSelector: 'unknown',
            newSelector: cssSelector,
            strategy: 'css-fallback'
          },
          'success',
          `Element found using CSS selector: ${cssSelector}`
        );
      } else {
        return this.createHealingAction(
          'fallback_strategy',
          `Attempted CSS selector: ${cssSelector}`,
          { selector: cssSelector, strategy: 'css-fallback' },
          'failure',
          `Element not found with CSS selector: ${cssSelector}`
        );
      }
    } catch (error) {
      return this.createHealingAction(
        'fallback_strategy',
        `Failed to try CSS selector: ${cssSelector}`,
        { selector: cssSelector, error: String(error) },
        'failure',
        `Error trying CSS selector: ${error}`
      );
    }
  }
  
  /**
   * Simulate element lookup (placeholder for real implementation)
   */
  private async simulateElementLookup(selector: string, _context: HealingContext): Promise<boolean> {
    // In a real implementation, this would use the browser API to check if element exists
    // For now, we'll simulate with some logic based on selector patterns
    
    // Simulate some delay
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Simulate success for certain patterns (for demo purposes)
    if (selector.includes('data-testid') || selector.includes('data-test')) {
      return Math.random() > 0.2; // 80% success rate for test attributes
    }
    
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
   * Calculate confidence for CSS-based healing
   */
  private calculateCSSConfidence(candidate: string, originalSelector: string): number {
    let confidence = 0.6; // Base confidence for CSS selectors
    
    // Increase confidence for attribute selectors
    if (candidate.includes('data-testid') || candidate.includes('data-test')) {
      confidence = 0.9;
    }
    
    // Increase confidence for class selectors
    if (candidate.startsWith('.')) {
      confidence = 0.7;
    }
    
    // Increase confidence for exact matches
    if (candidate.includes(originalSelector.replace(/[#.]/g, ''))) {
      confidence = 0.8;
    }
    
    // Decrease confidence for wildcard selectors
    if (candidate.startsWith('*')) {
      confidence -= 0.2;
    }
    
    return Math.min(1, Math.max(0, confidence));
  }
}

/**
 * Interface for selector components
 */
interface SelectorComponents {
  tag: string | null;
  classes: string[];
  attributes: Array<{ name: string; value?: string }>;
  text: string | null;
  id: string | null;
}
