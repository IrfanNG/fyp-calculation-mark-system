"use client";

import { useEffect, useState } from "react";

type Assessor = { id: string; staffId: string; name: string; role: string };
type Student = { studentId: string; name: string };
type Project = { id: string; title: string; student: Student };
type Schedule = { id: string; title: string; scheduledAt: string };
type Assignment = {
  id: string;
  projectId: string;
  assessorId: string;
  project: { id: string; title: string; student: Student };
  assessor: Assessor;
  schedule: Schedule | null;
};

export default function AssignAssessorClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [assessors, setAssessors] = useState<Assessor[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [selProject, setSelProject] = useState("");
  const [selAssessor, setSelAssessor] = useState("");
  const [selSchedule, setSelSchedule] = useState("");

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [pRes, lRes, aRes, sRes] = await Promise.all([
        fetch("/api/coordinator/projects"),
        fetch("/api/admin/lecturers"),
        fetch("/api/coordinator/assign"),
        fetch("/api/coordinator/schedule"),
      ]);
      const [pData, lData, aData, sData] = await Promise.all([pRes.json(), lRes.json(), aRes.json(), sRes.json()]);
      setProjects(pData.projects ?? []);
      setAssessors((lData.lecturers ?? []).filter((l: any) => l.role === "assessor"));
      setAssignments(aData.assignments ?? []);
      setSchedules(sData.schedules ?? []);
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function assign(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/coordinator/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selProject,
          assessorId: selAssessor,
          scheduleId: selSchedule || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to assign"); return; }
      setSelProject(""); setSelAssessor(""); setSelSchedule("");
      await loadAll();
    } finally {
      setBusy(false);
    }
  }

  async function unassign(projectId: string, assessorId: string) {
    setBusy(true);
    await fetch("/api/coordinator/assign", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, assessorId }),
    });
    await loadAll();
    setBusy(false);
  }

  if (loading) return <div className="text-(--unikl-muted) py-8 text-center">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Assign Assessors</h1>
        <p className="text-sm text-(--unikl-muted)">Assign assessors to FYP projects for evaluation.</p>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-5">
        <h2 className="font-semibold mb-4">New Assignment</h2>
        <form onSubmit={assign} className="grid gap-3 sm:grid-cols-4">
          <div>
            <label className="block text-xs font-medium mb-1">Project / Student</label>
            <select value={selProject} onChange={(e) => setSelProject(e.target.value)}
              className="w-full rounded-md border border-(--unikl-border) px-3 py-2 text-sm" required>
              <option value="">Select project…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.student.name} — {p.title.slice(0, 40)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Assessor</label>
            <select value={selAssessor} onChange={(e) => setSelAssessor(e.target.value)}
              className="w-full rounded-md border border-(--unikl-border) px-3 py-2 text-sm" required>
              <option value="">Select assessor…</option>
              {assessors.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.staffId})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Schedule (optional)</label>
            <select value={selSchedule} onChange={(e) => setSelSchedule(e.target.value)}
              className="w-full rounded-md border border-(--unikl-border) px-3 py-2 text-sm">
              <option value="">No schedule</option>
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>{s.title} — {new Date(s.scheduledAt).toLocaleDateString()}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={busy}
              className="w-full rounded-md bg-(--unikl-blue) px-4 py-2 text-sm font-medium text-white hover:bg-(--unikl-blue-2) disabled:opacity-50">
              Assign
            </button>
          </div>
        </form>
        {assessors.length === 0 && (
          <p className="mt-3 text-sm text-amber-600">No assessors found. Add staff with role "Assessor" via Admin → Manage Users.</p>
        )}
      </div>

      <div>
        <h2 className="font-semibold mb-3">Current Assignments</h2>
        <div className="overflow-hidden rounded-lg border border-(--unikl-border) bg-(--unikl-card)">
          <table className="w-full text-left text-sm">
            <thead className="bg-(--unikl-bg) text-(--unikl-muted)">
              <tr>
                <th className="px-4 py-2 font-medium">Student</th>
                <th className="px-4 py-2 font-medium">Project</th>
                <th className="px-4 py-2 font-medium">Assessor</th>
                <th className="px-4 py-2 font-medium">Schedule</th>
                <th className="px-4 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-4 text-(--unikl-muted) text-center">No assignments yet.</td></tr>
              ) : (
                assignments.map((a) => (
                  <tr key={a.id} className="border-t border-(--unikl-border)">
                    <td className="px-4 py-3">
                      <div className="font-medium">{a.project.student.name}</div>
                      <div className="text-xs text-(--unikl-muted)">{a.project.student.studentId}</div>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate">{a.project.title}</td>
                    <td className="px-4 py-3">{a.assessor.name}</td>
                    <td className="px-4 py-3">
                      {a.schedule ? (
                        <span>{a.schedule.title}<br /><span className="text-xs text-(--unikl-muted)">{new Date(a.schedule.scheduledAt).toLocaleString()}</span></span>
                      ) : <span className="text-(--unikl-muted)">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => unassign(a.project.id, a.assessor.id)} disabled={busy}
                        className="text-xs text-red-600 hover:underline disabled:opacity-50">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
