// tests/integration/stake.test.ts
import { assertStringIncludes } from '@std/assert';

Deno.test('paydirt stake --dry-run generates correct command', async () => {
  const cmd = new Deno.Command('deno', {
    args: ['run', '--allow-all', 'paydirt.ts', 'stake', 'Test task', '--dry-run'],
    cwd: '/Users/kent/Project/gastown_b/paydirt',
    stdout: 'piped',
    stderr: 'piped',
  });

  const { stdout } = await cmd.output();
  const output = new TextDecoder().decode(stdout);

  assertStringIncludes(output, '--plugin-dir');
  assertStringIncludes(output, '--add-dir');
  assertStringIncludes(output, '--agent');
  assertStringIncludes(output, 'trail-boss.md');
});
