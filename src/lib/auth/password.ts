import "server-only";
import bcrypt from "bcryptjs";

export const MIN_PASSWORD = 10;
export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);
