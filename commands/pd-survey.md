---
description: Show Paydirt Caravan status
---

# Survey Status

Show the current status of Caravans.

## Steps

1. Run this command to get Caravan status:
```bash
paydirt survey
```

2. Also check bd for Caravan issues:
```bash
bd list --label paydirt:caravan --brief
```

3. Display a summary:
```
╭────────────────────────────────────────╮
│  🗺️ SURVEY RESULTS                     │
├────────────────────────────────────────┤
│  Active: X  │  Idle: Y  │  Total: Z    │
╰────────────────────────────────────────╯
```
