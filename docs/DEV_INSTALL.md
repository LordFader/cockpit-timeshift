# Timeshift Dev — Installation

This package installs a parallel Cockpit application at:

`/usr/share/cockpit/timeshift-dev`

It does **not** replace or modify the stable installation at:

`/usr/share/cockpit/timeshift`

## Install

```bash
unzip cockpit-timeshift-v0.1.0-beta-dev.zip
cd cockpit-timeshift-v0.1.0-beta-dev/cockpit-timeshift
sudo ./install.sh
```

Then refresh Cockpit.

You should see two applications:

- **Timeshift** — stable installation
- **Timeshift Dev** — development installation

Both interfaces intentionally use the same system Timeshift executable:

`/usr/bin/timeshift`

## Important

Do not configure two independent Timeshift schedules to run at the same time.
The Dev interface is a development copy of the Cockpit frontend, not a second
Timeshift backend.

## Remove Dev

```bash
sudo rm -rf /usr/share/cockpit/timeshift-dev
```

The stable installation is left untouched.
