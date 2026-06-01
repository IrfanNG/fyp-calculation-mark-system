import { requireLecturer } from "@/lib/requireAuth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const lecturer = await requireLecturer();
  const isCoordinator = lecturer.isAdmin;
  const isSupervisor = !lecturer.isAdmin && lecturer.role === "supervisor";
  const isAssessor = !lecturer.isAdmin && lecturer.role === "assessor";

  return (
    <div className="min-h-screen bg-(--unikl-bg) text-(--unikl-text)">
      <header className="sticky top-0 z-10 border-b border-(--unikl-border) bg-(--unikl-blue) text-white">
        <div className="mx-auto flex items-center justify-between px-4 py-3">
          <div className="font-semibold tracking-wide">UniKL FYP Assessment System</div>
          <div className="flex items-center gap-3 text-sm">
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium uppercase tracking-wide">
              {isCoordinator ? "Coordinator" : isSupervisor ? "Supervisor" : "Assessor"}
            </span>
            <div className="text-white/90">{lecturer.name}</div>
            <form action="/api/auth/logout" method="post">
              <button className="rounded-md border border-white/30 bg-white px-3 py-1.5 font-medium text-(--unikl-blue) hover:bg-(--unikl-bg)">
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto grid grid-cols-12 gap-4 px-4 py-4">
        <aside className="col-span-12 md:col-span-2 lg:col-span-2">
          <nav className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-2 text-sm">
            {isCoordinator && (
              <>
                <p className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-(--unikl-muted)">Coordinator</p>
                <a className="block rounded-md px-3 py-2 font-medium text-(--unikl-blue) hover:bg-(--unikl-bg)" href="/">Dashboard</a>
                <a className="block rounded-md px-3 py-2 font-medium text-(--unikl-blue) hover:bg-(--unikl-bg)" href="/coordinator/projects">All Projects</a>
                <a className="block rounded-md px-3 py-2 font-medium text-(--unikl-blue) hover:bg-(--unikl-bg)" href="/coordinator/assign">Assign Assessors</a>
                <a className="block rounded-md px-3 py-2 font-medium text-(--unikl-blue) hover:bg-(--unikl-bg)" href="/coordinator/schedule">Assessment Schedule</a>
                <a className="block rounded-md px-3 py-2 font-medium text-(--unikl-blue) hover:bg-(--unikl-bg)" href="/coordinator/marks">Final Marks</a>
                <div className="my-2 border-t border-(--unikl-border)" />
                <p className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-(--unikl-muted)">Admin</p>
                <a className="block rounded-md px-3 py-2 font-medium text-(--unikl-blue) hover:bg-(--unikl-bg)" href="/admin/manage">Manage Users</a>
                <a className="block rounded-md px-3 py-2 font-medium text-(--unikl-blue) hover:bg-(--unikl-bg)" href="/admin/gpa-scale">Grade Scale</a>
              </>
            )}
            {isSupervisor && (
              <>
                <p className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-(--unikl-muted)">Supervisor</p>
                <a className="block rounded-md px-3 py-2 font-medium text-(--unikl-blue) hover:bg-(--unikl-bg)" href="/">Dashboard</a>
                <a className="block rounded-md px-3 py-2 font-medium text-(--unikl-blue) hover:bg-(--unikl-bg)" href="/supervisor/projects">My Students</a>
              </>
            )}
            {isAssessor && (
              <>
                <p className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-(--unikl-muted)">Assessor</p>
                <a className="block rounded-md px-3 py-2 font-medium text-(--unikl-blue) hover:bg-(--unikl-bg)" href="/">Dashboard</a>
                <a className="block rounded-md px-3 py-2 font-medium text-(--unikl-blue) hover:bg-(--unikl-bg)" href="/assessor/projects">Assigned Students</a>
              </>
            )}
          </nav>
        </aside>
        <main className="col-span-12 md:col-span-10 lg:col-span-10">{children}</main>
      </div>
    </div>
  );
}
