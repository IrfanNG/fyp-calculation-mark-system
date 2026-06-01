"use client";

import { useState, useEffect } from "react";

type CourseClass = {
  name: string;
  course: { code: string; name: string };
};

type Submission = {
  id: string;
  comment: string | null;
  fileUrl: string | null;
  score: number | null;
  gradedAt: string | null;
};

type Assignment = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  maxScore: number;
  courseClass: CourseClass;
  submissions: Submission[];
};

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string>("");
  const [submitComment, setSubmitComment] = useState("");
  const [submitFileUrl, setSubmitFileUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadAssignments();
  }, []);

  async function loadAssignments() {
    setLoading(true);
    try {
      const res = await fetch("/api/student/assignments");
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.assignments || []);
      }
    } catch (err) {
      console.error("Failed to load assignments:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setSubmitFileUrl(""); // Clear manual URL if file is selected
    }
  }

  async function handleSubmit(assignmentId: string) {
    if (!submitComment.trim() && !submitFileUrl.trim() && !selectedFile) {
      alert("Please provide either a comment, file, or file URL");
      return;
    }

    setUploading(true);
    try {
      let finalFileUrl = submitFileUrl;

      // Upload file if selected
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);

        const uploadRes = await fetch("/api/student/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const data = await uploadRes.json();
          alert(data.error || "Failed to upload file");
          setUploading(false);
          return;
        }

        const uploadData = await uploadRes.json();
        finalFileUrl = uploadData.fileUrl;
      }

      // Submit assignment
      const res = await fetch("/api/student/assignments/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId,
          comment: submitComment || undefined,
          fileUrl: finalFileUrl || undefined,
        }),
      });

      if (res.ok) {
        setSubmittingId("");
        setSubmitComment("");
        setSubmitFileUrl("");
        setSelectedFile(null);
        loadAssignments();
        alert("Assignment submitted successfully!");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to submit assignment");
      }
    } catch (err) {
      alert("Failed to submit assignment");
    } finally {
      setUploading(false);
    }
  }

  function handleEditSubmission(assignment: Assignment) {
    const submission = assignment.submissions[0];
    setSubmittingId(assignment.id);
    setSubmitComment(submission.comment || "");
    setSubmitFileUrl(submission.fileUrl || "");
    setSelectedFile(null);
  }

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  const pendingAssignments = assignments.filter(
    (a) => a.submissions.length === 0 && (!a.dueDate || new Date(a.dueDate) > new Date())
  );
  const submittedAssignments = assignments.filter((a) => a.submissions.length > 0);
  const overdueAssignments = assignments.filter(
    (a) => a.submissions.length === 0 && a.dueDate && new Date(a.dueDate) < new Date()
  );

  const renderAssignment = (assignment: Assignment, status: "pending" | "submitted" | "overdue") => {
    const submission = assignment.submissions[0];
    const daysUntilDue = assignment.dueDate
      ? Math.ceil((new Date(assignment.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    const isSubmitting = submittingId === assignment.id;

    return (
      <div
        key={assignment.id}
        className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-4"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-medium">{assignment.title}</h3>
            <p className="text-sm text-(--unikl-muted) mt-1">
              {assignment.courseClass.course.code} - {assignment.courseClass.name}
            </p>
            {assignment.description && (
              <p className="text-sm mt-2 text-(--unikl-text)">
                {assignment.description}
              </p>
            )}
          </div>
          <div
            className={
              "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap " +
              (status === "submitted"
                ? "bg-green-100 text-green-800"
                : status === "overdue"
                ? "bg-red-100 text-red-800"
                : "bg-yellow-100 text-yellow-800")
            }
          >
            {status === "submitted" ? "✓ Submitted" : status === "overdue" ? "Overdue" : "Pending"}
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-(--unikl-border) flex items-center justify-between text-sm">
          <div className="flex items-center gap-4 text-(--unikl-muted)">
            {assignment.dueDate && (
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
                  Due: {new Date(assignment.dueDate).toLocaleDateString()}
                  {daysUntilDue !== null && daysUntilDue >= 0 && (
                    <span className="ml-1 text-xs">({daysUntilDue} days left)</span>
                  )}
                </span>
              </div>
            )}
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>Max Score: {assignment.maxScore}</span>
            </div>
          </div>

          {submission ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {submission.score !== null && (
                  <span className="font-medium text-(--unikl-blue)">
                    Score: {submission.score}/{assignment.maxScore}
                  </span>
                )}
                {submission.gradedAt ? (
                  <span className="text-xs text-(--unikl-muted)">Graded</span>
                ) : (
                  <span className="text-xs text-(--unikl-muted)">Awaiting grade</span>
                )}
              </div>
              {!submission.gradedAt && (
                <button
                  onClick={() => handleEditSubmission(assignment)}
                  className="px-3 py-1 text-sm border border-(--unikl-border) rounded-md hover:bg-(--unikl-hover)"
                >
                  Edit Submission
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => setSubmittingId(assignment.id)}
              className="px-4 py-2 bg-(--unikl-blue) text-white rounded-md text-sm font-medium hover:opacity-90"
            >
              Submit
            </button>
          )}
        </div>

        {submission && !isSubmitting && (
          <div className="mt-3 pt-3 border-t border-(--unikl-border) space-y-2">
            {submission.comment && (
              <p className="text-sm text-(--unikl-text)">
                <span className="font-medium">Your answer:</span> {submission.comment}
              </p>
            )}
            {submission.fileUrl && (
              <a
                href={submission.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-(--unikl-blue) hover:underline"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                View submitted file
              </a>
            )}
          </div>
        )}

        {/* Submission Form */}
        {isSubmitting && (
          <div className="mt-4 pt-4 border-t border-(--unikl-border) space-y-3">
            <h4 className="font-medium text-sm">
              {submission ? "Edit Submission" : "Submit Assignment"}
            </h4>
            <div>
              <label className="block text-sm font-medium mb-1">Comment/Answer</label>
              <textarea
                value={submitComment}
                onChange={(e) => setSubmitComment(e.target.value)}
                placeholder="Write your answer or comments here..."
                rows={4}
                className="w-full px-3 py-2 rounded-lg border border-(--unikl-border) bg-(--unikl-background) focus:outline-none focus:ring-2 focus:ring-(--unikl-blue) resize-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Upload File</label>
              <div className="space-y-2">
                <input
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.txt,.zip,.rar,.jpg,.jpeg,.png"
                  className="w-full px-3 py-2 rounded-lg border border-(--unikl-border) bg-(--unikl-background) text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-(--unikl-blue) file:text-white hover:file:opacity-90"
                />
                {selectedFile && (
                  <div className="flex items-center gap-2 text-sm text-(--unikl-muted)">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="text-red-600 hover:underline text-xs"
                    >
                      Remove
                    </button>
                  </div>
                )}
                <p className="text-xs text-(--unikl-muted)">
                  Accepted: PDF, Word, Text, ZIP, Images (Max 10MB)
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Or paste file URL</label>
              <input
                type="url"
                value={submitFileUrl}
                onChange={(e) => {
                  setSubmitFileUrl(e.target.value);
                  if (e.target.value) setSelectedFile(null); // Clear file if URL is entered
                }}
                placeholder="https://... (Google Drive, Dropbox, etc.)"
                disabled={!!selectedFile}
                className="w-full px-3 py-2 rounded-lg border border-(--unikl-border) bg-(--unikl-background) focus:outline-none focus:ring-2 focus:ring-(--unikl-blue) text-sm disabled:opacity-50"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleSubmit(assignment.id)}
                disabled={uploading}
                className="px-4 py-2 rounded-lg bg-(--unikl-blue) text-white hover:opacity-90 text-sm font-medium disabled:opacity-50"
              >
                {uploading ? "Uploading..." : submission ? "Update Submission" : "Submit Assignment"}
              </button>
              <button
                onClick={() => {
                  setSubmittingId("");
                  setSubmitComment("");
                  setSubmitFileUrl("");
                  setSelectedFile(null);
                }}
                disabled={uploading}
                className="px-4 py-2 rounded-lg border border-(--unikl-border) hover:bg-(--unikl-hover) text-sm disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Assignments</h1>
        <p className="text-sm text-(--unikl-muted)">
          View and submit course assignments
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-4">
          <div className="text-2xl font-semibold text-yellow-600">
            {pendingAssignments.length}
          </div>
          <div className="text-sm text-(--unikl-muted)">Pending</div>
        </div>
        <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-4">
          <div className="text-2xl font-semibold text-green-600">
            {submittedAssignments.length}
          </div>
          <div className="text-sm text-(--unikl-muted)">Submitted</div>
        </div>
        <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-4">
          <div className="text-2xl font-semibold text-red-600">
            {overdueAssignments.length}
          </div>
          <div className="text-sm text-(--unikl-muted)">Overdue</div>
        </div>
      </div>

      {assignments.length === 0 ? (
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="mt-4 text-(--unikl-muted)">No assignments yet</p>
          <p className="text-sm text-(--unikl-muted) mt-1">
            Assignments will appear here when lecturers create them
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending Assignments */}
          {pendingAssignments.length > 0 && (
            <div>
              <h2 className="font-medium mb-3">Pending Assignments</h2>
              <div className="space-y-3">
                {pendingAssignments.map((a) => renderAssignment(a, "pending"))}
              </div>
            </div>
          )}

          {/* Overdue Assignments */}
          {overdueAssignments.length > 0 && (
            <div>
              <h2 className="font-medium mb-3 text-red-600">Overdue Assignments</h2>
              <div className="space-y-3">
                {overdueAssignments.map((a) => renderAssignment(a, "overdue"))}
              </div>
            </div>
          )}

          {/* Submitted Assignments */}
          {submittedAssignments.length > 0 && (
            <div>
              <h2 className="font-medium mb-3">Submitted Assignments</h2>
              <div className="space-y-3">
                {submittedAssignments.map((a) => renderAssignment(a, "submitted"))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
