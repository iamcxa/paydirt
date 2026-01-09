# Automation & Boomtown Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable fully automated agent delegation via Claude Code hooks, with real-time visualization in Boomtown dashboard.

**Architecture:** PostToolUse hook detects `bd comments add` with SPAWN/QUESTION prefixes, then executes `paydirt prospect` to spawn agents in tmux windows. Camp Boss can create new caravans via `SPAWN: trail-boss`. Boomtown attaches directly to tmux sessions for real-time agent visibility.

**Tech Stack:** Deno/TypeScript, Bash hooks, tmux, mprocs, bd CLI

---

## Phase 1: Hook Environment Variables

### Task 1.1: Add environment variable injection to buildClaudeCommand

**Files:**
- Modify: `src/paydirt/claude/command.ts`
- Test: `src/paydirt/claude/command.test.ts`

**Step 1: Write the failing test**

Add to `src/paydirt/claude/command.test.ts`:

```typescript
Deno.test({
  name: 'buildClaudeCommand includes PAYDIRT environment variables',
  fn() {
    const command = buildClaudeCommand({
      role: 'trail-boss',
      claimId: 'pd-test123',
      caravanName: 'test-caravan',
      paydirtInstallDir: '/opt/paydirt',
      userProjectDir: '/home/user/project',
      prompt: 'Test prompt',
      paydirtBinPath: '/opt/paydirt/paydirt',
    });

    assertStringIncludes(command, 'PAYDIRT_CLAIM=pd-test123');
    assertStringIncludes(command, 'PAYDIRT_BIN=/opt/paydirt/paydirt');
    assertStringIncludes(command, 'PAYDIRT_ROLE=trail-boss');
  },
});
```

**Step 2: Run test to verify it fails**

```bash
cd .worktrees/automation-boomtown
deno test src/paydirt/claude/command.test.ts --allow-all
```

Expected: FAIL - environment variables not in command

**Step 3: Implement environment variable injection**

Modify `src/paydirt/claude/command.ts`, find the `buildClaudeCommand` function and update it:

```typescript
export function buildClaudeCommand(options: ClaudeCommandOptions): string {
  const {
    role,
    claimId,
    caravanName,
    paydirtInstallDir,
    userProjectDir,
    prompt,
    tunnelPath,
    paydirtBinPath,
  } = options;

  // Build environment variables for hook integration
  const envVars = [
    `PAYDIRT_CLAIM=${claimId}`,
    `PAYDIRT_BIN=${paydirtBinPath}`,
    `PAYDIRT_ROLE=${role}`,
  ].join(' ');

  // ... rest of existing command building logic ...

  // Prepend env vars to the final command
  return `${envVars} ${command}`;
}
```

**Step 4: Run test to verify it passes**

```bash
deno test src/paydirt/claude/command.test.ts --allow-all
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/paydirt/claude/command.ts src/paydirt/claude/command.test.ts
git commit -m "feat(claude): inject PAYDIRT_* environment variables for hook integration"
```

---

### Task 1.2: Verify environment variables in prospect command

**Files:**
- Test: `tests/integration/env-vars.test.ts` (create)

**Step 1: Write the failing test**

Create `tests/integration/env-vars.test.ts`:

```typescript
// tests/integration/env-vars.test.ts
/**
 * Tests that prospect-launched Claude has correct environment variables.
 */

import { assertEquals, assertStringIncludes } from '@std/assert';

Deno.test({
  name: 'prospect --dry-run shows PAYDIRT environment variables',
  async fn() {
    const cmd = new Deno.Command('deno', {
      args: [
        'run', '--allow-all', 'paydirt.ts',
        'prospect', 'surveyor',
        '--claim', 'pd-envtest',
        '--task', 'Test task',
        '--dry-run',
      ],
      stdout: 'piped',
      stderr: 'piped',
      cwd: Deno.cwd(),
    });

    const { stdout } = await cmd.output();
    const output = new TextDecoder().decode(stdout);

    assertStringIncludes(output, 'PAYDIRT_CLAIM=pd-envtest');
    assertStringIncludes(output, 'PAYDIRT_ROLE=surveyor');
    assertStringIncludes(output, 'PAYDIRT_BIN=');
  },
});
```

**Step 2: Run test to verify it fails**

```bash
deno test tests/integration/env-vars.test.ts --allow-all
```

Expected: FAIL - env vars not shown in dry-run output

**Step 3: Verify implementation works**

The implementation from Task 1.1 should already make this pass. If not, check that `buildClaudeCommand` is being called correctly in `prospect.ts`.

**Step 4: Run test to verify it passes**

```bash
deno test tests/integration/env-vars.test.ts --allow-all
```

Expected: PASS

**Step 5: Commit**

```bash
git add tests/integration/env-vars.test.ts
git commit -m "test(integration): verify PAYDIRT env vars in prospect dry-run"
```

---

## Phase 2: Hook Auto-Delegation

### Task 2.1: Update post-tool-use.sh hook script

**Files:**
- Modify: `hooks/post-tool-use.sh`

**Step 1: Read current implementation**

```bash
cat hooks/post-tool-use.sh
```

**Step 2: Update hook script with improved parsing**

Replace contents of `hooks/post-tool-use.sh`:

```bash
#!/bin/bash
# hooks/post-tool-use.sh
# PostToolUse hook - automatic agent delegation
#
# Environment variables (set by Claude launcher):
#   PAYDIRT_CLAIM - Current caravan ID
#   PAYDIRT_BIN   - Path to paydirt binary
#   PAYDIRT_ROLE  - Current agent role
#
# Receives tool output on stdin from Claude Code

set -e

# Only process in Paydirt context
[ -z "$PAYDIRT_BIN" ] && exit 0

# Read tool output from stdin
TOOL_OUTPUT=$(cat)

# Check if this is a bd comments add command
echo "$TOOL_OUTPUT" | grep -q "bd comments add" || exit 0

# Extract the comment content
# Handles: bd comments add <id> "CONTENT" or bd comments add $VAR "CONTENT"
COMMENT=$(echo "$TOOL_OUTPUT" | grep -oP 'bd comments add [^ ]+ "\K[^"]+' || true)
[ -z "$COMMENT" ] && exit 0

# Get prefix (everything before first colon)
PREFIX=$(echo "$COMMENT" | cut -d: -f1)
# Get content (everything after "PREFIX: ")
CONTENT=$(echo "$COMMENT" | sed 's/^[^:]*: *//')

case "$PREFIX" in
  SPAWN)
    # Parse: <role> [--task "<task>"] [--claim <claim>]
    ROLE=$(echo "$CONTENT" | awk '{print $1}')
    TASK=$(echo "$CONTENT" | grep -oP '(?<=--task ")[^"]+' || echo "")
    TARGET_CLAIM=$(echo "$CONTENT" | grep -oP '(?<=--claim )\S+' || echo "")

    [ -z "$ROLE" ] && exit 0

    if [ "$ROLE" = "trail-boss" ]; then
      # Camp Boss creates new caravan
      if [ -n "$TASK" ]; then
        "$PAYDIRT_BIN" stake "$TASK" &
      fi
    elif [ -n "$TARGET_CLAIM" ]; then
      # Add agent to specified caravan
      "$PAYDIRT_BIN" prospect "$ROLE" --claim "$TARGET_CLAIM" --task "$TASK" --background &
    elif [ -n "$PAYDIRT_CLAIM" ]; then
      # Add agent to same caravan
      "$PAYDIRT_BIN" prospect "$ROLE" --claim "$PAYDIRT_CLAIM" --task "$TASK" --background &
    fi
    ;;

  QUESTION)
    # Spawn claim-agent to answer question
    if [ -n "$PAYDIRT_CLAIM" ]; then
      "$PAYDIRT_BIN" prospect claim-agent --claim "$PAYDIRT_CLAIM" --background &
    fi
    ;;

  # Other prefixes - no action needed
  ANSWER|OUTPUT|PROGRESS|CHECKPOINT|DECISION)
    exit 0
    ;;
esac

exit 0
```

**Step 3: Make executable**

```bash
chmod +x hooks/post-tool-use.sh
```

**Step 4: Commit**

```bash
git add hooks/post-tool-use.sh
git commit -m "feat(hooks): update post-tool-use.sh with full dispatch logic"
```

---

### Task 2.2: Create hook dispatch test

**Files:**
- Create: `tests/integration/hook-dispatch.test.ts`

**Step 1: Write the test**

Create `tests/integration/hook-dispatch.test.ts`:

```typescript
// tests/integration/hook-dispatch.test.ts
/**
 * Tests for hook dispatch logic.
 * Verifies that the hook script correctly parses comments and spawns agents.
 */

import { assertEquals, assertStringIncludes } from '@std/assert';

async function runHookWithInput(
  input: string,
  env: Record<string, string>,
): Promise<{ stdout: string; stderr: string; success: boolean }> {
  const cmd = new Deno.Command('bash', {
    args: ['hooks/post-tool-use.sh'],
    stdin: 'piped',
    stdout: 'piped',
    stderr: 'piped',
    env: { ...Deno.env.toObject(), ...env },
    cwd: Deno.cwd(),
  });

  const child = cmd.spawn();
  const writer = child.stdin.getWriter();
  await writer.write(new TextEncoder().encode(input));
  await writer.close();

  const { stdout, stderr, success } = await child.output();
  return {
    stdout: new TextDecoder().decode(stdout),
    stderr: new TextDecoder().decode(stderr),
    success,
  };
}

Deno.test({
  name: 'hook exits silently without PAYDIRT_BIN',
  async fn() {
    const result = await runHookWithInput(
      'bd comments add pd-123 "SPAWN: surveyor --task \\"Test\\""',
      {}, // No PAYDIRT_BIN
    );
    assertEquals(result.success, true);
    assertEquals(result.stdout, '');
  },
});

Deno.test({
  name: 'hook exits silently for non-bd commands',
  async fn() {
    const result = await runHookWithInput(
      'echo "hello world"',
      { PAYDIRT_BIN: 'echo', PAYDIRT_CLAIM: 'pd-123' },
    );
    assertEquals(result.success, true);
  },
});

Deno.test({
  name: 'hook parses SPAWN comment correctly',
  async fn() {
    // Use echo as PAYDIRT_BIN to capture what would be called
    const result = await runHookWithInput(
      'bd comments add pd-123 "SPAWN: surveyor --task \\"Design system\\""',
      {
        PAYDIRT_BIN: 'echo',
        PAYDIRT_CLAIM: 'pd-123',
      },
    );
    assertEquals(result.success, true);
    // Echo will print the command that would be executed
    assertStringIncludes(result.stdout, 'prospect');
    assertStringIncludes(result.stdout, 'surveyor');
  },
});

Deno.test({
  name: 'hook handles SPAWN trail-boss for new caravan',
  async fn() {
    const result = await runHookWithInput(
      'bd comments add pd-boss "SPAWN: trail-boss --task \\"Build auth\\""',
      {
        PAYDIRT_BIN: 'echo',
        PAYDIRT_CLAIM: 'pd-boss',
      },
    );
    assertEquals(result.success, true);
    assertStringIncludes(result.stdout, 'stake');
    assertStringIncludes(result.stdout, 'Build auth');
  },
});

Deno.test({
  name: 'hook handles QUESTION by spawning claim-agent',
  async fn() {
    const result = await runHookWithInput(
      'bd comments add pd-123 "QUESTION: Which database?"',
      {
        PAYDIRT_BIN: 'echo',
        PAYDIRT_CLAIM: 'pd-123',
      },
    );
    assertEquals(result.success, true);
    assertStringIncludes(result.stdout, 'prospect');
    assertStringIncludes(result.stdout, 'claim-agent');
  },
});
```

**Step 2: Run tests**

```bash
deno test tests/integration/hook-dispatch.test.ts --allow-all
```

Expected: PASS (using echo as mock)

**Step 3: Commit**

```bash
git add tests/integration/hook-dispatch.test.ts
git commit -m "test(integration): add hook dispatch tests"
```

---

### Task 2.3: Create Claude Code hook settings file

**Files:**
- Create: `.claude/settings.local.json`

**Step 1: Create the settings file**

Create `.claude/settings.local.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "command": "${PAYDIRT_INSTALL_DIR}/hooks/post-tool-use.sh"
      }
    ]
  }
}
```

**Step 2: Add to .gitignore if needed**

Check if `.claude/` is already in gitignore:

```bash
git check-ignore .claude/settings.local.json || echo ".claude/settings.local.json" >> .gitignore
```

**Step 3: Commit**

```bash
git add .claude/settings.local.json .gitignore
git commit -m "feat: add Claude Code PostToolUse hook configuration"
```

---

## Phase 3: Camp Boss Integration

### Task 3.1: Create Camp Boss command log issue on startup

**Files:**
- Modify: `src/paydirt/cli/boss.ts`

**Step 1: Read current implementation**

```bash
cat src/paydirt/cli/boss.ts
```

**Step 2: Add function to ensure boss log issue exists**

Add to `src/paydirt/cli/boss.ts`:

```typescript
const BOSS_LOG_LABEL = 'pd:camp-boss';
const BOSS_LOG_TITLE = 'Camp Boss Command Log';

/**
 * Find or create the Camp Boss command log issue.
 */
async function ensureBossLog(): Promise<string | null> {
  // Try to find existing
  const findCmd = new Deno.Command('bd', {
    args: ['list', '--label', BOSS_LOG_LABEL, '--type', 'epic', '--limit', '1'],
    stdout: 'piped',
    stderr: 'null',
  });

  const findResult = await findCmd.output();
  if (findResult.success) {
    const output = new TextDecoder().decode(findResult.stdout).trim();
    if (output) {
      const match = output.match(/^(\S+)\s+/);
      if (match) return match[1];
    }
  }

  // Create new
  const createCmd = new Deno.Command('bd', {
    args: [
      'create',
      '--title', BOSS_LOG_TITLE,
      '--type', 'epic',
      '--label', BOSS_LOG_LABEL,
    ],
    stdout: 'piped',
    stderr: 'piped',
  });

  const createResult = await createCmd.output();
  if (!createResult.success) return null;

  const output = new TextDecoder().decode(createResult.stdout).trim();
  const match = output.match(/Created issue:\s*(\S+)/);
  return match ? match[1] : null;
}
```

**Step 3: Update startDaemon to use boss log**

Modify the `startDaemon` function to call `ensureBossLog` and pass the ID to Camp Boss:

```typescript
async function startDaemon(dryRun?: boolean): Promise<void> {
  if (await isDaemonRunning()) {
    console.log('Camp Boss daemon is already running');
    console.log(`Attach with: tmux attach -t ${BOSS_SESSION}`);
    return;
  }

  // Ensure boss log exists
  const bossLogId = await ensureBossLog();
  if (bossLogId) {
    console.log(`Boss log: ${bossLogId}`);
  }

  const paydirtBin = getPaydirtBin();
  const projectDir = Deno.cwd();

  // Build command with boss log claim
  const claimArg = bossLogId ? `--claim ${bossLogId}` : '';
  const command = `${paydirtBin} prospect camp-boss ${claimArg} --background`;

  // ... rest of existing code ...
}
```

**Step 4: Run existing tests**

```bash
deno test tests/integration/tmux-spawn.test.ts --allow-all -f "boss"
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/paydirt/cli/boss.ts
git commit -m "feat(boss): create command log issue on daemon startup"
```

---

### Task 3.2: Add Camp Boss prospect definition

**Files:**
- Create: `prospects/camp-boss.md`

**Step 1: Create the prospect file**

Create `prospects/camp-boss.md`:

```markdown
# Camp Boss

You are the Camp Boss - the strategic command center for Paydirt multi-agent orchestration.

## Your Role

- **Human Interface**: You are the primary point of contact for users
- **Caravan Creator**: You spawn new Trail Bosses to handle user requests
- **Overseer**: You monitor overall progress across all caravans

## Communication Protocol

Write comments to bd issues using these prefixes:

### Creating New Caravans

When a user asks you to do something substantial:

```bash
bd comments add $PAYDIRT_CLAIM "SPAWN: trail-boss --task \"<user's task description>\""
```

This will:
1. Create a new caravan (bd issue)
2. Launch a Trail Boss in a new tmux session
3. The new caravan will appear in Boomtown after reload

### Delegating to Existing Caravans

To add an agent to an existing caravan:

```bash
bd comments add $PAYDIRT_CLAIM "SPAWN: <role> --task \"<task>\" --claim <caravan-id>"
```

### Available Roles

- `trail-boss` - Creates new caravan, coordinates work
- `surveyor` - Designs and plans
- `shift-boss` - Breaks down work into phases
- `miner` - Implements code
- `assayer` - Tests and validates
- `claim-agent` - Answers questions from the Decision Ledger

## Example Interaction

User: "Help me build a user authentication system"

You:
1. Acknowledge the request
2. Create a new caravan:
   ```bash
   bd comments add $PAYDIRT_CLAIM "SPAWN: trail-boss --task \"Build user authentication system with OAuth2 support\""
   ```
3. Inform the user that work has been delegated

## Important

- Always log your decisions with `bd comments add`
- Use descriptive task descriptions
- Don't try to do implementation work yourself - delegate to specialists
```

**Step 2: Commit**

```bash
git add prospects/camp-boss.md
git commit -m "feat: add Camp Boss prospect definition"
```

---

## Phase 4: Boomtown Visualization

### Task 4.1: Update Caravan pane to use direct tmux attach

**Files:**
- Modify: `src/paydirt/boomtown/mprocs.ts`

**Step 1: Update generateCaravanScriptContent**

Find the `generateCaravanScriptContent` function and simplify it to prioritize tmux attach:

```typescript
export function generateCaravanScriptContent(
  caravanId: string,
  caravanName: string,
  status: CaravanStatus,
  paydirtPath: string,
): string {
  const sessionName = `paydirt-${caravanId}`;
  const safeName = caravanName.replace(/"/g, '\\"').substring(0, 42);
  const safeId = caravanId.substring(0, 20);

  return `#!/bin/bash
# PAYDIRT BOOMTOWN - Caravan Pane
# Direct tmux attach with fallback to detail view

SESSION_NAME="${sessionName}"
CARAVAN_ID="${safeId}"
CARAVAN_NAME="${safeName}"
PAYDIRT_BIN="${paydirtPath}"

# Colors
AMBER="\\033[38;5;214m"
FG="\\033[38;5;156m"
DIM="\\033[38;5;242m"
RESET="\\033[0m"

show_waiting() {
  clear
  echo -e "\${AMBER}"
  echo "  ╔════════════════════════════════════════════════════════════╗"
  echo -e "  ║  CARAVAN: \${FG}\$CARAVAN_NAME\${AMBER}"
  echo "  ╠════════════════════════════════════════════════════════════╣"
  echo -e "  ║  ID: \$CARAVAN_ID"
  echo -e "  ║  Session: \$SESSION_NAME"
  echo "  ╠════════════════════════════════════════════════════════════╣"
  echo -e "  ║  \${FG}[s]\${AMBER} START - Launch Trail Boss"
  echo -e "  ║  \${DIM}Waiting for session...\${AMBER}"
  echo "  ╚════════════════════════════════════════════════════════════╝"
  echo -e "\${RESET}"
}

start_caravan() {
  echo -e "\\n\${AMBER}Starting caravan...\${RESET}"
  "\$PAYDIRT_BIN" continue "\$CARAVAN_ID" &
  sleep 2
}

# Main loop
while true; do
  if tmux has-session -t "\$SESSION_NAME" 2>/dev/null; then
    # Session exists - attach directly
    tmux attach -t "\$SESSION_NAME"
    # After detach, loop continues
    sleep 1
  else
    # No session - show waiting screen
    show_waiting
    read -t 2 -n 1 key 2>/dev/null || key=""
    case "\$key" in
      s|S) start_caravan ;;
    esac
  fi
done
`;
}
```

**Step 2: Run existing boomtown tests**

```bash
deno test src/paydirt/boomtown/*.test.ts --allow-all
```

Expected: PASS

**Step 3: Commit**

```bash
git add src/paydirt/boomtown/mprocs.ts
git commit -m "feat(boomtown): simplify caravan pane to direct tmux attach"
```

---

### Task 4.2: Add new caravan notification to Control Room

**Files:**
- Modify: `src/paydirt/boomtown/mprocs.ts`

**Step 1: Update generateStatusScriptContent**

Add a section to check for new caravans. Find the `print_caravan_stats` function and add notification check:

```typescript
// Add to generateStatusScriptContent, in the bash script:

print_new_caravan_alert() {
  if [ -f /tmp/paydirt-new-caravans ]; then
    local new_caravans=$(cat /tmp/paydirt-new-caravans 2>/dev/null | tail -3)
    if [ -n "$new_caravans" ]; then
      echo ""
      echo -e "\${AMBER} ╔══════════════════════════════════════════════════════════════════════╗"
      echo -e " ║  ⚠ NEW CARAVAN(S) DETECTED - Press [q] then relaunch to see         ║"
      echo -e " ╠══════════════════════════════════════════════════════════════════════╣"
      while IFS= read -r line; do
        printf " ║  %-66s  ║\\n" "$line"
      done <<< "$new_caravans"
      echo -e " ╚══════════════════════════════════════════════════════════════════════╝\${FG}"
    fi
  fi
}
```

And call it in the main loop after `print_caravan_stats`.

**Step 2: Update stake command to write notification**

Modify `src/paydirt/cli/stake.ts` to write notification file:

```typescript
// After successful caravan creation, add:
async function notifyNewCaravan(claimId: string, task: string): Promise<void> {
  const notification = `${claimId}: ${task.substring(0, 50)}`;
  const file = '/tmp/paydirt-new-caravans';

  try {
    await Deno.writeTextFile(file, notification + '\n', { append: true });
  } catch {
    // Ignore write errors
  }
}
```

Call this in `stakeCommand` after successful session creation.

**Step 3: Commit**

```bash
git add src/paydirt/boomtown/mprocs.ts src/paydirt/cli/stake.ts
git commit -m "feat(boomtown): add new caravan notification in Control Room"
```

---

### Task 4.3: E2E test for full delegation flow

**Files:**
- Create: `tests/e2e/delegation-flow.test.ts`

**Step 1: Write the E2E test**

Create `tests/e2e/delegation-flow.test.ts`:

```typescript
// tests/e2e/delegation-flow.test.ts
/**
 * E2E test for the full delegation flow.
 * Tests: Trail Boss → SPAWN surveyor → tmux window created
 */

import { assertEquals, assertExists } from '@std/assert';

async function createTestClaim(title: string): Promise<string> {
  const cmd = new Deno.Command('bd', {
    args: ['create', '--title', title, '--type', 'task'],
    stdout: 'piped',
    stderr: 'piped',
  });

  const { stdout } = await cmd.output();
  const output = new TextDecoder().decode(stdout).trim();
  const match = output.match(/Created issue:\s*(\S+)/);
  return match ? match[1] : '';
}

async function closeClaim(claimId: string): Promise<void> {
  const cmd = new Deno.Command('bd', {
    args: ['close', claimId, '--reason', 'E2E test cleanup'],
    stdout: 'null',
    stderr: 'null',
  });
  await cmd.output();
}

async function cleanupTmuxSession(sessionName: string): Promise<void> {
  const cmd = new Deno.Command('tmux', {
    args: ['kill-session', '-t', sessionName],
    stdout: 'null',
    stderr: 'null',
  });
  await cmd.output();
}

async function createTmuxSession(sessionName: string, windowName: string): Promise<boolean> {
  const cmd = new Deno.Command('tmux', {
    args: ['new-session', '-d', '-s', sessionName, '-n', windowName],
    stdout: 'null',
    stderr: 'null',
  });
  return (await cmd.output()).success;
}

async function listTmuxWindows(sessionName: string): Promise<string[]> {
  const cmd = new Deno.Command('tmux', {
    args: ['list-windows', '-t', sessionName, '-F', '#{window_name}'],
    stdout: 'piped',
    stderr: 'null',
  });

  const { stdout, success } = await cmd.output();
  if (!success) return [];

  return new TextDecoder().decode(stdout).trim().split('\n').filter(Boolean);
}

Deno.test({
  name: 'E2E: prospect command adds window to existing caravan session',
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const claimId = await createTestClaim('E2E Delegation Test');
    const sessionName = `paydirt-${claimId}`;

    try {
      // Step 1: Create initial session (simulating Trail Boss)
      const created = await createTmuxSession(sessionName, 'trail-boss');
      assertEquals(created, true, 'Should create initial session');

      // Step 2: Spawn surveyor (simulating SPAWN command)
      const cmd = new Deno.Command('deno', {
        args: [
          'run', '--allow-all', 'paydirt.ts',
          'prospect', 'surveyor',
          '--claim', claimId,
          '--task', 'Design the system',
          '--background',
        ],
        stdout: 'piped',
        stderr: 'piped',
        cwd: Deno.cwd(),
      });

      const { success } = await cmd.output();
      assertEquals(success, true, 'Prospect command should succeed');

      // Step 3: Verify surveyor window exists
      const windows = await listTmuxWindows(sessionName);
      assertEquals(windows.length, 2, 'Should have 2 windows');
      assertEquals(windows.includes('surveyor'), true, 'Should have surveyor window');

      // Step 4: Spawn miner
      const cmd2 = new Deno.Command('deno', {
        args: [
          'run', '--allow-all', 'paydirt.ts',
          'prospect', 'miner',
          '--claim', claimId,
          '--task', 'Implement feature',
          '--background',
        ],
        stdout: 'piped',
        stderr: 'piped',
        cwd: Deno.cwd(),
      });

      await cmd2.output();

      // Step 5: Verify miner window exists
      const finalWindows = await listTmuxWindows(sessionName);
      assertEquals(finalWindows.length, 3, 'Should have 3 windows');
      assertEquals(finalWindows.includes('miner'), true, 'Should have miner window');

    } finally {
      await cleanupTmuxSession(sessionName);
      await closeClaim(claimId);
    }
  },
});
```

**Step 2: Run the test**

```bash
deno test tests/e2e/delegation-flow.test.ts --allow-all
```

Expected: PASS

**Step 3: Commit**

```bash
git add tests/e2e/delegation-flow.test.ts
git commit -m "test(e2e): add full delegation flow test"
```

---

## Final: Merge and Cleanup

### Task 5.1: Run all tests

```bash
deno test --allow-all
```

Expected: All tests pass (except the 4 known worktree path tests)

### Task 5.2: Merge to main

```bash
git checkout main
git merge feature/automation-boomtown --no-ff -m "feat: Phase 2 - Automation & Boomtown Integration"
git push
```

### Task 5.3: Cleanup worktree

```bash
git worktree remove .worktrees/automation-boomtown
git branch -d feature/automation-boomtown
```

---

## Summary

| Phase | Tasks | Tests |
|-------|-------|-------|
| 1. Hook Env Vars | 1.1, 1.2 | command.test.ts, env-vars.test.ts |
| 2. Hook Auto-Delegation | 2.1, 2.2, 2.3 | hook-dispatch.test.ts |
| 3. Camp Boss Integration | 3.1, 3.2 | existing boss tests |
| 4. Boomtown Visualization | 4.1, 4.2, 4.3 | delegation-flow.test.ts |
| 5. Merge | 5.1, 5.2, 5.3 | full test suite |

**Total: 11 tasks**
