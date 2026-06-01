"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type CourseClass = {
  id: string;
  name: string;
  _count: { enrollments: number };
};

type Assignment = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  maxScore: number;
  createdAt: string;
  courseClass: {
    name: string;
  };
  _count: {
    submissions: number;
  };
};

export default function AssignmentsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const router = useRouter();
  const [courseId, setCourseId] = useState<string>("");
  const [classes, setClasses] = useState<CourseClass[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    courseClassId: "",
    title: "",
    description: "",
    dueDate: "",
    maxScore: 100,
  });

  useEffect(() => {
    params.then((p) => {
      setCourseId(p.courseId);
      loadData(p.courseId);
    });
  }, []);

  async function loadData(cId: string) {
    setLoading(true);
    try {
      // Load classes
      const classRes = await fetch(`/api/lecturer/courses/${cId}/classes`);
      if (classRes.ok) {
        const data = await classRes.json();
        setClasses(data.classes || []);
      }

      // Load assignments
      const assignmentsRes = await fetch(`/api/lecturer/courses/${cId}/assignments`);
      if (assignmentsRes.ok) {
        const data = await assignmentsRes.json();
        setAssignments(data.assignments || []);
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.courseClassId || !formData.title.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          dueDate: formData.dueDate || undefined,
          description: formData.description || undefined,
        }),
      });

      if (res.ok) {
        setFormData({
          courseClassId: "",
          title: "",
          description: "",
          dueDate: "",
          maxScore: 100,
        });
        setShowForm(false);
        loadData(courseId);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create assignment");
      }
    } catch (err) {
      alert("Failed to create assignment");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/my-courses/${courseId}`}
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
          <div>
            <h1 className="text-xl font-semibold">Assignments</h1>
            <p className="text-sm text-(--unikl-muted)">Create and manage assignments</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg bg-(--unikl-blue) text-white hover:opacity-90 transition-opacity"
        >
          {showForm ? "Cancel" : "+ New Assignment"}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-6 space-y-4"
        >
          <h2 className="font-medium">Create Assignment</h2>

          <div>
            <label className="block text-sm font-medium mb-2">
              Class <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.courseClassId}
              onChange={(e) =>
                setFormData({ ...formData, courseClassId: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border border-(--unikl-border) bg-(--unikl-background) focus:outline-none focus:ring-2 focus:ring-(--unikl-blue)"
              required
            >
              <option value="">Select a class</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls._count.enrollments} students)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Programming Assignment 1"
              className="w-full px-3 py-2 rounded-lg border border-(--unikl-border) bg-(--unikl-background) focus:outline-none focus:ring-2 focus:ring-(--unikl-blue)"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Assignment instructions..."
              rows={6}
              className="w-full px-3 py-2 rounded-lg border border-(--unikl-border) bg-(--unikl-background) focus:outline-none focus:ring-2 focus:ring-(--unikl-blue) resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Due Date</label>
              <input
                type="datetime-local"
                value={formData.dueDate}
                onChange={(e) =>
                  setFormData({ ...formData, dueDate: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-(--unikl-border) bg-(--unikl-background) focus:outline-none focus:ring-2 focus:ring-(--unikl-blue)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Max Score</label>
              <input
                type="number"
                value={formData.maxScore}
                onChange={(e) =>
                  setFormData({ ...formData, maxScore: Number(e.target.value) })
                }
                min="0"
                step="0.5"
                className="w-full px-3 py-2 rounded-lg border border-(--unikl-border) bg-(--unikl-background) focus:outline-none focus:ring-2 focus:ring-(--unikl-blue)"
                required
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-(--unikl-border) hover:bg-(--unikl-hover) transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-(--unikl-blue) text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Assignment"}
            </button>
          </div>
        </form>
      )}

      {/* Assignments List */}
      <div className="space-y-3">
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
              Click "New Assignment" to create your first assignment
            </p>
          </div>
        ) : (
          assignments.map((assignment) => {
            const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
            const isPastDue = dueDate && dueDate < new Date();
            const totalStudents =
              classes.find((c) => c.name === assignment.courseClass.name)?._count
                .enrollments || 0;
            const submissionRate =
              totalStudents > 0
                ? Math.round((assignment._count.submissions / totalStudents) * 100)
                : 0;

            return (
              <Link
                key={assignment.id}
                href={`/my-courses/${courseId}/assignments/${assignment.id}`}
                className="block rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-4 hover:border-(--unikl-blue) transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-medium">{assignment.title}</h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-(--unikl-muted)">
                      <span>{assignment.courseClass.name}</span>
                      {dueDate && (
                        <>
                          <span>•</span>
                          <span className={isPastDue ? "text-red-600" : ""}>
                            Due: {dueDate.toLocaleDateString()}
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span>Max: {assignment.maxScore} pts</span>
                    </div>
                    {assignment.description && (
                      <p className="text-sm mt-2 text-(--unikl-text) line-clamp-2">
                        {assignment.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-semibold text-(--unikl-blue)">
                      {assignment._count.submissions}/{totalStudents}
                    </div>
                    <div className="text-xs text-(--unikl-muted)">
                      {submissionRate}% submitted
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
