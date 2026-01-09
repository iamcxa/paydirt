#!/usr/bin/env -S deno run --allow-all
/**
 * Paydirt - Multi-agent orchestrator with Goldflow execution engine
 *
 * Usage:
 *   paydirt <command> [options]
 *   pd <command> [options]
 *
 * Commands:
 *   stake "task"     Start new Caravan
 *   continue [id]    Resume existing Caravan
 *   survey [id]      Show status
 *   abandon [id]     Stop Caravan
 *   prospect <role>  Spawn specific Prospect
 *   boomtown         Open Dashboard
 *   ledger           View history
 */

import { parseArgs } from '@std/cli/parse-args';

const VERSION = '0.1.0';

function printHelp(): void {
  console.log(`
Paydirt v${VERSION} - Multi-agent orchestrator

Usage:
  paydirt <command> [options]
  pd <command> [options]

Commands:
  stake "task"      Start new Caravan (stake a claim)
  continue [id]     Resume existing Caravan
  survey [id]       Show status
  abandon [id]      Stop Caravan
  prospect <role>   Spawn specific Prospect
  boomtown          Open Dashboard
  ledger            View history

Options:
  -h, --help        Show this help
  -v, --version     Show version
  --dry-run         Preview without executing
`);
}

async function main(): Promise<void> {
  const args = parseArgs(Deno.args, {
    boolean: ['help', 'version', 'dry-run'],
    alias: {
      h: 'help',
      v: 'version',
    },
  });

  if (args.help) {
    printHelp();
    Deno.exit(0);
  }

  if (args.version) {
    console.log(`Paydirt v${VERSION}`);
    Deno.exit(0);
  }

  const command = args._[0] as string | undefined;

  if (!command) {
    printHelp();
    Deno.exit(1);
  }

  // TODO: Implement commands
  console.log(`Command: ${command}`);
  console.log('Not yet implemented.');
}

if (import.meta.main) {
  main();
}
