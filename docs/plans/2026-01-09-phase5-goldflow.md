# Phase 5: Goldflow Execution Layer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the complete Goldflow execution layer including Controllers, Verifiers, Metrics, configuration system, and Superpowers integration.

**Architecture:** Goldflow is the execution layer that handles HOW work gets done reliably. It has no narrative/role concepts - those belong to the Paydirt layer. Components include Sources (fetch work), Processors (transform), Verifiers (validate), Controllers (orchestrate), and Sinks (output).

**Tech Stack:** Deno/TypeScript, YAML configuration, bd CLI for state

---

## Overview

```
GOLDFLOW ARCHITECTURE

  SOURCE  --->  PROCESSOR  --->  VERIFIER  --->  SINK
  (Scout)       (Miner)         (Assayer)       (PR)
     |             |                |              |
     +-------------+----------------+--------------+
                          |
                   CONTROLLER
                  (Trail Boss)
                          |
                     METRICS
                    (Ledger)
```

---

## Task 5.1: Create Goldflow Controllers

**bd issue:** `pd-5pd`

**Files:**
- Create: `src/goldflow/controllers/mod.ts`
- Create: `src/goldflow/controllers/base.ts`
- Create: `src/goldflow/controllers/trail-boss.ts`
- Test: `src/goldflow/controllers/controllers.test.ts`

### Step 1: Create test file

Create `src/goldflow/controllers/controllers.test.ts` with tests for BaseController.

### Step 2: Run test to verify failure

```
deno test --allow-all src/goldflow/controllers/controllers.test.ts
```

### Step 3: Create base.ts

Implement BaseController with orchestrate interface.

### Step 4: Run test to verify pass

### Step 5: Add TrailBossController tests

### Step 6: Implement trail-boss.ts

TrailBossController with retry policy and sequential execution.

### Step 7: Run all tests

### Step 8: Create mod.ts export

### Step 9: Commit

---

## Task 5.2: Create Goldflow Verifiers

**bd issue:** `pd-xb1`

**Files:**
- Create: `src/goldflow/verifiers/mod.ts`
- Create: `src/goldflow/verifiers/base.ts`
- Create: `src/goldflow/verifiers/assayer.ts`
- Create: `src/goldflow/verifiers/canary.ts`
- Create: `src/goldflow/verifiers/smelter.ts`
- Test: `src/goldflow/verifiers/verifiers.test.ts`

### Step 1: Write failing test for base verifier

### Step 2: Run test

### Step 3: Implement base verifier with gates support

### Step 4: Run test

### Step 5: Write failing tests for AssayerVerifier

### Step 6: Implement AssayerVerifier

AssayerVerifier checks code review gates (conventions, security, types).

### Step 7: Implement CanaryVerifier

CanaryVerifier checks test results and coverage thresholds.

### Step 8: Implement SmelterVerifier

SmelterVerifier checks security and quality issues.

### Step 9: Create mod.ts

### Step 10: Commit

---

## Task 5.3: Create Goldflow Metrics System

**bd issue:** `pd-5pr`

**Files:**
- Create: `src/goldflow/metrics/mod.ts`
- Create: `src/goldflow/metrics/collector.ts`
- Create: `src/goldflow/metrics/types.ts`
- Test: `src/goldflow/metrics/metrics.test.ts`

### Step 1: Write failing test for MetricsCollector

### Step 2: Run test

### Step 3: Implement metrics types

MetricEntry with timestamp, component, duration, tokens, success.

### Step 4: Implement collector

MetricsCollector with record(), getMetrics(), aggregate().

### Step 5: Run tests

### Step 6: Create mod.ts

### Step 7: Commit

---

## Task 5.4: Create goldflow.yaml Configuration

**bd issue:** `pd-tb9`

**Files:**
- Create: `src/goldflow/config/mod.ts`
- Create: `src/goldflow/config/parser.ts`
- Create: `src/goldflow/config/schema.ts`
- Create: `goldflow.yaml` (example)
- Test: `src/goldflow/config/config.test.ts`

### Step 1: Write failing test for parseGoldflowConfig

### Step 2: Run test

### Step 3: Implement schema types

ConfigSchema with processors, verifiers, controllers, pipelines.

### Step 4: Implement parser

YAML parser with validation.

### Step 5: Run tests

### Step 6: Create example goldflow.yaml

### Step 7: Create mod.ts

### Step 8: Commit

---

## Task 5.5: Integrate Superpowers with Goldflow

**bd issue:** `pd-u0m`

**Files:**
- Create: `src/goldflow/superpowers/mod.ts`
- Create: `src/goldflow/superpowers/loader.ts`
- Create: `src/goldflow/superpowers/mapping.ts`
- Test: `src/goldflow/superpowers/superpowers.test.ts`

### Step 1: Write failing test for getSuperpowersForRole

### Step 2: Run test

### Step 3: Implement mapping

ROLE_SUPERPOWERS mapping:
- miner: executing-plans, test-driven-development
- assayer: requesting-code-review
- canary: verification-before-completion
- smelter: systematic-debugging
- surveyor: brainstorming, writing-plans

### Step 4: Run tests

### Step 5: Implement loader

buildSkillInvocations() and generateSkillPrompt().

### Step 6: Create mod.ts

### Step 7: Commit

---

## Task 5.6: Create Source/Sink Processors

**bd issue:** `pd-822`

**Files:**
- Create: `src/goldflow/sources/mod.ts`
- Create: `src/goldflow/sources/linear.ts`
- Create: `src/goldflow/sources/github.ts`
- Create: `src/goldflow/sinks/mod.ts`
- Create: `src/goldflow/sinks/pr.ts`
- Test: `src/goldflow/sources/sources.test.ts`

### Step 1: Write failing test for LinearSource

### Step 2: Implement LinearSource

Fetch Linear issues via MCP.

### Step 3: Implement GitHubSource

Fetch GitHub issues/PRs via MCP.

### Step 4: Implement PRSink

Create PRs via GitHub MCP.

### Step 5: Create mod files

### Step 6: Commit

---

## Task 5.7: Create Claim Agent Controller

**bd issue:** `pd-wkc`

**Files:**
- Verify: `prospects/claim-agent.md` (already exists)
- Create: `src/goldflow/controllers/claim-agent.ts`
- Test: `src/goldflow/controllers/claim-agent.test.ts`

### Step 1: Verify claim-agent.md has Goldflow integration

### Step 2: Write failing test for ClaimAgentController

### Step 3: Implement ClaimAgentController

- processQuestions() method
- Q&A pattern matching from context
- Confidence levels (high/medium/low/none/escalated)

### Step 4: Run tests

### Step 5: Update controllers/mod.ts

### Step 6: Commit

---

## Task 5.8: Create Scout Source

**bd issue:** `pd-tjd`

**Files:**
- Verify: `prospects/scout.md` (already exists)
- Create: `src/goldflow/sources/scout.ts`
- Test: `src/goldflow/sources/scout.test.ts`

### Step 1: Verify scout.md has Goldflow integration

### Step 2: Write failing test for ScoutSource

### Step 3: Implement ScoutSource

- Query types: web, search, api
- JSON result format with status/summary
- Error handling

### Step 4: Run tests

### Step 5: Update sources/mod.ts

### Step 6: Commit

---

## Task 5.9: Create Decision Ledger

**bd issue:** `pd-9l1`

**Files:**
- Create: `src/goldflow/ledger/mod.ts`
- Create: `src/goldflow/ledger/decision-ledger.ts`
- Create: `src/goldflow/ledger/types.ts`
- Test: `src/goldflow/ledger/decision-ledger.test.ts`

### Step 1: Write failing test for DecisionLedger

### Step 2: Run test

### Step 3: Implement types

Decision with id, timestamp, question, answer, confidence, source, reasoning, outcome.

### Step 4: Implement DecisionLedger

- record() - add decision
- updateOutcome() - track success/failure
- getDecisions() - retrieve all
- toBdComment() - export to bd format
- toJSON() - export with summary stats

### Step 5: Run tests

### Step 6: Create mod.ts

### Step 7: Commit

---

## Task 5.10: Create Commander Journal

**bd issue:** `pd-dls`

**Files:**
- Create: `src/goldflow/ledger/commander-journal.ts`
- Test: `src/goldflow/ledger/commander-journal.test.ts`

### Step 1: Write failing test for CommanderJournal

### Step 2: Run test

### Step 3: Implement CommanderJournal

Entry types:
- caravan-status
- directive
- strategic-note
- human-input
- alert

Methods:
- log() - add entry
- getEntries() - all entries
- getByType() - filter by type
- getByCaravan() - filter by caravan
- persist() - save to JSONL
- toMarkdown() - export as markdown

### Step 4: Run tests

### Step 5: Update ledger/mod.ts

### Step 6: Commit

---

## Summary

| Task | Description | bd Issue |
|------|-------------|----------|
| 5.1 | Goldflow Controllers | pd-5pd |
| 5.2 | Goldflow Verifiers | pd-xb1 |
| 5.3 | Metrics System | pd-5pr |
| 5.4 | YAML Configuration | pd-tb9 |
| 5.5 | Superpowers Integration | pd-u0m |
| 5.6 | Source/Sink Processors | pd-822 |
| 5.7 | Claim Agent Controller | pd-wkc |
| 5.8 | Scout Source | pd-tjd |
| 5.9 | Decision Ledger | pd-9l1 |
| 5.10 | Commander Journal | pd-dls |

---

## Final Directory Structure

```
src/goldflow/
├── types.ts
├── pipelines/
│   ├── mod.ts
│   └── delivery.ts
├── controllers/
│   ├── mod.ts
│   ├── base.ts
│   ├── trail-boss.ts
│   ├── claim-agent.ts
│   └── controllers.test.ts
├── verifiers/
│   ├── mod.ts
│   ├── base.ts
│   ├── assayer.ts
│   ├── canary.ts
│   ├── smelter.ts
│   └── verifiers.test.ts
├── metrics/
│   ├── mod.ts
│   ├── types.ts
│   ├── collector.ts
│   └── metrics.test.ts
├── config/
│   ├── mod.ts
│   ├── schema.ts
│   ├── parser.ts
│   └── config.test.ts
├── superpowers/
│   ├── mod.ts
│   ├── mapping.ts
│   ├── loader.ts
│   └── superpowers.test.ts
├── sources/
│   ├── mod.ts
│   ├── linear.ts
│   ├── github.ts
│   ├── scout.ts
│   └── sources.test.ts
├── sinks/
│   ├── mod.ts
│   └── pr.ts
└── ledger/
    ├── mod.ts
    ├── types.ts
    ├── decision-ledger.ts
    ├── commander-journal.ts
    └── *.test.ts
```
