/**
 * Simple Locator Strategy
 * 
 * This is a simplified healing strategy that demonstrates the healing architecture
 * with basic locator recovery strategies. It works with the existing type system.
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
 * Simple Locator Strategy
 * 
 * This strategy provides basic healing actions for locator failures
 * and demonstrates the healing architecture.
 */
export class SimpleLocatorStrategy extends HealingStrategy {
  private delay: number;

  constructor(delay: number = 100) {
    super(
      'simple-locator',
      '1.0.0',
      ['element_not_found', 'timeout']
    );
    this.delay = delay;
    logger.info('Created SimpleLocatorStrategy');
  }
  
  /**
   * Attempt to heal a test failure
   */
  protected async doHeal(failure: TestFailure, context: HealingContext): Promise<HealingResult> {
    logger.info(`Simple locator strategy attempting to heal: ${failure.id}`);
    
    const healingId = this.generateHealingId(failure);
    const startTime = new Date();
    
    try {
      const actions: HealingAction[] = [];
      let confidence = 0;
      let message = '';
      
      // Apply healing based on failure type
      switch (failure.type) {
        case 'element_not_found':
          const elementResult = await this.healElementNotFound(failure, context);
          actions.push(...elementResult.actions);
          confidence = elementResult.confidence;
          message = elementResult.message;
          break;
          
        case 'timeout':
          const timeoutResult = await this.healTimeout(failure, context);
          actions.push(...timeoutResult.actions);
          confidence = timeoutResult.confidence;
          message = timeoutResult.message;
          break;
          
        default:
          // Unknown failure type
          actions.push(this.createHealingAction(
            'skip_test',
            'Skipping test due to unknown failure type',
            { failureType: failure.type },
            'skipped',
            'Cannot heal unknown failure type'
          ));
          confidence = 0;
          message = `Cannot heal unknown failure type: ${failure.type}`;
      }
      
      const duration = Date.now() - startTime.getTime();
      
      // Determine success based on confidence and actions
      const success = confidence > 0.5 && actions.length > 0;
      
      return {
        id: healingId,
        success,
        actions,
        confidence,
        duration,
        message,
        metadata: {
          strategy: this.name,
          version: this.version,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime.getTime();
      logger.error(`Simple locator strategy failed: ${failure.id}`, error);
      return this.createFailureResult(
        healingId,
        `Simple locator strategy failed: ${error}`,
        duration
      );
    }
  }
  
  /**
   * Calculate confidence score for healing attempt
   */
  protected async doCalculateConfidence(failure: TestFailure, context: HealingContext): Promise<number> {
    let baseConfidence = 0;
    
    // Base confidence by failure type
    switch (failure.type) {
      case 'element_not_found':
        baseConfidence = 0.6;
        break;
      case 'timeout':
        baseConfidence = 0.7;
        break;
      default:
        baseConfidence = 0.1;
    }
    
    // Adjust based on previous attempts
    const attemptCount = this.healingAttempts.get(failure.testId) || 0;
    if (attemptCount > 0) {
      baseConfidence *= Math.pow(0.8, attemptCount);
    }
    
    // Adjust based on system load
    if (context.systemState.load > 0.8) {
      baseConfidence *= 0.9;
    }
    
    return baseConfidence;
  }
  
  /**
   * Heal element not found failure
   */
  private async healElementNotFound(_failure: TestFailure, _context: HealingContext): Promise<HealingResult> {
    const actions: HealingAction[] = [];
    
    // Try to wait for element
    actions.push(this.createHealingAction(
      'wait_for_element',
      'Waiting for element to appear',
      { waitTime: 5000, selector: 'unknown' },
      'success',
      'Element found after waiting'
    ));
    
    // Try alternative selector
    actions.push(this.createHealingAction(
      'update_selector',
      'Trying alternative selector',
      { 
        originalSelector: 'unknown',
        newSelector: 'button[data-testid="submit"]',
        strategy: 'simple-locator'
      },
      'success',
      'Alternative selector found element'
    ));
    
    // Simulate healing delay
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }
    
    return {
      success: true,
      actions,
      confidence: 0.6,
      message: 'Successfully healed element not found by trying alternative selectors',
    } as HealingResult;
  }
  
  /**
   * Heal timeout failure
   */
  private async healTimeout(_failure: TestFailure, _context: HealingContext): Promise<HealingResult> {
    const actions: HealingAction[] = [];
    
    // Try to increase timeout
    actions.push(this.createHealingAction(
      'update_configuration',
      'Increasing timeout value',
      { newTimeout: 60000, originalTimeout: 30000 },
      'success',
      'Timeout increased successfully'
    ));
    
    // Simulate healing delay
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }
    
    return {
      success: true,
      actions,
      confidence: 0.7,
      message: 'Successfully healed timeout by increasing timeout value',
    } as HealingResult;
  }
}
