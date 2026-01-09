// tests/integration/env-vars.test.ts
/**
 * Tests that prospect-launched Claude has correct environment variables.
 */

import { assertStringIncludes } from '@std/assert';

Deno.test({
  name: 'prospect --dry-run shows PAYDIRT environment variables',
  async fn() {
    const cmd = new Deno.Command('deno', {
      args: [
        'run',
        '--allow-all',
        'paydirt.ts',
        'prospect',
        'surveyor',
        '--claim',
        'pd-envtest',
        '--task',
        'Test task',
        '--dry-run',
      ],
      stdout: 'piped',
      stderr: 'piped',
      cwd: Deno.cwd(),
    });

    const { stdout } = await cmd.output();
    const output = new TextDecoder().decode(stdout);

    assertStringIncludes(output, 'PAYDIRT_CLAIM=');
    assertStringIncludes(output, 'pd-envtest');
    assertStringIncludes(output, 'PAYDIRT_PROSPECT=');
    assertStringIncludes(output, 'surveyor');
    assertStringIncludes(output, 'PAYDIRT_BIN=');
  },
});
