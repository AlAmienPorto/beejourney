import "server-only";

export type UploadTicket = {
  version: 1;
  id: string;
  eventId: string;
  path: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  expiresAt: number;
};

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

async function signingKey() {
  const secret = (process.env.ADMIN_SESSION_SECRET ?? "").replace(/^'|'$/g, "").replace(/^"|"$/g, "");
  if (!secret) throw new Error("ADMIN_SESSION_SECRET belum dikonfigurasi");
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(`beejourney-upload-ticket:${secret}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createUploadTicket(payload: Omit<UploadTicket, "version">) {
  const encodedPayload = base64UrlEncode(encoder.encode(JSON.stringify({ version: 1, ...payload })));
  const signature = await crypto.subtle.sign("HMAC", await signingKey(), encoder.encode(encodedPayload));
  return `${encodedPayload}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export async function verifyUploadTicket(value: unknown): Promise<UploadTicket | null> {
  if (typeof value !== "string") return null;
  const separator = value.lastIndexOf(".");
  if (separator < 1) return null;
  const payload = value.slice(0, separator);
  const signature = value.slice(separator + 1);

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await signingKey(),
      base64UrlDecode(signature),
      encoder.encode(payload),
    );
    if (!valid) return null;
    const parsed = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))) as UploadTicket;
    if (
      parsed.version !== 1
      || !parsed.id
      || !parsed.eventId
      || !parsed.path
      || !parsed.fileName
      || !parsed.fileType
      || !Number.isInteger(parsed.fileSize)
      || parsed.expiresAt <= Date.now()
    ) return null;
    return parsed;
  } catch {
    return null;
  }
}
