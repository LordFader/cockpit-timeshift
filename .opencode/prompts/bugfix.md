# Bug Fix Prompt

Investigate the reported bug in Cockpit Timeshift.

Rules:

1. Work only in /usr/share/cockpit/timeshift-dev/
2. Do not modify the stable installation.
3. Inspect the existing implementation before changing it.
4. Identify the root cause.
5. Make the smallest safe change.
6. Do not remove working functionality.
7. Run node --check timeshift.js.
8. Explain the files changed and why.
9. Do not commit unless explicitly requested.

Before editing, report:

- suspected cause
- files that need changing
- proposed solution