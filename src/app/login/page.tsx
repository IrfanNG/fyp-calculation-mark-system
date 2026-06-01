"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId, password }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error || "Login failed");
        return;
      }

      const params = new URLSearchParams(window.location.search);
      router.replace(params.get("next") || "/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-(--unikl-bg) flex items-center justify-center p-6 text-(--unikl-text)">
      <div className="w-full max-w-md rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-6">
        <div className="mb-6">
          <div className="text-xl font-semibold text-(--unikl-blue)">UniKL VLE</div>
          <div className="text-sm text-(--unikl-muted)">Lecturer login</div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4" autoComplete="off">
          <div>
            <label className="block text-sm font-medium">Staff ID</label>
            <input
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="mt-1 w-full rounded-md border border-(--unikl-border) bg-white px-3 py-2"
              placeholder="e.g. LEC12345"
              autoComplete="off"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="mt-1 w-full rounded-md border border-(--unikl-border) bg-white px-3 py-2"
              autoComplete="new-password"
              required
            />
          </div>

          {error ? <div className="text-sm text-red-600">{error}</div> : null}

          <button
            disabled={loading}
            className="w-full rounded-md bg-(--unikl-blue) px-3 py-2 font-medium text-white hover:bg-(--unikl-blue-2) disabled:opacity-60"
            type="submit"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <div className="text-sm text-(--unikl-muted)">
            No account?{" "}
            <a className="underline" href="/signup">
              Sign up
            </a>
          </div>

          <div className="text-center text-sm pt-3 border-t border-(--unikl-border)">
            <a href="/welcome" className="text-(--unikl-muted) hover:text-(--unikl-text)">
              ← Back to portal selection
            </a>
          </div>
        </form>
      </div>
    </main>
  );
}
