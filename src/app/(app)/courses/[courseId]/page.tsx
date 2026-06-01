import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireLecturer } from "@/lib/requireAuth";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const lecturer = await requireLecturer();
  const { courseId } = await params;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      clos: { orderBy: { code: "asc" } },
      assessments: {
        orderBy: { createdAt: "asc" },
        include: {
          assessmentClo: {
            include: { clo: true },
          },
        },
      },
      lecturers: {
        where: { lecturerId: lecturer.id },
      },
      classes: { orderBy: { name: "asc" } },
    },
  });

  if (!course) notFound();
  if (!lecturer.isAdmin && course.lecturers.length === 0) notFound();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">
            {course.code} — {course.name}
          </h1>
          <div className="text-sm text-(--unikl-muted)">
            {course.semester ?? "(no semester)"} {course.year ? `• ${course.year}` : ""}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/courses/${course.id}/marks`}
            className="rounded-md bg-(--unikl-blue) px-3 py-2 text-sm font-medium text-white hover:bg-(--unikl-blue-2)"
          >
            Course Mark Entry
          </Link>
          <Link
            href={`/courses/${course.id}/analysis`}
            className="rounded-md border border-(--unikl-border) bg-(--unikl-card) px-3 py-2 text-sm font-medium hover:bg-(--unikl-bg)"
          >
            CLO Analysis
          </Link>
          <Link
            href={`/courses/${course.id}/report`}
            className="rounded-md border border-(--unikl-border) bg-(--unikl-card) px-3 py-2 text-sm font-medium hover:bg-(--unikl-bg)"
          >
            Report
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-4">
        <div className="text-sm font-medium">CLOs</div>
        <div className="mt-2 grid gap-2">
          {course.clos.length === 0 ? (
            <div className="text-sm text-(--unikl-muted)">No CLOs.</div>
          ) : (
            course.clos.map((c) => (
              <div key={c.id} className="text-sm">
                <span className="font-medium">{c.code}</span>
                {c.description ? <span className="text-(--unikl-muted)"> — {c.description}</span> : null}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-(--unikl-border) bg-(--unikl-card)">
        <div className="border-b border-(--unikl-border) bg-(--unikl-card) p-4">
          <div className="text-sm font-medium">Assessments</div>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-(--unikl-bg) text-(--unikl-muted)">
            <tr>
              <th className="px-4 py-2 font-medium">Assessment</th>
              <th className="px-4 py-2 font-medium">Weightage</th>
              <th className="px-4 py-2 font-medium">Full Mark</th>
              <th className="px-4 py-2 font-medium">CLO Mapping</th>
            </tr>
          </thead>
          <tbody>
            {course.assessments.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-3 text-(--unikl-muted)">
                  No assessments.
                </td>
              </tr>
            ) : (
              course.assessments.map((a) => (
                <tr key={a.id} className="border-t border-(--unikl-border)">
                  <td className="px-4 py-3 font-medium">{a.name}</td>
                  <td className="px-4 py-3">{a.weightage}%</td>
                  <td className="px-4 py-3">{a.fullMark ?? "-"}</td>
                  <td className="px-4 py-3">
                    {a.assessmentClo.length === 0
                      ? "-"
                      : a.assessmentClo
                          .map((m) => m.clo.code)
                          .sort((x, y) => x.localeCompare(y))
                          .join(", ")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
