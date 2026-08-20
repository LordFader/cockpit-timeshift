(() => {
  "use strict";

  const TS = "/usr/bin/timeshift";
  const TIMER = "timeshift.timer";
  const SERVICE = "timeshift.service";
  const LEGACY_TIMER = "cockpit-timeshift.timer";

  const {
    SCHEDULE_LEVELS,
    RECOMMENDED_COUNTS,
    humanBytes,
    shortUuid,
    cap,
    readScheduleLevels,
    flattenDevices,
    parseList,
    parseHeader
  } = (window.TSParsers || globalThis.TSParsers || {});

  const state = {
    snapshots: [],
    version: "--",
    mode: "--",
    privilege: "--",
    btrfsAvailable: false,
    devices: "--",
    device: "--",
    uuid: "--",
    timeshiftStatus: "--",
    freeSpace: "--",
    scheduleEnabled: false,
    timerActive: false,
    nextSnapshot: "--",
    configured: true,
    devicesList: [],
    backupUuid: "",
    excludes: []
  };

  const $ = id => document.getElementById(id);
  let operationTimer = null;
  let operationStarted = 0;
  let operationLines = 0;
  let operationRunning = false;

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[c]));
  }

  function toast(message, error = false) {
    const box = $("toastContainer");
    if (!box) return;
    const el = document.createElement("div");
    el.className = `toast${error ? " error" : ""}`;
    el.textContent = message;
    box.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  function setError(message) {
    const el = $("globalError");
    if (!el) return;
    el.textContent = message;
    el.classList.remove("hidden");
  }

  function clearError() {
    $("globalError")?.classList.add("hidden");
  }

  function run(args) {
    return cockpit.spawn([TS, ...args], {
      superuser: "try",
      err: "message"
    });
  }

  function sys(args) {
    return cockpit.spawn(["systemctl", ...args], {
      superuser: "require",
      err: "message"
    });
  }

  function sysRead(args) {
    return cockpit.spawn(["systemctl", ...args], { err: "message" });
  }

  async function writeSystemFile(path, content) {
    const file = cockpit.file(path, { superuser: "require" });
    try {
      await file.replace(content);
    } finally {
      file.close();
    }
  }

  async function readTimeshiftConfig() {
    try {
      const file = cockpit.file("/etc/timeshift/timeshift.json");
      const text = String((await file.read()) || "");
      file.close();
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  async function timeshiftIsConfigured() {
    const cfg = await readTimeshiftConfig();
    if (!cfg) return null;
    const firstRun = String(cfg.do_first_run).toLowerCase() === "true";
    const deviceUuid = String(cfg.backup_device_uuid || "").trim();
    return !firstRun && deviceUuid !== "";
  }

  async function loadDeviceData() {
    try {
      const json = await cockpit.spawn([
        "lsblk", "-J", "-b", "-o", "NAME,PATH,SIZE,FSTYPE,LABEL,UUID,MOUNTPOINTS"
      ]);
      const data = JSON.parse(json);
      state.devicesList = flattenDevices(data.blockdevices).map(n => {
        const mp = n.mountpoints;
        const mounts = Array.isArray(mp)
          ? mp.filter(Boolean)
          : String(mp || "").split(/[\r\n]+/).filter(Boolean);
        return {
          device: n.path,
          name: n.name,
          size: Number(n.size) || 0,
          fstype: n.fstype,
          label: n.label || "",
          uuid: n.uuid || "",
          mounts
        };
      });
    } catch {
      state.devicesList = [];
    }
    const cfg = await readTimeshiftConfig();
    state.backupUuid = (cfg && String(cfg.backup_device_uuid || "").trim()) || "";

    const rootBtrfs = state.devicesList.some(d =>
      d.fstype === "btrfs" && d.mounts.includes("/"));
    state.btrfsAvailable = rootBtrfs;
  }

  function renderDevices() {
    const host = $("deviceList");
    if (!host) return;
    host.textContent = "";

    if (!state.devicesList.length) {
      host.innerHTML = `<p class="muted">No eligible Linux devices found (ext4/xfs/btrfs). Press Refresh to rescan.</p>`;
      return;
    }

    for (const d of state.devicesList) {
      const selected = d.uuid === state.backupUuid;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `device-item${selected ? " selected" : ""}`;
      btn.dataset.device = d.device;
      btn.title = selected ? "Current backup device" : "Set as backup device";
      btn.innerHTML = `
        <span class="device-radio">${selected ? "●" : "○"}</span>
        <span class="device-main">
          <strong>${esc(d.device)}</strong>
          <em>${esc(humanBytes(d.size))} · ${esc(d.fstype)}${d.label ? ` · ${esc(d.label)}` : ""}${d.uuid ? ` · ${esc(shortUuid(d.uuid))}` : ""}</em>
        </span>
        <span class="device-mount">${d.mounts.length ? "mounted" : "not mounted"}</span>
      `;
      host.appendChild(btn);
    }
  }

  async function selectDevice(device) {
    const dev = state.devicesList.find(d => d.device === device);
    if (!dev || !dev.uuid) {
      toast("Device has no UUID and cannot be used by Timeshift.", true);
      return;
    }
    const cfg = (await readTimeshiftConfig()) || {};
    cfg.backup_device_uuid = dev.uuid;
    cfg.parent_device_uuid = dev.uuid;
    cfg.do_first_run = "false";
    await writeSystemFile("/etc/timeshift/timeshift.json", JSON.stringify(cfg, null, 2));
    state.backupUuid = dev.uuid;
    toast(`Backup device set to ${dev.device}.`);
    await refresh();
  }

  function renderExcludes() {
    const input = $("excludesInput");
    if (input && input !== document.activeElement) {
      input.value = state.excludes.join("\n");
    }
  }

  async function refreshExcludes() {
    const cfg = await readTimeshiftConfig();
    const list = (cfg && Array.isArray(cfg.exclude)) ? cfg.exclude : [];
    state.excludes = list.filter(x => typeof x === "string");
    renderExcludes();
  }

  async function saveExcludes() {
    const raw = String($("excludesInput")?.value || "").split(/\r?\n/);
    const list = raw.map(x => x.trim()).filter(Boolean);
    const cfg = (await readTimeshiftConfig()) || {};
    cfg.exclude = list;
    await writeSystemFile("/etc/timeshift/timeshift.json", JSON.stringify(cfg, null, 2));
    state.excludes = list;
    $("excludesSaved").textContent = "Exclusions saved.";
    toast("Exclusion list updated.");
  }

  async function snapshotSize(id) {
    for (const p of [`/timeshift/snapshots/${id}`, `/run/timeshift/backup/snapshots/${id}`]) {
      try {
        const out = await cockpit.spawn(["du", "-sb", p], {
          superuser: "try",
          err: "message"
        });
        const m = String(out).trim().match(/^\s*(\d+)/);
        if (m) return humanBytes(Number(m[1]));
      } catch {}
    }
    return "—";
  }

  async function loadSnapshotSizes() {
    for (const snap of state.snapshots) {
      if (snap.size && snap.size !== "--") continue;
      snap.size = await snapshotSize(snap.id);
      renderTables();
    }
  }

  function filteredSnapshots() {
    const q = ($("snapshotSearch")?.value || "").trim().toLowerCase();
    const type = ($("typeFilter")?.value || "all").toLowerCase();

    return state.snapshots.filter(s => {
      const matchesText = !q || [
        s.id, s.date, s.time, s.comment, s.tags, s.type
      ].join(" ").toLowerCase().includes(q);

      const matchesType =
        type === "all" ||
        (type === "scheduled" && s.type === "Scheduled") ||
        (type === "on-demand" && s.type === "On-demand");

      return matchesText && matchesType;
    });
  }

  function row(snapshot) {
    return `
      <tr>
        <td><strong>${esc(snapshot.date)} ${esc(snapshot.time)}</strong></td>
        <td><span class="badge ${snapshot.type === "Scheduled" ? "success" : ""}">${esc(snapshot.type)}</span></td>
        <td>${esc(snapshot.comment)}</td>
        <td>${esc(snapshot.size)}</td>
        <td><span class="badge success">${esc(snapshot.status)}</span></td>
        <td>
          <div class="table-actions">
            <button class="small-button" data-action="restore" data-id="${esc(snapshot.id)}">Restore</button>
            <button class="small-button danger" data-action="delete" data-id="${esc(snapshot.id)}">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }

  function renderTables() {
    const recent = $("recentTable");
    const table = $("snapshotTable");
    const empty = $("emptyState");

    if (recent) {
      recent.innerHTML = state.snapshots.length
        ? state.snapshots.slice(0, 5).map(row).join("")
        : `<tr><td colspan="6" class="muted">No snapshots detected.</td></tr>`;
    }

    if (table) {
      const rows = filteredSnapshots();
      table.innerHTML = rows.map(row).join("");
      empty?.classList.toggle("hidden", rows.length !== 0);
    }
  }

  function renderStats() {
    const latest = state.snapshots[0];

    $("snapshotCount").textContent = String(state.snapshots.length);
    $("lastSnapshot").textContent = latest ? `${latest.date} ${latest.time}` : "—";
    $("lastSnapshotType").textContent = latest ? latest.type : "—";
    $("diskFree").textContent = state.freeSpace;
    $("diskMeta").textContent = state.device !== "--" ? state.device : "snapshot storage";
    $("nextSnapshot").textContent = state.nextSnapshot;
    $("nextSnapshotMeta").textContent = state.scheduleEnabled ? "systemd timer" : "not scheduled";
  }

  function renderSettings() {
    $("version").value = state.version;
    const modeSelect = $("snapshotMode");
    const btrfsOpt = modeSelect?.querySelector('option[value="BTRFS"]');
    if (btrfsOpt) btrfsOpt.disabled = !state.btrfsAvailable;
    modeSelect.value = ["RSYNC", "BTRFS"].includes(state.mode) ? state.mode : "RSYNC";
    $("privilege").value = state.privilege;

    const modeHint = modeSelect?.closest("label")?.querySelector(".mode-hint");
    if (modeHint) {
      modeHint.textContent = state.btrfsAvailable
        ? "RSYNC works on most filesystems; BTRFS uses native snapshots (available on this system)."
        : "RSYNC works on most filesystems. BTRFS is unavailable — the system is not on a BTRFS volume.";
    }

    $("storageInfo").textContent =
      `Device: ${state.device} · UUID: ${state.uuid} · Mode: ${state.mode} · Status: ${state.timeshiftStatus}`;

    $("devices").textContent = state.devices;
    renderDevices();
  }

  function renderProtection() {
    const banner = $("statusBanner");
    const icon = $("statusIcon");
    const status = $("protectionStatus");
    const sub = $("protectionSub");

    banner?.classList.remove("warning", "error");

    if (state.configured === false) {
      banner?.classList.add("warning");
      icon.textContent = "!";
      status.textContent = "Timeshift not configured";
      sub.textContent = "No backup device selected. Configure Timeshift to enable protection.";
    } else if (state.timeshiftStatus !== "--" && state.timeshiftStatus !== "OK") {
      banner?.classList.add("error");
      icon.textContent = "!";
      status.textContent = "Timeshift reports a problem";
      sub.textContent = `Timeshift status: ${state.timeshiftStatus}`;
    } else if (!state.snapshots.length) {
      banner?.classList.add("warning");
      icon.textContent = "!";
      status.textContent = "No snapshots detected";
      sub.textContent = "Timeshift is installed, but no restore points were found.";
    } else {
      icon.textContent = "✓";
      status.textContent = "System protected";
      sub.textContent = `${state.snapshots.length} restore point${state.snapshots.length === 1 ? "" : "s"} available.`;
    }

    const badge = $("scheduleBadge");
    badge.textContent = state.timerActive
      ? "Scheduled"
      : state.scheduleEnabled
        ? "Enabled"
        : "Manual only";

    badge.className = `badge ${state.timerActive ? "success" : ""}`;
  }

  async function refreshTimeshift() {
    const version = await run(["--version"]);
    state.version = String(version).trim().split(/\r?\n/)[0] || "Detected";

    const list = await run(["--list"]);
    Object.assign(state, parseHeader(list));
    state.snapshots = parseList(list);

    try {
      state.devices = String(await run(["--list-devices"])).trim() || "No device information returned.";
    } catch {
      state.devices = "Unable to load device information.";
    }
  }

  async function getTimerState() {
    let enabled = "disabled";
    let active = "inactive";
    let next = "";

    try { enabled = String(await sysRead(["is-enabled", TIMER])).trim(); } catch {}
    try { active = String(await sysRead(["is-active", TIMER])).trim(); } catch {}
    try {
      next = String(await sysRead([
        "show", TIMER, "--property=NextElapseUSecRealtime", "--value"
      ])).trim();
    } catch {}

    return { enabled, active, next };
  }

async function refreshSchedule() {
    const cfg = (await readTimeshiftConfig()) || {};
    const levels = readScheduleLevels(cfg);

    for (const lvl of SCHEDULE_LEVELS) {
      $(`sched${cap(lvl)}`).checked = levels[lvl];
      const count = $(`count${cap(lvl)}`);
      if (count) {
        if (!count.dataset.populated) {
          for (let n = 1; n <= 20; n++) count.add(new Option(String(n), String(n)));
          count.dataset.populated = "1";
        }
        count.value = String(cfg[`count_${lvl}`] ?? RECOMMENDED_COUNTS[lvl]);
      }
    }

    state.scheduleEnabled = SCHEDULE_LEVELS.some(lvl => levels[lvl]);
    $("scheduleEnabled").checked = state.scheduleEnabled;

    const t = await getTimerState();
    state.timerActive = t.active === "active";
    state.nextSnapshot = t.next || (state.scheduleEnabled ? "Waiting" : "Not scheduled");

    $("timerStatus").textContent = [
      `enabled: ${t.enabled}`,
      `active: ${t.active}`,
      `next: ${t.next || "--"}`,
      `unit: ${TIMER}`,
      `executable: ${TS}`
    ].join("\n");

    $("scheduleBadge").textContent =
      state.timerActive ? "Scheduled" :
      state.scheduleEnabled ? "Enabled" : "Manual only";

    $("scheduleBadge").className =
      `badge ${state.timerActive ? "success" : ""}`;
  }

  async function checkExecutable() {
    const el = $("execCheck");
    if (!el) return;
    try {
      await cockpit.spawn(["sh", "-c", `test -x ${TS}`], { superuser: "try" });
      el.textContent = "✔ found and executable";
      el.classList.remove("bad");
      el.classList.add("good");
    } catch {
      el.textContent = "✘ not found or not executable";
      el.classList.remove("good");
      el.classList.add("bad");
    }
  }

  async function refresh() {
    clearError();
    $("connectionText").textContent = "Refreshing…";

    try {
      await refreshTimeshift();
      try { await loadDeviceData(); } catch {}
      try { await refreshExcludes(); } catch {}
      try { await checkExecutable(); } catch {}
      renderStats();
      renderTables();
      loadSnapshotSizes();
      renderSettings();
      renderProtection();

      await refreshSchedule();
      renderStats();
      renderProtection();

      $("connectionText").textContent = "Connected";
      $("connectionDot").classList.remove("offline");
    } catch (error) {
      $("connectionText").textContent = "Error";
      $("connectionDot").classList.add("offline");

      const configured = await timeshiftIsConfigured();
      const msg = String(error?.message || error || "");
      const looksUnconfigured = configured === false ||
        (configured === null && /gee_abstract_collection_get_size|Device\s*:\s*Not (Selected|Found)/i.test(msg));

      state.configured = configured !== false;
      renderProtection();

      if (looksUnconfigured) {
        setError(`${TS} is installed but has no backup device configured. Open the Timeshift app ("sudo timeshift-gtk") to select a backup device, then refresh.`);
        toast("Timeshift is not configured to use a backup device.", true);
      } else {
        setError(`Unable to communicate with ${TS}. ${msg}`);
        toast("Timeshift communication failed.", true);
      }
    }
  }

  function showView(view) {
    const views = ["overview", "snapshots", "schedule", "settings"];

    views.forEach(name => {
      $(`${name}View`)?.classList.toggle("hidden", name !== view);
    });

    document.querySelectorAll(".nav-item").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.view === view);
    });

    const titles = {
      overview: ["Timeshift", "Create, inspect and restore system snapshots."],
      snapshots: ["Snapshots", "Browse and manage available restore points."],
      schedule: ["Schedule", "Configure automatic system snapshots."],
      settings: ["Settings", "Inspect Timeshift integration and storage."]
    };

    const title = titles[view];
    if (title) {
      $("pageTitle").textContent = title[0];
      $("pageDescription").textContent = title[1];
    }

    $("sidebar")?.classList.remove("open");
  }

  function closeModal(force = false) {
    if (operationRunning && !force) return;
    stopOperationUi();
    $("modalBackdrop")?.classList.add("hidden");
  }

  function openModal(title, body, confirmText, callback, danger = false) {
    stopOperationUi();
    // Always start a modal with a clean operation/progress state.
    // This prevents the result of the previous Create/Delete/Restore
    // operation from being shown when a new operation is opened.
    resetProgressUi("Working…");
    $("modalTitle").textContent = title;
    $("modalBody").innerHTML = `<div class="modal-body">${body}</div>`;
    $("modalActions").innerHTML = `
      <button class="secondary-button" id="cancelModal" type="button">Cancel</button>
      <button class="${danger ? "danger-button" : "primary-button"}" id="confirmModal" type="button">${esc(confirmText)}</button>
    `;
    $("modalBackdrop").classList.remove("hidden");

    $("cancelModal").onclick = closeModal;
    $("confirmModal").onclick = async () => {
      const button = $("confirmModal");
      button.disabled = true;
      try {
        await callback();
        closeModal(true);
      } catch (error) {
        finishOperation(false, error?.message || String(error));
        toast(error?.message || String(error), true);
        button.disabled = false;
      }
    };
  }

  function resetProgressUi(title = "Working…") {
    const area = $("progressArea");
    if (!area) return;
    area.classList.add("hidden", "indeterminate");
    $("progressTitle").textContent = title;
    $("progressPhase").textContent = "Preparing Timeshift";
    $("progressPercent").textContent = "—";
    $("progressBar").style.width = "0%";
    $("progressElapsed").textContent = "00:00";
    $("progressCounter").textContent = "Waiting for output…";
    $("progressLog").textContent = "";
    operationLines = 0;
  }

  function startOperationUi(title) {
    operationRunning = true;
    operationStarted = Date.now();
    resetProgressUi(title);
    $("progressArea")?.classList.remove("hidden");
    $("progressArea")?.classList.add("indeterminate");
    $("modalBackdrop")?.classList.add("operation-running");
    $("progressTitle").textContent = title;
    $("confirmModal")?.classList.add("hidden");
    $("cancelModal")?.classList.add("hidden");

    operationTimer = setInterval(() => {
      const seconds = Math.floor((Date.now() - operationStarted) / 1000);
      const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
      const ss = String(seconds % 60).padStart(2, "0");
      $("progressElapsed").textContent = `${mm}:${ss}`;
    }, 500);
  }

  function stopOperationUi() {
    if (operationTimer) clearInterval(operationTimer);
    operationTimer = null;
    operationRunning = false;
    $("modalBackdrop")?.classList.remove("operation-running");
  }

  function appendProgressOutput(data) {
    const text = String(data || "").replace(/\x1b\[[0-?]*[ -\/]*[@-~]/g, "");
    const chunks = text.split(/\r|\n/).map(x => x.trim()).filter(Boolean);
    if (!chunks.length) return;

    for (const line of chunks) {
      operationLines++;
      const percent = line.match(/(?:^|\s)(\d{1,3}(?:\.\d+)?)%/);
      if (percent) {
        const value = Math.max(0, Math.min(100, Number(percent[1])));
        $("progressArea")?.classList.remove("indeterminate");
        $("progressBar").style.width = `${value}%`;
        $("progressPercent").textContent = `${Math.round(value)}%`;
      }

      const lower = line.toLowerCase();
      let phase = "Creating snapshot";
      if (lower.includes("mount")) phase = "Mounting snapshot storage";
      else if (lower.includes("rsync") || lower.includes("copy")) phase = "Copying system data";
      else if (lower.includes("creating") || lower.includes("snapshot")) phase = "Creating snapshot";
      else if (lower.includes("boot")) phase = "Updating boot files";
      else if (lower.includes("unmount")) phase = "Unmounting storage";
      $("progressPhase").textContent = phase;

      const log = $("progressLog");
      if (log) {
        const lines = log.textContent ? log.textContent.split("\n") : [];
        lines.push(line);
        log.textContent = lines.slice(-12).join("\n");
        log.scrollTop = log.scrollHeight;
      }
    }
    $("progressCounter").textContent = `${operationLines} live output update${operationLines === 1 ? "" : "s"}`;
  }

  function finishOperation(success, message = "", successMessage = "Operation completed successfully") {
    if (success) {
      $("progressArea")?.classList.remove("indeterminate");
      $("progressBar").style.width = "100%";
      $("progressPercent").textContent = "100%";
      $("progressPhase").textContent = "Snapshot completed";
      $("progressCounter").textContent = successMessage;
    } else {
      $("progressArea")?.classList.remove("indeterminate");
      $("progressPhase").textContent = "Operation failed";
      $("progressCounter").textContent = message || "Timeshift returned an error";
    }
    stopOperationUi();
  }

  async function runSnapshotOperation(args, title) {
    startOperationUi(title);
    const process = cockpit.spawn([TS, ...args], {
      superuser: "require",
      err: "out",
      pty: true,
      batch: 1,
      latency: 100
    });
    process.stream(appendProgressOutput);
    try {
      const output = await process;
      if (output) appendProgressOutput(output);
      finishOperation(true);
      return output;
    } catch (error) {
      finishOperation(false, error?.message || String(error));
      throw error;
    }
  }

  function createSnapshot() {
    openModal(
      "Create snapshot",
      `
        <div class="form-grid">
          <label class="full">Comment
            <input class="input" id="newComment" value="Manual system snapshot" maxlength="120">
          </label>
        </div>
        <p style="margin-top:14px">Timeshift will create a new restore point using its configured storage.</p>
      `,
      "Create snapshot",
      async () => {
        const comment = $("newComment").value.trim() || "Manual system snapshot";
        await runSnapshotOperation(["--create", "--comments", comment, "--scripted"], "Creating snapshot");
        toast("Snapshot created successfully.");
        await refresh();
      }
    );
  }

  function restoreSnapshot(id) {
    const snap = state.snapshots.find(s => s.id === id);
    const meta = snap
      ? `
       <ul class="summary-list">
         <li><strong>${esc(`${snap.date} ${snap.time}`)}</strong> · ${esc(snap.type)}${snap.comment !== "--" ? ` · ${esc(snap.comment)}` : ""}</li>
       </ul>`
      : "";
    openModal(
      "Restore snapshot",
      `<p>Restore the system to snapshot <strong>${esc(id)}</strong>?</p>
       ${meta}
       <div class="restore-notes">
         <p><strong>What will happen</strong></p>
         <ul>
           <li>System files and settings are restored to the state of this snapshot.</li>
           <li>Boot files and EFI are handled automatically by Timeshift.</li>
           <li>User data under <code>/home</code> is excluded by default and remains untouched.</li>
           <li>Timeshift reinstalls the bootloader automatically if needed.</li>
         </ul>
       </div>
       <p style="margin-top:12px;color:var(--warning)">This changes the system and requires a reboot to complete.</p>`,
      "Restore",
      async () => {
        await runSnapshotOperation(["--restore", "--snapshot", id, "--scripted"], "Restoring snapshot");
        toast("Restore command completed.");
        await refresh();
      },
      true
    );
  }

  function deleteSnapshot(id) {
    openModal(
      "Delete snapshot",
      `<p>Delete <strong>${esc(id)}</strong>?</p>
       <p style="margin-top:12px">This cannot be undone.</p>`,
      "Delete",
      async () => {
        await runSnapshotOperation(["--delete", "--snapshot", id, "--scripted"], "Deleting snapshot");
        toast("Snapshot deleted successfully.");
        await refresh();
      },
      true
    );
  }

  function deleteAll() {
    openModal(
      "Delete all snapshots",
      `<p>Delete every Timeshift snapshot?</p>
       <p style="margin-top:12px;color:var(--danger)">This action cannot be undone.</p>`,
      "Delete all",
      async () => {
        await runSnapshotOperation(["--delete-all", "--scripted"], "Deleting all snapshots");
        toast("All snapshots deleted successfully.");
        await refresh();
      },
      true
    );
  }

  async function saveSchedule() {
    const cfg = (await readTimeshiftConfig()) || {};
    const enabled = $("scheduleEnabled").checked;
    const onLevels = new Set();

    for (const lvl of SCHEDULE_LEVELS) {
      const on = !enabled ? false : $(`sched${cap(lvl)}`).checked === true;
      cfg[`schedule_${lvl}`] = on ? "true" : "false";
      const raw = parseInt(String($(`count${cap(lvl)}`)?.value || "0"), 10);
      const n = Math.max(1, Math.min(20, Number.isFinite(raw) ? raw : 1));
      cfg[`count_${lvl}`] = String(on ? n : n);
      if (on) onLevels.add(lvl);
    }

    if (enabled && !onLevels.size) {
      toast("Enable at least one snapshot level.", true);
      return;
    }

    await writeSystemFile("/etc/timeshift/timeshift.json", JSON.stringify(cfg, null, 2));

    if (enabled) {
      await writeSystemFile(`/etc/systemd/system/${SERVICE}`, [
        "[Unit]",
        "Description=Run timeshift on schedule",
        "ConditionPathExists=/usr/bin/timeshift",
        "",
        "[Service]",
        "Type=oneshot",
        "ExecStart=/usr/bin/timeshift --check --scripted",
        ""
      ].join("\n"));
      await writeSystemFile(`/etc/systemd/system/${TIMER}`, [
        "[Unit]",
        "Description=Run timeshift on schedule",
        "",
        "[Timer]",
        "OnCalendar=hourly",
        "Persistent=true",
        "AccuracySec=1min",
        `Unit=${SERVICE}`,
        "",
        "[Install]",
        "WantedBy=timers.target",
        ""
      ].join("\n"));
      await sys(["daemon-reload"]);
      await sys(["enable", "--now", TIMER]);
      try { await sys(["disable", "--now", LEGACY_TIMER]); } catch {}
      $("scheduleSaved").textContent = "Schedule enabled (timeshift checks hourly, snapshots when a level is due).";
      toast("Timeshift native scheduling enabled.");
    } else {
      try { await sys(["disable", "--now", TIMER]); } catch {}
      try { await sys(["disable", "--now", LEGACY_TIMER]); } catch {}
      state.scheduleEnabled = false;
      state.timerActive = false;
      $("scheduleSaved").textContent = "Schedule disabled.";
      toast("Schedule disabled.");
    }

    await refreshSchedule();
    renderStats();
  }

  function bindEvents() {
    document.querySelectorAll(".nav-item").forEach(btn => {
      btn.addEventListener("click", () => showView(btn.dataset.view));
    });

    document.querySelectorAll("[data-view-target]").forEach(btn => {
      btn.addEventListener("click", () => showView(btn.dataset.viewTarget));
    });

    $("createSnapshot").onclick = createSnapshot;
    $("refresh").onclick = refresh;
    $("refreshTimer").onclick = refreshSchedule;
    $("saveSchedule").onclick = async () => {
      try {
        await saveSchedule();
      } catch (error) {
        setError(`Could not configure systemd: ${error?.message || String(error)}`);
        toast("Schedule configuration failed.", true);
      }
    };

    $("saveExcludes").onclick = async () => {
      try {
        await saveExcludes();
      } catch (error) {
        setError(`Could not save exclusions: ${error?.message || String(error)}`);
        toast("Could not save exclusions.", true);
      }
    };

    $("clearSnapshots").onclick = deleteAll;
    $("snapshotSearch").oninput = renderTables;
    $("typeFilter").onchange = renderTables;

    $("snapshotMode").onchange = async () => {
      try {
        const mode = $("snapshotMode").value;
        if (mode === "BTRFS" && !state.btrfsAvailable) {
          toast("BTRFS mode is unavailable on this system.", true);
          $("snapshotMode").value = "RSYNC";
          return;
        }
        const cfg = (await readTimeshiftConfig()) || {};
        cfg.btrfs_mode = (mode === "BTRFS") ? "true" : "false";
        await writeSystemFile("/etc/timeshift/timeshift.json", JSON.stringify(cfg, null, 2));
        toast(`Snapshot mode set to ${mode}.`);
        await refresh();
      } catch (error) {
        setError(`Could not save snapshot mode: ${error?.message || String(error)}`);
        toast("Could not save snapshot mode.", true);
      }
    };

    $("recentTable").addEventListener("click", handleTableAction);
    $("snapshotTable").addEventListener("click", handleTableAction);

    const deviceList = $("deviceList");
    if (deviceList) {
      deviceList.addEventListener("click", e => {
        const btn = e.target.closest("button[data-device]");
        if (!btn || btn.disabled) return;
        btn.disabled = true;
        selectDevice(btn.dataset.device).finally(() => { btn.disabled = false; });
      });
    }

    $("mobileMenu").onclick = () => $("sidebar").classList.toggle("open");
    $("closeModal").onclick = closeModal;
    $("modalBackdrop").addEventListener("click", e => {
      if (e.target === $("modalBackdrop")) closeModal();
    });

    $("themeToggle").onclick = () => {
      const light = document.body.dataset.theme === "light";
      document.body.dataset.theme = light ? "dark" : "light";

      if (!light) {
        const root = document.documentElement;
        root.style.setProperty("--bg", "#f5f6f7");
        root.style.setProperty("--panel", "#fff");
        root.style.setProperty("--panel-2", "#f0f2f4");
        root.style.setProperty("--panel-3", "#fff");
        root.style.setProperty("--border", "#d2d8de");
        root.style.setProperty("--text", "#15191d");
        root.style.setProperty("--muted", "#59636d");
      } else {
        ["--bg","--panel","--panel-2","--panel-3","--border","--text","--muted"]
          .forEach(p => document.documentElement.style.removeProperty(p));
      }
    };
  }

  function handleTableAction(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = button.dataset.id;
    if (!id) return;

    if (button.dataset.action === "restore") restoreSnapshot(id);
    if (button.dataset.action === "delete") deleteSnapshot(id);
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindEvents();
    showView("overview");

    // Navigation is ready before any privileged operation starts.
    setTimeout(refresh, 0);
  });
})();
