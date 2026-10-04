"use strict";
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

// Workspace directories are created only here, named with the first twelve
// hex digits of the sha256 of the plan path.
function createWorkspace(root, planPath) {
  const name = crypto.createHash("sha256").update(planPath).digest("hex").slice(0, 12);
  const dir = path.join(root, name);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Names of the workspace directories under root, sorted; [] when root is absent.
function listWorkspaces(root) {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

// events.log holds one "<workspace name>\t<kind>" line per recorded event.
function eventsFor(root, name) {
  const file = path.join(root, "events.log");
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line !== "")
    .map((line) => line.split("\t"))
    .filter(([workspace]) => workspace === name)
    .map(([, kind]) => kind);
}

module.exports = { createWorkspace, listWorkspaces, eventsFor };
