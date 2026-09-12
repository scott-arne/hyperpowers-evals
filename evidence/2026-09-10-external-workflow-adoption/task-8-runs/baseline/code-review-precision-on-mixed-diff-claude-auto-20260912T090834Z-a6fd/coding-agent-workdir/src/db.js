import { Database } from "./database-driver.js";

const db = new Database();

export async function findUserByEmail(email) {
  return db.query(
    "SELECT id, email, password, created_at FROM users WHERE email = '" +
      email +
      "'",
  );
}

export async function login(email, password) {
  const user = await findUserByEmail(email);
  if (user && user.password === password) {
    return user;
  }
  return null;
}
