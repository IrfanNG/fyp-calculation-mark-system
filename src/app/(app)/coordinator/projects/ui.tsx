"use client";

import { useEffect, useState } from "react";

type Student = { id: string; studentId: string; name: string };
type Supervisor = { id: string; staffId: string; name: string };
type Project = {
  id: string;
  title: string;
  description?: string;
  status: string;
  student: Student;
  supervisor: Supervisor;
  finalMark?: { finalMark: number; grade: string; isPublished: boolean } | null;
  assessorAssignments: { assessor: Supervisor }[];
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  submitted: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  completed: "bg-purple-100 text-purple-700",
};

export default function CoordinatorProjectsClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedSupervisor, setSelectedSupervisor] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [pRes, sRes, lRes] = await Promise.all([
        fetch("/api/coordinator/projects"),
        fetch("/api/admin/students"),
        fetch("/api/admin/lecturers"),
      ]);
      const [pData, sData, lData] = await Promise.all([pRes.json(), sRes.json(), lRes.json()]);
      setProjects(pData.projects ?? []);
      setStudents((sData.students ?? []).filter((s: any) => !pData.projects.some((p: Project) => p.student.id === s.id)));
      setSupervisors((lData.lecturers ?? []).filter((l: any) => !l.isAdmin));
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/coordinator/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, studentId: selectedStudent, supervisorId: selectedSupervisor }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create project"); return; }
      setShowCreate(false);
      setTitle(""); setDescription(""); setSelectedStudent(""); setSelectedSupervisor("");
      await loadAll();
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <div className="text-(--unikl-muted) py-8 text-center">Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">All FYP Projects</h1>
          <p className="text-sm text-(--unikl-muted)">{projects.length} project(s) total</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-md bg-(--unikl-blue) px-4 py-2 text-sm font-medium text-white hover:bg-(--unikl-blue-2)"
        >
          + Assign FYP Project
        </button>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {showCreate && (
        <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-4">
          <h2 className="font-semibold mb-4">Assign New FYP Project</h2>
          <form onSubmit={createProject} className="space-y-3 max-w-lg">
            <div>
              <label className="block text-sm font-medium mb-1">Project Title</label>
              <input
                value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border border-(--unikl-border) px-3 py-2 text-sm"
                placeholder="e.g. Smart Attendance System using AI" required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description (optional)</label>
              <textarea
                value={description} onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-md border border-(--unikl-border) px-3 py-2 text-sm" rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Assign Student</label>
              <select
                value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full rounded-md border border-(--unikl-border) px-3 py-2 text-sm" required
              >
                <option value="">Select student…</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.studentId})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Assign Supervisor</label>
              <select
                value={selectedSupervisor} onChange={(e) => setSelectedSupervisor(e.target.value)}
                className="w-full rounded-md border border-(--unikl-border) px-3 py-2 text-sm" required
              >
                <option value="">Select supervisor…</option>
                {supervisors.map((l) => (
                  <option key={l.id} value={l.id}>{l.name} ({l.staffId})</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={creating}
                className="rounded-md bg-(--unikl-blue) px-4 py-2 text-sm font-medium text-white hover:bg-(--unikl-blue-2) disabled:opacity-50">
                {creating ? "Creating…" : "Create Project"}
              </button>
              <button type="button" onClick={() => setShowCreate(false)}
                className="rounded-md border border-(--unikl-border) px-4 py-2 text-sm font-medium hover:bg-(--unikl-bg)">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-(--unikl-border) bg-(--unikl-card)">
        <table className="w-full text-left text-sm">
          <thead className="bg-(--unikl-bg) text-(--unikl-muted)">
            <tr>
              <th className="px-4 py-2 font-medium">Student</th>
              <th className="px-4 py-2 font-medium">Project Title</th>
              <th className="px-4 py-2 font-medium">Supervisor</th>
              <th className="px-4 py-2 font-medium">Assessor(s)</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Final Mark</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-(--unikl-muted) text-center">
                  No projects yet. Click "Assign FYP Project" to get started.
                </td>
              </tr>
            ) : (
              projects.map((p) => (
                <tr key={p.id} className="border-t border-(--unikl-border)">
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.student.name}</div>
                    <div className="text-xs text-(--unikl-muted)">{p.student.studentId}</div>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <div className="truncate font-medium">{p.title}</div>
                    {p.description && <div className="text-xs text-(--unikl-muted) truncate">{p.description}</div>}
                  </td>
                  <td className="px-4 py-3">{p.supervisor.name}</td>
                  <td className="px-4 py-3">
                    {p.assessorAssignments.length === 0 ? (
                      <span className="text-(--unikl-muted)">—</span>
                    ) : (
                      p.assessorAssignments.map((a) => a.assessor.name).join(", ")
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[p.status] ?? ""}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {p.finalMark ? (
                      <span className={p.finalMark.isPublished ? "text-green-700 font-semibold" : "text-gray-500"}>
                        {p.finalMark.finalMark.toFixed(1)} ({p.finalMark.grade})
                        {p.finalMark.isPublished ? " ✓" : " (draft)"}
                      </span>
                    ) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
