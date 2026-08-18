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
- Create, Delete and Restore are the currently tested core operations.
- Schedule functionality remains under testing.
