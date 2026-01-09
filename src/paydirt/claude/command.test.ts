// src/paydirt/claude/command.test.ts
import { assertEquals, assertStringIncludes } from '@std/assert';
import { buildClaudeCommand, buildPaydirtEnvVars } from './command.ts';

Deno.test('buildPaydirtEnvVars includes required variables', () => {
  const vars = buildPaydirtEnvVars({
    role: 'trail-boss',
    claimId: 'pd-001',
    caravanName: 'test-caravan',
  });

  assertEquals(vars.PAYDIRT_PROSPECT, 'trail-boss');
  assertEquals(vars.PAYDIRT_CLAIM, 'pd-001');
  assertEquals(vars.PAYDIRT_CARAVAN, 'test-caravan');
  assertEquals(vars.PAYDIRT_SESSION, 'paydirt-pd-001');
});

Deno.test('buildClaudeCommand includes --plugin-dir flag', () => {
  const cmd = buildClaudeCommand({
    role: 'miner',
    claimId: 'pd-001',
    caravanName: 'test',
    paydirtInstallDir: '/opt/paydirt',
    userProjectDir: '/home/user/project',
    prompt: 'Test task',
  });

  assertStringIncludes(cmd, '--plugin-dir /opt/paydirt');
});

Deno.test('buildClaudeCommand includes --add-dir flags', () => {
  const cmd = buildClaudeCommand({
    role: 'miner',
    claimId: 'pd-001',
    caravanName: 'test',
    paydirtInstallDir: '/opt/paydirt',
    userProjectDir: '/home/user/project',
    prompt: 'Test task',
  });

  assertStringIncludes(cmd, '--add-dir /opt/paydirt');
  assertStringIncludes(cmd, '--add-dir /home/user/project');
});

Deno.test('buildClaudeCommand includes --agent flag', () => {
  const cmd = buildClaudeCommand({
    role: 'miner',
    claimId: 'pd-001',
    caravanName: 'test',
    paydirtInstallDir: '/opt/paydirt',
    userProjectDir: '/home/user/project',
    prompt: 'Test task',
  });

  assertStringIncludes(cmd, '--agent /opt/paydirt/prospects/miner.md');
});
