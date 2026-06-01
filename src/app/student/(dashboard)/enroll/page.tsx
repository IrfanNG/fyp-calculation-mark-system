"use client";

import { useEffect, useState } from "react";

type CourseClass = {
  id: string;
  name: string;
  enrollmentCount: number;
  isEnrolled: boolean;
};

type CourseGroup = {
  courseId: string;
  courseCode: string;
  courseName: string;
  semester: string | null;
  year: number | null;
  lecturer: string;
  isEnrolled: boolean;
  classes: CourseClass[];
};

export default function EnrollPage() {
  const [courses, setCourses] = useState<CourseGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [selectedClasses, setSelectedClasses] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await fetch("/api/student/enroll");
      if (res.ok) {
        const data = await res.json();
        setCourses(data.courses);
        
        // Initialize selected classes for enrolled courses
        const initial: Record<string, string> = {};
        data.courses.forEach((course: CourseGroup) => {
          const enrolledClass = course.classes.find(cls => cls.isEnrolled);
          if (enrolledClass) {
            initial[course.courseId] = enrolledClass.id;
          }
        });
        setSelectedClasses(initial);
      }
    } catch (err) {
      console.error("Failed to fetch courses:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId: string, courseCode: string, courseName: string) => {
    const courseClassId = selectedClasses[courseId];
    if (!courseClassId) {
      alert("Please select a class first");
      return;
    }

    const course = courses.find(c => c.courseId === courseId);
    const selectedClass = course?.classes.find(cls => cls.id === courseClassId);
    
    if (!confirm(`Enroll in ${courseCode} - ${courseName} (${selectedClass?.name})?`)) return;

    setEnrolling(courseId);
    try {
      const res = await fetch("/api/student/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseClassId }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message || "Successfully enrolled!");
        fetchCourses();
      } else {
        alert(data.error || "Failed to enroll");
      }
    } catch (err) {
      console.error("Failed to enroll in course:", err);
    } finally {
      setEnrolling(null);
    }
  };

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      searchQuery === "" ||
      course.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.lecturer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

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
        <h1 className="text-3xl font-bold text-(--unikl-blue)">Enroll in Course</h1>
        <p className="text-(--unikl-muted) mt-1">
          Browse available courses and select your preferred class
        </p>
      </div>

      {/* Search */}
      <div className="bg-(--unikl-card) rounded-lg border border-(--unikl-border) p-4">
        <input
          type="text"
          placeholder="Search by course code, name, or lecturer..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-(--unikl-border) rounded-md focus:outline-none focus:ring-2 focus:ring-(--unikl-blue)"
        />
        <div className="mt-2 text-sm text-(--unikl-muted)">
          Showing {filteredCourses.length} course{filteredCourses.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Course List */}
      <div className="space-y-4">
        {filteredCourses.length === 0 ? (
          <div className="bg-(--unikl-card) rounded-lg border border-(--unikl-border) p-8 text-center">
            <p className="text-(--unikl-muted)">
              {searchQuery ? "No courses found matching your search" : "No courses available"}
            </p>
          </div>
        ) : (
          filteredCourses.map((course) => (
            <div
              key={course.courseId}
              className="bg-(--unikl-card) rounded-lg border border-(--unikl-border) p-5 hover:shadow-md transition-shadow"
            >
              {/* Course Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-(--unikl-blue)">
                      {course.courseCode}
                    </h3>
                    {course.semester && course.year && (
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                        {course.semester} {course.year}
                      </span>
                    )}
                    {course.isEnrolled && (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                        ✓ Enrolled
                      </span>
                    )}
                  </div>
                  <p className="text-(--unikl-text) font-medium mb-1">{course.courseName}</p>
                  <p className="text-sm text-(--unikl-muted)">Lecturer: {course.lecturer}</p>
                </div>
              </div>

              {/* Class Selection */}
              <div className="mt-4 p-3 bg-gray-50 rounded-md">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Select a class:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {course.classes.map((cls) => (
                    <label
                      key={cls.id}
                      className={`flex flex-col p-3 border-2 rounded-md cursor-pointer transition-all ${
                        selectedClasses[course.courseId] === cls.id
                          ? 'border-blue-500 bg-blue-50'
                          : cls.isEnrolled
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-300 hover:border-blue-300'
                      } ${cls.isEnrolled ? 'cursor-default' : ''}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          type="radio"
                          name={`course-${course.courseId}`}
                          checked={selectedClasses[course.courseId] === cls.id}
                          disabled={cls.isEnrolled || course.isEnrolled}
                          onChange={() => {
                            if (!cls.isEnrolled && !course.isEnrolled) {
                              setSelectedClasses(prev => ({ ...prev, [course.courseId]: cls.id }));
                            }
                          }}
                          className="h-4 w-4 text-blue-600"
                        />
                        <span className="font-medium text-sm">{cls.name}</span>
                      </div>
                      <span className="text-xs text-gray-600 ml-6">
                        {cls.enrollmentCount} student{cls.enrollmentCount !== 1 ? 's' : ''}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-4 flex justify-end">
                {course.isEnrolled ? (
                  <button
                    disabled
                    className="px-6 py-2 rounded-md bg-gray-100 text-gray-500 font-medium cursor-not-allowed"
                  >
                    Already Enrolled
                  </button>
                ) : (
                  <button
                    onClick={() => handleEnroll(course.courseId, course.courseCode, course.courseName)}
                    disabled={enrolling === course.courseId || !selectedClasses[course.courseId]}
                    className="px-6 py-2 rounded-md bg-(--unikl-blue) text-white font-medium hover:bg-(--unikl-blue-2) disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {enrolling === course.courseId ? "Enrolling..." : "Enroll Now"}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
