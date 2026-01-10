// src/bq-test/runner.ts
import type { BehaviorExpectation, BehaviorTest, SuiteResult, TestResult } from './types.ts';
import { executeRealAgent, type ExecutorConfig } from './executor.ts';

export interface ActualBehavior {
  createdIssue: boolean;
  closedIssue: boolean;
  exitedCleanly: boolean;
  spawned: string[];
  wroteFile?: string;
  output: string;
}

/** Configuration for real mode execution */
export interface RealModeConfig {
  executorConfig: ExecutorConfig;
}

export interface CheckResult {
  passed: boolean;
  failures: string[];
}

export function checkAssertions(
  assertions: BehaviorExpectation['assertions'],
  actual: ActualBehavior,
): CheckResult {
  const failures: string[] = [];

  if (assertions.createdIssue !== undefined) {
    if (assertions.createdIssue !== actual.createdIssue) {
      failures.push(
        `createdIssue: expected ${assertions.createdIssue}, got ${actual.createdIssue}`,
      );
    }
  }

  if (assertions.closedIssue !== undefined) {
    if (assertions.closedIssue !== actual.closedIssue) {
      failures.push(
        `closedIssue: expected ${assertions.closedIssue}, got ${actual.closedIssue}`,
      );
    }
  }

  if (assertions.exitedCleanly !== undefined) {
    if (assertions.exitedCleanly !== actual.exitedCleanly) {
      failures.push(
        `exitedCleanly: expected ${assertions.exitedCleanly}, got ${actual.exitedCleanly}`,
      );
    }
  }

  if (assertions.spawned !== undefined) {
    const missing = assertions.spawned.filter((s) => !actual.spawned.includes(s));
    if (missing.length > 0) {
      failures.push(`spawned: missing ${missing.join(', ')}`);
    }
  }

  if (assertions.wroteFile !== undefined) {
    if (assertions.wroteFile !== actual.wroteFile) {
      failures.push(
        `wroteFile: expected ${assertions.wroteFile}, got ${actual.wroteFile}`,
      );
    }
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

export function checkLabels(
  labels: BehaviorExpectation['labels'],
  output: string,
): CheckResult {
  const failures: string[] = [];

  for (const required of labels.required) {
    if (!output.includes(required)) {
      failures.push(`required label missing: ${required}`);
    }
  }

  for (const forbidden of labels.forbidden) {
    if (output.includes(forbidden)) {
      failures.push(`forbidden label found: ${forbidden}`);
    }
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

export function runBehaviorTest(
  test: BehaviorTest,
  mockMode: boolean = true,
): TestResult {
  const startTime = Date.now();

  // In mock mode, simulate behavior based on expectations
  const actualBehavior: ActualBehavior = mockMode ? simulateBehavior(test) : simulateBehavior(test);

  const assertionResult = checkAssertions(
    test.expectations.assertions,
    actualBehavior,
  );

  const labelResult = checkLabels(test.expectations.labels, actualBehavior.output);

  const duration = Date.now() - startTime;

  return {
    testName: test.scenario.name,
    passed: assertionResult.passed && labelResult.passed,
    details: {
      assertionsPassed: assertionResult.passed,
      assertionFailures: assertionResult.failures,
      labelsPassed: labelResult.passed,
      labelFailures: labelResult.failures,
    },
    duration,
  };
}

/**
 * Run a behavior test with real Claude agent execution
 */
export async function runRealBehaviorTest(
  test: BehaviorTest,
  config: RealModeConfig,
): Promise<TestResult & { rawOutput: string }> {
  const startTime = Date.now();

  // Execute real agent
  const result = await executeRealAgent(test, config.executorConfig);
  const actualBehavior = result.behavior;

  const assertionResult = checkAssertions(
    test.expectations.assertions,
    actualBehavior,
  );

  const labelResult = checkLabels(test.expectations.labels, actualBehavior.output);

  const duration = Date.now() - startTime;

  return {
    testName: test.scenario.name,
    passed: assertionResult.passed && labelResult.passed,
    details: {
      assertionsPassed: assertionResult.passed,
      assertionFailures: assertionResult.failures,
      labelsPassed: labelResult.passed,
      labelFailures: labelResult.failures,
    },
    duration,
    rawOutput: result.rawOutput,
  };
}

/**
 * Run test suite with real Claude agent execution
 */
export async function runRealTestSuite(
  tests: BehaviorTest[],
  suiteName: string,
  config: RealModeConfig,
): Promise<SuiteResult & { rawOutputs: string[] }> {
  const results: TestResult[] = [];
  const rawOutputs: string[] = [];

  for (const test of tests) {
    console.log(`\n--- Running: ${test.scenario.name} ---`);
    const result = await runRealBehaviorTest(test, config);
    results.push(result);
    rawOutputs.push(result.rawOutput);
    console.log(`Result: ${result.passed ? 'PASS' : 'FAIL'}`);
  }

  const passed = results.filter((r) => r.passed).length;

  return {
    suiteName,
    totalTests: tests.length,
    passed,
    failed: tests.length - passed,
    passRate: (passed / tests.length) * 100,
    results,
    rawOutputs,
  };
}

function simulateBehavior(test: BehaviorTest): ActualBehavior {
  // Mock implementation - returns expected behavior for unit testing
  return {
    createdIssue: test.expectations.assertions.createdIssue ?? false,
    closedIssue: test.expectations.assertions.closedIssue ?? false,
    exitedCleanly: test.expectations.assertions.exitedCleanly ?? true,
    spawned: test.expectations.assertions.spawned ?? [],
    wroteFile: test.expectations.assertions.wroteFile,
    output: test.expectations.labels.required.join('\n'),
  };
}

export function runTestSuite(
  tests: BehaviorTest[],
  suiteName: string,
  mockMode: boolean = true,
): SuiteResult {
  const results: TestResult[] = [];

  for (const test of tests) {
    const result = runBehaviorTest(test, mockMode);
    results.push(result);
  }

  const passed = results.filter((r) => r.passed).length;

  return {
    suiteName,
    totalTests: tests.length,
    passed,
    failed: tests.length - passed,
    passRate: (passed / tests.length) * 100,
    results,
  };
}
