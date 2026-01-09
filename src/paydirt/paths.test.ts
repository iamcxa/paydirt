// src/paydirt/paths.test.ts
import { assertEquals, assertMatch } from '@std/assert';
import { getPaydirtInstallDir, getUserProjectDir } from './paths.ts';

Deno.test('getPaydirtInstallDir returns paydirt root directory', () => {
  const installDir = getPaydirtInstallDir();
  // Should end with 'paydirt'
  assertMatch(installDir, /paydirt$/);
});

Deno.test('getUserProjectDir returns current working directory', () => {
  const projectDir = getUserProjectDir();
  assertEquals(projectDir, Deno.cwd());
});
