---
name: beads-expert
description: Expert guidance for Beads (bd) - a Git-backed issue tracker for AI-supervised coding workflows. Use when working with bd CLI commands, MCP tools, hooks, issue tracking, dependencies, workflows, or troubleshooting beads. Covers CLI reference, MCP server integration, Claude Code hooks, event-driven automation, and multi-session context management.
allowed-tools: Read, Grep, Glob, WebFetch, WebSearch, Write, Edit, Bash, mcp__beads__*
---

# Beads Expert

## Purpose

Provide expert guidance for Beads (bd) - a distributed, Git-backed graph issue tracker designed specifically for AI agents. Beads provides persistent, structured memory for coding agents, replacing messy markdown plans with a dependency-aware graph.

## Expertise

- bd CLI commands and workflows
- MCP server tools and integration
- Claude Code hooks and event-driven automation
- Issue lifecycle management (create, update, close, reopen)
- Dependency tracking (blocks, related, parent-child, discovered-from)
- Git synchronization and JSONL storage
- Multi-session context management
- Compaction and memory decay
- Troubleshooting and diagnostics

## When to Invoke

Invoke this skill when the user:
- Uses bd CLI commands or asks about beads
- Works with issue tracking in AI workflows
- Configures MCP server or hooks
- Manages dependencies between issues
- Needs to sync issues with git
- Asks about `bd ready`, `bd create`, `bd update`, `bd close`
- Troubleshoots beads integration
- Wants event-driven automation with hooks

## Installation

```bash
# Install bd CLI
npm install -g @beads/bd
# OR
brew install steveyegge/beads/bd
# OR
go install github.com/steveyegge/beads/cmd/bd@latest

# Install MCP server (for Claude Code)
pip install beads-mcp
# OR use uv
uv pip install beads-mcp

# Initialize in a project
bd init
```

## Core Concepts

### Architecture

```
Beads Architecture:
┌─────────────────────────────────────────────────────────┐
│                    Claude Code                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ bd CLI       │  │ MCP Server   │  │ Hooks        │  │
│  │ (direct)     │  │ (tools)      │  │ (events)     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
└─────────┼─────────────────┼─────────────────┼──────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────┐
│                  bd Daemon (optional)                   │
│                  Auto-sync, background ops              │
└─────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│  .beads/                                                │
│  ├── beads.db      (SQLite - local cache, not committed)│
│  └── issues.jsonl  (Git-tracked source of truth)        │
└─────────────────────────────────────────────────────────┘
```

### Issue Types

| Type | Purpose |
|------|---------|
| `bug` | Something broken that needs fixing |
| `feature` | New functionality |
| `task` | Work item (tests, docs, refactoring) |
| `epic` | Large feature composed of multiple issues |
| `chore` | Maintenance work (dependencies, tooling) |

### Issue Statuses

| Status | Description |
|--------|-------------|
| `open` | Ready to be worked on |
| `in_progress` | Currently being worked on |
| `blocked` | Cannot proceed (waiting on dependencies) |
| `deferred` | Deliberately postponed for later |
| `closed` | Work completed |
| `tombstone` | Deleted issue (suppresses resurrections) |
| `pinned` | Stays open indefinitely (hooks, anchors) |

### Priorities

| Priority | Description |
|----------|-------------|
| `0` (P0) | Critical (security, data loss, broken builds) |
| `1` (P1) | High (major features, important bugs) |
| `2` (P2) | Medium (default, nice-to-have) |
| `3` (P3) | Low (polish, optimization) |
| `4` (P4) | Backlog (future ideas) |

### Dependency Types

| Type | Effect | Use Case |
|------|--------|----------|
| `blocks` | Hard dependency, affects ready queue | Issue X must complete before Y |
| `related` | Soft link, informational | Issues are connected |
| `parent-child` | Epic/subtask hierarchy | Epic contains subtasks |
| `discovered-from` | Work found during other work | Bug found while implementing feature |

Only `blocks` dependencies affect the `bd ready` queue.

## CLI Reference

### Finding Work

```bash
# Find ready work (no blockers)
bd ready --json

# Find stale issues
bd stale --days 30 --json

# List with filters
bd list --status open --priority 1 --json
bd list --assignee alice --type bug --json
bd list --label bug,critical --json      # AND: must have ALL
bd list --label-any frontend,backend --json  # OR: has ANY
```

### Creating Issues

```bash
# Basic creation
bd create "Issue title" -t bug|feature|task -p 0-4 --json

# With description
bd create "Fix auth bug" -t bug -p 1 -d "Description here" --json

# With labels
bd create "Issue title" -t bug -p 1 -l bug,critical --json

# Create and link discovered work (single command - preferred)
bd create "Found bug" -t bug -p 1 --deps discovered-from:bd-123 --json

# Create epic with hierarchical children
bd create "Auth System" -t epic -p 1 --json                     # Returns: bd-a3f8e9
bd create "Login UI" -p 1 --parent bd-a3f8e9 --json             # Auto: bd-a3f8e9.1
bd create "Backend validation" -p 1 --parent bd-a3f8e9 --json   # Auto: bd-a3f8e9.2

# Read description from file (avoids shell escaping)
bd create "Issue title" --body-file=description.md --json
echo "Description" | bd create "Title" --body-file=- --json
```

### Updating Issues

```bash
# Update status
bd update bd-42 --status in_progress --json

# Update priority
bd update bd-42 --priority 1 --json

# Update multiple issues
bd update bd-41 bd-42 bd-43 --priority 0 --json

# Update assignee
bd update bd-42 --assignee alice --json
```

### Completing Work

```bash
# Close single issue
bd close bd-42 --reason "Completed" --json

# Close multiple issues
bd close bd-41 bd-42 bd-43 --reason "Batch completion" --json

# Reopen issues
bd reopen bd-42 --reason "Needs more work" --json
```

### Dependencies

```bash
# Add blocking dependency (bd-101 depends on bd-100)
bd dep add bd-101 bd-100 --type blocks

# Add discovered-from link
bd dep add bd-101 bd-100 --type discovered-from

# View dependency tree
bd dep tree bd-42

# Show blocked issues
bd blocked --json
```

### Labels

```bash
# Add label to multiple issues
bd label add bd-41 bd-42 bd-43 urgent --json

# Remove label
bd label remove bd-42 urgent --json

# List labels on issue
bd label list bd-42 --json

# List all labels in project
bd label list-all --json
```

### Sync Operations

```bash
# Manual sync (export + commit + push)
bd sync

# Check sync status
bd sync --status

# Import from JSONL
bd import -i .beads/issues.jsonl

# Force import (when DB appears synced but isn't)
bd import -i .beads/issues.jsonl --force
```

### Information Commands

```bash
# Show issue details
bd show bd-42 --json

# Show multiple issues
bd show bd-41 bd-42 bd-43 --json

# Project statistics
bd stats --json

# Database info
bd info --json
```

### Global Flags

```bash
# JSON output (always use for programmatic access)
bd --json <command>

# Sandbox mode (disables daemon, auto-sync)
bd --sandbox <command>

# Skip staleness check
bd --allow-stale <command>

# Custom actor for audit trail
bd --actor alice <command>
```

## MCP Server Integration

### Available MCP Tools

The beads MCP server provides these tools:

| Tool | Description |
|------|-------------|
| `context` | Set workspace root for operations |
| `discover_tools` | List available tools (names only) |
| `get_tool_info` | Get detailed info for specific tool |
| `init` | Initialize bd in current directory |
| `create` | Create new issue |
| `list` | List issues with filters |
| `ready` | Find tasks with no blockers |
| `show` | Show detailed issue info |
| `update` | Update issue fields |
| `close` | Close completed issue |
| `reopen` | Reopen closed issue |
| `dep` | Add dependency |
| `blocked` | Get blocked issues |
| `stats` | Get project statistics |
| `admin` | Administrative operations |

### MCP Context Management

```python
# IMPORTANT: Set workspace before write operations
mcp__beads__context(workspace_root='/path/to/project')

# Then use other tools
mcp__beads__ready()
mcp__beads__create(title="New task", issue_type="task", priority=2)
```

### Context Optimization

The MCP server uses lazy tool schema loading:
1. Use `discover_tools()` to see available tools (names only)
2. Use `get_tool_info(tool_name)` for specific tool details
3. This reduces context from ~10-50k tokens to ~2-5k tokens

### MCP Resources

```
beads://quickstart  - Interactive quickstart guide
```

## Hooks and Event-Driven Automation

### Claude Code Hooks

Beads integrates with Claude Code through hooks:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bd prime"
          }
        ]
      }
    ],
    "PreCompact": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bd prime"
          }
        ]
      }
    ]
  }
}
```

### Hook Events

| Event | Trigger | Use Case |
|-------|---------|----------|
| `SessionStart` | When Claude Code session begins | Load workflow context |
| `PreCompact` | Before context compaction | Preserve workflow instructions |

### Installing Hooks

```bash
# Install globally
bd setup claude

# Install for project only
bd setup claude --project

# Use stealth mode (flush only, no git)
bd setup claude --stealth

# Check installation
bd setup claude --check

# Remove hooks
bd setup claude --remove
```

### bd prime Command

The `bd prime` command outputs workflow context (~1-2k tokens):
- Current project status
- Ready work summary
- Workflow instructions
- Essential commands

This is more context-efficient than MCP tool schemas (10-50k tokens).

## Workflow Patterns

### Standard Agent Workflow

```bash
# 1. Start of session - find work
bd ready --json

# 2. Claim task
bd update bd-42 --status in_progress --json

# 3. Work on it...

# 4. Discover related work (create and link in one command)
bd create "Found bug during work" -t bug -p 1 --deps discovered-from:bd-42 --json

# 5. Complete original task
bd close bd-42 --reason "Implemented and tested" --json

# 6. End of session - ALWAYS sync
bd sync
```

### Session Close Protocol

**CRITICAL: Before ending any session:**

```bash
# 1. Check what changed
git status

# 2. Stage code changes
git add <files>

# 3. Sync beads changes
bd sync

# 4. Commit code
git commit -m "..."

# 5. Sync any new beads changes
bd sync

# 6. Push to remote
git push
```

**Work is NOT complete until `git push` succeeds.**

### Batch Operations

```bash
# Update multiple issues at once
bd update bd-41 bd-42 bd-43 --priority 0 --json

# Close multiple issues
bd close bd-41 bd-42 bd-43 --reason "Batch completion" --json

# Add label to multiple issues
bd label add bd-41 bd-42 bd-43 urgent --json
```

### Hierarchical Issue Creation

```bash
# Create epic
bd create "Auth System Overhaul" -t epic -p 1 --json
# Returns: bd-a3f8

# Create subtasks (auto-numbered)
bd create "Implement OAuth" -p 1 --parent bd-a3f8 --json   # bd-a3f8.1
bd create "Add MFA support" -p 1 --parent bd-a3f8 --json   # bd-a3f8.2
bd create "Write tests" -p 1 --parent bd-a3f8 --json       # bd-a3f8.3

# Subtasks can have subtasks (up to 3 levels)
bd create "Unit tests" -p 2 --parent bd-a3f8.3 --json      # bd-a3f8.3.1
```

## Auto-Sync with Git

Beads automatically syncs issues to `.beads/issues.jsonl`:

- **Export**: After any CRUD operation (5-second debounce)
- **Import**: When JSONL is newer than DB (e.g., after `git pull`)

```bash
# Make changes
bd create "Add feature" -p 1

# Changes auto-export after 5 seconds
# Commit when ready
git add .beads/issues.jsonl
git commit -m "Add feature tracking"

# After pull, JSONL auto-imports
git pull
bd ready  # Shows fresh data from git
```

### Important Git Rules

- **Always commit `.beads/issues.jsonl` with code changes**
- **Never commit `.beads/beads.db`** (SQLite cache)
- **Run `bd sync` at end of sessions**

## Troubleshooting

### Common Issues

**Plugin not appearing:**
1. Check installation: `/plugin list`
2. Restart Claude Code
3. Verify `bd` is in PATH: `which bd`
4. Check uv is installed: `which uv`

**MCP server not connecting:**
1. Check MCP server list: `/mcp`
2. Restart Claude Code
3. Check logs for errors

**Staleness errors:**
```bash
# Force import
bd import -i .beads/issues.jsonl --force

# Or skip staleness check (emergency)
bd --allow-stale ready --json
```

**Sandboxed environments:**
```bash
# Enable sandbox mode
bd --sandbox <command>

# Equivalent to:
bd --no-daemon --no-auto-flush --no-auto-import <command>
```

**Missing parent errors during import:**
```bash
# Allow orphans (default)
bd import -i issues.jsonl --orphan-handling allow

# Resurrect deleted parents
bd import -i issues.jsonl --orphan-handling resurrect

# Strict mode (fail on missing parent)
bd import -i issues.jsonl --orphan-handling strict
```

### Diagnostics

```bash
# Check database and daemon status
bd info --json

# Run health checks
bd admin validate --json

# Check daemon health
bd daemons health --json

# View daemon logs
bd daemons logs /path/to/workspace -n 100
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BEADS_PATH` | Path to bd executable | `bd` in PATH |
| `BEADS_DB` | Path to database file | Auto-discover |
| `BEADS_ACTOR` | Actor name for audit | `$USER` |
| `BEADS_NO_AUTO_FLUSH` | Disable auto JSONL sync | `false` |
| `BEADS_NO_AUTO_IMPORT` | Disable auto JSONL import | `false` |
| `BEADS_WORKING_DIR` | Working directory | Current dir |

### MCP Compaction Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `BEADS_MCP_COMPACTION_THRESHOLD` | Compact results with >N issues | `20` |
| `BEADS_MCP_PREVIEW_COUNT` | Show first N issues in preview | `5` |

## Best Practices

### For AI Agents

1. **Always use `--json` flag** for programmatic access
2. **Use `bd ready` first** to find available work
3. **Link discovered work** with `--deps discovered-from:<parent>`
4. **Run `bd sync` at end of sessions** to push changes
5. **Never create markdown TODO lists** - use bd instead

### For Multi-Session Work

1. **Check `bd ready`** at session start
2. **Update status to `in_progress`** when claiming work
3. **Create issues for discovered work** instead of notes
4. **Close issues with reasons** for audit trail
5. **Always sync and push** before ending session

### Context Efficiency

1. **Prefer CLI + Hooks over MCP** when shell is available
2. **Use `bd prime`** for context injection (~1-2k tokens)
3. **Use MCP `discover_tools()`** instead of loading all schemas
4. **Set workspace context once** then reuse

## Resources

- **Repository**: https://github.com/steveyegge/beads
- **Documentation**: See docs/ in repository
- **CLI Reference**: docs/CLI_REFERENCE.md
- **MCP Server**: integrations/beads-mcp/
- **Plugin**: .claude-plugin/
