/**
 * Shared storage for API routes
 * TODO: Replace with actual database integration
 */

import { TestResult } from '../../types';

// Shared storage maps
export const testRuns = new Map<string, TestResult>();
export const testResults = new Map<string, TestResult>();
export const testQueue = new Map<string, any>();
export const healingAttempts = new Map<string, any>();
export const healingStrategies = new Map<string, any>();
export const engines = new Map<string, any>();
export const engineHealth = new Map<string, any>();
export const reports = new Map<string, any>();

// Helper function to sync test runs to test results
export function syncTestRunToResults(testId: string, result: TestResult) {
  testResults.set(testId, result);
}
