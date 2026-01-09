#!/bin/bash
# hooks/post-tool-use.sh
# PostToolUse hook - dispatches based on bd comment prefix

set -e

# Only process if we're in a Paydirt context
[ -z "$PAYDIRT_CLAIM" ] && exit 0

# Read the tool output from stdin (Claude passes it)
TOOL_OUTPUT=$(cat)

# Check if this was a bd comments add command
if ! echo "$TOOL_OUTPUT" | grep -q "bd comments add"; then
  exit 0
fi

# Extract the comment content (rough parsing)
COMMENT=$(echo "$TOOL_OUTPUT" | grep -oP '(?<=bd comments add \$PAYDIRT_CLAIM ")[^"]+' || true)
[ -z "$COMMENT" ] && exit 0

# Get the prefix
PREFIX=$(echo "$COMMENT" | cut -d: -f1)

# Dispatch based on prefix
case "$PREFIX" in
  QUESTION)
    # Spawn Claim Agent in background
    if [ -n "$PAYDIRT_BIN" ]; then
      "$PAYDIRT_BIN" prospect claim-agent --claim "$PAYDIRT_CLAIM" &
    fi
    ;;
  SPAWN)
    # Parse: SPAWN: <role> --task "<task>"
    ROLE=$(echo "$COMMENT" | sed 's/SPAWN: //' | cut -d' ' -f1)
    TASK=$(echo "$COMMENT" | grep -oP '(?<=--task ")[^"]+' || echo "")
    if [ -n "$PAYDIRT_BIN" ] && [ -n "$ROLE" ]; then
      "$PAYDIRT_BIN" prospect "$ROLE" --claim "$PAYDIRT_CLAIM" --task "$TASK" &
    fi
    ;;
  *)
    # Other prefixes - no action needed
    ;;
esac

exit 0
