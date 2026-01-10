// src/paydirt/boomtown/zellij-dashboard.ts
/**
 * Zellij-based Boomtown dashboard launcher.
 * Replaces mprocs for dynamic caravan pane management.
 */

import { findPaydirtPath } from './dashboard.ts';
import { generateCampBossScriptContent } from './camp-boss-pane.ts';
import { generateStatusScriptContent, type DashboardCaravanInfo } from './mprocs.ts';
import {
  BOOMTOWN_SESSION,
  generateBoomtownLayout,
  sessionExists,
  attachSession,
  createSession,
  addCaravanTab,
} from './zellij.ts';

/**
 * List open caravans from bd.
 */
async function listCaravans(): Promise<DashboardCaravanInfo[]> {
  try {
    const cmd = new Deno.Command('bd', {
      args: ['list', '--label', 'pd:caravan', '--status', 'open', '--brief'],
      stdout: 'piped',
      stderr: 'null',
    });
    const result = await cmd.output();
    if (!result.success) return [];

    const output = new TextDecoder().decode(result.stdout);
    const lines = output.trim().split('\n').filter((l) => l.trim());
    const caravans: DashboardCaravanInfo[] = [];

    for (const line of lines) {
      // Parse: "pd-xxx [P2] [task] open [pd:caravan] - Title"
      const match = line.match(/^(\S+)\s+.*\s+-\s+(.+)$/);
      if (match) {
        caravans.push({
          id: match[1],
          name: match[2],
          status: 'idle',
        });
      }
    }
    return caravans;
  } catch {
    return [];
  }
}

/**
 * Launch Boomtown with zellij.
 *
 * Features:
 * - Creates zellij session with Control Room + Camp Boss layout
 * - Attaches to existing session if already running
 * - Adds tabs for existing caravans on first launch
 * - New caravans are added dynamically via stake command
 */
export async function launchZellijBoomtown(): Promise<void> {
  console.log('Launching Paydirt Boomtown (zellij)...');

  // Check if session already exists
  if (await sessionExists(BOOMTOWN_SESSION)) {
    console.log(`Session ${BOOMTOWN_SESSION} exists, attaching...`);
    await attachSession(BOOMTOWN_SESSION);
    return;
  }

  // Find paydirt binary
  let paydirtPath: string;
  try {
    paydirtPath = await findPaydirtPath();
  } catch (error) {
    console.error((error as Error).message);
    Deno.exit(1);
  }

  const projectRoot = Deno.cwd();
  const tempDir = await Deno.makeTempDir({ prefix: 'paydirt-zellij-' });

  // Write Control Room script
  const controlRoomScript = `${tempDir}/control-room.sh`;
  await Deno.writeTextFile(controlRoomScript, generateStatusScriptContent());
  await Deno.chmod(controlRoomScript, 0o755);

  // Write Camp Boss script
  const campBossScript = `${tempDir}/camp-boss.sh`;
  const campBossAgentPath = `${projectRoot}/prospects/camp-boss.md`;
  await Deno.writeTextFile(
    campBossScript,
    generateCampBossScriptContent(paydirtPath, campBossAgentPath, projectRoot),
  );
  await Deno.chmod(campBossScript, 0o755);

  // Write layout file
  const layoutPath = `${tempDir}/boomtown.kdl`;
  await Deno.writeTextFile(
    layoutPath,
    generateBoomtownLayout(controlRoomScript, campBossScript),
  );

  console.log('Creating zellij session...');

  // Get existing caravans to add as tabs after session starts
  const caravans = await listCaravans();
  if (caravans.length > 0) {
    console.log(`Found ${caravans.length} existing caravan(s)`);
  }

  // Create session - this will block until user exits zellij
  // We need to add caravan tabs AFTER session is created but BEFORE blocking
  // Solution: Create session in background, add tabs, then attach

  // Start session detached first
  const startCmd = new Deno.Command('zellij', {
    args: ['--session', BOOMTOWN_SESSION, '--layout', layoutPath, 'options', '--detach'],
    stdout: 'null',
    stderr: 'null',
  });

  // Try detached start (may not work on all zellij versions)
  const startResult = await startCmd.output();

  if (startResult.success) {
    // Add caravan tabs
    for (const caravan of caravans) {
      await addCaravanTab(caravan.id, caravan.name);
    }

    // Now attach
    console.log('Attaching to session...');
    await attachSession(BOOMTOWN_SESSION);
  } else {
    // Fallback: create session interactively (tabs won't be pre-added)
    const success = await createSession(BOOMTOWN_SESSION, layoutPath);
    if (!success) {
      console.error('Failed to create zellij session');
      Deno.exit(1);
    }
  }

  // Cleanup temp files after session exits
  try {
    await Deno.remove(tempDir, { recursive: true });
  } catch {
    // Ignore cleanup errors
  }

  console.log('Boomtown session ended.');
}
