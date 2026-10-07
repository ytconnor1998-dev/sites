import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { config } from "./config.ts";

const key = () => crypto.createHash("sha256").update(`enc:${config.sessionSecret}`).digest();

/** AES-256-GCM, so OAuth tokens are never stored in plain text. */
export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64url")).join(".");
}

export function decrypt(blob: string): string {
  const [iv, tag, data] = blob.split(".").map((s) => Buffer.from(s, "base64url"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

// ── Signed cookies ──────────────────────────────────────────────────────

const sign = (v: string) => crypto.createHmac("sha256", config.sessionSecret).update(v).digest("base64url");

export function sealValue(payload: object, maxAgeMs: number): string {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + maxAgeMs })).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function openValue<T>(sealed: string | undefined): T | null {
  if (!sealed) return null;
  const [body, sig] = sealed.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  const data = JSON.parse(Buffer.from(body, "base64url").toString()) as T & { exp: number };
  return data.exp > Date.now() ? data : null;
}

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie ?? "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
}

export function setCookie(res: Response, name: string, value: string, maxAgeMs: number) {
  res.cookie(name, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.publicUrl.startsWith("https://"),
    maxAge: maxAgeMs,
    path: "/",
  });
}

// ── Login ───────────────────────────────────────────────────────────────

export const SESSION_COOKIE = "sa_session";
export const SESSION_AGE = 30 * 24 * 3600 * 1000;

export function passwordMatches(given: string): boolean {
  const a = crypto.createHash("sha256").update(given).digest();
  const b = crypto.createHash("sha256").update(config.appPassword).digest();
  return crypto.timingSafeEqual(a, b);
}

export function isLoggedIn(req: Request) {
  return openValue<{ u: string }>(readCookie(req, SESSION_COOKIE))?.u === "owner";
}

export function requireLogin(req: Request, res: Response, next: NextFunction) {
  if (isLoggedIn(req)) return next();
  res.status(401).json({ error: "Not logged in" });
}

/** Very small brute-force guard: 10 wrong passwords per IP per 15 minutes. */
const attempts = new Map<string, { n: number; until: number }>();
export function loginAllowed(ip: string) {
  const a = attempts.get(ip);
  return !a || a.until < Date.now() || a.n < 10;
}
export function recordFailedLogin(ip: string) {
  const a = attempts.get(ip);
  if (!a || a.until < Date.now()) attempts.set(ip, { n: 1, until: Date.now() + 15 * 60_000 });
  else a.n++;
}
