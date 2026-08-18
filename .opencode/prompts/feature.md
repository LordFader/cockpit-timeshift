# Feature Development Prompt

Implement the requested feature in Cockpit Timeshift Dev.

Rules:

- Work only in /usr/share/cockpit/timeshift-dev/
- Preserve existing functionality.
- Do not modify /usr/share/cockpit/timeshift/.
- Reuse existing Cockpit APIs and application patterns.
- Avoid unnecessary dependencies.
- Avoid arbitrary shell commands.
- Do not introduce destructive behaviour without explicit confirmation.

Before coding:

1. inspect relevant files
2. explain the implementation plan
3. identify potential risks

After coding:

1. run node --check timeshift.js
2. inspect git diff
3. explain how the feature was tested