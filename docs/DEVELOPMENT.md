# Development Workflow

## Stable

Stable frontend:

`/usr/share/cockpit/timeshift`

Do not develop directly in this directory.

## Development

Development frontend:

`/usr/share/cockpit/timeshift-dev`

Use this installation for UI changes, bug fixes and experimental features.

## Release flow

1. Develop and test in `Timeshift Dev`.
2. Test Create, Delete and Restore.
3. Test Schedule separately.
4. Update the changelog and version.
5. Promote the tested code to the stable branch/release via `install.sh`
   (it strips the DEV markers: badge, DEV title and `Timeshift Dev` label).
6. Create a Git tag such as `v0.2.0-beta`.

## DEV markers

The Dev frontend intentionally identifies itself as **Timeshift Dev** (manifest
label, topbar badge `.dev-badge`, `<title>…DEV</title>`). When `install.sh`
promotes the code to the stable installation it removes these markers so the
production app shows only **Timeshift**.

The stable and development frontends share `/usr/bin/timeshift`.
