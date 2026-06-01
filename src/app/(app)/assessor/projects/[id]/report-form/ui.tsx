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

export default function AssessorReportFormClient() {
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
          fetch("/api/assessor/projects"),
          fetch(`/api/assessor/report-assessment?projectId=${id}`),
        ]);

        const projData = await projRes.json();
        const foundAssignment = (projData.assignments ?? []).find((a: any) => a.project.id === id);
        setProject(foundAssignment?.project || null);

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
      const res = await fetch("/api/assessor/report-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: id,
          ...formData,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save assessment");

      router.push(`/assessor/projects/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving");
    } finally {
      setSaving(false);
    }
  }

  const handleChange = (field: keyof Assessment, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Loading form...</div>;
  if (!project) return <div className="p-8 text-center text-red-500">Project not found</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 bg-white shadow-lg rounded-xl border border-gray-200 my-8">
      <div className="bg-gradient-to-r from-purple-900 to-purple-700 p-6 rounded-t-xl text-white mb-6">
        <h1 className="text-2xl font-bold">Assessor: FYP1 Report Assessment Form</h1>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm opacity-90">
          <p><span className="opacity-70">Project:</span> <span className="font-semibold">{project.title}</span></p>
          <p><span className="opacity-70">Student:</span> <span className="font-semibold">{project.student.name} ({project.student.studentId})</span></p>
        </div>
      </div>

      {error && <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center gap-2">
        <span className="font-bold">Error:</span> {error}
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
              <HeaderRow label="1. Introduction" weight={8} />
              <RubricRow label="Research background" weight={2} value={formData.s1_bg} onChange={(v: number) => handleChange("s1_bg", v)} />
              <RubricRow label="Overview of research study and problem statement" weight={2} value={formData.s1_problem} onChange={(v: number) => handleChange("s1_problem", v)} />
              <RubricRow label="Problem identification and the significant of the study" weight={2} value={formData.s1_significance} onChange={(v: number) => handleChange("s1_significance", v)} />
              <RubricRow label="Research objectives and scope of the study" weight={2} value={formData.s1_objScope} onChange={(v: number) => handleChange("s1_objScope", v)} />

              <HeaderRow label="2. Literature Review" weight={10} />
              <RubricRow label="The theoretical study and/or recent study from journal and/or relevant resources" weight={5} value={formData.s2_theory} onChange={(v: number) => handleChange("s2_theory", v)} />
              <RubricRow label="Relevancy of literature to the objectives of the study" weight={5} value={formData.s2_relevancy} onChange={(v: number) => handleChange("s2_relevancy", v)} />

              <HeaderRow label="3. Material and Methodology" weight={10} />
              <RubricRow label="Materials and methods must support scope of studies" weight={2} value={formData.s3_material} onChange={(v: number) => handleChange("s3_material", v)} />
              <RubricRow label="Analysis/hardware design/case study/must be relevant to the objectives" weight={3} value={formData.s3_analysis} onChange={(v: number) => handleChange("s3_analysis", v)} />
              <RubricRow label="Follow established/modified standard (steps and procedures)" weight={3} value={formData.s3_standard} onChange={(v: number) => handleChange("s3_standard", v)} />
              <RubricRow label="Research Plan (Milestones, Gantt Chart)" weight={2} value={formData.s3_plan} onChange={(v: number) => handleChange("s3_plan", v)} />

              <HeaderRow label="4. Language / writing convention / vocabulary" weight={3} />
              <RubricRow label="Content is well organized and coherent" weight={3} value={formData.s4_language} onChange={(v: number) => handleChange("s4_language", v)} />

              <HeaderRow label="5. Project Report Format / Organization" weight={4} />
              <RubricRow label="Students abide by format given" weight={2} value={formData.s5_abide} onChange={(v: number) => handleChange("s5_abide", v)} />
              <RubricRow label="Project report is effectively organized for easy understanding" weight={2} value={formData.s5_org} onChange={(v: number) => handleChange("s5_org", v)} />
            </tbody>
            <tfoot className="bg-orange-100 text-orange-900">
              <tr>
                <td colSpan={3} className="p-4 text-right font-bold text-lg uppercase tracking-wider">Total Score (35)</td>
                <td className="p-4 text-center font-black text-2xl border-l border-orange-200">
                  {totalWeighted.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
          <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Assessor Comments</label>
          <textarea
            value={formData.comments}
            onChange={(e) => handleChange("comments", e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none shadow-sm transition-all"
            placeholder="Provide feedback on the report quality..."
          />
        </div>

        <div className="flex justify-between items-center pt-6 border-t border-gray-200">
          <button type="button" onClick={() => router.back()} className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-600 font-medium hover:bg-gray-50 transition-colors">Cancel & Back</button>
          <div className="flex gap-4 items-center">
             <div className="text-right hidden sm:block">
               <p className="text-xs text-gray-500 font-medium uppercase tracking-tighter">Final Report Mark</p>
               <p className="text-xl font-bold text-purple-900">{((totalWeighted / 35) * 100).toFixed(2)}%</p>
             </div>
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-2.5 bg-purple-700 text-white rounded-lg font-bold hover:bg-purple-800 disabled:opacity-50 shadow-md transform active:scale-95 transition-all"
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
    <tr className="bg-purple-50">
      <td className="p-3 font-bold text-purple-900 text-sm">{label}</td>
      <td className="p-3 font-bold text-purple-900 text-center text-sm">{weight}</td>
      <td className="p-3 bg-white" colSpan={2}></td>
    </tr>
  );
}

function RubricRow({ label, weight, value, onChange }: any) {
  const actual = (value / 10) * weight;
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="p-4 pl-8">
        <p className="text-sm text-gray-800 font-medium">{label}</p>
      </td>
      <td className="p-4 text-center text-gray-500 font-medium border-x border-gray-100">{weight}</td>
      <td className="p-4">
        <div className="flex items-center justify-center gap-3">
          <input type="range" min="0" max="10" step="1" value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-32 accent-purple-600 cursor-pointer" />
          <input type="number" min={0} max={10} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-14 rounded border border-gray-300 px-1 py-1 text-center font-bold text-gray-800 focus:ring-2 focus:ring-purple-500 outline-none" />
        </div>
      </td>
      <td className="p-4 text-center font-bold text-gray-900 bg-orange-50/30 border-l border-gray-100">
        {actual.toFixed(2)}
      </td>
    </tr>
  );
}
