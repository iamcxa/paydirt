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
