"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Course = {
  id: string;
  code: string;
  name: string;
  semester: string | null;
  year: number | null;
  isAssigned: boolean;
  lecturerCount: number;
};

export default function MyCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await fetch("/api/lecturer/my-courses");
      if (res.ok) {
        const data = await res.json();
        setCourses(data.courses);
        
        // Set initially selected courses
        const assigned = data.courses.filter((c: Course) => c.isAssigned).map((c: Course) => c.id);
        setSelectedCourses(assigned);
      }
    } catch (err) {
      console.error("Failed to fetch courses:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCourse = (courseId: string) => {
    setSelectedCourses(prev => {
      if (prev.includes(courseId)) {
        // Remove course
        return prev.filter(id => id !== courseId);
      } else {
        // Check if already at max
        if (prev.length >= 3) {
          setMessage({ type: "error", text: "You can only teach a maximum of 3 courses" });
          setTimeout(() => setMessage(null), 3000);
          return prev;
        }
        // Add course
        return [...prev, courseId];
      }
    });
  };

  const handleSave = async () => {
    if (selectedCourses.length < 1) {
      setMessage({ type: "error", text: "You must select at least 1 course" });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    if (selectedCourses.length > 3) {
      setMessage({ type: "error", text: "You can only teach a maximum of 3 courses" });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/lecturer/my-courses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseIds: selectedCourses }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: data.message || "Course assignments updated successfully!" });
        fetchCourses(); // Refresh the list
      } else {
        setMessage({ type: "error", text: data.error || "Failed to update course assignments" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Failed to save changes" });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch =
      searchQuery === "" ||
      course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const selectedCount = selectedCourses.length;
  const hasChanges = JSON.stringify(selectedCourses.sort()) !== JSON.stringify(
    courses.filter(c => c.isAssigned).map(c => c.id).sort()
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-(--unikl-muted)">Loading courses...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-(--unikl-blue)">My Courses</h1>
        <p className="text-(--unikl-muted) mt-1">
          Manage your course assignments and content
        </p>
      </div>

      {/* Currently Teaching */}
      {selectedCourses.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Currently Teaching</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses
              .filter((c) => selectedCourses.includes(c.id))
              .map((course) => (
                <Link
                  key={course.id}
                  href={`/my-courses/${course.id}`}
                  className="block bg-(--unikl-card) rounded-lg border border-(--unikl-border) p-5 hover:border-(--unikl-blue) hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                      Teaching
                    </div>
                    <svg className="h-5 w-5 text-(--unikl-muted)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-(--unikl-blue) mb-1">
                    {course.code}
                  </h3>
                  <p className="text-sm text-(--unikl-text) font-medium mb-2 line-clamp-2">
                    {course.name}
                  </p>
                  {course.semester && course.year && (
                    <p className="text-xs text-(--unikl-muted)">
                      {course.semester} {course.year}
                    </p>
                  )}
                </Link>
              ))}
          </div>
        </div>
      )}

      {/* Message Banner */}
      {message && (
        <div
          className={`rounded-lg border p-4 ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Edit Assignments Section */}
      <div className="border-t border-(--unikl-border) pt-6 mt-6">
        <h2 className="text-lg font-semibold mb-3">Edit Course Assignments</h2>
        <p className="text-sm text-(--unikl-muted) mb-4">
          Select the courses you want to teach (minimum 1, maximum 3 courses)
        </p>

      {/* Stats and Save */}
      <div className="flex items-center justify-between bg-(--unikl-card) rounded-lg border border-(--unikl-border) p-4">
        <div className="flex items-center gap-6">
          <div>
            <div className="text-2xl font-bold text-(--unikl-blue)">{selectedCount}/3</div>
            <div className="text-sm text-(--unikl-muted)">Courses Selected</div>
          </div>
          {selectedCount < 1 && (
            <div className="text-sm text-red-600 font-medium">⚠️ Select at least 1 course</div>
          )}
          {selectedCount === 3 && (
            <div className="text-sm text-amber-600 font-medium">Maximum courses reached</div>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges || selectedCount < 1}
          className="px-6 py-2 rounded-md bg-(--unikl-blue) text-white font-medium hover:bg-(--unikl-blue-2) disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Saving..." : hasChanges ? "Save Changes" : "No Changes"}
        </button>
      </div>

      {/* Search */}
      <div className="bg-(--unikl-card) rounded-lg border border-(--unikl-border) p-4">
        <input
          type="text"
          placeholder="Search by course code or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-(--unikl-border) rounded-md focus:outline-none focus:ring-2 focus:ring-(--unikl-blue)"
        />
        <div className="mt-2 text-sm text-(--unikl-muted)">
          Showing {filteredCourses.length} course{filteredCourses.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Course List */}
      <div className="space-y-3">
        {filteredCourses.length === 0 ? (
          <div className="bg-(--unikl-card) rounded-lg border border-(--unikl-border) p-8 text-center">
            <p className="text-(--unikl-muted)">
              {searchQuery ? "No courses found matching your search" : "No courses available"}
            </p>
          </div>
        ) : (
          filteredCourses.map((course) => {
            const isSelected = selectedCourses.includes(course.id);
            return (
              <label
                key={course.id}
                className={`block bg-(--unikl-card) rounded-lg border-2 p-4 cursor-pointer transition-all ${
                  isSelected
                    ? "border-blue-500 bg-blue-50"
                    : "border-(--unikl-border) hover:border-blue-300 hover:shadow-md"
                }`}
              >
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleCourse(course.id)}
                    className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-(--unikl-blue)">
                        {course.code}
                      </h3>
                      {course.semester && course.year && (
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                          {course.semester} {course.year}
                        </span>
                      )}
                      {isSelected && (
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                          ✓ Selected
                        </span>
                      )}
                    </div>
                    <p className="text-(--unikl-text) font-medium mb-1">{course.name}</p>
                    <p className="text-sm text-(--unikl-muted)">
                      {course.lecturerCount} lecturer{course.lecturerCount !== 1 ? "s" : ""} assigned
                    </p>
                  </div>
                </div>
              </label>
            );
          })
        )}
      </div>
      </div>
    </div>
  );
}
