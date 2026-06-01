import { requireStudent } from "@/lib/requireAuthStudent";
import { prisma } from "@/lib/prisma";

export default async function StudentCoursesPage() {
  const student = await requireStudent();

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: student.id },
    include: {
      courseClass: {
        include: {
          course: {
            select: {
              code: true,
              name: true,
              semester: true,
              year: true,
              lecturers: {
                include: {
                  lecturer: { select: { name: true, staffId: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">My Courses</h1>
        <p className="text-sm text-(--unikl-muted)">
          All courses you are enrolled in
        </p>
      </div>

      {enrollments.length === 0 ? (
        <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-8 text-center">
          <p className="text-(--unikl-muted)">
            You are not enrolled in any courses yet.
          </p>
          <p className="text-sm text-(--unikl-muted) mt-2">
            Contact your administrator to enroll you in courses.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {enrollments.map((enrollment) => (
            <div
              key={enrollment.id}
              className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-4 hover:border-(--unikl-blue) transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-lg">
                    {enrollment.courseClass.course.code}
                  </h3>
                  <p className="text-sm text-(--unikl-muted)">
                    {enrollment.courseClass.course.name}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <div className="font-medium">{enrollment.courseClass.name}</div>
                  <div className="text-(--unikl-muted)">
                    {enrollment.courseClass.course.semester}{" "}
                    {enrollment.courseClass.course.year}
                  </div>
                </div>
              </div>

              {enrollment.courseClass.course.lecturers.length > 0 && (
                <div className="mt-3 pt-3 border-t border-(--unikl-border)">
                  <div className="flex items-center gap-2 text-sm text-(--unikl-muted)">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <span>
                      Lecturer{enrollment.courseClass.course.lecturers.length > 1 ? "s" : ""}:{" "}
                      {enrollment.courseClass.course.lecturers.map((l) => l.lecturer.name).join(", ")}
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-(--unikl-border) text-xs text-(--unikl-muted)">
                Enrolled: {new Date(enrollment.enrolledAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
