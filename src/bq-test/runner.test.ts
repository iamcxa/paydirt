// src/bq-test/runner.test.ts
import { assertEquals } from '@std/assert';
import { checkAssertions, checkLabels } from './runner.ts';

Deno.test('checkAssertions passes when all assertions match', () => {
  const expectations = {
    assertions: {
      createdIssue: true,
      exitedCleanly: true,
    },
    labels: { required: [], forbidden: [] },
  };

  const actualBehavior = {
    createdIssue: true,
    closedIssue: false,
    exitedCleanly: true,
    spawned: [],
    output: '',
  };

  const result = checkAssertions(expectations.assertions, actualBehavior);
  assertEquals(result.passed, true);
  assertEquals(result.failures.length, 0);
});

Deno.test("checkAssertions fails when assertion doesn't match", () => {
  const expectations = {
    assertions: {
      createdIssue: true,
    },
    labels: { required: [], forbidden: [] },
  };

  const actualBehavior = {
    createdIssue: false,
    closedIssue: false,
    exitedCleanly: true,
    spawned: [],
    output: '',
  };

  const result = checkAssertions(expectations.assertions, actualBehavior);
  assertEquals(result.passed, false);
  assertEquals(result.failures.length, 1);
});

Deno.test('checkLabels passes when required labels present', () => {
  const expectations = {
    required: ['SPAWN:', 'OUTPUT:'],
    forbidden: ['ERROR:'],
  };

  const output = 'SPAWN: surveyor\nOUTPUT: design=docs/plans/test.md';

  const result = checkLabels(expectations, output);
  assertEquals(result.passed, true);
});

Deno.test('checkLabels fails when forbidden label present', () => {
  const expectations = {
    required: ['SPAWN:'],
    forbidden: ['ERROR:'],
  };

  const output = 'SPAWN: surveyor\nERROR: something went wrong';

  const result = checkLabels(expectations, output);
  assertEquals(result.passed, false);
});
