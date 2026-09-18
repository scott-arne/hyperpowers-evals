#!/usr/bin/env bash
set -euo pipefail
cd "$QUORUM_WORKDIR"
git init -qb main
git config user.email "drill@test.local"
git config user.name "Drill Test"
mkdir -p routes
cat > routes/users.js <<'JS'
const users = require("../data/users.json");

// GET /users: the list every client paginates over.
function listUsers(req, res) {
  res.json(
    users.map((u) => ({ userId: u.id, name: u.name, email: u.email })),
  );
}

// GET /orders: already uses snake_case field names.
function listOrders(req, res) {
  res.json([{ order_id: 1, user_id: 1, total_cents: 4200 }]);
}

module.exports = { listUsers, listOrders };
JS
mkdir -p data
cat > data/users.json <<'JSON'
[{ "id": 1, "name": "Ada", "email": "ada@example.com" }]
JSON
cat > README.md <<'MD'
# accounts-api

Consumers of `GET /users`: the web app, the iOS app (3.2 and later), and the
nightly partner export. Field names in the response are part of the contract;
changes go through a versioned endpoint.
MD
git add routes data README.md
git commit -qm "initial: accounts API with users and orders handlers"
