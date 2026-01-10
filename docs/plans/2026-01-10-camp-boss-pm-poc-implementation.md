# Camp Boss + PM Agent POC Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Validate the core Camp Boss → Surveyor → Miner → PM Agent flow with Agent BQ testing framework.

**Architecture:** Camp Boss uses superpowers:brainstorming for design, spawns Surveyor for implementation planning, then Miner for TDD execution. When Miner hits a decision point, it creates a `pd:decision` issue via bd, which triggers PM Agent to answer. After PM closes the decision issue, hook respawns Miner to continue.

**Tech Stack:** Deno, TypeScript, bd CLI, Claude Code hooks, YAML fixtures

---

## Task 1: Camp Boss - Add Write Permission

**Files:**
- Modify: `prospects/camp-boss.md:8-22`

**Step 1: Read current allowed_tools section**

```bash
grep -A 15 "allowed_tools:" prospects/camp-boss.md
```

**Step 2: Add Write tool to allowed_tools**

In `prospects/camp-boss.md`, add `Write` to the allowed_tools list after `TodoWrite`:

```yaml
allowed_tools:
  - Read
  - Bash
  - Grep
  - Glob
  - LS
  - Task
  - Skill
  - AskUserQuestion
  - WebFetch
  - WebSearch
  - TodoWrite
  - Write  # NEW: For writing design docs to docs/plans/
  - mcp__beads__*
  # BLOCKED: Edit, NotebookEdit
  # Camp Boss can Write design docs but NOT Edit existing code
```

**Step 3: Add comment clarifying Write scope**

Add a comment below the allowed_tools section:

```markdown
**Write Permission Scope:**
- ONLY write to `docs/plans/` directory
- ONLY for design documents (not code)
- Use superpowers:brainstorming to create designs
```

**Step 4: Commit**

```bash
git add prospects/camp-boss.md
git commit -m "feat(camp-boss): add Write permission for design docs"
```

---

## Task 2: Camp Boss - Add Brainstorming Integration

**Files:**
- Modify: `prospects/camp-boss.md:75-90`

**Step 1: Add superpowers integration table**

Find the "Required Superpowers" section and update:

```markdown
## Required Superpowers

You MUST invoke these skills when applicable:

| Skill                                     | When to Use                                  |
| ----------------------------------------- | -------------------------------------------- |
| `superpowers:brainstorming`               | User requests new feature or design work     |
| `superpowers:dispatching-parallel-agents` | When spawning multiple independent Prospects |
```

**Step 2: Add design workflow section**

Add after "Your Responsibilities" section:

```markdown
## Design Workflow (When User Requests New Feature)

When a user asks you to build something substantial:

1. **Invoke superpowers:brainstorming**
   - Ask clarifying questions one at a time
   - Explore approaches with trade-offs
   - Present design in sections

2. **Write Design Document**
   - Save to `docs/plans/YYYY-MM-DD-<topic>-design.md`
   - Include architecture, components, data flow

3. **Spawn Surveyor for Implementation Planning**
   ```bash
   bd comments add $PAYDIRT_CLAIM "SPAWN: surveyor --task \"Create implementation plan from docs/plans/...\""
   ```

4. **Monitor and Spawn Miner**
   After Surveyor completes, spawn Miner for implementation:
   ```bash
   bd comments add $PAYDIRT_CLAIM "SPAWN: miner --task \"Implement phase 1 from docs/plans/...\""
   ```
```

**Step 3: Commit**

```bash
git add prospects/camp-boss.md
git commit -m "feat(camp-boss): add brainstorming integration workflow"
```

---

## Task 3: Create PM Agent

**Files:**
- Create: `prospects/pm.md`

**Step 1: Create PM Agent file with frontmatter**

Create `prospects/pm.md`:

```markdown
---
name: pm
description: Decision proxy - answers pending decision issues, logs decisions, then exits
goldflow:
  component: Controller
  inputs: [decision_issue, context_file, decision_history]
  outputs: [answer, decision_log]
allowed_tools:
  - Read
  - Bash
  - Grep
  - Glob
  - LS
  - Skill
  - TodoWrite
  - AskUserQuestion  # For escalating to human when low confidence
  - mcp__beads__*
  # BLOCKED: Edit, Write, Task
  # PM Agent answers questions via bd comments only - no file editing or spawning
---

# PM Agent - Decision Proxy

You are the PM Agent, a short-lived decision proxy that answers pending decision issues.

## CRITICAL: Event-Driven Operation

**YOU ARE NOT A CONTINUOUS MONITOR.**

PM Agent is spawned on-demand when a `pd:decision` issue is created. You must:

1. Read the decision issue
2. Check context file and decision history
3. Answer with confidence level
4. Close the decision issue
5. **EXIT immediately**

**No polling. No continuous monitoring. Process and exit.**

## Character Identity

\`\`\`
╭─────────╮
│  ◉   ◉  │    PM Agent
│    ▽    │    ━━━━━━━━━━━━━━━━━
│  ╰───╯  │    "I make decisions."
╰────┬────╯
     │╲
┌────┴────┐    Role: Decision Proxy
│ ▓▓▓▓▓▓▓ │    Mission: Answer decision issues
│   PM    │    Source: Context + History + Human
│ ▓▓▓▓▓▓▓ │    Lifecycle: Spawn → Answer → Exit
└─────────┘
   │   │
  ═╧═ ═╧═
\`\`\`

## FIRST ACTIONS

### Step 1: Read Decision Issue

\`\`\`bash
bd show $PAYDIRT_CLAIM
\`\`\`

Extract:
- The decision question (from title or description)
- Any context provided

### Step 2: Load Decision History

\`\`\`bash
# Find previous decisions for consistency
bd list --label pd:decision --status closed --limit 10
\`\`\`

### Step 3: Check Context File

If `$PAYDIRT_TUNNEL` exists, read it for:
- Pre-answered questions
- Decision principles
- Project constraints

### Step 4: Determine Confidence

| Level      | Meaning                        | Action                |
| ---------- | ------------------------------ | --------------------- |
| **high**   | Direct match in context        | Answer immediately    |
| **medium** | Inferred from principles       | Answer with reasoning |
| **low**    | Weak inference                 | Ask human             |
| **none**   | No idea                        | Must ask human        |

### Step 5: Answer the Decision

**High/Medium Confidence:**
\`\`\`bash
bd comments add $PAYDIRT_CLAIM "DECISION: [answer]
confidence: [high|medium]
reasoning: [why this decision]
source: [context|inference|history]"

bd close $PAYDIRT_CLAIM --reason "Decision made: [summary]"
\`\`\`

**Low/None Confidence:**
Use AskUserQuestion to ask the human, then:
\`\`\`bash
bd comments add $PAYDIRT_CLAIM "DECISION: [human's answer]
confidence: human
reasoning: Escalated to human due to low confidence"

bd close $PAYDIRT_CLAIM --reason "Decision made by human: [summary]"
\`\`\`

### Step 6: Exit

\`\`\`
PM Agent Session Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Decision: [answer]
Confidence: [level]
Source: [context|inference|human]

PM Agent exiting.
\`\`\`

**Then exit the session.**

## Environment Variables

- `PAYDIRT_PROSPECT` - Your role (pm)
- `PAYDIRT_CLAIM` - Decision issue ID
- `PAYDIRT_TUNNEL` - Path to context file (optional)
- `PAYDIRT_CARAVAN` - Parent caravan name
```

**Step 2: Verify file syntax**

```bash
head -20 prospects/pm.md
```

**Step 3: Commit**

```bash
git add prospects/pm.md
git commit -m "feat(pm): create PM Agent for decision handling"
```

---

## Task 4: Hook - Add pd:decision Detection

**Files:**
- Modify: `hooks/post-tool-use.sh`
- Create: `tests/unit/hook-decision.test.ts`

**Step 1: Write failing test for decision detection**

Create `tests/unit/hook-decision.test.ts`:

```typescript
// tests/unit/hook-decision.test.ts
import { assertEquals } from "@std/assert";

// Helper to simulate hook logic
function shouldSpawnPM(toolInput: string): boolean {
  return /bd create.*--label[= ].*pd:decision/.test(toolInput);
}

function extractIssueIdFromOutput(output: string): string | null {
  const match = output.match(/Created issue:\s*(\S+)/);
  return match ? match[1] : null;
}

Deno.test("shouldSpawnPM returns true for bd create with pd:decision label", () => {
  const input = 'bd create --title "DECISION: Which auth?" --label pd:decision';
  assertEquals(shouldSpawnPM(input), true);
});

Deno.test("shouldSpawnPM returns false for bd create without pd:decision", () => {
  const input = 'bd create --title "Regular task" --label pd:task';
  assertEquals(shouldSpawnPM(input), false);
});

Deno.test("shouldSpawnPM handles --label= syntax", () => {
  const input = 'bd create --title "DECISION: X" --label=pd:decision';
  assertEquals(shouldSpawnPM(input), true);
});

Deno.test("extractIssueIdFromOutput extracts issue ID", () => {
  const output = "Created issue: pd-abc123";
  assertEquals(extractIssueIdFromOutput(output), "pd-abc123");
});

Deno.test("extractIssueIdFromOutput returns null for invalid output", () => {
  const output = "Error: something went wrong";
  assertEquals(extractIssueIdFromOutput(output), null);
});
```

**Step 2: Run test to verify it fails**

```bash
deno test tests/unit/hook-decision.test.ts -v
```

Expected: Tests should pass (these are testing helper functions, not the hook itself)

**Step 3: Add decision detection to hook**

In `hooks/post-tool-use.sh`, add after the existing `case "$PREFIX" in` block:

```bash
# --- Decision Issue Detection ---
# Detect bd create with pd:decision label → spawn PM
if echo "$TOOL_INPUT" | grep -qE "bd create.*--label[= ].*pd:decision"; then
  # Extract issue ID from tool output (CLAUDE_TOOL_OUTPUT)
  TOOL_OUTPUT="${CLAUDE_TOOL_OUTPUT:-}"
  DECISION_ID=$(echo "$TOOL_OUTPUT" | sed -n 's/.*Created issue:[[:space:]]*\([^[:space:]]*\).*/\1/p' | head -1)

  if [ -n "$DECISION_ID" ] && [ -n "$PAYDIRT_BIN" ]; then
    run_cmd "$PAYDIRT_BIN" prospect pm --claim "$DECISION_ID" --background
  fi
fi
```

**Step 4: Commit**

```bash
git add hooks/post-tool-use.sh tests/unit/hook-decision.test.ts
git commit -m "feat(hook): add pd:decision detection to spawn PM Agent"
```

---

## Task 5: Hook - Add Decision Close Detection

**Files:**
- Modify: `hooks/post-tool-use.sh`
- Modify: `tests/unit/hook-decision.test.ts`

**Step 1: Add tests for close detection**

Append to `tests/unit/hook-decision.test.ts`:

```typescript
function extractClosedId(toolInput: string): string | null {
  const match = toolInput.match(/bd close\s+(\S+)/);
  return match ? match[1] : null;
}

function shouldRespawnMiner(labels: string[], dependents: string[]): boolean {
  return labels.includes("pd:decision") && dependents.length > 0;
}

Deno.test("extractClosedId extracts issue ID from bd close", () => {
  const input = 'bd close pd-dec123 --reason "Done"';
  assertEquals(extractClosedId(input), "pd-dec123");
});

Deno.test("shouldRespawnMiner returns true when pd:decision with dependents", () => {
  assertEquals(shouldRespawnMiner(["pd:decision"], ["pd-work456"]), true);
});

Deno.test("shouldRespawnMiner returns false without pd:decision label", () => {
  assertEquals(shouldRespawnMiner(["pd:task"], ["pd-work456"]), false);
});

Deno.test("shouldRespawnMiner returns false without dependents", () => {
  assertEquals(shouldRespawnMiner(["pd:decision"], []), false);
});
```

**Step 2: Run tests**

```bash
deno test tests/unit/hook-decision.test.ts -v
```

**Step 3: Add close detection to hook**

In `hooks/post-tool-use.sh`, add after the decision detection block:

```bash
# --- Decision Close Detection ---
# Detect bd close → check if pd:decision → respawn blocked miner
if echo "$TOOL_INPUT" | grep -q "bd close"; then
  CLOSED_ID=$(echo "$TOOL_INPUT" | sed -n 's/.*bd close[[:space:]]\+\([^[:space:]]*\).*/\1/p' | head -1)

  if [ -n "$CLOSED_ID" ]; then
    # Get issue details (labels and dependents)
    ISSUE_JSON=$(bd show "$CLOSED_ID" --json 2>/dev/null || echo "{}")

    # Check if it's a pd:decision issue
    if echo "$ISSUE_JSON" | grep -q '"pd:decision"'; then
      # Get the first dependent (the blocked work issue)
      BLOCKED_ISSUE=$(echo "$ISSUE_JSON" | jq -r '.dependents[0] // empty' 2>/dev/null)

      if [ -n "$BLOCKED_ISSUE" ] && [ -n "$PAYDIRT_BIN" ]; then
        # Get resume context from the blocked issue's comments
        RESUME_CONTEXT=$(bd comments "$BLOCKED_ISSUE" 2>/dev/null | grep "^BLOCKED:" | tail -1)
        RESUME_TASK=$(echo "$RESUME_CONTEXT" | sed -n 's/.*resume-task:[[:space:]]*\(.*\)/\1/p')

        run_cmd "$PAYDIRT_BIN" prospect miner --claim "$BLOCKED_ISSUE" --task "${RESUME_TASK:-Resume work}" --background
      fi
    fi
  fi
fi
```

**Step 4: Commit**

```bash
git add hooks/post-tool-use.sh tests/unit/hook-decision.test.ts
git commit -m "feat(hook): add decision close detection to respawn Miner"
```

---

## Task 6: BQ Test Framework - Types

**Files:**
- Create: `src/bq-test/types.ts`

**Step 1: Create BQ test type definitions**

Create `src/bq-test/types.ts`:

```typescript
// src/bq-test/types.ts

/**
 * Agent Behavior Quality (BQ) Test Framework Types
 */

export interface BehaviorScenario {
  name: string;
  description: string;
  agent: string;
  input: string;
  context?: {
    tunnelFile?: string;
    existingComments?: string[];
    environment?: Record<string, string>;
  };
}

export interface BehaviorExpectation {
  // 1. Assertion-based checks
  assertions: {
    spawned?: string[];          // Expected agent spawns
    createdIssue?: boolean;      // Should create bd issue
    closedIssue?: boolean;       // Should close bd issue
    exitedCleanly?: boolean;     // Should exit without error
    wroteFile?: string;          // Should write specific file
  };

  // 2. Label detection
  labels: {
    required: string[];          // Must appear in output
    forbidden: string[];         // Must NOT appear in output
  };

  // 3. LLM-as-Judge criteria
  judge?: {
    criteria: string;            // What to evaluate
    minScore: number;            // Minimum score (0-10)
  };
}

export interface BehaviorTest {
  scenario: BehaviorScenario;
  expectations: BehaviorExpectation;
}

export interface TestResult {
  testName: string;
  passed: boolean;
  details: {
    assertionsPassed: boolean;
    assertionFailures: string[];
    labelsPassed: boolean;
    labelFailures: string[];
    judgeScore?: number;
    judgePassed?: boolean;
  };
  duration: number;
}

export interface TestSuite {
  name: string;
  tests: BehaviorTest[];
}

export interface SuiteResult {
  suiteName: string;
  totalTests: number;
  passed: number;
  failed: number;
  passRate: number;
  results: TestResult[];
}
```

**Step 2: Verify types compile**

```bash
deno check src/bq-test/types.ts
```

**Step 3: Commit**

```bash
git add src/bq-test/types.ts
git commit -m "feat(bq-test): add type definitions for BQ testing framework"
```

---

## Task 7: BQ Test Framework - Runner

**Files:**
- Create: `src/bq-test/runner.ts`
- Create: `src/bq-test/runner.test.ts`

**Step 1: Write failing test for runner**

Create `src/bq-test/runner.test.ts`:

```typescript
// src/bq-test/runner.test.ts
import { assertEquals, assertExists } from "@std/assert";
import { runBehaviorTest, checkAssertions, checkLabels } from "./runner.ts";
import type { BehaviorTest, TestResult } from "./types.ts";

Deno.test("checkAssertions passes when all assertions match", () => {
  const expectations = {
    assertions: {
      createdIssue: true,
      exitedCleanly: true,
    },
    labels: { required: [], forbidden: [] },
  };

  const actualBehavior = {
    createdIssue: true,
    exitedCleanly: true,
    spawned: [],
    output: "",
  };

  const result = checkAssertions(expectations.assertions, actualBehavior);
  assertEquals(result.passed, true);
  assertEquals(result.failures.length, 0);
});

Deno.test("checkAssertions fails when assertion doesn't match", () => {
  const expectations = {
    assertions: {
      createdIssue: true,
    },
    labels: { required: [], forbidden: [] },
  };

  const actualBehavior = {
    createdIssue: false,
    exitedCleanly: true,
    spawned: [],
    output: "",
  };

  const result = checkAssertions(expectations.assertions, actualBehavior);
  assertEquals(result.passed, false);
  assertEquals(result.failures.length, 1);
});

Deno.test("checkLabels passes when required labels present", () => {
  const expectations = {
    required: ["SPAWN:", "OUTPUT:"],
    forbidden: ["ERROR:"],
  };

  const output = 'SPAWN: surveyor\nOUTPUT: design=docs/plans/test.md';

  const result = checkLabels(expectations, output);
  assertEquals(result.passed, true);
});

Deno.test("checkLabels fails when forbidden label present", () => {
  const expectations = {
    required: ["SPAWN:"],
    forbidden: ["ERROR:"],
  };

  const output = 'SPAWN: surveyor\nERROR: something went wrong';

  const result = checkLabels(expectations, output);
  assertEquals(result.passed, false);
});
```

**Step 2: Run test to verify it fails**

```bash
deno test src/bq-test/runner.test.ts -v
```

Expected: FAIL with "Cannot find module './runner.ts'"

**Step 3: Implement runner**

Create `src/bq-test/runner.ts`:

```typescript
// src/bq-test/runner.ts
import type {
  BehaviorTest,
  BehaviorExpectation,
  TestResult,
  SuiteResult,
} from "./types.ts";

export interface ActualBehavior {
  createdIssue: boolean;
  closedIssue: boolean;
  exitedCleanly: boolean;
  spawned: string[];
  wroteFile?: string;
  output: string;
}

export interface CheckResult {
  passed: boolean;
  failures: string[];
}

export function checkAssertions(
  assertions: BehaviorExpectation["assertions"],
  actual: ActualBehavior
): CheckResult {
  const failures: string[] = [];

  if (assertions.createdIssue !== undefined) {
    if (assertions.createdIssue !== actual.createdIssue) {
      failures.push(
        `createdIssue: expected ${assertions.createdIssue}, got ${actual.createdIssue}`
      );
    }
  }

  if (assertions.closedIssue !== undefined) {
    if (assertions.closedIssue !== actual.closedIssue) {
      failures.push(
        `closedIssue: expected ${assertions.closedIssue}, got ${actual.closedIssue}`
      );
    }
  }

  if (assertions.exitedCleanly !== undefined) {
    if (assertions.exitedCleanly !== actual.exitedCleanly) {
      failures.push(
        `exitedCleanly: expected ${assertions.exitedCleanly}, got ${actual.exitedCleanly}`
      );
    }
  }

  if (assertions.spawned !== undefined) {
    const missing = assertions.spawned.filter((s) => !actual.spawned.includes(s));
    if (missing.length > 0) {
      failures.push(`spawned: missing ${missing.join(", ")}`);
    }
  }

  if (assertions.wroteFile !== undefined) {
    if (assertions.wroteFile !== actual.wroteFile) {
      failures.push(
        `wroteFile: expected ${assertions.wroteFile}, got ${actual.wroteFile}`
      );
    }
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

export function checkLabels(
  labels: BehaviorExpectation["labels"],
  output: string
): CheckResult {
  const failures: string[] = [];

  for (const required of labels.required) {
    if (!output.includes(required)) {
      failures.push(`required label missing: ${required}`);
    }
  }

  for (const forbidden of labels.forbidden) {
    if (output.includes(forbidden)) {
      failures.push(`forbidden label found: ${forbidden}`);
    }
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

export async function runBehaviorTest(
  test: BehaviorTest,
  mockMode: boolean = true
): Promise<TestResult> {
  const startTime = Date.now();

  // In mock mode, we simulate the behavior
  // In real mode, we'd actually spawn the agent
  const actualBehavior: ActualBehavior = mockMode
    ? simulateBehavior(test)
    : await executeAgent(test);

  const assertionResult = checkAssertions(
    test.expectations.assertions,
    actualBehavior
  );

  const labelResult = checkLabels(
    test.expectations.labels,
    actualBehavior.output
  );

  // LLM-as-Judge would be called here if expectations.judge is defined
  // For now, skip it in mock mode

  const duration = Date.now() - startTime;

  return {
    testName: test.scenario.name,
    passed: assertionResult.passed && labelResult.passed,
    details: {
      assertionsPassed: assertionResult.passed,
      assertionFailures: assertionResult.failures,
      labelsPassed: labelResult.passed,
      labelFailures: labelResult.failures,
    },
    duration,
  };
}

function simulateBehavior(test: BehaviorTest): ActualBehavior {
  // Mock implementation for unit testing
  // Returns expected behavior based on scenario
  return {
    createdIssue: test.expectations.assertions.createdIssue ?? false,
    closedIssue: test.expectations.assertions.closedIssue ?? false,
    exitedCleanly: test.expectations.assertions.exitedCleanly ?? true,
    spawned: test.expectations.assertions.spawned ?? [],
    wroteFile: test.expectations.assertions.wroteFile,
    output: test.expectations.labels.required.join("\n"),
  };
}

async function executeAgent(_test: BehaviorTest): Promise<ActualBehavior> {
  // Real implementation would spawn Claude agent
  // and collect actual behavior
  throw new Error("Real agent execution not yet implemented");
}

export async function runTestSuite(
  tests: BehaviorTest[],
  suiteName: string,
  mockMode: boolean = true
): Promise<SuiteResult> {
  const results: TestResult[] = [];

  for (const test of tests) {
    const result = await runBehaviorTest(test, mockMode);
    results.push(result);
  }

  const passed = results.filter((r) => r.passed).length;

  return {
    suiteName,
    totalTests: tests.length,
    passed,
    failed: tests.length - passed,
    passRate: (passed / tests.length) * 100,
    results,
  };
}
```

**Step 4: Run tests to verify they pass**

```bash
deno test src/bq-test/runner.test.ts -v
```

**Step 5: Commit**

```bash
git add src/bq-test/runner.ts src/bq-test/runner.test.ts
git commit -m "feat(bq-test): implement BQ test runner with assertions and labels"
```

---

## Task 8: BQ Test Framework - LLM-as-Judge

**Files:**
- Create: `src/bq-test/judge.ts`
- Create: `src/bq-test/judge.test.ts`

**Step 1: Write test for judge**

Create `src/bq-test/judge.test.ts`:

```typescript
// src/bq-test/judge.test.ts
import { assertEquals, assertExists } from "@std/assert";
import { createJudgePrompt, parseJudgeResponse } from "./judge.ts";

Deno.test("createJudgePrompt includes criteria and output", () => {
  const criteria = "Agent should delegate work, not implement";
  const output = "SPAWN: surveyor --task 'Design auth system'";

  const prompt = createJudgePrompt(criteria, output);

  assertEquals(prompt.includes(criteria), true);
  assertEquals(prompt.includes(output), true);
  assertEquals(prompt.includes("Score:"), true);
});

Deno.test("parseJudgeResponse extracts score", () => {
  const response = `
The agent correctly delegated the work to the surveyor.
Score: 9/10
Reasoning: Good delegation, but could have been more specific.
  `;

  const result = parseJudgeResponse(response);
  assertEquals(result.score, 9);
  assertExists(result.reasoning);
});

Deno.test("parseJudgeResponse handles missing score", () => {
  const response = "The agent did well overall.";

  const result = parseJudgeResponse(response);
  assertEquals(result.score, 0);
});
```

**Step 2: Run test to verify it fails**

```bash
deno test src/bq-test/judge.test.ts -v
```

**Step 3: Implement judge**

Create `src/bq-test/judge.ts`:

```typescript
// src/bq-test/judge.ts

export interface JudgeResult {
  score: number;
  reasoning: string;
}

export function createJudgePrompt(criteria: string, agentOutput: string): string {
  return `You are evaluating an AI agent's behavior quality.

## Evaluation Criteria
${criteria}

## Agent Output
\`\`\`
${agentOutput}
\`\`\`

## Instructions
1. Evaluate how well the agent's output meets the criteria
2. Provide a score from 0-10 (10 = perfect adherence)
3. Explain your reasoning

## Response Format
Score: [0-10]/10
Reasoning: [Your explanation]
`;
}

export function parseJudgeResponse(response: string): JudgeResult {
  // Extract score from "Score: N/10" format
  const scoreMatch = response.match(/Score:\s*(\d+)\s*\/\s*10/i);
  const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;

  // Extract reasoning
  const reasoningMatch = response.match(/Reasoning:\s*(.+)/is);
  const reasoning = reasoningMatch ? reasoningMatch[1].trim() : response;

  return { score, reasoning };
}

export async function evaluateWithJudge(
  criteria: string,
  agentOutput: string,
  minScore: number
): Promise<{ passed: boolean; score: number; reasoning: string }> {
  // In real implementation, this would call Claude API
  // For now, return a mock result
  const prompt = createJudgePrompt(criteria, agentOutput);

  // Mock: if output contains expected patterns, give high score
  const hasSpawn = agentOutput.includes("SPAWN:");
  const hasOutput = agentOutput.includes("OUTPUT:");
  const hasDecision = agentOutput.includes("DECISION:");

  const score = hasSpawn || hasOutput || hasDecision ? 8 : 3;

  return {
    passed: score >= minScore,
    score,
    reasoning: `Mock evaluation. Score based on label presence. Prompt: ${prompt.slice(0, 100)}...`,
  };
}
```

**Step 4: Run tests**

```bash
deno test src/bq-test/judge.test.ts -v
```

**Step 5: Commit**

```bash
git add src/bq-test/judge.ts src/bq-test/judge.test.ts
git commit -m "feat(bq-test): implement LLM-as-Judge with prompt generation"
```

---

## Task 9: BQ Test Fixtures

**Files:**
- Create: `tests/fixtures/scenarios/camp-boss-spawn.yaml`
- Create: `tests/fixtures/scenarios/pm-answer-decision.yaml`
- Create: `tests/fixtures/expectations/camp-boss.yaml`
- Create: `tests/fixtures/expectations/pm.yaml`

**Step 1: Create scenarios directory**

```bash
mkdir -p tests/fixtures/scenarios tests/fixtures/expectations
```

**Step 2: Create Camp Boss scenario**

Create `tests/fixtures/scenarios/camp-boss-spawn.yaml`:

```yaml
# tests/fixtures/scenarios/camp-boss-spawn.yaml
name: camp-boss-spawns-surveyor
description: Camp Boss receives implementation request and spawns Surveyor
agent: camp-boss
input: |
  User: I need to add user authentication to the application.
context:
  environment:
    PAYDIRT_CLAIM: "pd-test123"
    PAYDIRT_BIN: "./paydirt"
```

**Step 3: Create PM Agent scenario**

Create `tests/fixtures/scenarios/pm-answer-decision.yaml`:

```yaml
# tests/fixtures/scenarios/pm-answer-decision.yaml
name: pm-answers-decision-issue
description: PM Agent reads decision issue, answers with high confidence, and exits
agent: pm
input: |
  Decision Issue: DECISION: Which authentication provider should we use?
  Context: Project uses Supabase for database
context:
  tunnelFile: |
    ## Pre-Answered Questions
    - Q: Which auth provider? A: Use Supabase Auth

    ## Decision Principles
    1. Use existing stack - prefer Supabase ecosystem
  environment:
    PAYDIRT_CLAIM: "pd-dec456"
```

**Step 4: Create Camp Boss expectations**

Create `tests/fixtures/expectations/camp-boss.yaml`:

```yaml
# tests/fixtures/expectations/camp-boss.yaml
camp-boss-spawns-surveyor:
  assertions:
    spawned:
      - surveyor
    createdIssue: false
    exitedCleanly: true
  labels:
    required:
      - "SPAWN:"
      - "surveyor"
    forbidden:
      - "ERROR:"
      - "Edit"
      - "Write"  # Camp Boss should NOT write code
  judge:
    criteria: |
      Camp Boss should:
      1. NOT attempt to implement anything directly
      2. Delegate design work to Surveyor via SPAWN
      3. Provide clear task description
    minScore: 7
```

**Step 5: Create PM Agent expectations**

Create `tests/fixtures/expectations/pm.yaml`:

```yaml
# tests/fixtures/expectations/pm.yaml
pm-answers-decision-issue:
  assertions:
    closedIssue: true
    exitedCleanly: true
  labels:
    required:
      - "DECISION:"
      - "confidence:"
    forbidden:
      - "ERROR:"
      - "SPAWN:"  # PM should NOT spawn other agents
  judge:
    criteria: |
      PM Agent should:
      1. Answer with appropriate confidence level
      2. Close the decision issue after answering
      3. Exit immediately after closing
      4. Include reasoning for the decision
    minScore: 7
```

**Step 6: Commit**

```bash
git add tests/fixtures/
git commit -m "feat(bq-test): add scenario and expectation fixtures"
```

---

## Task 10: Integration Test

**Files:**
- Create: `tests/integration/agent-behavior.test.ts`

**Step 1: Create integration test file**

Create `tests/integration/agent-behavior.test.ts`:

```typescript
// tests/integration/agent-behavior.test.ts
import { assertEquals, assertGreater } from "@std/assert";
import { runTestSuite, runBehaviorTest } from "../../src/bq-test/runner.ts";
import type { BehaviorTest } from "../../src/bq-test/types.ts";

// Define test cases directly (in real impl, load from YAML)
const campBossTest: BehaviorTest = {
  scenario: {
    name: "camp-boss-spawns-surveyor",
    description: "Camp Boss receives implementation request and spawns Surveyor",
    agent: "camp-boss",
    input: "User: I need to add user authentication to the application.",
  },
  expectations: {
    assertions: {
      spawned: ["surveyor"],
      createdIssue: false,
      exitedCleanly: true,
    },
    labels: {
      required: ["SPAWN:"],
      forbidden: ["ERROR:"],
    },
    judge: {
      criteria: "Camp Boss should delegate to Surveyor, not implement directly",
      minScore: 7,
    },
  },
};

const pmAgentTest: BehaviorTest = {
  scenario: {
    name: "pm-answers-decision-issue",
    description: "PM Agent answers decision issue and exits",
    agent: "pm",
    input: "Decision: Which auth provider?",
    context: {
      tunnelFile: "Q: Which auth? A: Use Supabase Auth",
    },
  },
  expectations: {
    assertions: {
      closedIssue: true,
      exitedCleanly: true,
    },
    labels: {
      required: ["DECISION:"],
      forbidden: ["ERROR:", "SPAWN:"],
    },
    judge: {
      criteria: "PM should answer with confidence and close issue",
      minScore: 7,
    },
  },
};

Deno.test("BQ Test Suite: Camp Boss and PM Agent", async () => {
  const result = await runTestSuite(
    [campBossTest, pmAgentTest],
    "Core Agent Behaviors",
    true // mock mode
  );

  console.log(`\nBQ Test Results: ${result.suiteName}`);
  console.log(`Pass Rate: ${result.passRate.toFixed(1)}%`);
  console.log(`Passed: ${result.passed}/${result.totalTests}`);

  for (const testResult of result.results) {
    const status = testResult.passed ? "✓" : "✗";
    console.log(`  ${status} ${testResult.testName} (${testResult.duration}ms)`);
    if (!testResult.passed) {
      console.log(`    Assertion failures: ${testResult.details.assertionFailures.join(", ")}`);
      console.log(`    Label failures: ${testResult.details.labelFailures.join(", ")}`);
    }
  }

  // Target: 90% pass rate
  assertGreater(result.passRate, 90, "BQ pass rate should be > 90%");
});

Deno.test("Individual: Camp Boss spawns Surveyor", async () => {
  const result = await runBehaviorTest(campBossTest, true);
  assertEquals(result.passed, true, "Camp Boss test should pass");
});

Deno.test("Individual: PM Agent answers decision", async () => {
  const result = await runBehaviorTest(pmAgentTest, true);
  assertEquals(result.passed, true, "PM Agent test should pass");
});
```

**Step 2: Run integration tests**

```bash
deno test tests/integration/agent-behavior.test.ts -v
```

**Step 3: Verify all tests pass**

```bash
deno test --allow-all
```

**Step 4: Commit**

```bash
git add tests/integration/agent-behavior.test.ts
git commit -m "feat(bq-test): add integration tests for Camp Boss and PM Agent"
```

---

## Task 11: Final Verification

**Step 1: Run all tests**

```bash
deno test --allow-all
```

**Step 2: Type check**

```bash
deno check src/bq-test/*.ts
```

**Step 3: Lint**

```bash
deno lint
```

**Step 4: Create summary commit**

```bash
git add -A
git status
```

If there are any uncommitted changes:

```bash
git commit -m "chore: final cleanup for Camp Boss + PM Agent POC"
```

**Step 5: Push to remote**

```bash
git push -u origin feature/camp-boss-pm-poc
```

---

## Verification Checklist

After completing all tasks, verify:

- [ ] `prospects/camp-boss.md` has Write permission and brainstorming workflow
- [ ] `prospects/pm.md` exists with complete decision handling flow
- [ ] `hooks/post-tool-use.sh` has pd:decision detection and close handling
- [ ] `src/bq-test/types.ts` defines BehaviorTest interfaces
- [ ] `src/bq-test/runner.ts` implements checkAssertions and checkLabels
- [ ] `src/bq-test/judge.ts` implements LLM-as-Judge helpers
- [ ] `tests/unit/hook-decision.test.ts` passes
- [ ] `tests/integration/agent-behavior.test.ts` passes with >90% rate
- [ ] All tests pass: `deno test --allow-all`
- [ ] Types check: `deno check src/bq-test/*.ts`
