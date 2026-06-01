import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { defaultGpaScale } from "@/lib/gpa";
import { requireLecturer } from "@/lib/requireAuth";
import ReportClient from "./ui";

export default async function ReportPage({
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
      assessments: { orderBy: { createdAt: "asc" } },
      lecturers: {
        where: { lecturerId: lecturer.id },
      },
    },
  });

  if (!course) notFound();
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

  const scaleRows = await prisma.gpaScale.findMany({ orderBy: { minMark: "desc" } });
  const scale =
    scaleRows.length === 0
      ? defaultGpaScale
      : scaleRows.map((r) => ({ minMark: r.minMark, maxMark: r.maxMark, grade: r.grade, gpa: r.gpa }));

  const entries = await prisma.markEntry.findMany({
    where: selectedClassId ? { courseId, courseClassId: selectedClassId } : { courseId },
  });

  const byStudent = new Map<string, { studentName: string; studentId: string | null; marks: Record<string, number> }>();
  for (const e of entries) {
    const key = `${e.studentName}::${e.studentId ?? ""}`;
    const row = byStudent.get(key) ?? { studentName: e.studentName, studentId: e.studentId, marks: {} };
    row.marks[e.assessmentId] = e.rawMark;
    byStudent.set(key, row);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Report</h1>
        <p className="text-sm text-(--unikl-muted)">Export marks and computed results.</p>
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

      <ReportClient
        course={{ id: course.id, code: course.code, name: course.name }}
        assessments={course.assessments.map((a) => ({
          id: a.id,
          name: a.name,
          weightage: a.weightage,
          fullMark: a.fullMark ?? null,
        }))}
        gpaScale={scale}
        students={Array.from(byStudent.values()).sort((a, b) => a.studentName.localeCompare(b.studentName))}
      />
    </div>
  );
}
