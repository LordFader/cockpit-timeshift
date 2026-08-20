# Testing Checklist

## JavaScript

    node --check timeshift.js

Expected result:

No output and exit code 0.

---

## Timeshift

    sudo timeshift --version

    sudo timeshift --list

---

## Cockpit

Open:

    Timeshift Dev

---

## Overview

[ ] Timeshift version visible
[ ] Snapshot count correct
[ ] Last snapshot correct
[ ] Storage information visible
[ ] Schedule status correct

---

## Create

[ ] Click Create snapshot
[ ] Operation dialog appears
[ ] Progress/activity feedback appears
[ ] Operation completes
[ ] Success message appears
[ ] Snapshot list refreshes
[ ] Snapshot count changes if appropriate

---

## Delete

[ ] Select snapshot
[ ] Confirmation appears
[ ] Operation starts
[ ] Progress/activity feedback appears
[ ] Operation completes
[ ] List refreshes
[ ] Deleted snapshot disappears

---

## Restore

[ ] Select snapshot
[ ] Warning appears
[ ] Confirmation required
[ ] Operation starts
[ ] Feedback remains visible
[ ] Result is reported

---

## Schedule

[ ] Current timer state is detected
[ ] Enable works
[ ] Disable works
[ ] Levels (hourly/daily/weekly/monthly/boot) toggle correctly
[ ] Retention count dropdowns show 1–20 and persist selection
[ ] Recommended defaults shown when config has no count value
[ ] Legacy `cockpit-timeshift.timer` is disabled on save
[ ] `timeshift.timer`/`timeshift.service` written with `--check --scripted`
[ ] Timer state refreshes
[ ] Next execution is displayed

---

## Settings

[ ] Mode dropdown shows RSYNC/BTRFS
[ ] BTRFS option disabled with hint when system is not on BTRFS
[ ] BTRFS save rejected via toast when unavailable
[ ] Changing mode writes `btrfs_mode` and refreshes
[ ] Executable indicator shows "✔ found and executable"
[ ] Version detected
[ ] Device detected
[ ] Excluded items load from config and save back
[ ] Device list scans via lsblk and shows current selection

---

## Browser console

No application errors should remain.

Known Cockpit warnings that are unrelated to this application may be
ignored if they do not affect functionality.