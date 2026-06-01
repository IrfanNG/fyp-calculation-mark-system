"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function StudentSignupPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/student/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, name, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Signup failed");
        return;
      }

      router.push("/student");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-(--unikl-bg) px-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-(--unikl-blue)">UniKL VLE</h1>
          <p className="mt-2 text-sm text-(--unikl-muted)">Student Registration</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-6 space-y-4">
          {error ? (
            <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
          ) : null}

          <div>
            <label className="block text-sm font-medium mb-1">Student ID</label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full rounded-md border border-(--unikl-border) bg-(--unikl-bg) px-3 py-2 text-sm"
              required
            />
            <div className="mt-1 text-xs text-(--unikl-muted)">Format: 522XXXXXXX</div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-(--unikl-border) bg-(--unikl-bg) px-3 py-2 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-(--unikl-border) bg-(--unikl-bg) px-3 py-2 text-sm"
              required
            />
            <div className="mt-1 text-xs text-(--unikl-muted)">Min 8 chars with uppercase, lowercase, number, and special character.</div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-(--unikl-blue) px-4 py-2 font-medium text-white hover:bg-(--unikl-blue-2) disabled:opacity-50"
          >
            {loading ? "Signing up..." : "Sign Up"}
          </button>

          <div className="text-center text-sm">
            Already have an account?{" "}
            <Link href="/student/login" className="font-medium text-(--unikl-blue) hover:underline">
              Login
            </Link>
          </div>

          <div className="text-center text-sm pt-3 border-t border-(--unikl-border)">
            <Link href="/welcome" className="text-(--unikl-muted) hover:text-(--unikl-text)">
              ← Back to portal selection
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
