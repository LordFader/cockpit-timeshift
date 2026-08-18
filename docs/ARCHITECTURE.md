# Cockpit Timeshift Architecture

## Purpose

Cockpit Timeshift is a Cockpit web application providing a graphical
interface for Linux Timeshift.

The application communicates with the host Timeshift executable through
Cockpit's JavaScript APIs.

---

## Runtime

Timeshift executable:

    /usr/bin/timeshift

Cockpit API:

    cockpit.spawn()

Systemd API:

    cockpit.spawn(["systemctl", ...])

File API:

    cockpit.file()

---

## Main files

### index.html

Defines the UI structure.

Do not place application logic here unless absolutely necessary.

### timeshift.js

Contains application logic.

Responsibilities include:

- Timeshift communication
- snapshot listing
- snapshot creation
- snapshot deletion
- snapshot restoration
- systemd timer handling
- UI state
- modal dialogs
- notifications

### timeshift.css

Contains visual styling only.

### manifest.json

Registers the Cockpit application.

---

## Privileged operations

Operations requiring root privileges use:

    superuser: "require"

Example:

    cockpit.spawn([...], {
        superuser: "require",
        err: "message"
    });

Never execute arbitrary shell commands when a direct Cockpit API
can perform the operation safely.

---

## Timeshift

The application must treat Timeshift as the source of truth.

Do not maintain a second snapshot database.

Snapshot information should be obtained from:

    timeshift --list

---

## Systemd

Scheduled operation uses:

    cockpit-timeshift.service

and:

    cockpit-timeshift.timer

The UI must reflect actual systemd state.

Never assume that a timer is active merely because the UI says it
was configured.

---

## UI state

The UI should always refresh from the real system state after:

- create
- delete
- restore
- schedule changes

Do not rely exclusively on optimistic UI updates.

---

## Error handling

Errors from Timeshift or systemd must be visible to the user.

Never silently swallow operational errors.

---

## Security

Avoid:

- arbitrary shell interpolation
- unsafe HTML insertion
- inline event handlers
- unnecessary shell commands
- storing passwords or credentials

Use DOM APIs and Cockpit APIs whenever possible.