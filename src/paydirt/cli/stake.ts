// src/paydirt/cli/stake.ts
import { getPaydirtBinPath, getPaydirtInstallDir, getUserProjectDir } from '../paths.ts';
import { buildClaudeCommand } from '../claude/command.ts';

export interface StakeOptions {
  task: string;
  primeMode?: boolean;
  tunnelPath?: string;
  dryRun?: boolean;
}

/**
 * Check if a tmux session exists.
 */
async function sessionExists(sessionName: string): Promise<boolean> {
  const cmd = new Deno.Command('tmux', {
    args: ['has-session', '-t', sessionName],
    stdout: 'null',
    stderr: 'null',
  });
  const result = await cmd.output();
  return result.success;
}

/**
 * Create a tmux session and run Claude Code in it.
 */
async function createTmuxSession(
  sessionName: string,
  claudeCommand: string,
  projectDir: string,
): Promise<boolean> {
  // Create detached tmux session with Claude command
  const cmd = new Deno.Command('tmux', {
    args: [
      'new-session',
      '-d', // detached
      '-s', sessionName,
      '-c', projectDir, // working directory
      claudeCommand,
    ],
    stdout: 'piped',
    stderr: 'piped',
  });

  const result = await cmd.output();
  return result.success;
}

/**
 * Attach to an existing tmux session.
 */
async function attachSession(sessionName: string): Promise<void> {
  const cmd = new Deno.Command('tmux', {
    args: ['attach-session', '-t', sessionName],
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  });
  await cmd.output();
}

/**
 * Notify Boomtown dashboard of a new caravan.
 * Writes to a notification file that the Control Room status script checks.
 */
async function notifyNewCaravan(claimId: string, task: string): Promise<void> {
  const notification = `${claimId}: ${task.substring(0, 50)}`;
  const file = '/tmp/paydirt-new-caravans';

  try {
    await Deno.writeTextFile(file, notification + '\n', { append: true });
  } catch {
    // Ignore write errors
  }
}

export async function stakeCommand(options: StakeOptions): Promise<void> {
  const { task, primeMode: _primeMode, tunnelPath, dryRun } = options;

  console.log(`Staking claim for: "${task}"`);

  // Generate Caravan ID and name
  const claimId = `pd-${Date.now().toString(36)}`;
  const caravanName = task.slice(0, 30).replace(/\s+/g, '-').toLowerCase();
  const sessionName = `paydirt-${claimId}`;

  // Build Claude command
  const paydirtInstallDir = getPaydirtInstallDir();
  const userProjectDir = getUserProjectDir();

  const command = buildClaudeCommand({
    role: 'trail-boss',
    claimId,
    caravanName,
    paydirtInstallDir,
    userProjectDir,
    prompt: `You are the Trail Boss coordinating this Caravan. The task is: "${task}".`,
    tunnelPath,
    paydirtBinPath: getPaydirtBinPath(),
  });

  if (dryRun) {
    console.log('\n[DRY RUN] Would execute:');
    console.log(command);
    console.log(`\nSession name: ${sessionName}`);
    return;
  }

  // Check if session already exists
  if (await sessionExists(sessionName)) {
    console.log(`\n⚠ Session "${sessionName}" already exists`);
    console.log('Attaching to existing session...');
    await attachSession(sessionName);
    return;
  }

  // Create tmux session and launch Claude
  console.log(`\n⛏ Creating Caravan session: ${sessionName}`);
  const success = await createTmuxSession(sessionName, command, userProjectDir);

  if (!success) {
    console.error('✗ Failed to create tmux session');
    Deno.exit(1);
  }

  // Notify Boomtown dashboard
  await notifyNewCaravan(claimId, task);

  console.log(`✓ Caravan started: ${claimId}`);
  console.log(`\n▶ Attaching to session...`);
  console.log(`  (Press Ctrl+b d to detach)`);

  // Attach to the session
  await attachSession(sessionName);
}
