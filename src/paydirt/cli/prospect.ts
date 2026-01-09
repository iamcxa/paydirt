// src/paydirt/cli/prospect.ts
import type { ProspectRole } from '../../types.ts';
import { getPaydirtBinPath, getPaydirtInstallDir, getUserProjectDir } from '../paths.ts';
import { buildClaudeCommand } from '../claude/command.ts';

export interface ProspectOptions {
  role: string;
  task?: string;
  claimId?: string;
  dryRun?: boolean;
}

const VALID_ROLES: ProspectRole[] = [
  'camp-boss',
  'trail-boss',
  'surveyor',
  'shift-boss',
  'miner',
  'assayer',
  'canary',
  'smelter',
  'claim-agent',
  'scout',
];

export function prospectCommand(options: ProspectOptions): void {
  const { role, task, claimId, dryRun } = options;

  // Validate role
  if (!VALID_ROLES.includes(role as ProspectRole)) {
    console.error(`Error: Invalid prospect role: ${role}`);
    console.error(`Valid roles: ${VALID_ROLES.join(', ')}`);
    Deno.exit(1);
  }

  const prospectRole = role as ProspectRole;

  // Generate claimId if not provided
  const resolvedClaimId = claimId || `pd-${Date.now().toString(36)}`;
  const caravanName = task
    ? task.slice(0, 30).replace(/\s+/g, '-').toLowerCase()
    : `standalone-${prospectRole}`;

  console.log(`Spawning Prospect: ${prospectRole}`);
  if (claimId) {
    console.log(`Caravan: ${claimId}`);
  }

  // Build Claude command
  const paydirtInstallDir = getPaydirtInstallDir();
  const userProjectDir = getUserProjectDir();

  const prompt = task
    ? `You are a ${prospectRole} prospect. Your task is: "${task}".`
    : `You are a ${prospectRole} prospect. Awaiting instructions.`;

  const command = buildClaudeCommand({
    role: prospectRole,
    claimId: resolvedClaimId,
    caravanName,
    paydirtInstallDir,
    userProjectDir,
    prompt,
    paydirtBinPath: getPaydirtBinPath(),
  });

  if (dryRun) {
    console.log('\n[DRY RUN] Would execute:');
    console.log(command);
    return;
  }

  // TODO: Launch Claude with the built command
  console.log('\n[TODO] Would launch Claude with command');
  console.log(`Prospect ID: ${resolvedClaimId}`);
}
