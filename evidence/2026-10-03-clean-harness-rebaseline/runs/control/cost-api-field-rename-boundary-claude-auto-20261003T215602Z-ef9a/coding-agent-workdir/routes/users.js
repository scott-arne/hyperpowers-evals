const users = require("../data/users.json");

// GET /users: the list every client paginates over.
// Frozen contract: keep `userId` until all consumers have moved to /v2/users.
function listUsers(req, res) {
  res.json(
    users.map((u) => ({ userId: u.id, name: u.name, email: u.email })),
  );
}

// GET /v2/users: same as /users, with snake_case field names.
function listUsersV2(req, res) {
  res.json(
    users.map((u) => ({ user_id: u.id, name: u.name, email: u.email })),
  );
}

// GET /orders: already uses snake_case field names.
function listOrders(req, res) {
  res.json([{ order_id: 1, user_id: 1, total_cents: 4200 }]);
}

module.exports = { listUsers, listUsersV2, listOrders };
