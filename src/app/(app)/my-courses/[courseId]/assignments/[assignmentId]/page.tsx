"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Student = {
  id: string;
  studentId: string;
  name: string;
};

type Submission = {
  id: string;
  fileUrl: string | null;
  comment: string | null;
  score: number | null;
  submittedAt: string;
  gradedAt: string | null;
  student: Student;
};

type Assignment = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  maxScore: number;
  courseClass: {
    name: string;
    course: { code: string; name: string };
    enrollments: Array<{ student: Student }>;
  };
  submissions: Submission[];
};

export default function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ courseId: string; assignmentId: string }>;
}) {
  const [courseId, setCourseId] = useState<string>("");
  const [assignmentId, setAssignmentId] = useState<string>("");
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [gradingId, setGradingId] = useState<string>("");
  const [gradeValue, setGradeValue] = useState<string>("");

  useEffect(() => {
    params.then((p) => {
      setCourseId(p.courseId);
      setAssignmentId(p.assignmentId);
      loadAssignment(p.assignmentId);
    });
  }, []);

  async function loadAssignment(aId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/assignments/${aId}`);
      if (res.ok) {
        const data = await res.json();
        setAssignment(data.assignment);
      }
    } catch (err) {
      console.error("Failed to load assignment:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGrade(submissionId: string) {
    if (!gradeValue) return;
    
    const score = parseFloat(gradeValue);
    if (isNaN(score) || score < 0 || (assignment && score > assignment.maxScore)) {
      alert(`Please enter a valid score between 0 and ${assignment?.maxScore}`);
      return;
    }

    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, score }),
      });

      if (res.ok) {
        setGradingId("");
        setGradeValue("");
        loadAssignment(assignmentId);
      } else {
        alert("Failed to grade submission");
      }
    } catch (err) {
      alert("Failed to grade submission");
    }
  }

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  if (!assignment) {
    return <div className="p-4">Assignment not found</div>;
  }

  const submissionMap = new Map(
    assignment.submissions.map((s) => [s.student.id, s])
  );

  const allStudents = assignment.courseClass.enrollments.map((e) => e.student);
  const studentsWithStatus = allStudents.map((student) => ({
    student,
    submission: submissionMap.get(student.id) || null,
  }));

  const submittedCount = assignment.submissions.length;
  const gradedCount = assignment.submissions.filter((s) => s.score !== null).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href={`/my-courses/${courseId}/assignments`}
          className="text-(--unikl-muted) hover:text-(--unikl-text)"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{assignment.title}</h1>
          <p className="text-sm text-(--unikl-muted)">
            {assignment.courseClass.course.code} - {assignment.courseClass.name}
          </p>
        </div>
      </div>

      {/* Assignment Info */}
      <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-6">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <div className="text-sm text-(--unikl-muted)">Submissions</div>
            <div className="text-2xl font-semibold text-(--unikl-blue)">
              {submittedCount}/{allStudents.length}
            </div>
          </div>
          <div>
            <div className="text-sm text-(--unikl-muted)">Graded</div>
            <div className="text-2xl font-semibold text-green-600">
              {gradedCount}/{submittedCount}
            </div>
          </div>
          <div>
            <div className="text-sm text-(--unikl-muted)">Max Score</div>
            <div className="text-2xl font-semibold">{assignment.maxScore}</div>
          </div>
        </div>
        {assignment.description && (
          <div className="pt-4 border-t border-(--unikl-border)">
            <div className="text-sm font-medium mb-2">Description</div>
            <p className="text-sm text-(--unikl-text) whitespace-pre-wrap">
              {assignment.description}
            </p>
          </div>
        )}
        {assignment.dueDate && (
          <div className="pt-4 border-t border-(--unikl-border) mt-4">
            <div className="text-sm font-medium mb-1">Due Date</div>
            <p className="text-sm">
              {new Date(assignment.dueDate).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Submissions Table */}
      <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) overflow-hidden">
        <div className="p-4 border-b border-(--unikl-border)">
          <h2 className="font-medium">Student Submissions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-(--unikl-hover) text-sm">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Student ID</th>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Submitted</th>
                <th className="px-4 py-3 text-left font-medium">Score</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {studentsWithStatus.map(({ student, submission }) => (
                <tr key={student.id} className="border-t border-(--unikl-border)">
                  <td className="px-4 py-3">{student.studentId}</td>
                  <td className="px-4 py-3">{student.name}</td>
                  <td className="px-4 py-3">
                    {submission ? (
                      <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                        Submitted
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                        Not submitted
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {submission
                      ? new Date(submission.submittedAt).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    {submission && gradingId === submission.id ? (
                      <input
                        type="number"
                        value={gradeValue}
                        onChange={(e) => setGradeValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleGrade(submission.id);
                          if (e.key === "Escape") {
                            setGradingId("");
                            setGradeValue("");
                          }
                        }}
                        placeholder="0"
                        autoFocus
                        className="w-20 px-2 py-1 text-sm rounded border border-(--unikl-border) focus:outline-none focus:ring-2 focus:ring-(--unikl-blue)"
                      />
                    ) : submission && submission.score !== null ? (
                      <span className="font-medium">
                        {submission.score}/{assignment.maxScore}
                      </span>
                    ) : submission ? (
                      <span className="text-(--unikl-muted)">Not graded</span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {submission && (
                      <div className="flex gap-2">
                        {gradingId === submission.id ? (
                          <>
                            <button
                              onClick={() => handleGrade(submission.id)}
                              className="text-xs px-2 py-1 rounded bg-(--unikl-blue) text-white hover:opacity-90"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setGradingId("");
                                setGradeValue("");
                              }}
                              className="text-xs px-2 py-1 rounded border border-(--unikl-border) hover:bg-(--unikl-hover)"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setGradingId(submission.id);
                              setGradeValue(
                                submission.score?.toString() || ""
                              );
                            }}
                            className="text-xs px-2 py-1 rounded border border-(--unikl-border) hover:bg-(--unikl-hover)"
                          >
                            Grade
                          </button>
                        )}
                        {submission.comment && (
                          <button
                            onClick={() => alert(`Comment: ${submission.comment}`)}
                            className="text-xs px-2 py-1 rounded border border-(--unikl-border) hover:bg-(--unikl-hover)"
                            title={submission.comment}
                          >
                            💬
                          </button>
                        )}
                        {submission.fileUrl && (
                          <a
                            href={submission.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-2 py-1 rounded border border-(--unikl-border) hover:bg-(--unikl-hover)"
                          >
                            📎
                          </a>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
