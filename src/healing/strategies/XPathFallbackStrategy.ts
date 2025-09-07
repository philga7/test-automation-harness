/**
 * XPath Fallback Strategy
 * 
 * This strategy attempts to recover from locator failures by trying alternative
 * XPath expressions. XPath is powerful for complex element location and can
 * handle dynamic content and complex DOM structures.
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
 * Configuration for XPath fallback strategy
 */
export interface XPathFallbackConfig {
  /** Whether to try text-based XPath expressions */
  enableTextBased: boolean;
  
  /** Whether to try attribute-based XPath expressions */
  enableAttributeBased: boolean;
  
  /** Whether to try position-based XPath expressions */
  enablePositionBased: boolean;
  
  /** Whether to try structural XPath expressions */
  enableStructural: boolean;
  
  /** Maximum number of XPath variations to try */
  maxVariations: number;
  
  /** Common attributes to try in XPath */
  commonAttributes: string[];
  
  /** Common text patterns to try */
  commonTextPatterns: string[];
}

/**
 * XPath Fallback Strategy
 * 
 * This strategy attempts to recover from element not found failures by
 * trying alternative XPath expressions. It implements several techniques:
 * 
 * 1. Text-based XPath expressions
 * 2. Attribute-based XPath expressions
 * 3. Position-based XPath expressions
 * 4. Structural XPath expressions
 * 5. Fuzzy text matching
 */
export class XPathFallbackStrategy extends HealingStrategy {
  private config: XPathFallbackConfig;
  
  constructor(config: Partial<XPathFallbackConfig> = {}) {
    super(
      'xpath-fallback',
      '1.0.0',
      ['element_not_found', 'timeout']
    );
    
    this.config = {
      enableTextBased: true,
      enableAttributeBased: true,
      enablePositionBased: true,
      enableStructural: true,
      maxVariations: 6,
      commonAttributes: ['data-testid', 'data-test', 'data-cy', 'data-qa', 'name', 'type', 'value', 'placeholder', 'title', 'alt'],
      commonTextPatterns: ['button', 'submit', 'click', 'login', 'sign in', 'register', 'save', 'cancel', 'delete', 'edit'],
      ...config
    };
    
    logger.info('XPathFallbackStrategy initialized', { config: this.config });
  }
  
  /**
   * Attempt to heal using XPath-based locators
   */
  protected async doHeal(failure: TestFailure, context: HealingContext): Promise<HealingResult> {
    logger.info(`XPath fallback strategy attempting to heal: ${failure.id}`);
    
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
      
      // Try different XPath-based approaches
      const xpathCandidates = this.generateXPathCandidates(originalSelector);
      
      for (const candidate of xpathCandidates) {
        const action = await this.tryXPathLocator(candidate, context);
        actions.push(action);
        
        if (action.result === 'success') {
          const duration = Date.now() - startTime.getTime();
          const confidence = this.calculateXPathConfidence(candidate, originalSelector);
          
          logger.info(`XPath fallback successful with candidate: ${candidate}`, {
            originalSelector,
            confidence,
            duration
          });
          
          return this.createSuccessResult(
            healingId,
            actions,
            confidence,
            duration,
            `Successfully healed using XPath: ${candidate}`
          );
        }
      }
      
      // If no XPath candidates worked, try advanced techniques
      const advancedAction = await this.tryAdvancedXPathTechniques(originalSelector, context);
      actions.push(advancedAction);
      
      if (advancedAction.result === 'success') {
        const duration = Date.now() - startTime.getTime();
        const confidence = 0.5; // Lower confidence for advanced techniques
        
        return this.createSuccessResult(
          healingId,
          actions,
          confidence,
          duration,
          `Successfully healed using advanced XPath techniques`
        );
      }
      
      const duration = Date.now() - startTime.getTime();
      return this.createFailureResult(
        healingId,
        'No XPath-based locators were successful',
        duration
      );
      
    } catch (error) {
      const duration = Date.now() - startTime.getTime();
      logger.error(`XPath fallback strategy failed: ${failure.id}`, error);
      return this.createFailureResult(
        healingId,
        `XPath fallback strategy failed: ${error}`,
        duration
      );
    }
  }
  
  /**
   * Calculate confidence for XPath-based healing
   */
  protected async doCalculateConfidence(failure: TestFailure, context: HealingContext): Promise<number> {
    const originalSelector = this.extractSelector(failure);
    if (!originalSelector) {
      return 0;
    }
    
    let baseConfidence = 0.5; // XPath selectors are moderately reliable
    
    // Adjust confidence based on selector type
    if (originalSelector.includes('//')) {
      baseConfidence = 0.6; // Already an XPath selector
    } else if (originalSelector.includes('.')) {
      baseConfidence = 0.4; // CSS class selector
    } else if (originalSelector.includes('#')) {
      baseConfidence = 0.3; // ID selector (should use ID strategy instead)
    } else if (originalSelector.includes('[')) {
      baseConfidence = 0.5; // Attribute selector
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
   * Generate XPath candidates from original selector
   */
  private generateXPathCandidates(originalSelector: string): string[] {
    const candidates: string[] = [];
    
    // Extract components from original selector
    const components = this.extractSelectorComponents(originalSelector);
    
    // Try text-based XPath expressions
    if (this.config.enableTextBased) {
      candidates.push(...this.generateTextBasedXPath(components));
    }
    
    // Try attribute-based XPath expressions
    if (this.config.enableAttributeBased) {
      candidates.push(...this.generateAttributeBasedXPath(components));
    }
    
    // Try position-based XPath expressions
    if (this.config.enablePositionBased) {
      candidates.push(...this.generatePositionBasedXPath(components));
    }
    
    // Try structural XPath expressions
    if (this.config.enableStructural) {
      candidates.push(...this.generateStructuralXPath(components));
    }
    
    return candidates.slice(0, this.config.maxVariations);
  }
  
  /**
   * Extract components from selector
   */
  private extractSelectorComponents(selector: string): XPathComponents {
    const components: XPathComponents = {
      tag: null,
      text: null,
      attributes: [],
      classes: [],
      id: null
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
    
    return components;
  }
  
  /**
   * Generate text-based XPath expressions
   */
  private generateTextBasedXPath(components: XPathComponents): string[] {
    const xpaths: string[] = [];
    
    if (components.text) {
      // Exact text match
      xpaths.push(`//*[text()="${components.text}"]`);
      xpaths.push(`//*[normalize-space(text())="${components.text}"]`);
      
      // Partial text match
      xpaths.push(`//*[contains(text(), "${components.text}")]`);
      xpaths.push(`//*[contains(normalize-space(text()), "${components.text}")]`);
      
      // Case-insensitive text match
      xpaths.push(`//*[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "${components.text.toLowerCase()}")]`);
    }
    
    // Try common text patterns
    for (const pattern of this.config.commonTextPatterns) {
      xpaths.push(`//*[contains(text(), "${pattern}")]`);
      xpaths.push(`//*[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "${pattern.toLowerCase()}")]`);
    }
    
    return xpaths;
  }
  
  /**
   * Generate attribute-based XPath expressions
   */
  private generateAttributeBasedXPath(components: XPathComponents): string[] {
    const xpaths: string[] = [];
    
    // Try existing attributes
    for (const attr of components.attributes) {
      if (attr.value) {
        xpaths.push(`//*[@${attr.name}="${attr.value}"]`);
        xpaths.push(`//*[@${attr.name}="${attr.value}"]`);
      }
    }
    
    // Try common attributes
    for (const attr of this.config.commonAttributes) {
      if (components.text) {
        xpaths.push(`//*[@${attr}="${components.text}"]`);
        xpaths.push(`//*[contains(@${attr}, "${components.text}")]`);
      }
      
      if (components.id) {
        xpaths.push(`//*[@${attr}="${components.id}"]`);
        xpaths.push(`//*[contains(@${attr}, "${components.id}")]`);
      }
    }
    
    return xpaths;
  }
  
  /**
   * Generate position-based XPath expressions
   */
  private generatePositionBasedXPath(components: XPathComponents): string[] {
    const xpaths: string[] = [];
    
    // Try position-based selectors
    if (components.tag) {
      xpaths.push(`//${components.tag}[1]`);
      xpaths.push(`//${components.tag}[2]`);
      xpaths.push(`//${components.tag}[last()]`);
      xpaths.push(`//${components.tag}[last()-1]`);
    }
    
    // Try with classes
    for (const className of components.classes) {
      xpaths.push(`//*[@class="${className}"][1]`);
      xpaths.push(`//*[contains(@class, "${className}")][1]`);
    }
    
    // Try common button positions
    xpaths.push('//button[1]');
    xpaths.push('//button[last()]');
    xpaths.push('//input[@type="submit"][1]');
    xpaths.push('//input[@type="button"][1]');
    
    return xpaths;
  }
  
  /**
   * Generate structural XPath expressions
   */
  private generateStructuralXPath(components: XPathComponents): string[] {
    const xpaths: string[] = [];
    
    // Try parent-child relationships
    if (components.tag) {
      xpaths.push(`//*//${components.tag}`);
      xpaths.push(`//div//${components.tag}`);
      xpaths.push(`//form//${components.tag}`);
    }
    
    // Try with classes
    for (const className of components.classes) {
      xpaths.push(`//*[@class="${className}"]//*`);
      xpaths.push(`//*[contains(@class, "${className}")]//*`);
    }
    
    // Try common structural patterns
    xpaths.push('//form//button');
    xpaths.push('//form//input[@type="submit"]');
    xpaths.push('//div[@class="button-group"]//button');
    xpaths.push('//div[@class="form-group"]//input');
    
    return xpaths;
  }
  
  /**
   * Try advanced XPath techniques
   */
  private async tryAdvancedXPathTechniques(originalSelector: string, context: HealingContext): Promise<HealingAction> {
    try {
      // Try wildcard XPath expressions
      const wildcardXPaths = [
        '//*[@data-testid]',
        '//*[@data-test]',
        '//*[@data-cy]',
        '//*[@data-qa]',
        '//*[contains(@class, "btn")]',
        '//*[contains(@class, "button")]',
        '//*[contains(@class, "link")]',
        '//*[contains(@class, "input")]'
      ];
      
      for (const xpath of wildcardXPaths) {
        const elementFound = await this.simulateElementLookup(xpath, context);
        if (elementFound) {
          return this.createHealingAction(
            'update_selector',
            `Updated locator using advanced XPath technique: ${xpath}`,
            { 
              originalSelector,
              newSelector: xpath,
              strategy: 'xpath-fallback-advanced'
            },
            'success',
            `Element found using advanced XPath technique: ${xpath}`
          );
        }
      }
      
      return this.createHealingAction(
        'fallback_strategy',
        'Attempted advanced XPath techniques',
        { originalSelector, strategy: 'xpath-fallback-advanced' },
        'failure',
        'No elements found with advanced XPath techniques'
      );
    } catch (error) {
      return this.createHealingAction(
        'fallback_strategy',
        'Failed to try advanced XPath techniques',
        { originalSelector, error: String(error) },
        'failure',
        `Error in advanced XPath techniques: ${error}`
      );
    }
  }
  
  /**
   * Try a specific XPath locator
   */
  private async tryXPathLocator(xpath: string, context: HealingContext): Promise<HealingAction> {
    try {
      // Simulate element lookup (in real implementation, this would use the browser API)
      const elementFound = await this.simulateElementLookup(xpath, context);
      
      if (elementFound) {
        return this.createHealingAction(
          'update_selector',
          `Updated locator to XPath: ${xpath}`,
          { 
            originalSelector: 'unknown',
            newSelector: xpath,
            strategy: 'xpath-fallback'
          },
          'success',
          `Element found using XPath: ${xpath}`
        );
      } else {
        return this.createHealingAction(
          'fallback_strategy',
          `Attempted XPath: ${xpath}`,
          { selector: xpath, strategy: 'xpath-fallback' },
          'failure',
          `Element not found with XPath: ${xpath}`
        );
      }
    } catch (error) {
      return this.createHealingAction(
        'fallback_strategy',
        `Failed to try XPath: ${xpath}`,
        { selector: xpath, error: String(error) },
        'failure',
        `Error trying XPath: ${error}`
      );
    }
  }
  
  /**
   * Simulate element lookup (placeholder for real implementation)
   */
  private async simulateElementLookup(xpath: string, _context: HealingContext): Promise<boolean> {
    // In a real implementation, this would use the browser API to check if element exists
    // For now, we'll simulate with some logic based on XPath patterns
    
    // Simulate some delay
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Simulate success for certain patterns (for demo purposes)
    if (xpath.includes('data-testid') || xpath.includes('data-test')) {
      return Math.random() > 0.2; // 80% success rate for test attributes
    }
    
    if (xpath.includes('text()') || xpath.includes('contains(text()')) {
      return Math.random() > 0.3; // 70% success rate for text-based XPath
    }
    
    if (xpath.includes('btn') || xpath.includes('button')) {
      return Math.random() > 0.4; // 60% success rate for button-like XPath
    }
    
    // Default success rate
    return Math.random() > 0.5; // 50% success rate
  }
  
  /**
   * Calculate confidence for XPath-based healing
   */
  private calculateXPathConfidence(candidate: string, originalSelector: string): number {
    let confidence = 0.5; // Base confidence for XPath selectors
    
    // Increase confidence for text-based XPath
    if (candidate.includes('text()') || candidate.includes('contains(text()')) {
      confidence = 0.7;
    }
    
    // Increase confidence for attribute-based XPath
    if (candidate.includes('@data-testid') || candidate.includes('@data-test')) {
      confidence = 0.8;
    }
    
    // Increase confidence for exact matches
    if (candidate.includes(originalSelector.replace(/[#.]/g, ''))) {
      confidence = 0.6;
    }
    
    // Decrease confidence for wildcard XPath
    if (candidate.includes('//*')) {
      confidence -= 0.1;
    }
    
    // Decrease confidence for position-based XPath
    if (candidate.includes('[1]') || candidate.includes('[last()]')) {
      confidence -= 0.1;
    }
    
    return Math.min(1, Math.max(0, confidence));
  }
}

/**
 * Interface for XPath components
 */
interface XPathComponents {
  tag: string | null;
  text: string | null;
  attributes: Array<{ name: string; value?: string }>;
  classes: string[];
  id: string | null;
}
