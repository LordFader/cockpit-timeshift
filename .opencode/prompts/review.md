# Code Review Prompt

Review the current Cockpit Timeshift Dev implementation.

Look specifically for:

- JavaScript errors
- null DOM references
- event handlers referencing missing elements
- Cockpit API misuse
- privilege handling
- shell command injection risks
- unsafe HTML generation
- broken navigation
- stale UI state
- race conditions
- destructive operations without confirmation
- systemd integration errors
- Timeshift command compatibility

Do not modify files.

Return:

1. Critical issues
2. Important issues
3. Minor issues
4. Suggested improvements