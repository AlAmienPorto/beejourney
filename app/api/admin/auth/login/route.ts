import {
  createAdminSession,
  sessionCookieHeader,
  verifyAdminCredentials,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { username?: unknown; password?: unknown };
    const username = String(payload.username ?? "");
    const password = String(payload.password ?? "");
    if (!(await verifyAdminCredentials(username, password))) {
      return Response.json({ error: "Username atau password tidak sesuai." }, { status: 401 });
    }

    const session = await createAdminSession(username.trim());
    return Response.json(
      { ok: true },
      { headers: { "Set-Cookie": sessionCookieHeader(session, request), "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Admin login failed", error);
    return Response.json({ error: "Login belum dapat diproses." }, { status: 500 });
  }
}
