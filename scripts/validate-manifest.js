"use strict";

const fs = require("node:fs");
const path = require("node:path");

const REQUIRED_TOOL_FIELDS = ["label", "path"];

function fail(message) {
  console.error(`invalid manifest: ${message}`);
  process.exit(1);
}

function main() {
  const file = process.argv[2];
  const noPathCheck = process.argv.includes("--no-path-check");
  if (!file) {
    console.error("usage: node scripts/validate-manifest.js <manifest.json> [--no-path-check]");
    process.exit(2);
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    fail(`${file}: ${err.message}`);
  }

  const errors = [];

  if (!Number.isInteger(manifest.version)) {
    errors.push("required integer field 'version'");
  }

  if (!manifest.tools || typeof manifest.tools !== "object" || Array.isArray(manifest.tools)) {
    errors.push("required object field 'tools'");
  } else {
    const base = path.dirname(file);
    for (const [name, tool] of Object.entries(manifest.tools)) {
      for (const field of REQUIRED_TOOL_FIELDS) {
        if (typeof tool?.[field] !== "string" || tool[field] === "") {
          errors.push(`tool '${name}' missing non-empty string '${field}'`);
        }
      }
      if (!noPathCheck && typeof tool?.path === "string" && !fs.existsSync(path.resolve(base, tool.path))) {
        errors.push(`tool '${name}' points to missing file '${tool.path}'`);
      }
    }
  }

  if (typeof manifest.requires?.cockpit !== "string") {
    errors.push("missing 'requires.cockpit' string");
  }

  if (errors.length) {
    console.error(`invalid manifest ${file}:`);
    for (const e of errors) {
      console.error(`  - ${e}`);
    }
    process.exit(1);
  }

  const count = Object.keys(manifest.tools || {}).length;
  console.log(`OK: ${file} (${count} tool${count === 1 ? "" : "s"}, requires cockpit ${manifest.requires.cockpit})`);
}

main();