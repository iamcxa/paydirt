/**
 * Path utilities for Paydirt
 *
 * Paydirt is installed globally but runs in user's project directory.
 * These utilities help resolve paths correctly.
 */

/**
 * Get Paydirt installation directory.
 * This is where Paydirt's plugin resources (prospects, commands) live.
 */
export function getPaydirtInstallDir(): string {
  // import.meta.url is file:///path/to/paydirt/src/paydirt/paths.ts
  const url = new URL(import.meta.url);
  const filePath = url.pathname;
  // Go from src/paydirt/paths.ts to paydirt root
  const parts = filePath.split('/');
  parts.pop(); // remove paths.ts
  parts.pop(); // remove paydirt
  parts.pop(); // remove src
  return parts.join('/');
}

/**
 * Get user's project directory (where pd is executed).
 */
export function getUserProjectDir(): string {
  return Deno.cwd();
}

/**
 * Get path to Paydirt binary (for spawning agents).
 */
export function getPaydirtBinPath(): string {
  const installDir = getPaydirtInstallDir();
  return `${installDir}/paydirt.ts`;
}

/**
 * Get path to prospects directory.
 */
export function getProspectsDir(): string {
  const installDir = getPaydirtInstallDir();
  return `${installDir}/prospects`;
}

/**
 * Get path to a specific prospect definition file.
 */
export function getProspectPath(role: string): string {
  return `${getProspectsDir()}/${role}.md`;
}
