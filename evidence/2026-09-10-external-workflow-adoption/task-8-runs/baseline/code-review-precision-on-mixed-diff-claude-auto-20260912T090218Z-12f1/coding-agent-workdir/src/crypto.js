import { timingSafeEqual, scryptSync } from "node:crypto";

export function verifyHash(plaintext, stored) {
  const [salt, digest] = stored.split(":");
  const computed = scryptSync(plaintext, salt, 32).toString("hex");
  return timingSafeEqual(Buffer.from(computed), Buffer.from(digest));
}
