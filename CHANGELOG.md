# Changelog

## v0.1.0-beta-dev

Parallel development package based on the first approved public beta.

### Included
- Cockpit Timeshift dashboard
- Snapshot listing and filtering
- Create snapshot
- Delete snapshot
- Restore snapshot
- Live operation feedback
- Operation timing and output feedback
- Initial systemd scheduling interface
- Separate `Timeshift Dev` Cockpit application
- Installation target: `/usr/share/cockpit/timeshift-dev`

### Notes
- The stable installation at `/usr/share/cockpit/timeshift` is not modified.
- `install.sh` generates the production build and strips the DEV markers
  (`.dev-badge` badge, `…DEV` title, `Timeshift Dev` tool/label), so the
  stable app shows only **Timeshift**.
- Settings: snapshot mode is a fixed RSYNC/BTRFS dropdown that saves
  `btrfs_mode`; BTRFS is auto-detected (requires a BTRFS root volume) and
  disabled with an explanation otherwise.
- Settings: `/usr/bin/timeshift` is validated (exists + executable) with an
  inline indicator; the path is fixed for security.
- Settings: retention counts are fixed 1–20 dropdowns, preventing
  out-of-range values.
- Schedule: retention count defaults use the common recommendations
  (hourly 2, daily 5, weekly 3, monthly 2, boot 5) when the config has no
  value.
- Create, Delete and Restore are the currently tested core operations.
- Schedule functionality remains under testing.

---

## v0.1.0-beta-dev (2026-08-19)

Snapshot of the first approved public beta (pre-GUI-parity).
