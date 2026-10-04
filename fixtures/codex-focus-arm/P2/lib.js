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

// The workspace report: the first seven characters of each workspace name, one
// per line, in listWorkspaces order.
function formatWorkspaces(root) {
  return listWorkspaces(root)
    .map((name) => `${name.match(/^[0-9a-f]{12}$/)[0].slice(0, 7)}\n`)
    .join("");
}

function countWorkspaces(root) {
  return listWorkspaces(root).length;
}

module.exports = { createWorkspace, listWorkspaces, formatWorkspaces, countWorkspaces };
