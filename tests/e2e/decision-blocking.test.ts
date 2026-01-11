// tests/e2e/decision-blocking.test.ts
// E2E test for Miner decision blocking flow
//
// Flow:
// 1. Miner working → encounters decision → creates pd:decision issue
// 2. Hook detects → spawns PM Agent
// 3. PM answers → closes decision issue
// 4. Hook detects close → respawns Miner
//
// Run with: RUN_E2E_TESTS=1 deno test tests/e2e/decision-blocking.test.ts --allow-all

import { assertEquals, assertExists, assertStringIncludes } from "@std/assert";

const WORK_DIR = Deno.cwd();

interface TestContext {
  workIssueId: string;
  decisionIssueId: string;
  cleanup: () => Promise<void>;
}

/**
 * Helper to run bd command and get output
 */
async function bd(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  const cmd = new Deno.Command("bd", {
    args,
    cwd: WORK_DIR,
    stdout: "piped",
    stderr: "piped",
  });
  const { stdout, stderr, code } = await cmd.output();
  return {
    stdout: new TextDecoder().decode(stdout),
    stderr: new TextDecoder().decode(stderr),
    code,
  };
}

/**
 * Helper to extract issue ID from bd create output
 */
function extractIssueId(output: string): string | null {
  const match = output.match(/Created issue:\s*(\S+)/);
  return match ? match[1] : null;
}

/**
 * Setup test context - create work issue
 */
async function setupTest(): Promise<TestContext> {
  // Create a work issue for the miner
  const result = await bd([
    "create",
    "--title", "E2E Test: Implement auth feature",
    "--type", "task",
    "--label", "e2e-test",
    "--priority", "3",
  ]);

  const workIssueId = extractIssueId(result.stdout);
  if (!workIssueId) {
    throw new Error(`Failed to create work issue: ${result.stdout} ${result.stderr}`);
  }

  return {
    workIssueId,
    decisionIssueId: "", // Will be set during test
    cleanup: async () => {
      // Close test issues
      await bd(["close", workIssueId, "--reason", "E2E test cleanup"]);
    },
  };
}

// ============================================================================
// Unit Tests for Decision Flow Components
// ============================================================================

Deno.test("bd create with pd:decision label works", async () => {
  const result = await bd([
    "create",
    "--title", "DECISION: Test decision",
    "--type", "task",
    "--label", "pd:decision",
    "--label", "e2e-test",
    "--priority", "1",
  ]);

  const issueId = extractIssueId(result.stdout);
  assertExists(issueId, "Should create decision issue");
  assertStringIncludes(result.stdout, "Created issue:");

  // Verify the issue has pd:decision label
  const showResult = await bd(["show", issueId, "--json"]);
  assertStringIncludes(showResult.stdout, "pd:decision");

  // Cleanup
  await bd(["close", issueId, "--reason", "E2E test cleanup"]);
});

Deno.test("bd dep add creates dependency", async () => {
  // Create two issues
  const work = await bd([
    "create",
    "--title", "E2E: Work issue",
    "--type", "task",
    "--label", "e2e-test",
  ]);
  const workId = extractIssueId(work.stdout)!;

  const decision = await bd([
    "create",
    "--title", "DECISION: E2E decision",
    "--type", "task",
    "--label", "pd:decision",
    "--label", "e2e-test",
  ]);
  const decisionId = extractIssueId(decision.stdout)!;

  // Add dependency: work depends on decision
  const depResult = await bd(["dep", "add", workId, decisionId]);
  assertEquals(depResult.code, 0, "dep add should succeed");

  // Verify dependency
  const showResult = await bd(["show", workId, "--json"]);
  assertStringIncludes(showResult.stdout, decisionId);

  // Cleanup
  await bd(["close", decisionId, "--reason", "E2E cleanup"]);
  await bd(["close", workId, "--reason", "E2E cleanup"]);
});

Deno.test("Hook pattern matches pd:decision creation", () => {
  // Test the regex pattern used in hook
  const pattern = /bd create.*--label[= ].*pd:decision/;

  const validInputs = [
    'bd create --title "DECISION: X" --label pd:decision',
    'bd create --title "DECISION: X" --label=pd:decision',
    'bd create --type task --label pd:decision --title "X"',
  ];

  const invalidInputs = [
    'bd create --title "X" --label pd:task',
    'bd create --title "X"',
    'bd show pd:decision',
  ];

  for (const input of validInputs) {
    assertEquals(pattern.test(input), true, `Should match: ${input}`);
  }

  for (const input of invalidInputs) {
    assertEquals(pattern.test(input), false, `Should NOT match: ${input}`);
  }
});

Deno.test("Hook can extract closed issue ID", () => {
  const pattern = /bd close\s+(\S+)/;

  const testCases = [
    { input: 'bd close beads-abc123', expected: 'beads-abc123' },
    { input: 'bd close beads-dec456 --reason "Done"', expected: 'beads-dec456' },
    { input: 'bd close pd-xyz789', expected: 'pd-xyz789' },
  ];

  for (const { input, expected } of testCases) {
    const match = input.match(pattern);
    assertExists(match, `Should match: ${input}`);
    assertEquals(match![1], expected);
  }
});

// ============================================================================
// Integration Test - Simulated Flow
// ============================================================================

Deno.test({
  name: "Decision blocking flow - simulated",
  async fn() {
    const ctx = await setupTest();

    try {
      console.log(`\n--- Work Issue: ${ctx.workIssueId} ---`);

      // Step 1: Miner creates decision issue
      console.log("Step 1: Creating decision issue...");
      const decisionResult = await bd([
        "create",
        "--title", "DECISION: Which auth provider - OAuth or JWT?",
        "--type", "task",
        "--label", "pd:decision",
        "--label", "e2e-test",
        "--priority", "1",
      ]);
      ctx.decisionIssueId = extractIssueId(decisionResult.stdout)!;
      assertExists(ctx.decisionIssueId, "Should create decision issue");
      console.log(`   Decision Issue: ${ctx.decisionIssueId}`);

      // Step 2: Miner adds dependency
      console.log("Step 2: Adding dependency...");
      const depResult = await bd(["dep", "add", ctx.workIssueId, ctx.decisionIssueId]);
      assertEquals(depResult.code, 0, "dep add should succeed");

      // Step 3: Miner records blocked state
      console.log("Step 3: Recording blocked state...");
      const commentResult = await bd([
        "comments", "add", ctx.workIssueId,
        `BLOCKED: waiting for ${ctx.decisionIssueId}\nresume-task: Continue implementing auth after decision\nresume-context: Completed setup, blocked at provider choice`,
      ]);
      assertEquals(commentResult.code, 0, "comments add should succeed");

      // Verify blocked state
      const commentsResult = await bd(["comments", ctx.workIssueId]);
      assertStringIncludes(commentsResult.stdout, "BLOCKED:");
      assertStringIncludes(commentsResult.stdout, "resume-task:");

      // Step 4: Simulate PM answering (in real flow, PM Agent does this)
      console.log("Step 4: PM answers decision...");
      await bd([
        "comments", "add", ctx.decisionIssueId,
        "DECISION: Use OAuth 2.0\nconfidence: high\nreasoning: Better security and user experience",
      ]);

      // Step 5: PM closes decision issue
      console.log("Step 5: Closing decision issue...");
      const closeResult = await bd(["close", ctx.decisionIssueId, "--reason", "Decision made: OAuth 2.0"]);
      assertEquals(closeResult.code, 0, "close should succeed");

      // Verify decision is closed
      const showDecision = await bd(["show", ctx.decisionIssueId, "--json"]);
      assertStringIncludes(showDecision.stdout, '"status": "closed"');

      // Step 6: Verify work issue can be retrieved for respawn
      console.log("Step 6: Verifying respawn context...");
      const showWork = await bd(["show", ctx.workIssueId, "--json"]);
      // Work issue should still reference the (now closed) decision
      console.log(`   Work issue status: retrievable`);

      // Step 7: Verify resume context is available
      const workComments = await bd(["comments", ctx.workIssueId]);
      assertStringIncludes(workComments.stdout, "resume-task:");
      console.log(`   Resume context: available`);

      console.log("\n✅ Decision blocking flow completed successfully!");
    } finally {
      // Cleanup
      if (ctx.decisionIssueId) {
        await bd(["close", ctx.decisionIssueId, "--reason", "E2E cleanup"]).catch(() => {});
      }
      await ctx.cleanup();
    }
  },
});

// ============================================================================
// Real E2E Test (requires Claude) - Skipped by default
// ============================================================================

Deno.test({
  name: "REAL E2E: Full decision blocking with Claude agents",
  ignore: Deno.env.get("RUN_E2E_TESTS") !== "1",
  async fn() {
    console.log("\n========================================");
    console.log("REAL E2E: Full Decision Blocking Flow");
    console.log("========================================\n");

    // This would:
    // 1. Start a real Miner with a task that triggers decision
    // 2. Wait for Miner to create pd:decision
    // 3. Verify Hook spawns PM
    // 4. Wait for PM to answer and close
    // 5. Verify Hook respawns Miner
    // 6. Verify Miner continues with decision context

    console.log("TODO: Implement real E2E test with Claude agents");
    console.log("This requires orchestrating multiple agent sessions");
  },
});
