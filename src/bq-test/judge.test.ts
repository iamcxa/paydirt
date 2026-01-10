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
