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

### Snapshot mode

Timeshift supports two snapshot modes:

- **RSYNC** — copies the system with rsync; works on most filesystems.
- **BTRFS** — native BTRFS snapshots; only available when the root
  filesystem (`/`) is a BTRFS volume.

The mode is stored in the Timeshift config as `btrfs_mode`
(`/etc/timeshift/timeshift.json`).

The UI derives `btrfsAvailable` from the `lsblk` device scan: a device
whose filesystem is `btrfs` and that is mounted at `/`. The Settings
dropdown disables the BTRFS option when unavailable, explains why via the
mode hint, and rejects a BTRFS save with a toast instead of writing an
invalid `btrfs_mode`. The `timeshift` executable remains the final
authority on whether a mode is usable.

### Executable validity

The Settings page asserts `/usr/bin/timeshift` exists and is executable
(`test -x`) and shows the result inline as a pass/fail indicator. The
binary path is fixed and not user-editable: the UI runs it with elevated
privileges, so an arbitrary path would be an unsafe root-execution
vector.

### Retention counts

Each schedule level (hourly/daily/weekly/monthly/boot) exposes its
retention count as a fixed 1–20 `<select>` (populated once in
`refreshSchedule`), preventing out-of-range values.

---

## Systemd

Scheduled operation uses the native Timeshift units:

    timeshift.service

and:

    timeshift.timer

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