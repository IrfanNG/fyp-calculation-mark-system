"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type CourseClass = {
  id: string;
  name: string;
  _count: { enrollments: number };
};

type Announcement = {
  id: string;
  title: string;
  content: string;
  publishedAt: string;
  courseClass: { name: string } | null;
};

export default function AnnouncementsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const router = useRouter();
  const [courseId, setCourseId] = useState<string>("");
  const [classes, setClasses] = useState<CourseClass[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    courseClassId: "",
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
      // Load classes for this course
      const classRes = await fetch(`/api/lecturer/courses/${cId}/classes`);
      if (classRes.ok) {
        const data = await classRes.json();
        setClasses(data.classes || []);
      }

      // Load announcements for this course
      const announcementsRes = await fetch(`/api/lecturer/courses/${cId}/announcements`);
      if (announcementsRes.ok) {
        const data = await announcementsRes.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          courseClassId: formData.courseClassId || undefined,
        }),
      });

      if (res.ok) {
        setFormData({ title: "", content: "", courseClassId: "" });
        setShowForm(false);
        loadData(courseId);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create announcement");
      }
    } catch (err) {
      alert("Failed to create announcement");
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
            <h1 className="text-xl font-semibold">Announcements</h1>
            <p className="text-sm text-(--unikl-muted)">Post updates to your students</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg bg-(--unikl-blue) text-white hover:opacity-90 transition-opacity"
        >
          {showForm ? "Cancel" : "+ New Announcement"}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-6 space-y-4"
        >
          <h2 className="font-medium">Create Announcement</h2>

          <div>
            <label className="block text-sm font-medium mb-2">
              Target Audience
            </label>
            <select
              value={formData.courseClassId}
              onChange={(e) =>
                setFormData({ ...formData, courseClassId: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border border-(--unikl-border) bg-(--unikl-background) focus:outline-none focus:ring-2 focus:ring-(--unikl-blue)"
            >
              <option value="">All classes (Course-wide)</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls._count.enrollments} students)
                </option>
              ))}
            </select>
            <p className="text-xs text-(--unikl-muted) mt-1">
              Select a specific class or leave empty for all students in this course
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Quiz 2 Schedule Change"
              className="w-full px-3 py-2 rounded-lg border border-(--unikl-border) bg-(--unikl-background) focus:outline-none focus:ring-2 focus:ring-(--unikl-blue)"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Content</label>
            <textarea
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              placeholder="Write your announcement..."
              rows={6}
              className="w-full px-3 py-2 rounded-lg border border-(--unikl-border) bg-(--unikl-background) focus:outline-none focus:ring-2 focus:ring-(--unikl-blue) resize-none"
              required
            />
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
              {submitting ? "Posting..." : "Post Announcement"}
            </button>
          </div>
        </form>
      )}

      {/* Announcements List */}
      <div className="space-y-3">
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
              Click "New Announcement" to create your first post
            </p>
          </div>
        ) : (
          announcements.map((announcement) => (
            <div
              key={announcement.id}
              className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-medium">{announcement.title}</h3>
                  <div className="flex items-center gap-2 mt-1 text-sm text-(--unikl-muted)">
                    <span>
                      {new Date(announcement.publishedAt).toLocaleString()}
                    </span>
                    <span>•</span>
                    <span>
                      {announcement.courseClass
                        ? announcement.courseClass.name
                        : "All classes"}
                    </span>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-sm whitespace-pre-wrap">
                {announcement.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
