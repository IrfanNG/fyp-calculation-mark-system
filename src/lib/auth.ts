import crypto from "crypto";

const COOKIE_NAME = "unikl_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

function getAuthSecret(): string {
  return process.env.AUTH_SECRET?.trim() || "dev-change-me";
}

export function getSessionCookieName() {
  return COOKIE_NAME;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3) return false;
  const [algo, saltHex, keyHex] = parts;
  if (algo !== "scrypt") return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(keyHex, "hex");
  const actual = crypto.scryptSync(password, salt, expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

function sign(value: string): string {
  return crypto.createHmac("sha256", getAuthSecret()).update(value).digest("hex");
}

export function createSessionValue(lecturerId: string): string;
export function createSessionValue(lecturerId: undefined, studentId: string): string;
export function createSessionValue(lecturerId?: string, studentId?: string): string {
  const exp = Date.now() + SESSION_TTL_MS;
  const type = lecturerId ? "lecturer" : "student";
  const id = lecturerId || studentId!;
  const payload = `${type}.${id}.${exp}`;
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

export function parseSessionValue(value: string | undefined): 
  { lecturerId: string; exp: number; studentId?: undefined } | 
  { studentId: string; exp: number; lecturerId?: undefined } | 
  null {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  const [type, id, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!type || !id || !Number.isFinite(exp)) return null;
  const payload = `${type}.${id}.${exp}`;
  const expected = sign(payload);
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  if (Date.now() > exp) return null;
  
  if (type === "lecturer") return { lecturerId: id, exp };
  if (type === "student") return { studentId: id, exp };
  return null;
}
