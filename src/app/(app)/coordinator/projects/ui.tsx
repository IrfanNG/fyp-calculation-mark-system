"use client";

import { useEffect, useState } from "react";

type Supervisor = { id: string; staffId: string; name: string };
type Project = {
  id: string;
  title: string;
  description?: string;
  status: string;
  phase: string;
  supervisor: Supervisor;
  finalMark?: { finalMark: number; grade: string; isPublished: boolean } | null;
  assessorAssignments: { assessor: Supervisor }[];
};
type StudentWithProject = {
  id: string;
  studentId: string;
  name: string;
  fypProject: Project | null;
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  submitted: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  completed: "bg-purple-100 text-purple-700",
};

function formatFinalMark(finalMark: { finalMark: number; grade: string; isPublished: boolean } | null | undefined) {
  if (!finalMark) return null;
  return `${finalMark.finalMark.toFixed(1)} (${finalMark.grade})${finalMark.isPublished ? " ✔" : " (draft)"}`;
}

export default function CoordinatorProjectsClient() {
  const [students, setStudents] = useState<StudentWithProject[]>([]);
  const [availableStudents, setAvailableStudents] = useState<StudentWithProject[]>([]);
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
      const [pRes, lRes] = await Promise.all([
        fetch("/api/coordinator/projects"),
        fetch("/api/admin/lecturers"),
      ]);
      const [pData, lData] = await Promise.all([pRes.json(), lRes.json()]);
      const allStudents = pData.students ?? [];
      setStudents(allStudents);
      setAvailableStudents(allStudents.filter((s: StudentWithProject) => !s.fypProject));
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
          <p className="text-sm text-(--unikl-muted)">{students.length} student(s) total</p>
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
                {availableStudents.map((s) => (
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
              <th className="px-4 py-2 font-medium">FYP1 Mark</th>
              <th className="px-4 py-2 font-medium">FYP2 Mark</th>
              <th className="px-4 py-2 font-medium">Final Mark</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-4 text-(--unikl-muted) text-center">
                  No students yet.
                </td>
              </tr>
            ) : (
              students.map((s) => {
                const project = s.fypProject;
                const fyp1Mark = project?.phase === "FYP1" ? formatFinalMark(project.finalMark) : null;
                const fyp2Mark = project?.phase === "FYP2" ? formatFinalMark(project.finalMark) : null;
                const finalMark = formatFinalMark(project?.finalMark ?? null);
                return (
                  <tr key={s.id} className="border-t border-(--unikl-border)">
                    <td className="px-4 py-3">
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-(--unikl-muted)">{s.studentId}</div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      {project ? (
                        <>
                          <div className="truncate font-medium">{project.title}</div>
                          {project.description && <div className="text-xs text-(--unikl-muted) truncate">{project.description}</div>}
                        </>
                      ) : (
                        <span className="text-(--unikl-muted)">Not assigned yet</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {project?.supervisor?.name || <span className="text-(--unikl-muted)">Not assigned yet</span>}
                    </td>
                    <td className="px-4 py-3">
                      {project && project.assessorAssignments.length > 0 ? (
                        project.assessorAssignments.map((a) => a.assessor.name).join(", ")
                      ) : (
                        <span className="text-(--unikl-muted)">Not assigned yet</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {project ? (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[project.status] ?? ""}`}>
                          {project.status}
                        </span>
                      ) : (
                        <span className="rounded-full px-2 py-0.5 text-xs font-medium capitalize bg-gray-100 text-gray-600">
                          Not Assigned
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {fyp1Mark ? (
                        <span className={project?.finalMark?.isPublished ? "text-green-700 font-semibold" : "text-gray-500"}>{fyp1Mark}</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {fyp2Mark ? (
                        <span className={project?.finalMark?.isPublished ? "text-green-700 font-semibold" : "text-gray-500"}>{fyp2Mark}</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {finalMark ? (
                        <span className={project?.finalMark?.isPublished ? "text-green-700 font-semibold" : "text-gray-500"}>{finalMark}</span>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
