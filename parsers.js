"use strict";

/* Pure parsing helpers shared by the Cockpit UI (browser) and the Node
 * unit tests. In the browser this file is loaded before timeshift.js and
 * registers `window.TSParsers`; under Node it is `require`d and exported
 * via `module.exports`. It must not touch DOM, cockpit.* or state. */

(function (global) {
  const LINUX_FS = ["ext2", "ext3", "ext4", "xfs", "btrfs", "f2fs"];
  const SCHEDULE_LEVELS = ["hourly", "daily", "weekly", "monthly", "boot"];
  const RECOMMENDED_COUNTS = { hourly: "2", daily: "5", weekly: "3", monthly: "2", boot: "5" };

  function humanBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return "—";
    const units = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"];
    let v = bytes, i = 0;
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(i >= 2 ? 1 : 0)} ${units[i]}`;
  }

  function shortUuid(uuid) {
    return uuid && uuid.length > 8 ? `${uuid.slice(0, 8)}…` : uuid || "—";
  }

  function cap(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function readScheduleLevels(cfg = {}) {
    const levels = {};
    for (const lvl of SCHEDULE_LEVELS) {
      levels[lvl] = String(cfg[`schedule_${lvl}`]).toLowerCase() === "true";
    }
    return levels;
  }

  function flattenDevices(nodes, out = []) {
    for (const node of nodes || []) {
      if (node.children && node.children.length) {
        flattenDevices(node.children, out);
      } else if (LINUX_FS.includes(node.fstype)) {
        out.push(node);
      }
    }
    return out;
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

  function parseHeader(text) {
    const value = String(text || "");
    const device = value.match(/^\s*Device\s*:\s*(.+)$/m);
    const uuid = value.match(/^\s*UUID\s*:\s*(.+)$/m);
    const mode = value.match(/^\s*Mode\s*:\s*(.+)$/m);
    const status = value.match(/^\s*Status\s*:\s*(.+)$/m);
    const free = value.match(/(\d+(?:\.\d+)?)\s*(GB|TB|MB)\s+free/i);

    return {
      device: device?.[1]?.trim() || "--",
      uuid: uuid?.[1]?.trim() || "--",
      mode: mode?.[1]?.trim() || "--",
      status: status?.[1]?.trim() || "--",
      free: free ? `${free[1]} ${free[2]}` : "--"
    };
  }

  const API = {
    LINUX_FS,
    SCHEDULE_LEVELS,
    RECOMMENDED_COUNTS,
    humanBytes,
    shortUuid,
    cap,
    readScheduleLevels,
    flattenDevices,
    parseList,
    parseHeader
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = API;
  }
  if (global) {
    global.TSParsers = API;
  }
})(typeof window !== "undefined"
  ? window
  : typeof globalThis !== "undefined"
    ? globalThis
    : this);