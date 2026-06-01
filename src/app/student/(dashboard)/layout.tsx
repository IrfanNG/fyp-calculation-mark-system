import { requireStudent } from "@/lib/requireAuthStudent";

export default async function StudentPortalLayout({ children }: { children: React.ReactNode }) {
  const student = await requireStudent();

  return (
    <div className="min-h-screen bg-(--unikl-bg) text-(--unikl-text)">
      <header className="sticky top-0 z-10 border-b border-(--unikl-border) bg-(--unikl-blue) text-white">
        <div className="mx-auto flex items-center justify-between px-4 py-3">
          <div className="font-semibold tracking-wide">UniKL FYP System — Student Portal</div>
          <div className="flex items-center gap-3 text-sm">
            <div className="text-white/90">{student.name} ({student.studentId})</div>
            <form action="/api/student/auth/logout" method="post">
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
            <a className="block rounded-md px-3 py-2 font-medium text-(--unikl-blue) hover:bg-(--unikl-bg)" href="/student">Dashboard</a>
            <div className="my-1 border-t border-(--unikl-border)" />
            <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-(--unikl-muted)">My FYP</p>
            <a className="block rounded-md px-3 py-2 font-medium text-(--unikl-blue) hover:bg-(--unikl-bg)" href="/student/fyp">FYP Overview</a>
            <a className="block rounded-md px-3 py-2 font-medium text-(--unikl-blue) hover:bg-(--unikl-bg)" href="/student/fyp/submit-report">Submit Report</a>
            <a className="block rounded-md px-3 py-2 font-medium text-(--unikl-blue) hover:bg-(--unikl-bg)" href="/student/fyp/upload-slides">Upload Slides</a>
            <a className="block rounded-md px-3 py-2 font-medium text-(--unikl-blue) hover:bg-(--unikl-bg)" href="/student/fyp/feedback">View Feedback</a>
            <a className="block rounded-md px-3 py-2 font-medium text-(--unikl-blue) hover:bg-(--unikl-bg)" href="/student/fyp/results">Assessment Result</a>
          </nav>
        </aside>
        <main className="col-span-12 md:col-span-10 lg:col-span-10">{children}</main>
      </div>
    </div>
  );
}
