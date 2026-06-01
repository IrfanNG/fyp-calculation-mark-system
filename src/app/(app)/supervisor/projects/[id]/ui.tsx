"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Submission = {
  id: string;
  type: string;
  fileUrl: string;
  fileName: string;
  status: string;
  notes?: string;
  version: number;
  submittedAt: string;
};

type Feedback = {
  id: string;
  content: string;
  createdAt: string;
  author: { name: string; staffId: string };
};

type Project = {
  id: string;
  title: string;
  description?: string;
  status: string;
  phase: string; // "FYP1" | "FYP2"
  student: { id: string; studentId: string; name: string };
  submissions: Submission[];
  feedbacks: Feedback[];
  supervisorMark: {
    mark: number;
    notes?: string;
    progressMark?: number | null;
    presentationMark?: number | null;
    reportMark?: number | null;
    paperMark?: number | null;
  } | null;
  assessorAssignments: { assessor: { name: string; staffId: string } }[];
  finalMark: { finalMark: number; grade: string; isPublished: boolean } | null;
};

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  pending: "bg-blue-100 text-blue-700",
};

export default function SupervisorProjectDetailClient() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Mark form
  const [mark, setMark] = useState("");
  const [markNotes, setMarkNotes] = useState("");
  const [progressMark, setProgressMark] = useState("");
  const [presentationMark, setPresentationMark] = useState("");
  const [reportMark, setReportMark] = useState("");
  const [paperMark, setPaperMark] = useState("");

  // Feedback form
  const [feedbackContent, setFeedbackContent] = useState("");

  async function loadProject() {
    const res = await fetch("/api/supervisor/projects");
    const data = await res.json();
    const proj = (data.projects ?? []).find((p: Project) => p.id === id);
    setProject(proj ?? null);
    if (proj?.supervisorMark) {
      setMark(String(proj.supervisorMark.mark));
      setMarkNotes(proj.supervisorMark.notes ?? "");
      setProgressMark(proj.supervisorMark.progressMark != null ? String(proj.supervisorMark.progressMark) : "");
      setPresentationMark(proj.supervisorMark.presentationMark != null ? String(proj.supervisorMark.presentationMark) : "");
      setReportMark(proj.supervisorMark.reportMark != null ? String(proj.supervisorMark.reportMark) : "");
      setPaperMark(proj.supervisorMark.paperMark != null ? String(proj.supervisorMark.paperMark) : "");
    }
    setLoading(false);
  }

  useEffect(() => { loadProject(); }, [id]);

  async function updateProjectStatus(status: "approved" | "rejected") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/supervisor/projects/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: id, status }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to update project status"); return; }
      await loadProject();
    } finally {
      setBusy(false);
    }
  }

  async function reviewSubmission(submissionId: string, status: "approved" | "rejected") {
    const notes = status === "rejected" ? prompt("Reason for rejection (optional):") ?? undefined : undefined;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/supervisor/review", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, status, notes }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      await loadProject();
    } finally {
      setBusy(false);
    }
  }

  async function submitMark(e: React.FormEvent) {
    e.preventDefault();
    const parse = (v: string, label: string): number | undefined | false => {
      if (v === "") return undefined;
      const n = Number(v);
      if (isNaN(n) || n < 0 || n > 100) { setError(`${label} must be 0–100`); return false; }
      return n;
    };
    const prog = parse(progressMark, "Progress");
    const pres = parse(presentationMark, "Presentation");
    const rep  = parse(reportMark, "Report");
    const pap  = parse(paperMark, "Paper");
    if (prog === false || pres === false || rep === false || pap === false) return;

    // Auto-derive aggregate `mark` from components when provided; otherwise fall back to typed mark.
    const isFyp2 = project?.phase === "FYP2";
    const components = [prog, pres, rep, ...(isFyp2 ? [pap] : [])].filter(
      (n): n is number => typeof n === "number"
    );
    let m: number;
    if (components.length > 0) {
      m = components.reduce((a, b) => a + b, 0) / components.length;
    } else {
      m = Number(mark);
      if (isNaN(m) || m < 0 || m > 100) { setError("Mark must be 0–100"); return; }
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/supervisor/marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: id,
          mark: m,
          progressMark: prog,
          presentationMark: pres,
          reportMark: rep,
          paperMark: isFyp2 ? pap : undefined,
          notes: markNotes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      await loadProject();
    } finally {
      setBusy(false);
    }
  }

  async function sendFeedback(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/supervisor/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: id, content: feedbackContent }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      setFeedbackContent("");
      await loadProject();
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="text-(--unikl-muted) py-8 text-center">Loading…</div>;
  if (!project) return <div className="text-(--unikl-muted) py-8 text-center">Project not found.</div>;

  const reports = project.submissions.filter((s) => s.type === "report").sort((a, b) => b.version - a.version);
  const slides = project.submissions.filter((s) => s.type === "slides").sort((a, b) => b.version - a.version);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <a href="/supervisor/projects" className="text-sm text-(--unikl-blue) hover:underline mt-1">← Back</a>
          <div>
            <h1 className="text-xl font-semibold">{project.title}</h1>
            <p className="text-sm text-(--unikl-muted)">
              Student: <strong>{project.student.name}</strong> ({project.student.studentId}) ·
              Status: <span className={`capitalize rounded-full px-2 py-0.5 text-xs font-medium ml-1 ${STATUS_COLORS[project.status]}`}>{project.status}</span>
            </p>
          </div>
        </div>

        {project.status === "submitted" && (
          <div className="flex gap-2">
            <button
              onClick={() => updateProjectStatus("approved")}
              disabled={busy}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              Approve Project
            </button>
            <button
              onClick={() => updateProjectStatus("rejected")}
              disabled={busy}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Reject Project
            </button>
          </div>
        )}
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {project.description && (
        <Section title="Project Description">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{project.description}</p>
        </Section>
      )}

      {/* Submissions */}
      <Section title="Submitted Documents">
        {project.submissions.length === 0 ? (
          <p className="text-sm text-(--unikl-muted)">No submissions yet.</p>
        ) : (
          <div className="space-y-3">
            {[...reports, ...slides].map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-(--unikl-border) bg-(--unikl-bg) p-3">
                <div>
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium capitalize text-blue-700 mr-2">
                    {s.type} v{s.version}
                  </span>
                  <a href={s.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-medium text-(--unikl-blue) hover:underline">
                    {s.fileName}
                  </a>
                  {s.notes && <p className="text-xs text-(--unikl-muted) mt-1">Note: {s.notes}</p>}
                  <p className="text-xs text-(--unikl-muted)">{new Date(s.submittedAt).toLocaleString("en-MY")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[s.status] ?? ""}`}>
                    {s.status}
                  </span>
                  {s.status === "pending" && (
                    <>
                      <button onClick={() => reviewSubmission(s.id, "approved")} disabled={busy}
                        className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50">
                        Approve
                      </button>
                      <button onClick={() => reviewSubmission(s.id, "rejected")} disabled={busy}
                        className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50">
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Rubrics Marks Forms */}
      <Section title="Detailed Assessment Forms (Rubrics)">
        <p className="text-sm text-(--unikl-muted) mb-4">
          Calculate component marks based on official UniKL Excel rubrics. The results will be synced to the marks table below.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/supervisor/projects/${id}/progress-defense-form`}
            className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 transition-all shadow-sm"
          >
             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Progress: Defense (20)
          </Link>
          <Link
            href={`/supervisor/projects/${id}/progress-week14-form`}
            className="inline-flex items-center gap-2 rounded-md bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800 transition-all shadow-sm"
          >
             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Progress: Week 14 (20)
          </Link>
          <Link
            href={`/supervisor/projects/${id}/presentation-form`}
            className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition-all shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            Presentation Rubric (35)
          </Link>
          <Link
            href={`/supervisor/projects/${id}/report-form`}
            className="inline-flex items-center gap-2 rounded-md bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800 transition-all shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Report Rubric (35)
          </Link>
        </div>
      </Section>

      {/* Supervisor Mark */}
      <Section title={`Supervisor Mark — ${project.phase}`}>
        <p className="mb-3 text-xs text-(--unikl-muted)">
          Enter component marks (0–100). The rubrics above will update these values automatically when submitted.
        </p>
        <form onSubmit={submitMark} className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Progress (0 – 100)</label>
              <input type="number" min={0} max={100} step={0.5} value={Number(progressMark || 0).toFixed(1)}
                onChange={(e) => setProgressMark(e.target.value)}
                className="w-full rounded-md border border-(--unikl-border) px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Presentation (0 – 100)</label>
              <input type="number" min={0} max={100} step={0.5} value={Number(presentationMark || 0).toFixed(1)}
                onChange={(e) => setPresentationMark(e.target.value)}
                className="w-full rounded-md border border-(--unikl-border) px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Report (0 – 100)</label>
              <input type="number" min={0} max={100} step={0.5} value={Number(reportMark || 0).toFixed(1)}
                onChange={(e) => setReportMark(e.target.value)}
                className="w-full rounded-md border border-(--unikl-border) px-3 py-2 text-sm" />
            </div>
            {project.phase === "FYP2" && (
              <div>
                <label className="block text-sm font-medium mb-1">Paper (0 – 100)</label>
                <input type="number" min={0} max={100} step={0.5} value={paperMark}
                  onChange={(e) => setPaperMark(e.target.value)}
                  className="w-full rounded-md border border-(--unikl-border) px-3 py-2 text-sm" />
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes (optional)</label>
            <input value={markNotes} onChange={(e) => setMarkNotes(e.target.value)}
              className="w-full rounded-md border border-(--unikl-border) px-3 py-2 text-sm"
              placeholder="Internal remarks…" />
          </div>
          <button type="submit" disabled={busy}
            className="rounded-md bg-(--unikl-blue) px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {project.supervisorMark ? "Update Marks Manually" : "Submit Marks Manually"}
          </button>
        </form>
        {project.supervisorMark && (
          <div className="mt-3 rounded-md bg-green-50 p-3 text-sm text-green-800">
            <p className="font-medium">Saved Marks</p>
            <ul className="mt-1 space-y-0.5">
              {project.supervisorMark.progressMark != null && <li>Progress: {project.supervisorMark.progressMark.toFixed(1)}</li>}
              {project.supervisorMark.presentationMark != null && <li>Presentation: {project.supervisorMark.presentationMark.toFixed(1)}</li>}
              {project.supervisorMark.reportMark != null && <li>Report: {project.supervisorMark.reportMark.toFixed(1)}</li>}
              {project.phase === "FYP2" && project.supervisorMark.paperMark != null && <li>Paper: {project.supervisorMark.paperMark.toFixed(1)}</li>}
            </ul>
          </div>
        )}
      </Section>

      {/* Feedback */}
      <Section title="Feedback">
        <form onSubmit={sendFeedback} className="flex gap-2 mb-4">
          <textarea
            value={feedbackContent}
            onChange={(e) => setFeedbackContent(e.target.value)}
            rows={2}
            className="flex-1 rounded-md border border-(--unikl-border) px-3 py-2 text-sm"
            placeholder="Write feedback for the student…"
            required
          />
          <button type="submit" disabled={busy}
            className="rounded-md bg-(--unikl-blue) px-4 py-2 text-sm font-medium text-white self-end disabled:opacity-50">
            Send
          </button>
        </form>
        {project.feedbacks.length === 0 ? (
          <p className="text-sm text-(--unikl-muted)">No feedback given yet.</p>
        ) : (
          <div className="space-y-3">
            {project.feedbacks.map((f) => (
              <div key={f.id} className="rounded-lg border border-(--unikl-border) bg-(--unikl-bg) p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{f.author.name}</span>
                  <span className="text-xs text-(--unikl-muted)">{new Date(f.createdAt).toLocaleString("en-MY")}</span>
                </div>
                <p className="text-sm">{f.content}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Assessors */}
      {project.assessorAssignments.length > 0 && (
        <Section title="Assigned Assessors">
          <ul className="space-y-1">
            {project.assessorAssignments.map((a, i) => (
              <li key={i} className="text-sm">{a.assessor.name} ({a.assessor.staffId})</li>
            ))}
          </ul>
        </Section>
      )}
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
