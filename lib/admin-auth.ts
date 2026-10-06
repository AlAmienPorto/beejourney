import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const SESSION_COOKIE = "beejourney_admin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 12;
const encoder = new TextEncoder();

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function secureEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

function configuredUsername() {
  return (process.env.ADMIN_USERNAME ?? "").trim();
}

async function sessionKey() {
  const secret = (process.env.ADMIN_SESSION_SECRET ?? "").replace(/^'|'$/g, "").replace(/^"|"$/g, "");
  if (!secret) throw new Error("ADMIN_SESSION_SECRET belum dikonfigurasi");
  return crypto.subtle.importKey("raw", base64UrlDecode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function sign(value: string) {
  const signature = await crypto.subtle.sign("HMAC", await sessionKey(), encoder.encode(value));
  return base64UrlEncode(new Uint8Array(signature));
}

export async function verifyAdminCredentials(username: string, password: string) {
  const record = (process.env.ADMIN_PASSWORD_HASH ?? "").replace(/^'|'$/g, "").replace(/^"|"$/g, "");
  const [scheme, iterationsText, saltText, hashText] = record.split(":");
  const iterations = Number(iterationsText);
  if (scheme !== "pbkdf2-sha256" || !Number.isInteger(iterations) || iterations < 100000 || !saltText || !hashText) {
    throw new Error("ADMIN_PASSWORD_HASH belum dikonfigurasi dengan benar");
  }

  const usernameMatches = username.trim() === configuredUsername();
  const passwordKey = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const derived = new Uint8Array(await crypto.subtle.deriveBits({
    name: "PBKDF2",
    hash: "SHA-256",
    salt: base64UrlDecode(saltText),
    iterations,
  }, passwordKey, 256));
  return usernameMatches && secureEqual(derived, base64UrlDecode(hashText));
}

export async function createAdminSession(username: string) {
  const payload = base64UrlEncode(encoder.encode(JSON.stringify({
    username,
    expiresAt: Date.now() + SESSION_DURATION_SECONDS * 1000,
  })));
  return `${payload}.${await sign(payload)}`;
}

export function sessionCookieHeader(value: string, request: Request) {
  const secure = new URL(request.url).protocol === "https:";
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DURATION_SECONDS}${secure ? "; Secure" : ""}`;
}

export function clearSessionCookieHeader(request: Request) {
  const secure = new URL(request.url).protocol === "https:";
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}

export async function getAdminSession() {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) return null;
  const separator = value.lastIndexOf(".");
  if (separator < 1) return null;
  const payload = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  try {
    const valid = await crypto.subtle.verify("HMAC", await sessionKey(), base64UrlDecode(signature), encoder.encode(payload));
    if (!valid) return null;
    const parsed = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))) as { username?: string; expiresAt?: number };
    if (parsed.username !== configuredUsername() || !parsed.expiresAt || parsed.expiresAt <= Date.now()) return null;
    return { username: parsed.username };
  } catch {
    return null;
  }
}

export async function requireAdminPage(returnTo = "/admin") {
  const session = await getAdminSession();
  if (!session) redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  return session;
}

export async function requireAdminApi() {
  const session = await getAdminSession();
  if (!session) {
    return {
      user: null,
      response: Response.json({ error: "Akses admin diperlukan." }, { status: 401 }),
    } as const;
  }
  return { user: session, response: null } as const;
}
