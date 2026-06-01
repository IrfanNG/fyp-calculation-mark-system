import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireLecturer } from "@/lib/requireAuth";

export default async function CloAnalysisPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams?: Promise<{ classId?: string }>;
}) {
  const lecturer = await requireLecturer();
  const { courseId } = await params;
  const sp = (await searchParams) ?? {};

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      clos: { orderBy: { code: "asc" } },
      assessments: {
        orderBy: { createdAt: "asc" },
        include: { assessmentClo: { include: { clo: true } } },
      },
      lecturers: {
        where: { lecturerId: lecturer.id },
      },
    },
  });

  if (!course) notFound();
  // Check access: admin or assigned lecturer
  if (!lecturer.isAdmin && course.lecturers.length === 0) notFound();

  const existingClassCount = await prisma.courseClass.count({ where: { courseId } });
  if (existingClassCount === 0) {
    await prisma.courseClass.createMany({
      data: ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5"].map((name) => ({ courseId, name })),
    });
  }

  const classes = await prisma.courseClass.findMany({
    where: { courseId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const selectedClassId = sp.classId ?? classes[0]?.id ?? null;

  const entries = await prisma.markEntry.findMany({
    where: selectedClassId ? { courseId, courseClassId: selectedClassId } : { courseId },
  });
  const studentsKey = (e: { studentName: string; studentId: string | null }) => `${e.studentName}::${e.studentId ?? ""}`;

  const studentMarks = new Map<
    string,
    { studentName: string; studentId: string | null; marks: Map<string, number> }
  >();
  for (const e of entries) {
    const key = studentsKey(e);
    let row = studentMarks.get(key);
    if (!row) {
      row = { studentName: e.studentName, studentId: e.studentId, marks: new Map<string, number>() };
      studentMarks.set(key, row);
    }
    row.marks.set(e.assessmentId, e.rawMark);
  }

  const cloCodes = course.clos.map((c) => c.code);
  const cloScoreSum = new Map<string, number>(cloCodes.map((c) => [c, 0] as const));
  const studentCount = studentMarks.size;

  for (const s of studentMarks.values()) {
    for (const a of course.assessments) {
      const raw = s.marks.get(a.id);
      const full = a.fullMark ?? 0;
      if (raw == null || full <= 0) continue;
      const weighted = (raw / full) * a.weightage;

      const mapped = a.assessmentClo.map((m) => m.clo.code);
      if (mapped.length === 0) continue;
      const share = weighted / mapped.length;
      for (const code of mapped) {
        cloScoreSum.set(code, (cloScoreSum.get(code) ?? 0) + share);
      }
    }
  }

  const cloRows = cloCodes.map((code) => {
    const avg = studentCount > 0 ? (cloScoreSum.get(code) ?? 0) / studentCount : 0;
    return { code, avg };
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">CLO Analysis</h1>
        <p className="text-sm text-(--unikl-muted)">Summary of average CLO attainment based on entered marks.</p>
      </div>

      {classes.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {classes.map((c) => {
            const active = c.id === selectedClassId;
            return (
              <a
                key={c.id}
                href={`?classId=${encodeURIComponent(c.id)}`}
                className={
                  "rounded-md border px-3 py-1.5 text-sm " +
                  (active
                    ? "border-(--unikl-gold) bg-(--unikl-bg) font-medium"
                    : "border-(--unikl-border) bg-(--unikl-card) hover:bg-(--unikl-bg)")
                }
              >
                {c.name}
              </a>
            );
          })}
        </div>
      ) : null}

      <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-4">
        <div className="text-sm font-medium">{course.code} — {course.name}</div>
        <div className="mt-1 text-xs text-(--unikl-muted)">Students with marks: {studentCount}</div>
      </div>

      {studentCount === 0 ? (
        <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-4 text-sm text-(--unikl-muted)">
          No marks entered yet.
        </div>
      ) : (
        <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-4">
          <div className="space-y-3">
            {cloRows.map((r) => (
              <div key={r.code}>
                <div className="flex items-center justify-between text-sm">
                  <div className="font-medium">{r.code}</div>
                  <div className="tabular-nums">{r.avg.toFixed(2)}%</div>
                </div>
                <div className="mt-1 h-2 w-full rounded bg-(--unikl-border)">
                  <div
                    className="h-2 rounded bg-(--unikl-blue)"
                    style={{ width: `${Math.max(0, Math.min(100, r.avg))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-(--unikl-border) bg-(--unikl-card)">
        <table className="w-full text-left text-sm">
          <thead className="bg-(--unikl-bg) text-(--unikl-muted)">
            <tr>
              <th className="px-4 py-2 font-medium">CLO</th>
              <th className="px-4 py-2 font-medium">Average (%)</th>
            </tr>
          </thead>
          <tbody>
            {cloRows.map((r) => (
              <tr key={r.code} className="border-t border-(--unikl-border)">
                <td className="px-4 py-2 font-medium">{r.code}</td>
                <td className="px-4 py-2 tabular-nums">{r.avg.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
