import { clearSessionCookieHeader } from "@/lib/admin-auth";

export async function POST(request: Request) {
  return Response.json(
    { ok: true },
    { headers: { "Set-Cookie": clearSessionCookieHeader(request), "Cache-Control": "no-store" } },
  );
}
