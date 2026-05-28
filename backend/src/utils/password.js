import bcrypt from "bcryptjs";

export const DEFAULT_PASSWORD = "init@123";

export function hashPassword(password = DEFAULT_PASSWORD) {
  return bcrypt.hash(password, 10);
}

export function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}
