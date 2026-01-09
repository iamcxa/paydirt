// src/paydirt/cli/stake.ts
import { getPaydirtBinPath, getPaydirtInstallDir, getUserProjectDir } from '../paths.ts';
import { buildClaudeCommand } from '../claude/command.ts';

export interface StakeOptions {
  task: string;
  primeMode?: boolean;
  tunnelPath?: string;
  dryRun?: boolean;
}

export function stakeCommand(options: StakeOptions): void {
  const { task, primeMode: _primeMode, tunnelPath, dryRun } = options;

  console.log(`Staking claim for: "${task}"`);

  // TODO: Create Caravan via bd CLI
  const claimId = `pd-${Date.now().toString(36)}`;
  const caravanName = task.slice(0, 30).replace(/\s+/g, '-').toLowerCase();

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
    return;
  }

  // TODO: Create tmux session and launch Claude
  console.log('\n[TODO] Would create tmux session and launch Claude');
  console.log(`Caravan ID: ${claimId}`);
}
