import { requireLecturer } from "@/lib/requireAuthLecturer";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function CourseManagementPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const lecturer = await requireLecturer();

  // Check if lecturer teaches this course
  const courseLecturer = await prisma.courseLecturer.findUnique({
    where: {
      courseId_lecturerId: {
        courseId,
        lecturerId: lecturer.id,
      },
    },
    include: {
      course: {
        include: {
          classes: {
            include: {
              _count: {
                select: { enrollments: true },
              },
            },
          },
        },
      },
    },
  });

  if (!courseLecturer) notFound();

  const course = courseLecturer.course;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">
          {course.code} - {course.name}
        </h1>
        <p className="text-sm text-(--unikl-muted)">
          Semester {course.semester} • {course.year}
        </p>
      </div>

      {/* Classes Overview */}
      <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-6">
        <h2 className="font-medium mb-4">Your Classes</h2>
        <div className="space-y-2">
          {course.classes.length === 0 ? (
            <div className="text-sm text-(--unikl-muted)">
              No classes assigned yet
            </div>
          ) : (
            course.classes.map((cls) => (
              <div
                key={cls.id}
                className="flex items-center justify-between p-3 rounded border border-(--unikl-border) hover:bg-(--unikl-hover) transition-colors"
              >
                <div>
                  <span className="font-medium">{cls.name}</span>
                  <span className="text-sm text-(--unikl-muted) ml-2">
                    ({cls._count.enrollments}{" "}
                    {cls._count.enrollments === 1 ? "student" : "students"})
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href={`/my-courses/${courseId}/announcements`}
          className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-6 hover:border-(--unikl-blue) transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-medium">Announcements</h3>
              <p className="text-sm text-(--unikl-muted)">Post updates to students</p>
            </div>
          </div>
        </Link>

        <Link
          href={`/my-courses/${courseId}/assignments`}
          className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-6 hover:border-(--unikl-blue) transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-green-50 text-green-600 group-hover:bg-green-100 transition-colors">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-medium">Assignments</h3>
              <p className="text-sm text-(--unikl-muted)">Create and grade assignments</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
