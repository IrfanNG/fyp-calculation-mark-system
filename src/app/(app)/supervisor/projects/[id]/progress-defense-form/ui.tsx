"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Project = {
  id: string;
  title: string;
  student: { name: string; studentId: string };
};

type Assessment = {
  s1_consultation: number;
  s2_proposal: number;
  s3_research: number;
  s4_aim: number;
  s5_independency: number;
  comments: string;
};

const WEIGHTS = {
  s1_consultation: 4,
  s2_proposal: 4,
  s3_research: 4,
  s4_aim: 4,
  s5_independency: 4,
};

export default function ProgressDefenseFormClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Assessment>({
    s1_consultation: 0,
    s2_proposal: 0,
    s3_research: 0,
    s4_aim: 0,
    s5_independency: 0,
    comments: "",
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [projRes, assessRes] = await Promise.all([
          fetch("/api/supervisor/projects"),
          fetch(`/api/supervisor/progress-defense?projectId=${id}`),
        ]);

        const projData = await projRes.json();
        const foundProj = (projData.projects ?? []).find((p: any) => p.id === id);
        setProject(foundProj);

        const assessData = await assessRes.json();
        if (assessData.assessment) {
          const { id: _, projectId: __, assessorId: ___, totalWeighted: ____, createdAt: _____, updatedAt: ______, ...rest } = assessData.assessment;
          setFormData({ ...formData, ...rest, comments: rest.comments || "" });
        }
      } catch (err) {
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const calcActual = (score: number, weight: number) => (score / 10) * weight;

  const totalWeighted = Object.entries(WEIGHTS).reduce((sum, [key, weight]) => {
    return sum + calcActual(formData[key as keyof typeof WEIGHTS], weight);
  }, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/supervisor/progress-defense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: id,
          ...formData,
        }),
      });

      if (!res.ok) throw new Error("Failed to save assessment");
      router.push(`/supervisor/projects/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving");
    } finally {
      setSaving(false);
    }
  }

  const handleChange = (field: keyof Assessment, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) return <div className="p-8 text-center">Loading form...</div>;
  if (!project) return <div className="p-8 text-center">Project not found</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 bg-white shadow-lg rounded-xl border border-gray-200 my-8">
      <div className="bg-gradient-to-r from-teal-900 to-teal-700 p-6 rounded-t-xl text-white mb-6">
        <h1 className="text-2xl font-bold">Progress Assessment (Week 4-6 Topic Defense)</h1>
        <div className="mt-2 grid grid-cols-2 gap-4 text-sm opacity-90">
          <p>Project: <span className="font-semibold">{project.title}</span></p>
          <p>Student: <span className="font-semibold">{project.student.name} ({project.student.studentId})</span></p>
        </div>
      </div>

      {error && <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center gap-2">
        <span className="font-bold">Error:</span> {error}
      </div>}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
              <tr>
                <th className="p-4 border-b">Criteria</th>
                <th className="p-4 border-b w-24 text-center">Weightage</th>
                <th className="p-4 border-b text-center">Score (1-10)</th>
                <th className="p-4 border-b w-32 text-center bg-orange-50">Actual Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <RubricRow
                label="1. Consultation with Supervisor"
                description="Discussion, Title/Problem statement presentation, Feedback seeking, Recording comments."
                weight={4}
                value={formData.s1_consultation}
                onChange={(v: number) => handleChange("s1_consultation", v)}
              />
              <RubricRow
                label="2. Proposal and Early planning"
                description="Intro/BG, Problem statement, Obj/Scope, Literature review, Methodology, Gantt chart."
                weight={4}
                value={formData.s2_proposal}
                onChange={(v: number) => handleChange("s2_proposal", v)}
              />
              <RubricRow
                label="3. Research Progress"
                description="Understanding of problem, Relevance, Initial comparison, Suitable methodology, Expected outcome."
                weight={4}
                value={formData.s3_research}
                onChange={(v: number) => handleChange("s3_research", v)}
              />
              <RubricRow
                label="4. Project Aim"
                description="Alignment with security domains (System, Mobile, Network, App, Web, OS, IOT, AI, etc)."
                weight={4}
                value={formData.s4_aim}
                onChange={(v: number) => handleChange("s4_aim", v)}
              />
              <RubricRow
                label="5. Self-driven & Independency"
                description="Idea explanation clarity, Confidence during defense, Structured progress, Openness to feedback."
                weight={4}
                value={formData.s5_independency}
                onChange={(v: number) =>
               handleChange("s5_independency", v)}
              />
            </tbody>
            <tfoot className="bg-orange-100 text-orange-900">
              <tr>
                <td colSpan={3} className="p-4 text-right font-bold text-lg uppercase tracking-wider">Total Score (20)</td>
                <td className="p-4 text-center font-black text-2xl border-l border-orange-200">
                  {totalWeighted.toFixed(1)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
          <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Defense Comments</label>
          <textarea
            value={formData.comments}
            onChange={(e) => handleChange("comments", e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
            placeholder="Feedback on defense performance..."
          />
        </div>

        <div className="flex justify-between items-center pt-6 border-t border-gray-200">
          <button type="button" onClick={() => router.back()} className="px-6 py-2.5 border rounded-lg text-gray-600 font-medium hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={saving} className="px-8 py-2.5 bg-teal-700 text-white rounded-lg font-bold hover:bg-teal-800 disabled:opacity-50">
            {saving ? "Saving..." : "Submit Defense Assessment"}
          </button>
        </div>
      </form>
    </div>
  );
}

function RubricRow({ label, description, weight, value, onChange }: any) {
  const actual = (value / 10) * weight;
  return (
    <tr className="hover:bg-gray-50">
      <td className="p-4">
        <p className="font-bold text-gray-900 text-sm">{label}</p>
        <p className="text-xs text-gray-500 mt-1 max-w-md">{description}</p>
      </td>
      <td className="p-4 text-center text-gray-500 font-medium border-x">{weight}</td>
      <td className="p-4">
        <div className="flex items-center justify-center gap-3">
          <input type="range" min="0" max="10" step="1" value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-32 accent-teal-600" />
          <input type="number" min={0} max={10} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-16 rounded border px-2 py-1 text-center font-bold" />
        </div>
      </td>
      <td className="p-4 text-center font-bold text-gray-900 bg-orange-50/50 border-l">{actual.toFixed(1)}</td>
    </tr>
  );
}
