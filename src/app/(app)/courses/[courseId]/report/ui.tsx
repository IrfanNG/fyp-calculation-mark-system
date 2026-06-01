"use client";

import { useMemo } from "react";
import Link from "next/link";
import { getGradeAndGpa, type GpaScaleRow } from "@/lib/gpa";

type Assessment = {
  id: string;
  name: string;
  weightage: number;
  fullMark: number | null;
};

type Student = {
  studentName: string;
  studentId: string | null;
  marks: Record<string, number>;
};

export default function ReportClient({
  course,
  assessments,
  gpaScale,
  students,
}: {
  course: { id: string; code: string; name: string };
  assessments: Assessment[];
  gpaScale: GpaScaleRow[];
  students: Student[];
}) {
  const rows = useMemo(() => {
    return students.map((s) => {
      const weightedTotal = assessments.reduce((sum, a) => {
        const raw = s.marks[a.id] ?? 0;
        const full = a.fullMark ?? 0;
        if (full <= 0) return sum;
        return sum + (raw / full) * a.weightage;
      }, 0);

      const total = Number.isFinite(weightedTotal) ? weightedTotal : 0;
      const grade = getGradeAndGpa(total, gpaScale);
      return { ...s, total, grade };
    });
  }, [students, assessments, gpaScale]);

  function exportCsv() {
    const header = [
      "Student Name",
      "Student ID",
      ...assessments.map((a) => `${a.name} (/ ${a.fullMark ?? "-"})`),
      "Total (%)",
      "Grade",
      "GPA",
    ];

    const lines = [header];
    for (const r of rows) {
      lines.push([
        r.studentName,
        r.studentId ?? "",
        ...assessments.map((a) => String(r.marks[a.id] ?? "")),
        r.total.toFixed(2),
        r.grade.grade,
        r.grade.gpa.toFixed(2),
      ]);
    }

    const csv = lines
      .map((cols) => cols.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${course.code}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-medium">
              {course.code} — {course.name}
            </div>
            <div className="text-xs text-(--unikl-muted)">Students: {rows.length}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/courses/${course.id}`}
              className="rounded-md border border-(--unikl-border) px-3 py-2 text-sm hover:bg-(--unikl-bg)"
            >
              Back to course
            </Link>
            <button
              onClick={exportCsv}
              className="rounded-md border border-(--unikl-border) px-3 py-2 text-sm hover:bg-(--unikl-bg)"
            >
              Export to CSV
            </button>
            <button
              onClick={() => window.print()}
              className="rounded-md border border-(--unikl-border) px-3 py-2 text-sm hover:bg-(--unikl-bg)"
            >
              Print
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-(--unikl-border) bg-(--unikl-card)">
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-(--unikl-bg) text-(--unikl-muted)">
              <tr>
                <th className="px-3 py-2 font-medium">Student</th>
                <th className="px-3 py-2 font-medium">ID</th>
                {assessments.map((a) => (
                  <th key={a.id} className="px-3 py-2 font-medium whitespace-nowrap">
                    {a.name}
                  </th>
                ))}
                <th className="px-3 py-2 font-medium">Total</th>
                <th className="px-3 py-2 font-medium">Grade</th>
                <th className="px-3 py-2 font-medium">GPA</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-(--unikl-muted)" colSpan={2 + assessments.length + 3}>
                    No marks entered yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={`${r.studentName}::${r.studentId ?? ""}`} className="border-t border-(--unikl-border)">
                    <td className="px-3 py-2 font-medium">{r.studentName}</td>
                    <td className="px-3 py-2">{r.studentId ?? ""}</td>
                    {assessments.map((a) => (
                      <td key={a.id} className="px-3 py-2 tabular-nums">
                        {typeof r.marks[a.id] === "number" ? r.marks[a.id] : ""}
                      </td>
                    ))}
                    <td className="px-3 py-2 font-medium tabular-nums">{r.total.toFixed(2)}</td>
                    <td className="px-3 py-2 font-medium">{r.grade.grade}</td>
                    <td className="px-3 py-2 font-medium tabular-nums">{r.grade.gpa.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
