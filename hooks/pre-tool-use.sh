#!/bin/bash
# hooks/pre-tool-use.sh
# PreToolUse hook - enforce tool restrictions for Camp Boss
#
# Environment variables:
#   PAYDIRT_PROSPECT - Current agent role
#
# Exit codes:
#   0 - Allow tool use
#   2 - Block tool use (returns message to Claude)

# Only enforce in Paydirt context
[ -z "$PAYDIRT_PROSPECT" ] && exit 0

# Get tool name from $CLAUDE_TOOL_NAME
TOOL_NAME="${CLAUDE_TOOL_NAME:-}"

# Camp Boss restrictions - BLOCK implementation tools
if [ "$PAYDIRT_PROSPECT" = "camp-boss" ]; then
  case "$TOOL_NAME" in
    Write|Edit|NotebookEdit)
      echo "BLOCKED: Camp Boss cannot use $TOOL_NAME tool."
      echo ""
      echo "You are the Camp Boss - you delegate, not implement."
      echo "Use SPAWN to delegate this work:"
      echo ""
      echo "  bd comments add \$PAYDIRT_CLAIM \"SPAWN: trail-boss --task \\\"<task>\\\"\""
      echo ""
      exit 2
      ;;
  esac
fi

exit 0
