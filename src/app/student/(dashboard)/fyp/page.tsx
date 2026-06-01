"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Project = {
  id: string;
  title: string;
  description?: string;
  status: string;
  supervisor?: { id: string; name: string; staffId: string } | null;
  submissions: any[];
  feedbacks: any[];
  assessorAssignments: any[];
  finalMark: any;
};

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  completed: "bg-purple-100 text-purple-700",
};

export default function StudentFYPPage() {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const loadData = async () => {
    try {
      const res = await fetch("/api/student/fyp/project");
      const data = await res.json();
      setProject(data.project);

      if (data.project) {
        setTitle(data.project.title);
        setDescription(data.project.description ?? "");
      }
    } catch (err) {
      setError("Failed to load project data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/student/fyp/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit proposal");
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-(--unikl-muted)">Loading...</div>;

  const canEdit = !project || project.status === "draft" || project.status === "rejected";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">My FYP Project</h1>
        <p className="text-sm text-(--unikl-muted)">Submit your FYP proposal and track its status.</p>
      </div>

      {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {canEdit ? (
        <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-6">
          <h2 className="text-lg font-semibold mb-4">{project ? "Edit Proposal" : "Submit New FYP Proposal"}</h2>
          <form onSubmit={handleSubmitProposal} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Project Title</label>
              <input
                className="w-full rounded-md border border-(--unikl-border) p-2 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter your proposed project title"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                className="w-full rounded-md border border-(--unikl-border) p-2 text-sm min-h-[120px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your project scope, objectives, and technology stack..."
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-(--unikl-blue) px-4 py-2 text-sm font-medium text-white hover:bg-(--unikl-blue-2) disabled:opacity-50"
            >
              {submitting ? "Submitting..." : project?.status === "rejected" ? "Resubmit Proposal" : "Submit Proposal"}
            </button>
          </form>
        </div>
      ) : (
        <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-5">
          <div className="flex items-start justify-between">
            <div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize mb-2 inline-block ${STATUS_COLOR[project.status]}`}>
                {project.status}
              </span>
              <h2 className="text-lg font-semibold">{project.title}</h2>
              {project.description && <p className="text-sm text-(--unikl-muted) mt-1">{project.description}</p>}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-sm border-t border-(--unikl-border) pt-4">
            <div>
              <span className="text-(--unikl-muted)">Supervisor: </span>
              <span className="font-medium text-(--unikl-blue)">
                {project.supervisor?.name || "Awaiting Assignment by Coordinator"}
              </span>
            </div>
            {project.status === "approved" && (
              <div className="flex gap-4">
                <Link href="/student/fyp/submit-report" className="text-(--unikl-blue) hover:underline font-medium">📄 Submit Report</Link>
                <Link href="/student/fyp/upload-slides" className="text-(--unikl-blue) hover:underline font-medium">📊 Upload Slides</Link>
              </div>
            )}
          </div>

          {project.status === "submitted" && (
            <div className="mt-4 rounded-md bg-blue-50 p-3 text-sm text-blue-700">
              Your proposal has been submitted. The FYP Coordinator will review it and assign a supervisor.
            </div>
          )}
        </div>
      )}

      {project && project.status === "approved" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/student/fyp/feedback" className="group rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-4 hover:border-(--unikl-blue) transition-colors">
            <div className="text-xl mb-1">💬</div>
            <div className="font-semibold group-hover:text-(--unikl-blue)">View Feedback</div>
          </Link>
          <Link href="/student/fyp/results" className="group rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-4 hover:border-(--unikl-blue) transition-colors">
            <div className="text-xl mb-1">🎓</div>
            <div className="font-semibold group-hover:text-(--unikl-blue)">Assessment Result</div>
          </Link>
        </div>
      )}
    </div>
  );
}
