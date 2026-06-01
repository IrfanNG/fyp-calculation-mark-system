"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type CourseOption = {
  id: string;
  code: string;
  name: string;
  semester: string | null;
  year: number | null;
};

export default function SignupPage() {
  const router = useRouter();
  const [staffId, setStaffId] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/public/course-options", { method: "GET" });
        const json = (await res.json().catch(() => null)) as { courses?: CourseOption[] } | null;
        if (!res.ok) return;
        if (!cancelled) setCourses(json?.courses ?? []);
      } catch {
        // ignore
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId, name, password, courseIds }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as any;
        setError(data?.error || "Signup failed");
        return;
      }

      router.replace("/");
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
          <div className="text-sm text-(--unikl-muted)">Create lecturer account</div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Staff ID</label>
            <input
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="mt-1 w-full rounded-md border border-(--unikl-border) bg-white px-3 py-2"
              required
            />
            <div className="mt-1 text-xs text-(--unikl-muted)">Format: 522XXXXXXX</div>
          </div>
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-(--unikl-border) bg-white px-3 py-2"
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
              required
            />
            <div className="mt-1 text-xs text-(--unikl-muted)">Min 8 chars with uppercase, lowercase, number, and special character.</div>
          </div>

          <div>
            <label className="block text-sm font-medium">Course(s) you teach</label>
            <select
              multiple
              value={courseIds}
              onChange={(e) => {
                const next = Array.from(e.target.selectedOptions).map((o) => o.value);
                setCourseIds(next);
              }}
              className="mt-1 w-full rounded-md border border-(--unikl-border) bg-white px-3 py-2 text-sm"
            >
              {courses.length === 0 ? (
                <option value="" disabled>
                  No courses available yet
                </option>
              ) : (
                courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))
              )}
            </select>
            <div className="mt-1 text-xs text-(--unikl-muted)">
              Optional. You can leave this empty and set up courses later.
            </div>
          </div>

          {error ? <div className="text-sm text-red-600">{error}</div> : null}

          <button
            disabled={loading}
            className="w-full rounded-md bg-(--unikl-blue) px-3 py-2 font-medium text-white hover:bg-(--unikl-blue-2) disabled:opacity-60"
            type="submit"
          >
            {loading ? "Creating..." : "Create account"}
          </button>

          <div className="text-sm text-(--unikl-muted)">
            Already have an account?{" "}
            <a className="underline" href="/login">
              Login
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
