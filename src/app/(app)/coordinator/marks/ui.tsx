"use client";

import { useEffect, useState } from "react";

type FinalMarkRow = {
  id: string;
  finalMark: number;
  grade: string;
  isPublished: boolean;
  publishedAt: string | null;
  supervisorWeight: number;
  assessorWeight: number;
  phase?: string | null;
  progressTotal?: number | null;
  presentationTotal?: number | null;
  reportTotal?: number | null;
  paperTotal?: number | null;
  project: {
    id: string;
    title: string;
    phase: string;
    student: { studentId: string; name: string };
    supervisor: { name: string; staffId: string };
    supervisorMark: {
      mark: number;
      progressMark?: number | null;
      presentationMark?: number | null;
      reportMark?: number | null;
      paperMark?: number | null;
    } | null;
    assessorMarks: {
      mark: number;
      presentationMark?: number | null;
      reportMark?: number | null;
      assessor: { name: string };
    }[];
    coordinatorMark?: { progressMark: number } | null;
  };
};

type ProjectRow = {
  id: string;
  title: string;
  phase: string;
  student: { studentId: string; name: string };
  supervisor: { name: string };
  supervisorMark: { progressMark?: number | null; presentationMark?: number | null; reportMark?: number | null; paperMark?: number | null } | null;
  assessorMarks: { presentationMark?: number | null; reportMark?: number | null; assessor?: { name: string } }[];
  coordinatorMark: { progressMark: number } | null;
};

export default function FinalMarksClient() {
  const [marks, setMarks] = useState<FinalMarkRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [supWeight, setSupWeight] = useState(40);
  const [assWeight, setAssWeight] = useState(60);
  const [tab, setTab] = useState<"entry" | "results">("entry");
  // Per-project progress input state
  const [progressInputs, setProgressInputs] = useState<Record<string, string>>({});

  async function loadAll() {
    setLoading(true);
    try {
      const [marksRes, projectsRes] = await Promise.all([
        fetch("/api/coordinator/marks"),
        fetch("/api/coordinator/projects"),
      ]);
      const marksData = await marksRes.json();
      const projectsData = await projectsRes.json();
      setMarks(marksData.marks ?? []);
      setProjects(projectsData.projects ?? []);
      // Prefill progress inputs
      const inputs: Record<string, string> = {};
      for (const p of projectsData.projects ?? []) {
        if (p.coordinatorMark?.progressMark != null) {
          inputs[p.id] = String(p.coordinatorMark.progressMark);
        }
      }
      setProgressInputs(inputs);
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function saveProgress(projectId: string) {
    const raw = progressInputs[projectId] ?? "";
    const n = Number(raw);
    if (raw === "" || isNaN(n) || n < 0 || n > 100) {
      setError("Progress mark must be 0–100");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/coordinator/progress-marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, progressMark: n }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      await loadAll();
    } finally {
      setBusy(false);
    }
  }

  async function setPhase(projectId: string, phase: "FYP1" | "FYP2") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/coordinator/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, phase }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      await loadAll();
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    if (!confirm("Generate final marks using FYP1/FYP2 scheme? Existing draft marks will be overwritten.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/coordinator/marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supervisorWeight: supWeight, assessorWeight: assWeight }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      await loadAll();
      setTab("results");
    } finally {
      setBusy(false);
    }
  }

  async function publish(ids?: string[]) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/coordinator/marks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectIds: ids }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      await loadAll();
    } finally {
      setBusy(false);
    }
  }

  const unpublished = marks.filter((m) => !m.isPublished);

  if (loading) return <div className="text-(--unikl-muted) py-8 text-center">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">All Student Final Marks</h1>
        <p className="text-sm text-(--unikl-muted)">View all FYP students, component marks, final totals, and publication status.</p>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-(--unikl-border)">
        <button onClick={() => setTab("entry")}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === "entry" ? "border-(--unikl-blue) text-(--unikl-blue)" : "border-transparent text-(--unikl-muted)"}`}>
          Progress Entry & Phase
        </button>
        <button onClick={() => setTab("results")}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === "results" ? "border-(--unikl-blue) text-(--unikl-blue)" : "border-transparent text-(--unikl-muted)"}`}>
          Generated Results ({marks.length})
        </button>
      </div>

      {tab === "entry" && (
        <>
          <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-5">
            <h2 className="font-semibold mb-3">Coordinator Progress (10%) & Phase</h2>
            <p className="text-sm text-(--unikl-muted) mb-4">
              Enter the coordinator progress mark (0–100) for each project and confirm its phase.
              Supervisor and Assessor enter their component marks in their own portals.
            </p>
            <div className="overflow-hidden rounded-lg border border-(--unikl-border)">
              <table className="w-full text-left text-sm">
                <thead className="bg-(--unikl-bg) text-(--unikl-muted)">
                  <tr>
                    <th className="px-3 py-2 font-medium">Student</th>
                    <th className="px-3 py-2 font-medium">Project</th>
                    <th className="px-3 py-2 font-medium">Phase</th>
                    <th className="px-3 py-2 font-medium">SV Components</th>
                    <th className="px-3 py-2 font-medium">Assessor Components</th>
                    <th className="px-3 py-2 font-medium">Coord Progress (0–100)</th>
                    <th className="px-3 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {projects.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-6 text-(--unikl-muted) text-center">No projects yet.</td></tr>
                  ) : projects.map((p) => {
                    const sv = p.supervisorMark;
                    const svParts = sv ? [
                      sv.progressMark != null && `Prog ${sv.progressMark}`,
                      sv.presentationMark != null && `Pres ${sv.presentationMark}`,
                      sv.reportMark != null && `Rep ${sv.reportMark}`,
                      p.phase === "FYP2" && sv.paperMark != null && `Pap ${sv.paperMark}`,
                    ].filter(Boolean).join(" · ") : "—";
                    const asrParts = p.assessorMarks.length === 0 ? "—" :
                      p.assessorMarks.map((a) => {
                        const bits = [
                          a.presentationMark != null && `Pres ${a.presentationMark}`,
                          p.phase === "FYP2" && a.reportMark != null && `Rep ${a.reportMark}`,
                        ].filter(Boolean).join(" ");
                        // Mencegah ralat name undefined dengan optional chaining
                        return `${a.assessor?.name || "Assessor"}: ${bits || "—"}`;
                      }).join(" | ");
                    return (
                      <tr key={p.id} className="border-t border-(--unikl-border) align-top">
                        <td className="px-3 py-2">
                          <div className="font-medium">{p.student.name}</div>
                          <div className="text-xs text-(--unikl-muted)">{p.student.studentId}</div>
                        </td>
                        <td className="px-3 py-2 max-w-xs">
                          <div className="truncate">{p.title}</div>
                          <div className="text-xs text-(--unikl-muted)">Sup: {p.supervisor.name}</div>
                        </td>
                        <td className="px-3 py-2">
                          <select value={p.phase} disabled={busy}
                            onChange={(e) => setPhase(p.id, e.target.value as "FYP1" | "FYP2")}
                            className="rounded-md border border-(--unikl-border) px-2 py-1 text-sm">
                            <option value="FYP1">FYP1</option>
                            <option value="FYP2">FYP2</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 text-xs">{svParts || "—"}</td>
                        <td className="px-3 py-2 text-xs">{asrParts}</td>
                        <td className="px-3 py-2">
                          <input type="number" min={0} max={100} step={0.5}
                            value={progressInputs[p.id] ?? ""}
                            onChange={(e) => setProgressInputs({ ...progressInputs, [p.id]: e.target.value })}
                            className="w-24 rounded-md border border-(--unikl-border) px-2 py-1 text-sm" />
                        </td>
                        <td className="px-3 py-2">
                          <button onClick={() => saveProgress(p.id)} disabled={busy}
                            className="rounded-md bg-(--unikl-blue) px-3 py-1 text-xs font-medium text-white disabled:opacity-50">
                            Save
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-5">
            <h2 className="font-semibold mb-2">Generate Final Marks</h2>
            <p className="text-sm text-(--unikl-muted) mb-4">
              Uses the FYP1 / FYP2 scheme automatically based on each project's phase. Weights below are the
              legacy fallback, used only when no component marks have been entered.
            </p>
            <div className="flex items-end gap-4 flex-wrap">
              <div>
                <label className="block text-sm font-medium mb-1">Supervisor Weight (%)</label>
                <input type="number" min={0} max={100} value={supWeight}
                  onChange={(e) => { const v = Number(e.target.value); setSupWeight(v); setAssWeight(100 - v); }}
                  className="w-24 rounded-md border border-(--unikl-border) px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Assessor Weight (%)</label>
                <input type="number" min={0} max={100} value={assWeight}
                  onChange={(e) => { const v = Number(e.target.value); setAssWeight(v); setSupWeight(100 - v); }}
                  className="w-24 rounded-md border border-(--unikl-border) px-3 py-2 text-sm" />
              </div>
              <button onClick={generate} disabled={busy || supWeight + assWeight !== 100}
                className="rounded-md bg-(--unikl-blue) px-5 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-(--unikl-blue-2)">
                {busy ? "Generating…" : "Generate Final Marks"}
              </button>
            </div>
          </div>
        </>
      )}

      {tab === "results" && (
        <>
          {unpublished.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-center justify-between">
              <div>
                <span className="font-semibold text-amber-800">{unpublished.length} unpublished mark(s)</span>
                <span className="text-sm text-amber-700 ml-2">Students cannot see these until published.</span>
              </div>
              <button onClick={() => publish()} disabled={busy}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                Publish All Results
              </button>
            </div>
          )}

          <div className="overflow-hidden rounded-lg border border-(--unikl-border) bg-(--unikl-card)">
            <table className="w-full text-left text-sm">
              <thead className="bg-(--unikl-bg) text-(--unikl-muted)">
                <tr>
                  <th className="px-3 py-2 font-medium">Student</th>
                  <th className="px-3 py-2 font-medium">Project</th>
                  <th className="px-3 py-2 font-medium">Phase</th>
                  <th className="px-3 py-2 font-medium">Breakdown</th>
                  <th className="px-3 py-2 font-medium">Final</th>
                  <th className="px-3 py-2 font-medium">Grade</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {marks.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-6 text-(--unikl-muted) text-center">No final marks generated yet.</td></tr>
                ) : marks.map((m) => {
                  const parts = [
                    m.progressTotal != null && `Prog ${m.progressTotal.toFixed(1)}`,
                    m.presentationTotal != null && `Pres ${m.presentationTotal.toFixed(1)}`,
                    m.reportTotal != null && `Rep ${m.reportTotal.toFixed(1)}`,
                    m.project.phase === "FYP2" && m.paperTotal != null && `Pap ${m.paperTotal.toFixed(1)}`,
                  ].filter(Boolean).join(" · ");
                  return (
                    <tr key={m.id} className="border-t border-(--unikl-border)">
                      <td className="px-3 py-2">
                        <div className="font-medium">{m.project.student.name}</div>
                        <div className="text-xs text-(--unikl-muted)">{m.project.student.studentId}</div>
                      </td>
                      <td className="px-3 py-2 max-w-xs truncate">{m.project.title}</td>
                      <td className="px-3 py-2">{m.project.phase}</td>
                      <td className="px-3 py-2 text-xs">{parts || <span className="text-(--unikl-muted)">legacy</span>}</td>
                      <td className="px-3 py-2 font-semibold">{m.finalMark.toFixed(1)}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${m.grade.startsWith("A") ? "bg-green-100 text-green-700" : m.grade === "F" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {m.grade}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {m.isPublished ? (
                          <span className="text-xs text-green-700 font-medium">Published ✓</span>
                        ) : (
                          <span className="text-xs text-amber-600">Draft</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {!m.isPublished && (
                          <button onClick={() => publish([m.project.id])} disabled={busy}
                            className="text-xs text-(--unikl-blue) hover:underline disabled:opacity-50">
                            Publish
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
