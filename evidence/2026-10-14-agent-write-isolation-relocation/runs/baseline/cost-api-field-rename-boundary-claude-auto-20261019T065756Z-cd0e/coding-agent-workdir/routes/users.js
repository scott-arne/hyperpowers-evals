const users = require("../data/users.json");

// GET /users: the list every client paginates over.
function listUsers(req, res) {
  res.json(
    // userId is deprecated; kept until all consumers read user_id.
    users.map((u) => ({
      user_id: u.id,
      userId: u.id,
      name: u.name,
      email: u.email,
    })),
  );
}

// GET /orders: already uses snake_case field names.
function listOrders(req, res) {
  res.json([{ order_id: 1, user_id: 1, total_cents: 4200 }]);
}

module.exports = { listUsers, listOrders };
