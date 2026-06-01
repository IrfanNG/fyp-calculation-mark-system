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
  phase: string;
  student: { id: string; studentId: string; name: string };
  supervisor: { name: string; staffId: string };
  submissions: Submission[];
  feedbacks: Feedback[];
  assessorMarks: {
    mark: number;
    notes?: string;
    presentationMark?: number | null;
    reportMark?: number | null;
  }[];
  finalMark: { finalMark: number; grade: string; isPublished: boolean } | null;
};

type AssignmentData = {
  schedule: { title: string; scheduledAt: string; venue?: string } | null;
  project: Project;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function AssessorProjectDetailClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<AssignmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [mark, setMark] = useState("");
  const [markNotes, setMarkNotes] = useState("");
  const [presentationMark, setPresentationMark] = useState("");
  const [reportMark, setReportMark] = useState("");
  const [feedbackContent, setFeedbackContent] = useState("");

  async function loadData() {
    const res = await fetch("/api/assessor/projects");
    const json = await res.json();
    const assignment = (json.assignments ?? []).find((a: any) => a.project.id === id);
    setData(assignment ?? null);
    if (assignment?.project.assessorMarks?.[0]) {
      const am = assignment.project.assessorMarks[0];
      setMark(am.mark.toFixed(2));
      setMarkNotes(am.notes ?? "");
      setPresentationMark(am.presentationMark != null ? am.presentationMark.toFixed(2) : "");
      setReportMark(am.reportMark != null ? am.reportMark.toFixed(2) : "");
    }
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [id]);

  async function submitMark(e: React.FormEvent) {
    e.preventDefault();
    const parse = (v: string, label: string): number | undefined | false => {
      if (v === "") return undefined;
      const n = Number(v);
      if (isNaN(n) || n < 0 || n > 100) { setError(`${label} must be 0–100`); return false; }
      return n;
    };
    const pres = parse(presentationMark, "Presentation");
    const rep  = parse(reportMark, "Report");
    if (pres === false || rep === false) return;

    const isFyp2 = data?.project.phase === "FYP2";
    const components = [pres, ...(isFyp2 ? [rep] : [])].filter(
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
      const res = await fetch("/api/assessor/marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: id,
          mark: Number(m.toFixed(2)),
          presentationMark: pres,
          reportMark: isFyp2 ? rep : undefined,
          notes: markNotes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed"); return; }
      await loadData();
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
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed"); return; }
      setFeedbackContent("");
      await loadData();
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="text-(--unikl-muted) py-8 text-center">Loading…</div>;
  if (!data) return <div className="text-(--unikl-muted) py-8 text-center">Project not found or not assigned to you.</div>;

  const { project, schedule } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <a href="/assessor/projects" className="text-sm text-(--unikl-blue) hover:underline mt-1">← Back</a>
        <div>
          <h1 className="text-xl font-semibold">{project.title}</h1>
          <p className="text-sm text-(--unikl-muted)">
            Student: <strong>{project.student.name}</strong> ({project.student.studentId}) ·
            Supervisor: {project.supervisor.name}
          </p>
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Schedule */}
      {schedule && (
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 shadow-sm">
          <div className="font-semibold text-purple-800 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Presentation Schedule
          </div>
          <div className="text-sm text-purple-700 mt-1">
            {schedule.title} · {new Date(schedule.scheduledAt).toLocaleString("en-MY", { dateStyle: "full", timeStyle: "short" })}
            {schedule.venue && ` · Venue: ${schedule.venue}`}
          </div>
        </div>
      )}

      {/* Rubrics Assessment Forms */}
      <Section title="Assessment Forms (Rubrics)">
        <p className="text-sm text-(--unikl-muted) mb-4">
          Evaluate the student's work using the official FYP rubrics. The calculated marks will be synced to the evaluation table below.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/assessor/projects/${id}/presentation-form`}
            className="inline-flex items-center gap-2 rounded-md bg-purple-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-800 transition-all shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><line x1="8" y1="21" x2="16" y2="21"/></svg>
            Presentation Rubric (35)
          </Link>
          <Link
            href={`/assessor/projects/${id}/report-form`}
            className="inline-flex items-center gap-2 rounded-md bg-purple-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-800 transition-all shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Report Rubric (35)
          </Link>
        </div>
      </Section>

      {/* Documents */}
      <Section title="Submitted Documents">
        {project.submissions.length === 0 ? (
          <p className="text-sm text-(--unikl-muted)">No submissions yet.</p>
        ) : (
          <div className="space-y-2">
            {project.submissions.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-(--unikl-border) bg-(--unikl-bg) p-3">
                <div>
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium capitalize text-blue-700 mr-2">
                    {s.type} v{s.version}
                  </span>
                  <a href={s.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-medium text-(--unikl-blue) hover:underline">
                    {s.fileName}
                  </a>
                  <span className="text-xs text-(--unikl-muted) ml-2">{new Date(s.submittedAt).toLocaleDateString("en-MY")}</span>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[s.status] ?? ""}`}>
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Assessor Mark */}
      <Section title={`Evaluate — ${project.phase}`}>
        <p className="mb-3 text-xs text-(--unikl-muted)">
          The rubric forms above will update the Presentation and Report marks automatically. You can also edit them manually here (use 2 decimal places).
        </p>
        <form onSubmit={submitMark} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Presentation (0 – 100)</label>
              <input type="number" min={0} max={100} step={0.01} value={presentationMark}
                onChange={(e) => setPresentationMark(e.target.value)}
                className="w-full rounded-md border border-(--unikl-border) px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Report (0 – 100)</label>
              <input type="number" min={0} max={100} step={0.01} value={reportMark}
                onChange={(e) => setReportMark(e.target.value)}
                className="w-full rounded-md border border-(--unikl-border) px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes (optional)</label>
            <input value={markNotes} onChange={(e) => setMarkNotes(e.target.value)}
              className="w-full rounded-md border border-(--unikl-border) px-3 py-2 text-sm"
              placeholder="Evaluation notes…" />
          </div>
          <button type="submit" disabled={busy}
            className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50">
            {project.assessorMarks.length > 0 ? "Update Marks Manually" : "Submit Marks Manually"}
          </button>
        </form>
        {project.assessorMarks.length > 0 && (
          <div className="mt-3 rounded-md bg-green-50 p-3 text-sm text-green-800">
            <p className="font-medium">Current Saved Marks</p>
            <ul className="mt-1 space-y-0.5">
              {project.assessorMarks[0].presentationMark != null && <li>Presentation: {project.assessorMarks[0].presentationMark.toFixed(2)}</li>}
              {project.assessorMarks[0].reportMark != null && <li>Report: {project.assessorMarks[0].reportMark.toFixed(2)}</li>}
            </ul>
          </div>
        )}
      </Section>

      {/* Feedback */}
      <Section title="Provide Feedback">
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
          <p className="text-sm text-(--unikl-muted)">No feedback yet.</p>
        ) : (
          <div className="space-y-2">
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
