"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const P = require("../parsers.js");

test("humanBytes: formats units", () => {
  assert.equal(P.humanBytes(0), "0 B");
  assert.equal(P.humanBytes(500), "500 B");
  assert.equal(P.humanBytes(1024), "1 KiB");
  assert.equal(P.humanBytes(1536), "2 KiB");
  assert.equal(P.humanBytes(1048576), "1.0 MiB");
  assert.equal(P.humanBytes(1073741824), "1.0 GiB");
});

test("humanBytes: handles invalid/negative input", () => {
  assert.equal(P.humanBytes(-5), "—");
  assert.equal(P.humanBytes(NaN), "—");
  assert.equal(P.humanBytes(Infinity), "—");
});

test("shortUuid: shortens long uuids, passes short ones", () => {
  assert.equal(P.shortUuid("e63721f2-409a-4e67"), "e63721f2…");
  assert.equal(P.shortUuid("abc"), "abc");
  assert.equal(P.shortUuid(""), "—");
});

test("cap: uppercases first letter", () => {
  assert.equal(P.cap("hourly"), "Hourly");
  assert.equal(P.cap("daily"), "Daily");
});

test("parseList: parses a scheduled and an on-demand snapshot, newest first", () => {
  const input = [
    "1 > 2026-08-19_20-08-01  O  Manual backup",
    "2 > 2026-08-20_00-07-27  D  Daily snapshot",
    ""
  ].join("\n");

  const snaps = P.parseList(input);

  assert.equal(snaps.length, 2);
  const [first, second] = snaps;

  assert.equal(first.index, 2);
  assert.equal(first.id, "2026-08-20_00-07-27");
  assert.equal(first.date, "2026-08-20");
  assert.equal(first.time, "00:07:27");
  assert.equal(first.tags, "D");
  assert.equal(first.comment, "Daily snapshot");
  assert.equal(first.type, "Scheduled");

  assert.equal(second.index, 1);
  assert.equal(second.tags, "O");
  assert.equal(second.comment, "Manual backup");
  assert.equal(second.type, "On-demand");
});

test("parseList: handles empty and whitespace-only input", () => {
  assert.deepEqual(P.parseList(""), []);
  assert.deepEqual(P.parseList("\n\n"), []);
  assert.deepEqual(P.parseList(null), []);
});

test("parseList: ignores unrelated lines (header)", () => {
  const input = [
    "Device: /dev/sdd",
    "Mode: RSYNC",
    "1 > 2026-08-19_20-08-01  O  Manual backup"
  ].join("\n");
  assert.equal(P.parseList(input).length, 1);
});

test("parseList: classifies multi-char tags as scheduled", () => {
  const snaps = P.parseList("5 > 2026-08-18_00-00-00  D W M  Mixed tags");
  assert.equal(snaps[0].tags, "D W M");
  assert.equal(snaps[0].type, "Scheduled");
});

test("parseHeader: extracts device, uuid, mode, status and free space", () => {
  const input = [
    "Device: /dev/sdd",
    "UUID: e63721f2-409a-4e67-9c4c-a959a14f45fd",
    "Mode: RSYNC",
    "Status: OK",
    "250 GB free"
  ].join("\n");

  assert.deepEqual(P.parseHeader(input), {
    device: "/dev/sdd",
    uuid: "e63721f2-409a-4e67-9c4c-a959a14f45fd",
    mode: "RSYNC",
    status: "OK",
    free: "250 GB"
  });
});

test("parseHeader: falls back to dashes on missing fields", () => {
  assert.deepEqual(P.parseHeader(""), {
    device: "--",
    uuid: "--",
    mode: "--",
    status: "--",
    free: "--"
  });
});

test("readScheduleLevels: honors schedule_* booleans", () => {
  const cfg = {
    schedule_hourly: "true",
    schedule_daily: "false",
    schedule_weekly: "true",
    schedule_monthly: "false",
    schedule_boot: "true"
  };
  assert.deepEqual(P.readScheduleLevels(cfg), {
    hourly: true,
    daily: false,
    weekly: true,
    monthly: false,
    boot: true
  });
});

test("readScheduleLevels: empty config is all false", () => {
  const levels = P.readScheduleLevels({});
  for (const lvl of P.SCHEDULE_LEVELS) {
    assert.equal(levels[lvl], false);
  }
});

test("flattenDevices: flattens children and keeps only linux filesystems", () => {
  const data = {
    blockdevices: [
      { name: "sda", path: "/dev/sda", fstype: null, children: [
        { name: "sda1", path: "/dev/sda1", fstype: "ext4" },
        { name: "sda2", path: "/dev/sda2", fstype: "swap" },
        { name: "sda3", path: "/dev/sda3", fstype: null, children: [
          { name: "sda3x", path: "/dev/sda3x", fstype: "xfs" }
        ] }
      ] },
      { name: "sdb", path: "/dev/sdb", fstype: "btrfs" },
      { name: "sr0", path: "/dev/sr0", fstype: "iso9660" }
    ]
  };

  const flat = P.flattenDevices(data.blockdevices);
  const paths = flat.map(n => n.path).sort();

  assert.deepEqual(paths, ["/dev/sda1", "/dev/sda3x", "/dev/sdb"]);
});