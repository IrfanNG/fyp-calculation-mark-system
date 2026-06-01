"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Project = {
  id: string;
  title: string;
  student: { name: string; studentId: string };
};

type Assessment = {
  s1_bg: number;
  s1_problem: number;
  s1_significance: number;
  s1_objScope: number;
  s2_theory: number;
  s2_relevancy: number;
  s3_material: number;
  s3_analysis: number;
  s3_standard: number;
  s3_plan: number;
  s4_language: number;
  s5_abide: number;
  s5_org: number;
  comments: string;
};

const WEIGHTS = {
  s1_bg: 2,
  s1_problem: 2,
  s1_significance: 2,
  s1_objScope: 2,
  s2_theory: 5,
  s2_relevancy: 5,
  s3_material: 2,
  s3_analysis: 3,
  s3_standard: 3,
  s3_plan: 2,
  s4_language: 3,
  s5_abide: 2,
  s5_org: 2,
};

export default function ReportFormClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Assessment>({
    s1_bg: 0,
    s1_problem: 0,
    s1_significance: 0,
    s1_objScope: 0,
    s2_theory: 0,
    s2_relevancy: 0,
    s3_material: 0,
    s3_analysis: 0,
    s3_standard: 0,
    s3_plan: 0,
    s4_language: 0,
    s5_abide: 0,
    s5_org: 0,
    comments: "",
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [projRes, assessRes] = await Promise.all([
          fetch("/api/supervisor/projects"),
          fetch(`/api/supervisor/report-assessment?projectId=${id}`),
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
      const res = await fetch("/api/supervisor/report-assessment", {
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
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 p-6 rounded-t-xl text-white mb-6">
        <h1 className="text-2xl font-bold">FYP1 Report Assessment Form</h1>
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
              {/* 1. Introduction */}
              <HeaderRow label="1. Introduction" weight={8} />
              <RubricRow
                label="Research background"
                weight={2}
                value={formData.s1_bg}
                onChange={(v) => handleChange("s1_bg", v)}
              />
              <RubricRow
                label="Overview of research study and problem statement"
                weight={2}
                value={formData.s1_problem}
                onChange={(v) => handleChange("s1_problem", v)}
              />
              <RubricRow
                label="Problem identification and the significant of the study"
                weight={2}
                value={formData.s1_significance}
                onChange={(v) => handleChange("s1_significance", v)}
              />
              <RubricRow
                label="Research objectives and scope of the study"
                weight={2}
                value={formData.s1_objScope}
                onChange={(v) => handleChange("s1_objScope", v)}
              />

              {/* 2. Literature Review */}
              <HeaderRow label="2. Literature Review" weight={10} />
              <RubricRow
                label="The theoretical study and/or recent study from journal and/or relevant resources"
                weight={5}
                value={formData.s2_theory}
                onChange={(v) => handleChange("s2_theory", v)}
              />
              <RubricRow
                label="Relevancy of literature to the objectives of the study"
                weight={5}
                value={formData.s2_relevancy}
                onChange={(v) => handleChange("s2_relevancy", v)}
              />

              {/* 3. Material and Methodology */}
              <HeaderRow label="3. Material and Methodology" weight={10} />
              <RubricRow
                label="Materials and methods must support scope of studies"
                weight={2}
                value={formData.s3_material}
                onChange={(v) => handleChange("s3_material", v)}
              />
              <RubricRow
                label="Analysis/hardware design/case study/must be relevant to the objectives"
                weight={3}
                value={formData.s3_analysis}
                onChange={(v) => handleChange("s3_analysis", v)}
              />
              <RubricRow
                label="Follow established/modified standard (steps and procedures)"
                weight={3}
                value={formData.s3_standard}
                onChange={(v) => handleChange("s3_standard", v)}
              />
              <RubricRow
                label="Research Plan (Milestones, Gantt Chart)"
                weight={2}
                value={formData.s3_plan}
                onChange={(v) => handleChange("s3_plan", v)}
              />

              {/* 4. Language / writing convention / vocabulary */}
              <HeaderRow label="4. Language / writing convention / vocabulary" weight={3} />
              <RubricRow
                label="Content is well organized and coherent"
                weight={3}
                value={formData.s4_language}
                onChange={(v) => handleChange("s4_language", v)}
              />

              {/* 5. Project Report Format / Organization */}
              <HeaderRow label="5. Project Report Format / Organization" weight={4} />
              <RubricRow
                label="Students abide by format given"
                weight={2}
                value={formData.s5_abide}
                onChange={(v) => handleChange("s5_abide", v)}
              />
              <RubricRow
                label="Project report is effectively organized for easy understanding"
                weight={2}
                value={formData.s5_org}
                onChange={(v) => handleChange("s5_org", v)}
              />
            </tbody>
            <tfoot className="bg-orange-100 text-orange-900">
              <tr>
                <td colSpan={3} className="p-4 text-right font-bold text-lg uppercase tracking-wider">Total Score (35)</td>
                <td className="p-4 text-center font-black text-2xl border-l border-orange-200">
                  {totalWeighted.toFixed(1)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
          <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">General Comments / Feedback</label>
          <textarea
            value={formData.comments}
            onChange={(e) => handleChange("comments", e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none shadow-sm"
            placeholder="Describe report quality, writing style, or areas for improvement..."
          />
        </div>

        <div className="flex justify-between items-center pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-600 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel & Back
          </button>
          <div className="flex gap-4 items-center">
             <div className="text-right hidden sm:block">
               <p className="text-xs text-gray-500 font-medium uppercase">Final Report Mark</p>
               <p className="text-xl font-bold text-blue-900">{((totalWeighted / 35) * 100).toFixed(1)}%</p>
             </div>
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-2.5 bg-blue-700 text-white rounded-lg font-bold hover:bg-blue-800 disabled:opacity-50 shadow-md transform active:scale-95 transition-all"
            >
              {saving ? "Saving Assessment..." : "Submit Report Assessment"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function HeaderRow({ label, weight }: { label: string; weight: number }) {
  return (
    <tr className="bg-cyan-100">
      <td className="p-3 font-bold text-cyan-900 text-sm">{label}</td>
      <td className="p-3 font-bold text-cyan-900 text-center text-sm">{weight}</td>
      <td className="p-3 bg-white" colSpan={2}></td>
    </tr>
  );
}

function RubricRow({ label, weight, value, onChange }: {
  label: string;
  weight: number;
  value: number;
  onChange: (v: number) => void;
}) {
  const actual = (value / 10) * weight;

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="p-4 pl-8">
        <p className="text-sm text-gray-800">{label}</p>
      </td>
      <td className="p-4 text-center text-gray-500 text-sm font-medium border-x border-gray-100">{weight}</td>
      <td className="p-4">
        <div className="flex items-center justify-center gap-2">
           <input
            type="range"
            min="0"
            max="10"
            step="1"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <input
            type="number"
            min={0}
            max={10}
            step={1}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm text-center font-bold focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex justify-between px-10 text-[10px] text-gray-400 mt-1 font-medium">
          <span>1-2</span>
          <span>3-4</span>
          <span>5-6</span>
          <span>7-8</span>
          <span>9-10</span>
        </div>
      </td>
      <td className="p-4 text-center font-bold text-gray-900 bg-orange-50/50 border-l border-gray-100">
        {actual.toFixed(1)}
      </td>
    </tr>
  );
}
