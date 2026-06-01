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
  s2_timelines: number;
  s3_components: number;
  s4_alignment: number;
  s5_independency: number;
  comments: string;
};

const WEIGHTS = {
  s1_consultation: 4,
  s2_timelines: 4,
  s3_components: 4,
  s4_alignment: 4,
  s5_independency: 4,
};

export default function ProgressWeek14FormClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Assessment>({
    s1_consultation: 0,
    s2_timelines: 0,
    s3_components: 0,
    s4_alignment: 0,
    s5_independency: 0,
    comments: "",
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [projRes, assessRes] = await Promise.all([
          fetch("/api/supervisor/projects"),
          fetch(`/api/supervisor/progress-week14?projectId=${id}`),
        ]);

        const projData = await projRes.json();
        const foundProj = (projData.projects ?? []).find((p: any) => p.id === id);
        setProject(foundProj);

        const assessData = await assessRes.json();
        if (assessData.assessment) {
          const { id: _, projectId: __, assessorId: ___, totalWeighted: ____, createdAt: _____, updatedAt: ______, ...rest } = assessData.assessment;
          setFormData((prev) => ({ ...prev, ...rest, comments: rest.comments || "" }));
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
      const res = await fetch("/api/supervisor/progress-week14", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: id,
          ...formData,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        // Jika ralat Zod (validation), permudahkan mesejnya
        if (data.error && typeof data.error === 'object') {
           throw new Error("Validation failed. Please check your scores.");
        }
        throw new Error(data.error || "Failed to save assessment");
      }

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

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Loading assessment data...</div>;
  if (!project) return <div className="p-8 text-center text-red-500">Project not found</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 bg-white shadow-lg rounded-xl border border-gray-200 my-8">
      <div className="bg-gradient-to-r from-indigo-900 to-indigo-700 p-6 rounded-t-xl text-white mb-6 shadow-sm">
        <h1 className="text-2xl font-bold">Progress Assessment (Week 14)</h1>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm opacity-90">
          <p><span className="opacity-70">Project:</span> <span className="font-semibold">{project.title}</span></p>
          <p><span className="opacity-70">Student:</span> <span className="font-semibold">{project.student.name} ({project.student.studentId})</span></p>
        </div>
      </div>

      {error && <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center gap-3 animate-pulse">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span className="font-medium">{error}</span>
      </div>}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-gray-50 text-gray-700 uppercase text-xs tracking-wider">
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
                description="Meet supervisor for FYP-related discussion. Seek advice for problem encountered."
                weight={4}
                value={formData.s1_consultation}
                onChange={(v: number) => handleChange("s1_consultation", v)}
              />
              <RubricRow
                label="2. Timelines"
                description="FYP milestones: Introduction, Literature review, Data collection, Visual representation, Drafting of chapters."
                weight={4}
                value={formData.s2_timelines}
                onChange={(v: number) => handleChange("s2_timelines", v)}
              />
              <RubricRow
                label="3. Research Components"
                description="Project management according to Gantt chart, Lit review comparison, Methodology model selection, Expected outcome."
                weight={4}
                value={formData.s3_components}
                onChange={(v: number) => handleChange("s3_components", v)}
              />
              <RubricRow
                label="4. Project Aim / Alignment"
                description="Project aligned with security domains (System, Mobile, Network, Application, Web, OS, Software, IOT, AI, etc)."
                weight={4}
                value={formData.s4_alignment}
                onChange={(v: number) => handleChange("s4_alignment", v)}
              />
              <RubricRow
                label="5. Self-driven & Independency"
                description="Demonstrates independence in task execution and problem solving."
                weight={4}
                value={formData.s5_independency}
                onChange={(v: number) => handleChange("s5_independency", v)}
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

        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
          <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Final Progress Comments</label>
          <textarea
            value={formData.comments}
            onChange={(e) => handleChange("comments", e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all"
            placeholder="Feedback on overall progress until Week 14..."
          />
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 rounded-lg text-gray-600 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel & Back
          </button>
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-8 py-2.5 bg-indigo-700 text-white rounded-lg font-bold hover:bg-indigo-800 disabled:opacity-50 shadow-md transform active:scale-95 transition-all"
          >
            {saving ? "Saving Assessment..." : "Submit Week 14 Assessment"}
          </button>
        </div>
      </form>
    </div>
  );
}

function RubricRow({ label, description, weight, value, onChange }: any) {
  const actual = (value / 10) * weight;
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="p-4">
        <p className="font-bold text-gray-900 text-sm">{label}</p>
        <p className="text-xs text-gray-500 mt-1 max-w-md leading-relaxed">{description}</p>
      </td>
      <td className="p-4 text-center text-gray-500 font-medium border-x border-gray-100">{weight}</td>
      <td className="p-4">
        <div className="flex items-center justify-center gap-3">
          <input
            type="range"
            min="0"
            max="10"
            step="1"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-24 sm:w-32 accent-indigo-600 cursor-pointer"
          />
          <input
            type="number"
            min={0}
            max={10}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-14 rounded border border-gray-300 px-1 py-1 text-center font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </td>
      <td className="p-4 text-center font-bold text-gray-900 bg-orange-50/30 border-l border-gray-100">
        {actual.toFixed(1)}
      </td>
    </tr>
  );
}
