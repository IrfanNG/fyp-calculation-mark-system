"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Project = {
  id: string;
  title: string;
  student: { name: string; studentId: string };
};

type Assessment = {
  s1_introClarity: number;
  s2_objClarity: number;
  s3_contOriginality: number;
  s3_contStructure: number;
  s3_contAppropriate: number;
  s3_contBackground: number;
  s3_contMethod: number;
  s3_contDiagrams: number;
  s4_protoCreativity: number;
  s4_protoDifficulty: number;
  s5_qaAbility: number;
  s5_qaUnderstanding: number;
  s5_qaInterpersonal: number;
  s6_mediaSuitability: number;
  s6_mediaSlides: number;
  s7_skillsAttire: number;
  s7_skillsOrg: number;
  comments: string;
};

const WEIGHTS = {
  s1_introClarity: 1,
  s2_objClarity: 2,
  s3_contOriginality: 2,
  s3_contStructure: 3,
  s3_contAppropriate: 2,
  s3_contBackground: 3,
  s3_contMethod: 3,
  s3_contDiagrams: 2,
  s4_protoCreativity: 2,
  s4_protoDifficulty: 3,
  s5_qaAbility: 2,
  s5_qaUnderstanding: 2,
  s5_qaInterpersonal: 2,
  s6_mediaSuitability: 1,
  s6_mediaSlides: 2,
  s7_skillsAttire: 2,
  s7_skillsOrg: 1,
};

export default function PresentationFormClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Assessment>({
    s1_introClarity: 0,
    s2_objClarity: 0,
    s3_contOriginality: 0,
    s3_contStructure: 0,
    s3_contAppropriate: 0,
    s3_contBackground: 0,
    s3_contMethod: 0,
    s3_contDiagrams: 0,
    s4_protoCreativity: 0,
    s4_protoDifficulty: 0,
    s5_qaAbility: 0,
    s5_qaUnderstanding: 0,
    s5_qaInterpersonal: 0,
    s6_mediaSuitability: 0,
    s6_mediaSlides: 0,
    s7_skillsAttire: 0,
    s7_skillsOrg: 0,
    comments: "",
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [projRes, assessRes] = await Promise.all([
          fetch("/api/supervisor/projects"),
          fetch(`/api/supervisor/presentation-assessment?projectId=${id}`),
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
      const res = await fetch("/api/supervisor/presentation-assessment", {
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
        <h1 className="text-2xl font-bold">FYP1 Presentation Assessment Form</h1>
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
              <HeaderRow label="1. Introduction" weight={1} />
              <RubricRow
                label="Clarity of the introduction"
                weight={1}
                value={formData.s1_introClarity}
                onChange={(v) => handleChange("s1_introClarity", v)}
              />

              {/* 2. Objectives */}
              <HeaderRow label="2. Objectives" weight={2} />
              <RubricRow
                label="Clarity of the objectives (specified / general)"
                weight={2}
                value={formData.s2_objClarity}
                onChange={(v) => handleChange("s2_objClarity", v)}
              />

              {/* 3. Content of Presentation */}
              <HeaderRow label="3. Content of Presentation" weight={15} />
              <RubricRow
                label="Originality & preparation of materials"
                weight={2}
                value={formData.s3_contOriginality}
                onChange={(v) => handleChange("s3_contOriginality", v)}
              />
              <RubricRow
                label="Clarity and structure of explanations"
                weight={3}
                value={formData.s3_contStructure}
                onChange={(v) => handleChange("s3_contStructure", v)}
              />
              <RubricRow
                label="Appropriateness of topics discussed"
                weight={2}
                value={formData.s3_contAppropriate}
                onChange={(v) => handleChange("s3_contAppropriate", v)}
              />
              <RubricRow
                label="Clarity project background, research analysis"
                weight={3}
                value={formData.s3_contBackground}
                onChange={(v) => handleChange("s3_contBackground", v)}
              />
              <RubricRow
                label="Suitability of method chosen"
                weight={3}
                value={formData.s3_contMethod}
                onChange={(v) => handleChange("s3_contMethod", v)}
              />
              <RubricRow
                label="Clarity of diagrams / gantt chart"
                weight={2}
                value={formData.s3_contDiagrams}
                onChange={(v) => handleChange("s3_contDiagrams", v)}
              />

              {/* 4. Prototype Progress */}
              <HeaderRow label="4. Prototype Progress (30% prototype)" weight={5} />
              <RubricRow
                label="Creativity and critical thinking reflected in prototype"
                weight={2}
                value={formData.s4_protoCreativity}
                onChange={(v) => handleChange("s4_protoCreativity", v)}
              />
              <RubricRow
                label="Technical difficulty"
                weight={3}
                value={formData.s4_protoDifficulty}
                onChange={(v) => handleChange("s4_protoDifficulty", v)}
              />

              {/* 5. Question & Answer */}
              <HeaderRow label="5. Question & Answer" weight={6} />
              <RubricRow
                label="Ability to handle questions"
                weight={2}
                value={formData.s5_qaAbility}
                onChange={(v) => handleChange("s5_qaAbility", v)}
              />
              <RubricRow
                label="Understanding of the project"
                weight={2}
                value={formData.s5_qaUnderstanding}
                onChange={(v) => handleChange("s5_qaUnderstanding", v)}
              />
              <RubricRow
                label="Interpersonal ability & communication skills"
                weight={2}
                value={formData.s5_qaInterpersonal}
                onChange={(v) => handleChange("s5_qaInterpersonal", v)}
              />

              {/* 6. Use of Media */}
              <HeaderRow label="6. Use of Media" weight={3} />
              <RubricRow
                label="Suitability of media chosen (helps understanding)"
                weight={1}
                value={formData.s6_mediaSuitability}
                onChange={(v) => handleChange("s6_mediaSuitability", v)}
              />
              <RubricRow
                label="Slides Presentation"
                weight={2}
                value={formData.s6_mediaSlides}
                onChange={(v) => handleChange("s6_mediaSlides", v)}
              />

              {/* 7. Presentation Skills */}
              <HeaderRow label="7. Presentation Skills" weight={3} />
              <RubricRow
                label="Attire & Expression (Confidence, lively, eye contact)"
                weight={2}
                value={formData.s7_skillsAttire}
                onChange={(v) => handleChange("s7_skillsAttire", v)}
              />
              <RubricRow
                label="Organization of presentation / time keeping"
                weight={1}
                value={formData.s7_skillsOrg}
                onChange={(v) => handleChange("s7_skillsOrg", v)}
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
            placeholder="Describe student performance, areas for improvement, or technical feedback..."
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
               <p className="text-xs text-gray-500 font-medium uppercase">Final Submission Mark</p>
               <p className="text-xl font-bold text-blue-900">{((totalWeighted / 35) * 100).toFixed(1)}%</p>
             </div>
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-2.5 bg-blue-700 text-white rounded-lg font-bold hover:bg-blue-800 disabled:opacity-50 shadow-md transform active:scale-95 transition-all"
            >
              {saving ? "Saving Assessment..." : "Submit Assessment"}
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
