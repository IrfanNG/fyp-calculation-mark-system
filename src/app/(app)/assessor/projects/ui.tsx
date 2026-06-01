"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Assignment = {
  id: string;
  project: {
    id: string;
    title: string;
    status: string;
    student: { studentId: string; name: string };
    supervisor: { name: string };
    submissions: { id: string; type: string; status: string }[];
    assessorMarks: { mark: number }[];
    finalMark: { finalMark: number; grade: string; isPublished: boolean } | null;
  };
  schedule: { title: string; scheduledAt: string; venue?: string } | null;
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  submitted: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  completed: "bg-purple-100 text-purple-700",
};

export default function AssessorProjectsClient() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/assessor/projects")
      .then((r) => r.json())
      .then((d) => setAssignments(d.assignments ?? []))
      .catch(() => setError("Failed to load assignments"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-(--unikl-muted) py-8 text-center">Loading…</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Assigned Students</h1>
        <p className="text-sm text-(--unikl-muted)">{assignments.length} project(s) assigned to you for assessment.</p>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {assignments.length === 0 ? (
        <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-8 text-center text-(--unikl-muted)">
          No projects assigned to you yet.
        </div>
      ) : (
        <div className="grid gap-4">
          {assignments.map((a) => (
            <Link key={a.id} href={`/assessor/projects/${a.project.id}`}
              className="block rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-5 hover:border-(--unikl-blue) transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[a.project.status] ?? ""}`}>
                      {a.project.status}
                    </span>
                    {a.schedule && (
                      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                        📅 {new Date(a.schedule.scheduledAt).toLocaleDateString("en-MY")}
                      </span>
                    )}
                  </div>
                  <div className="font-semibold">
                    {a.project.student.name}{" "}
                    <span className="font-normal text-sm text-(--unikl-muted)">({a.project.student.studentId})</span>
                  </div>
                  <div className="text-sm text-(--unikl-muted) truncate">{a.project.title}</div>
                  <div className="text-xs text-(--unikl-muted) mt-1">Supervisor: {a.project.supervisor.name}</div>
                </div>
                <div className="text-right text-sm shrink-0 space-y-2">
                  <div>
                    <div className="text-xs text-(--unikl-muted)">Your Mark</div>
                    {a.project.assessorMarks.length > 0 ? (
                      <div className="font-semibold text-(--unikl-blue)">
                        {a.project.assessorMarks[0].mark.toFixed(1)} / 100
                      </div>
                    ) : (
                      <div className="text-amber-600 text-xs font-medium">Not marked yet</div>
                    )}
                  </div>

                  <div>
                    <div className="text-xs text-(--unikl-muted)">Final Mark</div>
                    {a.project.finalMark ? (
                      <>
                        <div className="font-bold text-gray-900">
                          {a.project.finalMark.finalMark.toFixed(1)} / 100
                        </div>
                        <div className="text-xs text-(--unikl-muted)">
                          Grade {a.project.finalMark.grade}
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-amber-600">Not generated</div>
                    )}
                  </div>

                  <div className="text-xs text-(--unikl-muted)">{a.project.submissions.length} submission(s)</div>
                </div>
              </div>
              {a.schedule && (
                <div className="mt-2 text-xs text-purple-700 bg-purple-50 rounded-md px-3 py-1.5">
                  Presentation: {a.schedule.title} · {new Date(a.schedule.scheduledAt).toLocaleString("en-MY")}
                  {a.schedule.venue && ` · ${a.schedule.venue}`}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
