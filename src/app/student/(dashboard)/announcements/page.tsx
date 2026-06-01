import { requireStudent } from "@/lib/requireAuthStudent";
import { prisma } from "@/lib/prisma";

export default async function StudentAnnouncementsPage() {
  const student = await requireStudent();

  // Get enrolled class IDs
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: student.id },
    select: { courseClassId: true },
  });
  const classIds = enrollments.map((e) => e.courseClassId);

  // Get announcements for enrolled classes + global
  const announcements = await prisma.announcement.findMany({
    where: {
      OR: [
        { courseClassId: { in: classIds } },
        { courseClassId: null }, // global announcements
      ],
    },
    orderBy: { publishedAt: "desc" },
    include: {
      lecturer: { select: { name: true } },
      courseClass: {
        select: {
          name: true,
          course: { select: { code: true, name: true } },
        },
      },
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Announcements</h1>
        <p className="text-sm text-(--unikl-muted)">
          Updates from your lecturers and courses
        </p>
      </div>

      {announcements.length === 0 ? (
        <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-(--unikl-muted)"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
            />
          </svg>
          <p className="mt-4 text-(--unikl-muted)">No announcements yet</p>
          <p className="text-sm text-(--unikl-muted) mt-1">
            Check back later for updates from your lecturers
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-4 hover:border-(--unikl-blue) transition-colors"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-medium text-lg">{announcement.title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-(--unikl-muted)">
                    <div className="flex items-center gap-1">
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
                      <span>{announcement.lecturer.name}</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1">
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
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span>
                        {new Date(announcement.publishedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div
                  className={
                    "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap " +
                    (announcement.courseClass
                      ? "bg-blue-100 text-blue-800"
                      : "bg-yellow-100 text-yellow-800")
                  }
                >
                  {announcement.courseClass
                    ? `${announcement.courseClass.course.code} - ${announcement.courseClass.name}`
                    : "📢 General"}
                </div>
              </div>

              {/* Content */}
              <div className="mt-3 pt-3 border-t border-(--unikl-border)">
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap text-(--unikl-text)">
                    {announcement.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
