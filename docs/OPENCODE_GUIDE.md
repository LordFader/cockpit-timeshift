# OpenCode Guide

## Project

Cockpit Timeshift.

Development path:

    /usr/share/cockpit/timeshift-dev/

Stable path:

    /usr/share/cockpit/timeshift/

---

# Critical rule

NEVER modify:

    /usr/share/cockpit/timeshift/

The stable installation is read-only from the perspective of normal
development.

All development happens in:

    /usr/share/cockpit/timeshift-dev/

---

# Before changing code

Always inspect:

    git status

    git branch --show-current

Relevant files should be inspected before editing.

---

# Never do automatically

Do not:

- delete snapshots
- restore snapshots
- delete the stable application
- execute destructive system commands
- modify systemd timers
- modify files outside the project
- run git reset --hard
- force push
- rewrite Git history

unless explicitly requested by the user.

---

# Development principles

Prefer minimal changes.

Do not rewrite working code unnecessarily.

Preserve existing functionality.

When fixing a bug:

1. identify the root cause
2. make the smallest reasonable change
3. test the change
4. explain what changed

---

# Cockpit

Use Cockpit APIs where possible.

Timeshift:

    /usr/bin/timeshift

Privileged commands:

    cockpit.spawn(..., { superuser: "require" })

---

# Before declaring success

Run:

    node --check timeshift.js

Then verify the application in Cockpit.

At minimum test the affected functionality.

---

# Git

Do not commit automatically unless explicitly requested.

Before suggesting a commit:

    git diff

    git status

The user should be able to review the changes.

---

# Communication

When a change is potentially destructive or affects system configuration,
stop and ask for confirmation.

Do not assume that "fix" means permission to modify the production
installation.