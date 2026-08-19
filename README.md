# Cockpit Timeshift — Dev

A lightweight Cockpit web interface for managing Timeshift system snapshots.

## Version

**v0.1.0-beta** — first publicly released functional beta.

## Features

- View Timeshift snapshots
- Search and filter snapshots
- Create snapshots
- Delete snapshots
- Restore snapshots
- Live operation feedback and elapsed time
- Timeshift device information
- systemd-based scheduling interface

## Current status

Create, Delete and Restore are the currently tested core operations.
The Schedule functionality is included but remains under testing and should be
considered experimental in this beta release.

## Requirements

- Linux system with [Cockpit](https://cockpit-project.org/) installed
- [Timeshift](https://github.com/linuxmint/timeshift) installed at `/usr/bin/timeshift`
- A Cockpit user with permission to perform privileged Timeshift operations

## Installation

Clone the repository and run:

```bash
sudo ./install.sh
```

The Cockpit application is installed to:

```text
/usr/share/cockpit/timeshift/
```

Then refresh Cockpit in the browser.

## Manual installation

The application consists of the following Cockpit files:

```text
manifest.json
index.html
timeshift.js
timeshift.css
```

They can also be copied manually to `/usr/share/cockpit/timeshift/`.

## Permissions and security

The UI uses Cockpit's privileged execution mechanism to run Timeshift. This is
required because snapshot creation, deletion and restoration modify the system.
Only install the application from a source you trust.

See [SECURITY.md](SECURITY.md) for security reporting guidance.

## Development

The project intentionally keeps the Cockpit integration lightweight. The UI
communicates directly with the installed `/usr/bin/timeshift` executable.

Development installations can use `install.sh`; no symlink is required.

## Fork lineage

This project is a fork lineage of
[isivisi/cockpit-timeshift](https://github.com/isivisi/cockpit-timeshift)
(original upstream, kept read-only as a reference):

```text
isivisi/cockpit-timeshift   (original upstream, reference only)
        │
        ▼ fork
LordFader/cockpit-timeshift (canonical, shared collaboration repo)
        │  collaborators: LordFader + PGodinho
        ▼
/usr/share/cockpit/timeshift-dev (local dev checkout)
```

Remotes on the local dev checkout:

| remote     | URL                                        | purpose                      |
|------------|--------------------------------------------|------------------------------|
| `origin`   | `LordFader/cockpit-timeshift`              | shared push/pull (both write)|
| `isivisi`  | `isivisi/cockpit-timeshift`                | upstream reference (read)    |

## Development workflow

1. Edit files in `timeshift-dev`.
2. Check and commit: `node --check timeshift.js`
3. Push to `origin` (branch + PR for changes to `master`).
4. Publish the stable install (requires root):

   ```bash
   cd /usr/share/cockpit/timeshift-dev && sudo ./install.sh
   ```

5. Hard-refresh Cockpit in the browser.

## Packaging

A Debian package is planned for a future release. The current beta is installed
as a native Cockpit application using the standard `/usr/share/cockpit/` layout.

## License

MIT — see [LICENSE](LICENSE).


## Development installation

This archive is the parallel development build. It installs as **Timeshift Dev**
under `/usr/share/cockpit/timeshift-dev` and leaves the stable Timeshift
application untouched.

See `DEV_INSTALL.md` and `DEVELOPMENT.md`.
updated
