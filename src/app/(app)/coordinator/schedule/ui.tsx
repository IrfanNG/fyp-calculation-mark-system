"use client";

import { useEffect, useState } from "react";

type Schedule = {
  id: string;
  title: string;
  scheduledAt: string;
  venue?: string;
  assignments: {
    assessor: { name: string; staffId: string };
    project: { title: string; student: { name: string; studentId: string } };
  }[];
};

export default function ScheduleClient() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [venue, setVenue] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/coordinator/schedule");
      const data = await res.json();
      setSchedules(data.schedules ?? []);
    } catch {
      setError("Failed to load schedules");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function createSchedule(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/coordinator/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, scheduledAt: new Date(scheduledAt).toISOString(), venue: venue || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create"); return; }
      setShowCreate(false);
      setTitle(""); setScheduledAt(""); setVenue("");
      await loadAll();
    } finally {
      setBusy(false);
    }
  }

  async function deleteSchedule(id: string) {
    if (!confirm("Delete this schedule?")) return;
    setBusy(true);
    await fetch("/api/coordinator/schedule", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await loadAll();
    setBusy(false);
  }

  if (loading) return <div className="text-(--unikl-muted) py-8 text-center">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Assessment Schedule</h1>
          <p className="text-sm text-(--unikl-muted)">Manage FYP presentation schedules.</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="rounded-md bg-(--unikl-blue) px-4 py-2 text-sm font-medium text-white hover:bg-(--unikl-blue-2)">
          + New Schedule
        </button>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {showCreate && (
        <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-5">
          <h2 className="font-semibold mb-4">Create Schedule</h2>
          <form onSubmit={createSchedule} className="space-y-3 max-w-lg">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border border-(--unikl-border) px-3 py-2 text-sm"
                placeholder="e.g. FYP Presentation — Session 1" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date & Time</label>
              <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full rounded-md border border-(--unikl-border) px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Venue (optional)</label>
              <input value={venue} onChange={(e) => setVenue(e.target.value)}
                className="w-full rounded-md border border-(--unikl-border) px-3 py-2 text-sm"
                placeholder="e.g. Lecture Hall B, Level 3" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={busy}
                className="rounded-md bg-(--unikl-blue) px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                {busy ? "Creating…" : "Create"}
              </button>
              <button type="button" onClick={() => setShowCreate(false)}
                className="rounded-md border border-(--unikl-border) px-4 py-2 text-sm font-medium hover:bg-(--unikl-bg)">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {schedules.length === 0 ? (
        <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-8 text-center text-(--unikl-muted)">
          No schedules yet. Create one above.
        </div>
      ) : (
        <div className="space-y-4">
          {schedules.map((s) => (
            <div key={s.id} className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="text-sm text-(--unikl-muted)">
                    {new Date(s.scheduledAt).toLocaleString("en-MY", { dateStyle: "full", timeStyle: "short" })}
                    {s.venue && ` · ${s.venue}`}
                  </p>
                </div>
                <button onClick={() => deleteSchedule(s.id)} disabled={busy}
                  className="text-xs text-red-600 hover:underline disabled:opacity-50">
                  Delete
                </button>
              </div>
              {s.assignments.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-(--unikl-muted)">Assigned</p>
                  {s.assignments.map((a, i) => (
                    <div key={i} className="text-sm flex gap-3">
                      <span className="text-(--unikl-muted)">{a.project.student.name}</span>
                      <span className="text-(--unikl-muted)">→ Assessor: {a.assessor.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
