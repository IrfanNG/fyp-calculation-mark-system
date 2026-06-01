export default function WelcomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-(--unikl-bg) to-blue-50 px-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-(--unikl-blue) mb-2">
            UniKL FYP Assessment System
          </h1>
          <p className="text-lg text-(--unikl-muted)">
            Final Year Project Evaluation Portal
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* FYP Student Card */}
          <a
            href="/student/login"
            className="group relative overflow-hidden rounded-xl border-2 border-(--unikl-border) bg-(--unikl-card) p-8 text-center transition-all hover:border-(--unikl-blue) hover:shadow-xl"
          >
            <div className="mb-4">
              <svg
                className="mx-auto h-14 w-14 text-(--unikl-blue) transition-transform group-hover:scale-110"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-(--unikl-blue) mb-2">FYP Student</h2>
            <p className="text-xs text-(--unikl-muted) mb-4">Submit reports, upload slides, view feedback &amp; results</p>
            <div className="inline-flex items-center gap-1 text-sm font-medium text-(--unikl-blue)">
              Student Login
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </a>

          {/* Supervisor Card */}
          <a
            href="/login"
            className="group relative overflow-hidden rounded-xl border-2 border-(--unikl-border) bg-(--unikl-card) p-8 text-center transition-all hover:border-(--unikl-blue) hover:shadow-xl"
          >
            <div className="mb-4">
              <svg
                className="mx-auto h-14 w-14 text-(--unikl-blue) transition-transform group-hover:scale-110"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-(--unikl-blue) mb-2">Supervisor</h2>
            <p className="text-xs text-(--unikl-muted) mb-4">Review submissions, approve projects, give marks &amp; feedback</p>
            <div className="inline-flex items-center gap-1 text-sm font-medium text-(--unikl-blue)">
              Supervisor Login
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </a>

          {/* Assessor Card */}
          <a
            href="/login"
            className="group relative overflow-hidden rounded-xl border-2 border-(--unikl-border) bg-(--unikl-card) p-8 text-center transition-all hover:border-(--unikl-blue) hover:shadow-xl"
          >
            <div className="mb-4">
              <svg
                className="mx-auto h-14 w-14 text-(--unikl-blue) transition-transform group-hover:scale-110"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-(--unikl-blue) mb-2">Assessor</h2>
            <p className="text-xs text-(--unikl-muted) mb-4">Evaluate presentations, submit assessment marks</p>
            <div className="inline-flex items-center gap-1 text-sm font-medium text-(--unikl-blue)">
              Assessor Login
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </a>

          {/* Coordinator Card */}
          <a
            href="/login"
            className="group relative overflow-hidden rounded-xl border-2 border-(--unikl-gold) bg-(--unikl-card) p-8 text-center transition-all hover:border-(--unikl-blue) hover:shadow-xl"
          >
            <div className="absolute top-2 right-2">
              <span className="inline-block rounded-full bg-(--unikl-gold) px-2 py-1 text-xs font-medium text-white">
                Coordinator
              </span>
            </div>
            <div className="mb-4">
              <svg
                className="mx-auto h-14 w-14 text-(--unikl-gold) transition-transform group-hover:scale-110"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-(--unikl-gold) mb-2">FYP Coordinator</h2>
            <p className="text-xs text-(--unikl-muted) mb-4">Manage students, assign assessors, generate &amp; publish marks</p>
            <div className="inline-flex items-center gap-1 text-sm font-medium text-(--unikl-gold)">
              Coordinator Login
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </a>
        </div>

        {/* Footer Note */}
        <div className="mt-12 text-center">
          <p className="text-sm text-(--unikl-muted)">
            New student?{" "}
            <a href="/student/signup" className="font-medium text-(--unikl-blue) hover:underline">
              Register here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
