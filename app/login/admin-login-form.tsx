"use client";

import { useState } from "react";
import { LockKeyhole, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminLoginForm() {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Login belum berhasil.");
      window.location.assign("/admin");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login belum berhasil.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f7fb] px-5 py-10 text-slate-950">
      <section className="w-full max-w-md overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(40,56,95,.10)]">
        <div className="relative overflow-hidden bg-[#101d46] px-7 py-8 text-white">
          <div className="absolute -right-12 -top-16 size-40 rounded-full border-[28px] border-[#ff7a45]/90" />
          <div className="relative flex items-center gap-4">
            <img src="/logo.png" alt="BeeJourney Logo" className="h-12 w-auto object-contain" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">BeeJourney Event Organizer</h1>
              <p className="mt-1 text-sm text-blue-100/70">Login dashboard admin</p>
            </div>
          </div>
        </div>
        <form className="space-y-5 p-7" onSubmit={login}>
          <div>
            <Label className="mb-2 block text-sm font-semibold">Username</Label>
            <Input name="username" autoComplete="username" className="h-12 rounded-xl" required autoFocus />
          </div>
          <div>
            <Label className="mb-2 block text-sm font-semibold">Password</Label>
            <Input name="password" type="password" autoComplete="current-password" className="h-12 rounded-xl" required />
          </div>
          {error && (
            <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          )}
          <Button type="submit" disabled={submitting} className="h-12 w-full rounded-xl bg-[#3153d4] hover:bg-[#263fad]">
            {submitting ? <><LockKeyhole /> Memeriksa…</> : <><LogIn /> Masuk ke dashboard</>}
          </Button>
          <p className="text-center text-xs leading-5 text-slate-400">Akses ini khusus untuk pengelola BeeJourney.</p>
        </form>
      </section>
    </main>
  );
}
