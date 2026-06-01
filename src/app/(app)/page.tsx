import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireLecturer } from "@/lib/requireAuth";
import { redirect } from "next/navigation";

export default async function Home() {
  const lecturer = await requireLecturer();

  // Route to role-specific dashboards
  if (lecturer.role === "assessor" && !lecturer.isAdmin) {
    redirect("/assessor/projects");
  }
  if (lecturer.role === "supervisor" && !lecturer.isAdmin) {
    redirect("/supervisor/projects");
  }

  // Coordinator dashboard
  const [totalProjects, totalStudents, pendingSubmissions, publishedMarks] = await Promise.all([
    prisma.fypProject.count(),
    prisma.student.count({ where: { fypProject: { isNot: null } } }),
    prisma.fypSubmission.count({ where: { status: "pending" } }),
    prisma.finalMark.count({ where: { isPublished: true } }),
  ]);

  const recentProjects = await prisma.fypProject.findMany({
    take: 8,
    orderBy: { updatedAt: "desc" },
    include: {
      student: { select: { studentId: true, name: true } },
      supervisor: { select: { name: true } },
      finalMark: true,
    },
  });

  const statusColor: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    submitted: "bg-blue-100 text-blue-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    completed: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">FYP Coordinator Dashboard</h1>
        <p className="text-sm text-(--unikl-muted)">Welcome, {lecturer.name}. Manage all FYP projects from here.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Projects", value: totalProjects, href: "/coordinator/projects" },
          { label: "Students with FYP", value: totalStudents, href: "/coordinator/projects" },
          { label: "Pending Reviews", value: pendingSubmissions, href: "/coordinator/projects" },
          { label: "Published Results", value: publishedMarks, href: "/coordinator/marks" },
        ].map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-4 hover:border-(--unikl-blue) transition-colors"
          >
            <div className="text-3xl font-bold text-(--unikl-blue)">{stat.value}</div>
            <div className="text-sm text-(--unikl-muted) mt-1">{stat.label}</div>
          </Link>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Recent Projects</h2>
          <Link href="/coordinator/projects" className="text-sm text-(--unikl-blue) hover:underline">
            View all →
          </Link>
        </div>
        <div className="overflow-hidden rounded-lg border border-(--unikl-border) bg-(--unikl-card)">
          <table className="w-full text-left text-sm">
            <thead className="bg-(--unikl-bg) text-(--unikl-muted)">
              <tr>
                <th className="px-4 py-2 font-medium">Student</th>
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="px-4 py-2 font-medium">Supervisor</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Final Mark</th>
              </tr>
            </thead>
            <tbody>
              {recentProjects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-(--unikl-muted)">
                    No projects yet. Go to <Link href="/coordinator/projects" className="text-(--unikl-blue) underline">All Projects</Link> to create one.
                  </td>
                </tr>
              ) : (
                recentProjects.map((p) => (
                  <tr key={p.id} className="border-t border-(--unikl-border)">
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.student.name}</div>
                      <div className="text-xs text-(--unikl-muted)">{p.student.studentId}</div>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate">{p.title}</td>
                    <td className="px-4 py-3">{p.supervisor.name}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColor[p.status] ?? ""}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {p.finalMark ? (
                        <span className={`font-semibold ${p.finalMark.isPublished ? "text-green-700" : "text-gray-500"}`}>
                          {p.finalMark.finalMark.toFixed(1)} ({p.finalMark.grade}){p.finalMark.isPublished ? " ✓" : " (draft)"}
                        </span>
                      ) : (
                        <span className="text-(--unikl-muted)">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/coordinator/assign" className="group rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-5 hover:border-(--unikl-blue) transition-colors">
          <div className="text-2xl mb-2">👤</div>
          <div className="font-semibold group-hover:text-(--unikl-blue)">Assign Assessors</div>
          <div className="text-sm text-(--unikl-muted) mt-1">Assign assessors to FYP projects</div>
        </Link>
        <Link href="/coordinator/schedule" className="group rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-5 hover:border-(--unikl-blue) transition-colors">
          <div className="text-2xl mb-2">📅</div>
          <div className="font-semibold group-hover:text-(--unikl-blue)">Assessment Schedule</div>
          <div className="text-sm text-(--unikl-muted) mt-1">Manage presentation schedules</div>
        </Link>
        <Link href="/coordinator/marks" className="group rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-5 hover:border-(--unikl-blue) transition-colors">
          <div className="text-2xl mb-2">📊</div>
          <div className="font-semibold group-hover:text-(--unikl-blue)">Final Marks</div>
          <div className="text-sm text-(--unikl-muted) mt-1">Generate and publish final marks</div>
        </Link>
      </div>
    </div>
  );
}
