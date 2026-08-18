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
[ ] Timer state refreshes
[ ] Next execution is displayed

---

## Settings

[ ] Timeshift executable detected
[ ] Version detected
[ ] Mode detected
[ ] Device detected

---

## Browser console

No application errors should remain.

Known Cockpit warnings that are unrelated to this application may be
ignored if they do not affect functionality.