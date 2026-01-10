# Camp Boss 驅動開發流程 + PM Agent 決策機制 POC

## Overview

本 POC 驗證兩個核心流程：

1. **Flow 1**: Camp Boss 直接做 brainstorming → 寫設計文件 → 派發 Surveyor → Miner 實作 → Assayer 驗證
2. **Flow 2**: PM Agent 決策機制 - 透過 bd dependency 觸發短週期 PM agent 回答問題

目標：建立 Agent BQ (Behavior Quality) 測試框架，確保 90% 以上行為符合預期。

## 核心流程

```
┌─────────────────────────────────────────────────────────────────┐
│                        CAMP BOSS (Dashboard)                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  1. superpowers:brainstorming 與用戶對話                   │   │
│  │  2. 產出設計文件 → docs/plans/YYYY-MM-DD-*-design.md      │   │
│  │  3. SPAWN: surveyor 做 implementation planning            │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SURVEYOR                                 │
│  superpowers:writing-plans → implementation plan                 │
│  OUTPUT: impl=docs/plans/..., task-count=N                       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                          MINER                                   │
│  TDD 實作 → 遇到問題時創建「決策 issue」                          │
│  bd dep add <work-issue> <decision-issue>  ← blocks              │
│  EXIT (等待決策)                                                 │
└─────────────────────────────────────────────────────────────────┘
                                │
              ┌─────────────────┴─────────────────┐
              ▼                                   ▼
┌──────────────────────┐              ┌──────────────────────────┐
│   PM AGENT (短週期)   │              │        ASSAYER           │
│  處理決策 issue       │              │  superpowers:code-review │
│  回答 → close issue   │              │  + pr-review-toolkit     │
│  EXIT                 │              └──────────────────────────┘
└──────────────────────┘
              │
              ▼
┌──────────────────────┐
│   HOOK 偵測 close    │
│   重新 spawn Miner   │
└──────────────────────┘
```

## Camp Boss 擴展設計

### 權限修改

```yaml
# prospects/camp-boss.md
allowed_tools:
  - Write  # 新增：允許寫設計文件到 docs/plans/
  # 其他維持不變
```

### Superpower 整合

| Skill                       | When to Use              |
| --------------------------- | ------------------------ |
| `superpowers:brainstorming` | 用戶提出新需求時         |
| `superpowers:writing-plans` | brainstorming 完成後     |

### 流程

1. 用戶說「幫我做 X」
2. Camp Boss 判斷這是需要設計的任務
3. 觸發 superpowers:brainstorming
4. 與用戶對話完成設計
5. 寫設計文件到 docs/plans/YYYY-MM-DD-<topic>-design.md
6. SPAWN: surveyor --task "Create implementation plan from docs/plans/..."
7. 監控 Surveyor 完成
8. SPAWN: miner --task "Implement phase 1 from docs/plans/..."

### 原則

- Camp Boss 只寫 `docs/plans/` 下的設計文件
- 仍然不寫 code（維持 delegate 原則）
- Brainstorming 完成後才 spawn Surveyor

## PM Agent 決策機制

### 觸發機制：透過 bd dependency

當 Agent 需要決策時：

```bash
# Miner 遇到問題，創建決策 issue
bd create --title "DECISION: Which auth provider to use?" \
          --type task \
          --label pd:decision \
          --priority 1

# 設定 dependency：當前工作被這個決策 block
bd dep add $PAYDIRT_CLAIM <decision-issue-id>

# Hook 偵測到 pd:decision label，自動 spawn PM Agent
```

### Miner 退出 + 重啟機制

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   MINER     │     │  PM AGENT   │     │    HOOK     │     │ NEW MINER   │
│  (working)  │     │  (spawned)  │     │ (listening) │     │  (resumed)  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │                   │
       │ 1. bd create      │                   │                   │
       │    --label        │                   │                   │
       │    pd:decision    │                   │                   │
       │───────────────────┼───────────────────>                   │
       │                   │                   │                   │
       │ 2. bd dep add     │                   │                   │
       │    (block self)   │                   │                   │
       │                   │                   │                   │
       │ 3. bd comments    │                   │                   │
       │    "BLOCKED:..."  │                   │                   │
       │                   │                   │                   │
       │ 4. EXIT           │                   │                   │
       X                   │                   │                   │
                           │ 5. 處理決策       │                   │
                           │    回答問題       │                   │
                           │                   │                   │
                           │ 6. bd close       │                   │
                           │    <decision-id>  │                   │
                           │───────────────────>                   │
                           │                   │                   │
                           │ 7. EXIT           │ 8. 偵測到         │
                           X                   │    pd:decision    │
                                               │    被 close       │
                                               │                   │
                                               │ 9. 找到原本       │
                                               │    blocked 的     │
                                               │    work issue     │
                                               │                   │
                                               │ 10. SPAWN miner   │
                                               │─────────────────────>
                                               │                   │ 11. 繼續工作
```

### Hook 修改

```bash
# hooks/post-tool-use.sh 新增

# 偵測 bd create --label pd:decision → spawn PM
if echo "$TOOL_INPUT" | grep -q "bd create.*--label.*pd:decision"; then
  DECISION_ID=$(extract_issue_id "$TOOL_OUTPUT")
  run_cmd "$PAYDIRT_BIN" prospect pm --claim "$DECISION_ID" --background
fi

# 偵測 bd close pd:decision → spawn miner resume
if echo "$TOOL_INPUT" | grep -q "bd close"; then
  CLOSED_ID=$(echo "$TOOL_INPUT" | sed -n 's/.*bd close \([^ ]*\).*/\1/p')

  LABELS=$(bd show "$CLOSED_ID" --json | jq -r '.labels[]' 2>/dev/null)
  if echo "$LABELS" | grep -q "pd:decision"; then
    BLOCKED_ISSUE=$(bd show "$CLOSED_ID" --json | jq -r '.dependents[0]')
    if [ -n "$BLOCKED_ISSUE" ]; then
      run_cmd "$PAYDIRT_BIN" prospect miner --claim "$BLOCKED_ISSUE" --task "Resume work" --background
    fi
  fi
fi
```

### PM Agent 生命週期

1. 被 spawn（因為 pd:decision issue 被創建）
2. 讀取 decision issue 內容
3. 查詢 context file ($PAYDIRT_TUNNEL) + 歷史決策
4. 判斷信心度：
   - high/medium → 直接回答
   - low/none → AskUserQuestion 問人類
5. 記錄決策：bd comments add <decision-id> "DECISION: ..."
6. 關閉決策 issue：bd close <decision-id>
7. 原本 blocked 的工作自動 unblock
8. EXIT

### Miner 退出前記錄狀態

```bash
bd comments add $PAYDIRT_CLAIM "BLOCKED: waiting for $DECISION_ID
resume-task: Implement phase 2 - user authentication
resume-context: Completed step 1-3, blocked at step 4 (auth provider choice)"
```

## Agent BQ 測試架構

### 測試結構

```
tests/
├── unit/
│   └── agent-dispatch.test.ts     # Mock Claude，測 hook 和 dispatch 邏輯
├── integration/
│   └── agent-behavior.test.ts     # 真實 Claude，測 prompt 行為品質
└── fixtures/
    ├── scenarios/                 # 測試情境定義
    │   ├── camp-boss-brainstorm.yaml
    │   ├── miner-decision-block.yaml
    │   └── pm-answer-question.yaml
    └── expectations/              # 預期行為定義
        ├── camp-boss.yaml
        ├── miner.yaml
        └── pm.yaml
```

### 三種驗證方式

```typescript
interface BehaviorTest {
  name: string;
  scenario: string;           // 情境描述
  agent: string;              // 測試的 agent
  input: string;              // 輸入 prompt
  expectations: {
    // 1. Assertion-based: 明確行為檢查
    assertions: {
      spawned?: string[];     // 應該 spawn 哪些 agents
      createdIssue?: boolean; // 是否創建了 issue
      exitedCleanly?: boolean;
    };

    // 2. 行為標籤檢測: 檢查輸出中的標籤
    labels: {
      required: string[];     // 必須出現: ["SPAWN:", "OUTPUT:"]
      forbidden: string[];    // 不能出現: ["ERROR:"]
    };

    // 3. LLM-as-Judge: 語意評估
    judge: {
      criteria: string;       // 評判標準
      minScore: number;       // 最低分數 (0-10)
    };
  };
}
```

### 測試執行流程

1. 載入 scenario fixture
2. Spawn agent (mock 或 real Claude)
3. 收集 agent 輸出 (bd comments, tool calls, stdout)
4. 執行三種驗證：
   - Assertion checks → pass/fail
   - Label detection → count matches
   - LLM-as-Judge → score 0-10
5. 計算總體通過率
6. 目標：90% 以上

## POC 範圍

### 實作範圍 (MVP)

1. **Camp Boss 擴展**
   - 新增 Write 權限 (只限 docs/plans/)
   - 新增 superpowers:brainstorming 整合指引
   - 新增 SPAWN surveyor 流程

2. **PM Agent 新增**
   - 創建 prospects/pm.md
   - 處理 pd:decision issue
   - 混合策略回答（context + 問人類）
   - 記錄決策 + close issue + exit

3. **Hook 擴展**
   - 偵測 bd create --label pd:decision → spawn PM
   - 偵測 bd close pd:decision → spawn miner resume

4. **BQ 測試框架**
   - 基礎測試架構 (fixtures + runner)
   - 2-3 個 scenario 驗證核心流程
   - 三種驗證方式整合

### 不在 POC 範圍

- pr-review-toolkit 整合（後續 phase）
- superpowers chrome E2E 驗證（後續 phase）
- Assayer 兩層 code review（後續 phase）
- 完整錯誤處理和 retry 機制
- Context file 格式規範化

## 實作清單

### 需要修改的檔案

| 檔案 | 修改內容 |
|------|----------|
| `prospects/camp-boss.md` | 新增 Write 權限、brainstorming 整合指引 |
| `hooks/post-tool-use.sh` | 新增 pd:decision 偵測、close 偵測 |

### 需要新增的檔案

| 檔案 | 內容 |
|------|------|
| `prospects/pm.md` | PM Agent 定義（決策代理） |
| `tests/integration/agent-behavior.test.ts` | BQ 測試主程式 |
| `tests/fixtures/scenarios/*.yaml` | 測試情境定義 |
| `tests/fixtures/expectations/*.yaml` | 預期行為定義 |
| `src/bq-test/runner.ts` | BQ 測試執行器 |
| `src/bq-test/judge.ts` | LLM-as-Judge 實作 |

## 驗收標準

1. Camp Boss 能透過 brainstorming 產出設計文件
2. Camp Boss 能正確 spawn Surveyor 和 Miner
3. Miner 遇到決策問題時能正確創建 pd:decision issue 並退出
4. PM Agent 能被正確 spawn 並處理決策
5. 決策完成後 Miner 能被正確重啟
6. BQ 測試通過率 >= 90%
