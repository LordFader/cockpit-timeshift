(() => {
  "use strict";

  const TS = "/usr/bin/timeshift";
  const TIMER = "cockpit-timeshift.timer";
  const SERVICE = "cockpit-timeshift.service";

  const state = {
    snapshots: [],
    version: "--",
    mode: "--",
    privilege: "--",
    devices: "--",
    device: "--",
    uuid: "--",
    timeshiftStatus: "--",
    freeSpace: "--",
    scheduleEnabled: false,
    timerActive: false,
    nextSnapshot: "--",
    configured: true
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
      superuser: "require",
      err: "message"
    });
  }

  function sys(args) {
    return cockpit.spawn(["systemctl", ...args], {
      superuser: "require",
      err: "message"
    });
  }

  async function writeSystemFile(path, content) {
    const file = cockpit.file(path, { superuser: "require" });
    try {
      await file.replace(content);
    } finally {
      file.close();
    }
  }

  async function timeshiftIsConfigured() {
    try {
      const file = cockpit.file("/etc/timeshift/timeshift.json", { superuser: "require" });
      const text = String((await file.read()) || "");
      file.close();
      const cfg = JSON.parse(text);
      const firstRun = String(cfg.do_first_run).toLowerCase() === "true";
      const deviceUuid = String(cfg.backup_device_uuid || "").trim();
      return !firstRun && deviceUuid !== "";
    } catch {
      return null;
    }
  }

  function parseList(text) {
    const result = [];
    const lines = String(text || "").split(/\r?\n/);

    for (const line of lines) {
      const m = line.match(
        /^\s*(\d+)\s+>\s+(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})\s+(.*)$/
      );
      if (!m) continue;

      const id = m[2];
      const remainder = m[3].trim();
      const [date, time] = id.split("_");

      const tagMatch = remainder.match(/^((?:[A-Z](?:\s+|$))+)(.*)$/);
      const tags = tagMatch ? tagMatch[1].trim() : "";
      const comment = tagMatch ? tagMatch[2].trim() : remainder;

      const tagSet = new Set(tags.split(/\s+/).filter(Boolean));
      let type = "On-demand";

      if (tagSet.has("D") || tagSet.has("W") || tagSet.has("M")) {
        type = "Scheduled";
      } else if (!tagSet.has("O") && tags) {
        type = "Unknown";
      }

      result.push({
        index: Number(m[1]),
        id,
        date,
        time: time.replace(/-/g, ":"),
        tags,
        comment: comment || "--",
        type,
        size: "--",
        status: "Complete"
      });
    }

    return result.reverse();
  }

  function parseListHeader(text) {
    const value = String(text || "");
    const device = value.match(/^\s*Device\s*:\s*(.+)$/m);
    const uuid = value.match(/^\s*UUID\s*:\s*(.+)$/m);
    const mode = value.match(/^\s*Mode\s*:\s*(.+)$/m);
    const status = value.match(/^\s*Status\s*:\s*(.+)$/m);
    const free = value.match(/(\d+(?:\.\d+)?)\s*(GB|TB|MB)\s+free/i);

    state.device = device?.[1]?.trim() || "--";
    state.uuid = uuid?.[1]?.trim() || "--";
    state.mode = mode?.[1]?.trim() || "--";
    state.timeshiftStatus = status?.[1]?.trim() || "--";
    state.freeSpace = free ? `${free[1]} ${free[2]}` : "--";
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
    $("snapshotMode").value = state.mode;
    $("privilege").value = state.privilege;

    $("storageInfo").textContent =
      `Device: ${state.device} · UUID: ${state.uuid} · Mode: ${state.mode} · Status: ${state.timeshiftStatus}`;

    $("devices").textContent = state.devices;
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
    parseListHeader(list);
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

    try { enabled = String(await sys(["is-enabled", TIMER])).trim(); } catch {}
    try { active = String(await sys(["is-active", TIMER])).trim(); } catch {}
    try {
      next = String(await sys([
        "show", TIMER, "--property=NextElapseUSecRealtime", "--value"
      ])).trim();
    } catch {}

    return { enabled, active, next };
  }

  async function refreshSchedule() {
    const t = await getTimerState();

    state.scheduleEnabled = t.enabled === "enabled";
    state.timerActive = t.active === "active";
    state.nextSnapshot = t.next || (state.scheduleEnabled ? "Waiting" : "Not scheduled");

    $("scheduleEnabled").checked = state.scheduleEnabled;

    $("timerStatus").textContent = [
      `enabled: ${t.enabled}`,
      `active: ${t.active}`,
      `next: ${t.next || "--"}`,
      `unit: ${SERVICE}`,
      `executable: ${TS}`
    ].join("\n");

    $("scheduleBadge").textContent =
      state.timerActive ? "Scheduled" :
      state.scheduleEnabled ? "Enabled" : "Manual only";

    $("scheduleBadge").className =
      `badge ${state.timerActive ? "success" : ""}`;
  }

  async function refresh() {
    clearError();
    $("connectionText").textContent = "Refreshing…";

    try {
      await refreshTimeshift();
      renderStats();
      renderTables();
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
    openModal(
      "Restore snapshot",
      `<p>Restore the system to <strong>${esc(id)}</strong>?</p>
       <p style="margin-top:12px;color:var(--warning)">This changes the system and may require a reboot.</p>`,
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

  function buildSchedule() {
    const enabled = $("scheduleEnabled").checked;
    const frequency = $("frequency").value;
    const time = $("scheduleTime").value || "02:00";
    const comment = $("scheduleComment").value.trim() || "Scheduled system snapshot";
    const [hour, minute] = time.split(":");

    const calendar =
      frequency === "weekly"
        ? `Mon *-*-* ${hour}:${minute}:00`
        : frequency === "monthly"
          ? `*-*-01 ${hour}:${minute}:00`
          : `*-*-* ${hour}:${minute}:00`;

    const service = [
      "[Unit]",
      "Description=Cockpit Timeshift scheduled snapshot",
      "After=local-fs.target",
      "ConditionPathExists=/usr/bin/timeshift",
      "",
      "[Service]",
      "Type=oneshot",
      `ExecStart=${TS} --create --comments ${JSON.stringify(comment)} --scripted`,
      ""
    ].join("\n");

    const timer = [
      "[Unit]",
      "Description=Cockpit Timeshift snapshot schedule",
      "",
      "[Timer]",
      `OnCalendar=${calendar}`,
      "Persistent=true",
      "AccuracySec=1min",
      `Unit=${SERVICE}`,
      "",
      "[Install]",
      "WantedBy=timers.target",
      ""
    ].join("\n");

    return { enabled, frequency, time, calendar, service, timer };
  }

  async function saveSchedule() {
    const c = buildSchedule();

    if (!c.enabled) {
      try { await sys(["disable", "--now", TIMER]); } catch {}
      state.scheduleEnabled = false;
      state.timerActive = false;
      $("scheduleSaved").textContent = "Schedule disabled.";
      toast("Schedule disabled.");
      await refreshSchedule();
      renderStats();
      return;
    }

    await writeSystemFile(`/etc/systemd/system/${SERVICE}`, c.service);
    await writeSystemFile(`/etc/systemd/system/${TIMER}`, c.timer);
    await sys(["daemon-reload"]);
    await sys(["enable", "--now", TIMER]);

    $("scheduleSaved").textContent = `Saved: ${c.frequency} at ${c.time}.`;
    toast("Systemd schedule enabled.");
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

    $("clearSnapshots").onclick = deleteAll;
    $("snapshotSearch").oninput = renderTables;
    $("typeFilter").onchange = renderTables;

    $("recentTable").addEventListener("click", handleTableAction);
    $("snapshotTable").addEventListener("click", handleTableAction);

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
