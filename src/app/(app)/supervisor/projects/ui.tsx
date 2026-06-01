"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Student = {
  id: string;
  studentId: string;
  name: string;
  fypProject?: {
    title: string;
    description?: string | null;
    phase: string;
    supervisor?: { name: string } | null;
    assessorAssignments?: { assessor: { name: string } }[] | null;
  } | null;
};

type Project = {
  id: string;
  title: string;
  description?: string;
  status: string;
  phase: string;
  student: { id: string; studentId: string; name: string };
  submissions: { id: string; type: string; status: string; submittedAt: string; version: number }[];
  supervisorMark: { mark: number } | null;
  finalMark: { finalMark: number; grade: string; isPublished: boolean } | null;
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  submitted: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  completed: "bg-purple-100 text-purple-700",
};

export default function SupervisorProjectsClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Form states
  const [showModal, setShowModal] = useState<"create" | "edit" | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [phase, setPhase] = useState("FYP1");

  async function loadData() {
    setLoading(true);
    try {
      const [projRes, studRes] = await Promise.all([
        fetch("/api/supervisor/projects"),
        fetch("/api/admin/students"),
      ]);
      const projData = await projRes.json();
      const studData = await studRes.json();

      setProjects(projData.projects ?? []);
      setAllStudents(studData.students ?? []);
    } catch {
      setError("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  function resetForm() {
    setTitle("");
    setDescription("");
    setSelectedStudentId("");
    setPhase("FYP1");
    setEditingProjectId(null);
    setShowModal(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/supervisor/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, studentId: selectedStudentId, phase }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create project");
      resetForm();
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/supervisor/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: editingProjectId, title, description, phase }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update project");
      resetForm();
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const openEdit = (p: Project) => {
    setEditingProjectId(p.id);
    setTitle(p.title);
    setDescription(p.description || "");
    setPhase(p.phase);
    setShowModal("edit");
  };

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    const student = allStudents.find(s => s.id === studentId);
    if (student?.fypProject) {
      setTitle(student.fypProject.title);
      setDescription(student.fypProject.description || "");
      setPhase(student.fypProject.phase);
    } else {
      setTitle("");
      setDescription("");
      setPhase("FYP1");
    }
  };

  if (loading) return <div className="text-(--unikl-muted) py-8 text-center font-medium">Loading projects...</div>;

  const pendingCount = projects.filter((p) => p.submissions.some((s) => s.status === "pending")).length;
  const selectedStudent = allStudents.find(s => s.id === selectedStudentId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">My Supervised Students</h1>
          <p className="text-sm text-(--unikl-muted)">
            {projects.length} project(s) total
            {pendingCount > 0 && <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{pendingCount} pending review</span>}
          </p>
        </div>
        <button
          onClick={() => setShowModal("create")}
          className="rounded-md bg-(--unikl-blue) px-4 py-2 text-sm font-medium text-white hover:bg-(--unikl-blue-2) transition-all shadow-sm"
        >
          + Add Student Manually
        </button>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-100">{error}</div>}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
            <h2 className="text-lg font-bold mb-4 text-(--unikl-blue)">{showModal === "create" ? "Add Student Project" : "Edit Project Details"}</h2>
            <form onSubmit={showModal === "create" ? handleCreate : handleEdit} className="space-y-4">

              {showModal === "create" && (
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 tracking-tight">Select Student</label>
                  <select
                    value={selectedStudentId} onChange={(e) => handleStudentSelect(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required
                  >
                    <option value="">Select student…</option>
                    {allStudents.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.studentId})</option>
                    ))}
                  </select>

                  {selectedStudent?.fypProject && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
                      <p className="font-bold">Student already has a project:</p>
                      <p>• <strong>Current Supervisor:</strong> {selectedStudent.fypProject.supervisor?.name || "None"}</p>
                      {selectedStudent.fypProject.assessorAssignments && selectedStudent.fypProject.assessorAssignments.length > 0 && (
                        <p>• <strong>Assessor:</strong> {selectedStudent.fypProject.assessorAssignments[0].assessor.name}</p>
                      )}
                      <p className="mt-2 italic">Note: Proceeding will transfer this student and project to you.</p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700 tracking-tight">Project Title</label>
                <input
                  value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-(--unikl-blue) outline-none"
                  placeholder="e.g. AI-Based Security System" required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700 tracking-tight">Description</label>
                <textarea
                  value={description} onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-(--unikl-blue) outline-none"
                  rows={3} placeholder="Brief summary..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700 tracking-tight">Phase</label>
                <select
                  value={phase} onChange={(e) => setPhase(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="FYP1">FYP1</option>
                  <option value="FYP2">FYP2</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={busy}
                  className="flex-1 rounded-lg bg-(--unikl-blue) px-4 py-2.5 text-sm font-bold text-white hover:bg-(--unikl-blue-2) disabled:opacity-50 shadow-md">
                  {busy ? "Saving..." : (showModal === "create" ? "Create/Transfer Project" : "Update Project")}
                </button>
                <button type="button" onClick={resetForm}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-bold hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-(--unikl-border) bg-(--unikl-card) shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-(--unikl-bg) text-(--unikl-muted) uppercase text-xs tracking-wider border-b border-(--unikl-border)">
            <tr>
              <th className="px-4 py-3 font-semibold">Student</th>
              <th className="px-4 py-3 font-semibold">Project Title</th>
              <th className="px-4 py-3 font-semibold text-center">Phase</th>
              <th className="px-4 py-3 font-semibold text-center">Status</th>
              <th className="px-4 py-3 font-semibold text-center">Total Mark</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--unikl-border)">
            {projects.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-(--unikl-muted) text-center">
                  No students supervised yet. Click "Add Student Manually" to get started.
                </td>
              </tr>
            ) : (
              projects.map((p) => {
                const pending = p.submissions.filter(s => s.status === 'pending').length;
                return (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="font-bold text-gray-900">{p.student.name}</div>
                      <div className="text-xs text-(--unikl-muted)">{p.student.studentId}</div>
                    </td>
                    <td className="px-4 py-4 max-w-md">
                      <div className="font-medium text-gray-800 line-clamp-1">{p.title}</div>
                      {pending > 0 && (
                        <div className="mt-1">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                            {pending} NEW SUBMISSION(S)
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="font-bold text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">{p.phase}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${STATUS_COLORS[p.status] ?? ""}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {p.finalMark ? (
                        <div>
                          <div className="font-bold text-(--unikl-blue)">
                            {p.finalMark.finalMark.toFixed(1)} / 100
                          </div>
                          <div className="text-xs text-(--unikl-muted)">
                            Grade {p.finalMark.grade}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-600">Not generated</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-2 text-gray-400 hover:text-(--unikl-blue) hover:bg-blue-50 rounded-lg transition-all"
                          title="Edit Details"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <Link
                          href={`/supervisor/projects/${p.id}`}
                          className="px-3 py-1.5 bg-(--unikl-blue) hover:bg-(--unikl-blue-2) text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                        >
                          View Board
                        </Link>
                      </div>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-5">
      <h2 className="font-semibold mb-3 pb-2 border-b border-(--unikl-border)">{title}</h2>
      {children}
    </div>
  );
}
