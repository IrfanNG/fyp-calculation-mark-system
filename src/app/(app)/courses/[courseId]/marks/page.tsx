import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { defaultGpaScale } from "@/lib/gpa";
import MarksEntryClient from "./ui";
import { requireLecturer } from "@/lib/requireAuth";

export default async function MarksPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const lecturer = await requireLecturer();
  const { courseId } = await params;

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

  const scaleRows = await prisma.gpaScale.findMany({ orderBy: { minMark: "desc" } });
  const scale =
    scaleRows.length === 0
      ? defaultGpaScale
      : scaleRows.map((r) => ({ minMark: r.minMark, maxMark: r.maxMark, grade: r.grade, gpa: r.gpa }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Course Mark Entry</h1>
        <p className="text-sm text-(--unikl-muted)">
          Excel-like entry. Enter raw marks only — totals, grade, and GPA are auto calculated.
        </p>
      </div>
      <MarksEntryClient
        course={{ id: course.id, code: course.code, name: course.name }}
        assessments={course.assessments.map((a) => ({
          id: a.id,
          name: a.name,
          weightage: a.weightage,
          fullMark: a.fullMark ?? null,
        }))}
        gpaScale={scale}
      />
    </div>
  );
}
