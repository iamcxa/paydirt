---
name: mprocs-expert
description: Expert guidance for mprocs configuration, multi-process orchestration, and TUI customization. Use when configuring mprocs.yaml, setting up process management, customizing keybindings, styling the interface, troubleshooting mprocs issues, or optimizing multi-process workflows. Covers process definitions, stop signals, environment variables, remote control, npm/justfile integration, and visual design.
allowed-tools: Read, Grep, Glob, WebFetch, WebSearch, Write, Edit, Bash
---

# mprocs Expert

## Purpose

Provide expert guidance for configuring and optimizing mprocs - a TUI tool that runs multiple commands in parallel with separate output panes.

## Expertise

- Process definition and lifecycle management
- YAML configuration syntax and structure
- Keybinding customization
- Visual styling and theming
- Remote control via TCP
- npm/justfile integration
- Stop signal configuration
- Environment variable management
- Cross-platform configuration with `$select`
- Troubleshooting common issues

## When to Invoke

Invoke this skill when the user:
- Creates or edits `mprocs.yaml` configuration
- Asks about mprocs process management
- Wants to customize keybindings
- Needs to style or theme the interface
- Troubleshoots mprocs issues
- Sets up multi-process development workflows
- Configures process auto-restart behavior
- Needs remote control setup
- Works with npm scripts or justfile recipes

## Repository Reference

**Official Repository**: https://github.com/pvolok/mprocs

When encountering version-specific features or undocumented behavior:
1. Check the latest README: `https://raw.githubusercontent.com/pvolok/mprocs/master/README.md`
2. Check releases for changelog: `https://github.com/pvolok/mprocs/releases`
3. Check source code for implementation details:
   - Config: `https://raw.githubusercontent.com/pvolok/mprocs/master/src/config.rs`
   - Theme: `https://raw.githubusercontent.com/pvolok/mprocs/master/src/theme.rs`
4. JSON Schema: `https://json.schemastore.org/mprocs-0.6.4.json`

## Installation

```bash
# macOS/Linux (Homebrew)
brew install mprocs

# npm/yarn
npm install -g mprocs
yarn global add mprocs

# Cargo (Rust)
cargo install mprocs

# Windows (Scoop)
scoop install mprocs

# Arch Linux (AUR)
yay mprocs
```

## Configuration Files

### Location Priority
1. **Local**: `./mprocs.yaml` (project-specific, highest priority)
2. **Global**: `~/.config/mprocs/mprocs.yaml` (user defaults)
3. **CLI Override**: `mprocs --config ./path/to/config.yaml`

Local settings override global settings.

## Configuration Reference

### Complete Configuration Template

```yaml
# Process definitions (local config only)
procs:
  # Process with shell command (string)
  server:
    shell: "npm run dev"
    cwd: ./backend
    env:
      NODE_ENV: development
      PORT: "3000"
    autostart: true
    autorestart: false
    stop: SIGTERM

  # Process with cmd array (explicit args)
  database:
    cmd: ["docker", "compose", "up", "postgres"]
    cwd: <CONFIG_DIR>/docker
    autostart: true
    stop: SIGINT

  # Process with custom stop sequence
  vim-server:
    shell: "nvim --listen /tmp/nvim.sock"
    stop:
      send-keys:
        - <Esc>
        - ":"
        - "q"
        - "a"
        - "!"
        - <Enter>

  # Cross-platform process
  build:
    shell:
      $select: os
      windows: "npm.cmd run build"
      $else: "npm run build"

# UI Configuration
hide_keymap_window: false
mouse_scroll_speed: 3
scrollback: 5000
proc_list_width: 30

# Remote control server
server: "127.0.0.1:4050"

# Custom keybindings (see Keybindings section)
keymap_procs:
  <C-r>: { c: restart-proc }
  <C-q>: { c: quit }

keymap_term:
  <C-a>: { c: focus-procs }

keymap_copy:
  y: { c: copy-mode-copy }
```

### Process Configuration Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `shell` | string | — | Shell command to run (mutually exclusive with `cmd`) |
| `cmd` | string[] | — | Command with args array (mutually exclusive with `shell`) |
| `cwd` | string | config dir | Working directory. `<CONFIG_DIR>` expands to config location |
| `env` | object | — | Environment variables. Use `null` to unset inherited vars |
| `add_path` | string/string[] | — | Additional PATH entries |
| `autostart` | boolean | `true` | Start when mprocs launches |
| `autorestart` | boolean | `false` | Restart on exit (skips if exits within 1 second) |
| `stop` | string/object | `SIGTERM` | Stop method (see Stop Signals) |

### Global Configuration Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `hide_keymap_window` | boolean | `false` | Hide bottom keybinding panel |
| `mouse_scroll_speed` | integer | `3` | Lines per mouse scroll |
| `scrollback` | integer | `1000` | Terminal buffer size |
| `proc_list_width` | integer | `24` | Process list panel width |
| `server` | string | — | TCP address for remote control |
| `keymap_procs` | object | — | Process list keybindings |
| `keymap_term` | object | — | Terminal window keybindings |
| `keymap_copy` | object | — | Copy mode keybindings |

### Stop Signals

```yaml
# Built-in signals
stop: SIGINT     # Ctrl+C (graceful)
stop: SIGTERM    # Terminate request
stop: SIGKILL    # Force kill (Linux/macOS)
stop: hard-kill  # Force kill (cross-platform)

# Custom key sequence
stop:
  send-keys:
    - <C-c>      # Send Ctrl+C
    - <Enter>    # Then Enter

# For interactive programs (vim, etc.)
stop:
  send-keys:
    - <Esc>
    - ":"
    - "q"
    - "!"
    - <Enter>
```

### Cross-Platform Configuration ($select)

```yaml
procs:
  server:
    shell:
      $select: os
      windows: "npm.cmd run dev"
      linux: "npm run dev"
      macos: "npm run dev"
      $else: "npm run dev"

    cwd:
      $select: os
      windows: "C:\\Projects\\app"
      $else: "/home/user/app"
```

## Keybindings

### Default Process List Keys

| Key | Action | Command |
|-----|--------|---------|
| `q` | Quit (soft kill all) | `quit-or-ask` |
| `Q` | Force quit | `force-quit` |
| `C-a` | Focus terminal output | `focus-term` |
| `x` | Stop selected process | `term-proc` |
| `X` | Force kill selected | `kill-proc` |
| `s` | Start selected process | `start-proc` |
| `r` | Restart (soft) | `restart-proc` |
| `R` | Restart (force) | `force-restart-proc` |
| `a` | Add new process | `add-proc` |
| `C` | Duplicate process | `duplicate-proc` |
| `d` | Remove process | `remove-proc` |
| `e` | Rename process | `rename-proc` |
| `k` / `↑` | Previous process | `prev-proc` |
| `j` / `↓` | Next process | `next-proc` |
| `M-1` to `M-8` | Select process 1-8 | `select-proc` |
| `C-d` / `Page_Down` | Scroll down | `scroll-down` |
| `C-u` / `Page_Up` | Scroll up | `scroll-up` |
| `z` | Zoom terminal | `zoom` |
| `v` | Enter copy mode | `copy-mode-enter` |
| `p` | Commands menu | — |

### Default Terminal Window Keys

| Key | Action | Command |
|-----|--------|---------|
| `C-a` | Focus process list | `focus-procs` |

### Default Copy Mode Keys

| Key | Action | Command |
|-----|--------|---------|
| `v` | Select/toggle endpoint | `copy-mode-end` |
| `c` | Copy selected text | `copy-mode-copy` |
| `Esc` | Exit copy mode | `copy-mode-leave` |
| `h/j/k/l` | Navigate | `copy-mode-move` |

### Custom Keybinding Examples

```yaml
# Process list keybindings
keymap_procs:
  # Reset all default bindings first
  reset: true

  # Navigation
  <Up>: { c: prev-proc }
  <Down>: { c: next-proc }
  <C-k>: { c: prev-proc }
  <C-j>: { c: next-proc }

  # Process control
  <C-r>: { c: restart-proc }
  <C-x>: { c: term-proc }
  <C-s>: { c: start-proc }

  # Scrolling
  <C-d>: { c: scroll-down }
  <C-u>: { c: scroll-up }
  <C-e>: { c: scroll-down-lines, n: 3 }
  <C-y>: { c: scroll-up-lines, n: 3 }

  # Focus
  <Tab>: { c: toggle-focus }
  <Enter>: { c: focus-term }

  # Quit
  <C-q>: { c: quit }

  # Unbind a key
  q: null

# Terminal keybindings
keymap_term:
  <C-a>: { c: focus-procs }
  <Esc>: { c: focus-procs }

# Copy mode keybindings
keymap_copy:
  y: { c: copy-mode-copy }
  <Esc>: { c: copy-mode-leave }
```

### Key Syntax

```
<Enter>       # Enter key
<Esc>         # Escape key
<Tab>         # Tab key
<Space>       # Space key
<Up>          # Arrow up
<Down>        # Arrow down
<Left>        # Arrow left
<Right>       # Arrow right
<Page_Up>     # Page up
<Page_Down>   # Page down
<Home>        # Home key
<End>         # End key
<C-a>         # Ctrl + a
<M-1>         # Alt + 1 (Meta)
<S-Tab>       # Shift + Tab
a             # Plain 'a' key
1             # Plain '1' key
```

## Remote Control

### Enable Server

```yaml
# In mprocs.yaml
server: "127.0.0.1:4050"

# Or via CLI
mprocs --server 127.0.0.1:4050
```

### Send Commands

```bash
# Basic commands
mprocs --ctl '{c: quit}'
mprocs --ctl '{c: toggle-focus}'
mprocs --ctl '{c: next-proc}'
mprocs --ctl '{c: prev-proc}'

# Select specific process (0-indexed)
mprocs --ctl '{c: select-proc, index: 2}'

# Process control
mprocs --ctl '{c: start-proc}'
mprocs --ctl '{c: term-proc}'
mprocs --ctl '{c: kill-proc}'
mprocs --ctl '{c: restart-proc}'
mprocs --ctl '{c: restart-all}'

# Add new process
mprocs --ctl '{c: add-proc, cmd: "npm run test", name: "tests"}'

# Remove process by ID
mprocs --ctl '{c: remove-proc, id: "server"}'

# Send keystrokes to active process
mprocs --ctl '{c: send-key, key: "<C-c>"}'
mprocs --ctl '{c: send-key, key: "<Enter>"}'

# Batch multiple commands
mprocs --ctl '{c: batch, cmds: [{c: select-proc, index: 0}, {c: restart-proc}]}'

# Scrolling
mprocs --ctl '{c: scroll-down}'
mprocs --ctl '{c: scroll-up}'
mprocs --ctl '{c: scroll-down-lines, n: 10}'
```

### All Remote Commands

**Navigation:**
- `toggle-focus`, `focus-procs`, `focus-term`
- `zoom`
- `next-proc`, `prev-proc`
- `select-proc` (with `index`)

**Process Control:**
- `start-proc`, `term-proc`, `kill-proc`
- `restart-proc`, `restart-all`
- `force-restart-proc`, `force-restart-all`
- `add-proc` (with `cmd`, optional `name`)
- `duplicate-proc`
- `remove-proc` (with `id`)
- `rename-proc` (with `name`)

**Display:**
- `scroll-down`, `scroll-up`
- `scroll-down-lines` (with `n`)
- `scroll-up-lines` (with `n`)

**Copy Mode:**
- `copy-mode-enter`, `copy-mode-leave`
- `copy-mode-move` (with `dir`: up/down/left/right)
- `copy-mode-end`, `copy-mode-copy`

**Input:**
- `send-key` (with `key`)
- `batch` (with `cmds` array)

**Exit:**
- `quit-or-ask`, `quit`, `force-quit`

## Visual Customization

### Process List Styling

mprocs uses terminal colors. The active process item has a dark gray background (color 240).

To customize colors, modify your terminal's color scheme or use a terminal that supports 256 colors.

### UI Layout Options

```yaml
# Hide keybinding help panel for cleaner look
hide_keymap_window: true

# Adjust process list width
proc_list_width: 35

# Increase scrollback for long outputs
scrollback: 10000

# Faster mouse scrolling
mouse_scroll_speed: 5
```

### Status Indicators

| Status | Color | Meaning |
|--------|-------|---------|
| UP | Green | Process running |
| DOWN (0) | Blue | Exited successfully |
| DOWN (N) | Red | Exited with error code N |

## Integration Patterns

### npm Scripts Integration

```bash
# Load all scripts from package.json (won't auto-start)
mprocs --npm

# Combine with custom config
mprocs --npm --config mprocs.yaml
```

### Justfile Integration (v0.7.3+)

```bash
# Load recipes from justfile
mprocs --just
```

### Development Workflow Example

```yaml
# mprocs.yaml for full-stack development
procs:
  frontend:
    shell: "npm run dev"
    cwd: ./frontend
    env:
      VITE_API_URL: "http://localhost:3000"
    autostart: true

  backend:
    shell: "cargo watch -x run"
    cwd: ./backend
    env:
      DATABASE_URL: "postgres://localhost/mydb"
      RUST_LOG: debug
    autostart: true

  database:
    cmd: ["docker", "compose", "up", "postgres", "redis"]
    autostart: true
    stop: SIGINT

  tests:
    shell: "npm run test:watch"
    cwd: ./frontend
    autostart: false

  logs:
    shell: "tail -f /var/log/app.log"
    autostart: true
    autorestart: true

hide_keymap_window: true
proc_list_width: 20
scrollback: 5000
```

### Microservices Example

```yaml
procs:
  gateway:
    shell: "go run ./cmd/gateway"
    cwd: ./services/gateway
    env:
      PORT: "8080"
    autostart: true
    autorestart: true

  auth-service:
    shell: "python -m uvicorn main:app --reload --port 8081"
    cwd: ./services/auth
    autostart: true

  user-service:
    shell: "node dist/index.js"
    cwd: ./services/user
    env:
      NODE_ENV: development
    autostart: true

  message-queue:
    cmd: ["docker", "run", "--rm", "-p", "5672:5672", "rabbitmq:3"]
    autostart: true
    stop: SIGINT

server: "127.0.0.1:4050"
scrollback: 3000
```

### CI/CD Automation Script

```bash
#!/bin/bash
# Start mprocs in background and wait for services

mprocs --config ci.yaml &
MPROCS_PID=$!

# Wait for services to start
sleep 10

# Run tests via remote control
mprocs --ctl '{c: select-proc, index: 2}'
mprocs --ctl '{c: start-proc}'

# Wait for test completion
sleep 60

# Graceful shutdown
mprocs --ctl '{c: quit}'
wait $MPROCS_PID
```

## Troubleshooting

### Common Issues

**Process won't stop:**
```yaml
# Try different stop signals
stop: SIGKILL      # Force kill
stop: hard-kill    # Cross-platform force

# Or use key sequence for interactive programs
stop:
  send-keys:
    - <C-c>
```

**Autorestart not working:**
- Process must run longer than 1 second before exit
- Check exit code - autorestart only triggers on non-zero codes in some versions

**Keybindings not working:**
- Ensure YAML syntax is correct
- Check for conflicting terminal keybindings
- Use `reset: true` to clear defaults before customizing

**Process crashes immediately:**
```yaml
# Debug with explicit environment
env:
  DEBUG: "*"
  RUST_BACKTRACE: "1"

# Check working directory
cwd: <CONFIG_DIR>/relative/path
```

**Remote control connection refused:**
```bash
# Verify server is enabled
grep "server:" mprocs.yaml

# Check port availability
lsof -i :4050
```

**Colors not displaying:**
- Ensure terminal supports 256 colors
- Check TERM environment variable: `echo $TERM`
- Try: `export TERM=xterm-256color`

### Debug Checklist

1. **Verify config syntax:**
   ```bash
   # Check YAML validity
   python -c "import yaml; yaml.safe_load(open('mprocs.yaml'))"
   ```

2. **Check process manually:**
   ```bash
   # Run command directly to verify it works
   cd ./your/cwd && your-command
   ```

3. **Check environment:**
   ```bash
   # Verify PATH and required vars
   env | grep -E "PATH|NODE|PYTHON"
   ```

4. **Review mprocs version:**
   ```bash
   mprocs --version
   # Check release notes for your version
   ```

## Version History Highlights

| Version | Notable Features |
|---------|------------------|
| v0.8.0 | restart-all, force-restart-all commands |
| v0.7.3 | --just flag, title option, nushell support |
| v0.7.2 | Duplicate process, auto-restart improvements |
| v0.7.0 | Commands menu (p key), cursor shapes |
| v0.6.4 | Experimental Lua scripting |

## Best Practices

1. **Use `cmd` for complex arguments:**
   ```yaml
   # Clearer and safer
   cmd: ["python", "-m", "pytest", "-v", "--cov=src"]
   # Instead of shell escaping
   shell: "python -m pytest -v --cov=src"
   ```

2. **Set explicit stop signals:**
   ```yaml
   # Be explicit about how to stop
   stop: SIGTERM  # For well-behaved processes
   stop: SIGINT   # For interactive processes
   ```

3. **Use `<CONFIG_DIR>` for portability:**
   ```yaml
   cwd: <CONFIG_DIR>/services/api  # Relative to config file
   ```

4. **Clear environment when needed:**
   ```yaml
   env:
     NODE_ENV: production
     DEBUG: null  # Explicitly unset inherited DEBUG
   ```

5. **Increase scrollback for log-heavy processes:**
   ```yaml
   scrollback: 10000  # Default 1000 may be insufficient
   ```

6. **Hide keymap for experienced users:**
   ```yaml
   hide_keymap_window: true  # More screen space for output
   ```

## Resources

- **Repository**: https://github.com/pvolok/mprocs
- **Releases**: https://github.com/pvolok/mprocs/releases
- **Issues**: https://github.com/pvolok/mprocs/issues
- **Schema**: https://json.schemastore.org/mprocs-0.6.4.json
