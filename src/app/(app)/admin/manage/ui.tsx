"use client";

import { useEffect, useMemo, useState } from "react";

type CourseOption = {
  id: string;
  code: string;
  name: string;
  semester: string | null;
  year: number | null;
};

type CourseClass = {
  id: string;
  name: string;
  courseId: string;
  courseCode: string;
  courseName: string;
};

type LecturerRow = {
  id: string;
  staffId: string;
  name: string;
  role: string;
  isAdmin: boolean;
  createdAt: string;
};

type StudentRow = {
  id: string;
  studentId: string;
  name: string;
  createdAt: string;
};

export default function AdminManageClient() {
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [courseClasses, setCourseClasses] = useState<CourseClass[]>([]);
  const [lecturers, setLecturers] = useState<LecturerRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit modals
  const [editingLecturer, setEditingLecturer] = useState<LecturerRow | null>(null);
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null);
  
  // Edit form states
  const [editLecturerName, setEditLecturerName] = useState("");
  const [editLecturerStaffId, setEditLecturerStaffId] = useState("");
  const [editLecturerPassword, setEditLecturerPassword] = useState("");
  const [editLecturerIsAdmin, setEditLecturerIsAdmin] = useState(false);
  
  const [editStudentName, setEditStudentName] = useState("");
  const [editStudentId, setEditStudentId] = useState("");
  const [editStudentPassword, setEditStudentPassword] = useState("");
  const [editStudentEnrollments, setEditStudentEnrollments] = useState<string[]>([]);
  const [editStudentSupervisorId, setEditStudentSupervisorId] = useState("");
  const [editStudentAssessorId, setEditStudentAssessorId] = useState("");

  const [editLecturerCourseIds, setEditLecturerCourseIds] = useState<string[]>([]);

  // Lecturer form
  const [staffId, setStaffId] = useState("");
  const [lecturerName, setLecturerName] = useState("");
  const [lecturerPassword, setLecturerPassword] = useState("");
  const [lecturerIsAdmin, setLecturerIsAdmin] = useState(false);
  const [lecturerRole, setLecturerRole] = useState<"supervisor" | "assessor">("supervisor");
  const [lecturerCourseIds, setLecturerCourseIds] = useState<string[]>([]);

  // Student form
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentSupervisorId, setStudentSupervisorId] = useState("");
  const [studentAssessorId, setStudentAssessorId] = useState("");

  async function loadAll() {
    setError(null);
    try {
      const [cRes, lRes, sRes, classRes] = await Promise.all([
        fetch("/api/public/course-options?includeAll=true", { method: "GET" }),
        fetch("/api/admin/lecturers", { method: "GET" }),
        fetch("/api/admin/students", { method: "GET" }),
        fetch("/api/public/classes", { method: "GET" }),
      ]);

      const cJson = (await cRes.json().catch(() => null)) as { courses?: CourseOption[] } | null;
      const lJson = (await lRes.json().catch(() => null)) as { lecturers?: LecturerRow[]; error?: unknown } | null;
      const sJson = (await sRes.json().catch(() => null)) as { students?: StudentRow[]; error?: unknown } | null;
      const classJson = (await classRes.json().catch(() => null)) as { classes?: CourseClass[] } | null;

      if (!cRes.ok) throw new Error("Failed to load course options");
      if (!lRes.ok) throw new Error(typeof lJson?.error === "string" ? lJson.error : "Failed to load lecturers");
      if (!sRes.ok) throw new Error(typeof sJson?.error === "string" ? sJson.error : "Failed to load students");

      setCourses(cJson?.courses ?? []);
      setLecturers(lJson?.lecturers ?? []);
      setStudents(sJson?.students ?? []);
      setCourseClasses(classJson?.classes ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const courseLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of courses) m.set(c.id, `${c.code} — ${c.name}`);
    return m;
  }, [courses]);

  // Derived lists for student assignment
  const supervisorList = useMemo(() => lecturers.filter(l => l.role === "supervisor" || l.isAdmin), [lecturers]);
  const assessorList = useMemo(() => lecturers.filter(l => l.role === "assessor" || l.isAdmin), [lecturers]);

  async function createLecturer() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/lecturers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          staffId,
          name: lecturerName,
          password: lecturerPassword,
          isAdmin: lecturerIsAdmin,
          role: lecturerRole,
          courseIds: lecturerCourseIds,
        }),
      });
      const json = (await res.json().catch(() => null)) as { error?: unknown } | null;
      if (!res.ok) throw new Error(typeof json?.error === "string" ? json.error : "Failed to create lecturer");

      setStaffId("");
      setLecturerName("");
      setLecturerPassword("");
      setLecturerIsAdmin(false);
      setLecturerRole("supervisor");
      setLecturerCourseIds([]);

      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  async function createStudent() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          studentId,
          name: studentName,
          supervisorId: studentSupervisorId || undefined,
          assessorId: studentAssessorId || undefined
        }),
      });
      const json = (await res.json().catch(() => null)) as { error?: unknown } | null;
      if (!res.ok) throw new Error(typeof json?.error === "string" ? json.error : "Failed to create student");

      setStudentId("");
      setStudentName("");
      setStudentSupervisorId("");
      setStudentAssessorId("");

      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  async function deleteLecturer(id: string, name: string) {
    if (!confirm(`Delete lecturer "${name}"?`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/lecturers/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Failed to delete lecturer");
      }
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  async function deleteStudent(id: string, name: string) {
    if (!confirm(`Delete student "${name}"?`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/students/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Failed to delete student");
      }
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  async function editLecturer(lecturer: LecturerRow) {
    setEditingLecturer(lecturer);
    setEditLecturerName(lecturer.name);
    setEditLecturerStaffId(lecturer.staffId);
    setEditLecturerPassword("");
    setEditLecturerIsAdmin(lecturer.isAdmin);
    
    // Fetch current course assignments
    try {
      const res = await fetch(`/api/admin/lecturers/${lecturer.id}/courses`);
      if (res.ok) {
        const data = await res.json();
        const courseIds = data.courses?.map((c: { id: string }) => c.id) ?? [];
        setEditLecturerCourseIds(courseIds);
      }
    } catch (e) {
      console.error("Failed to load lecturer courses:", e);
      setEditLecturerCourseIds([]);
    }
  }

  async function submitEditLecturer() {
    if (!editingLecturer) return;
    setBusy(true);
    setError(null);
    try {
      const payload: Record<string, string | boolean | string[]> = { 
        name: editLecturerName, 
        staffId: editLecturerStaffId, 
        isAdmin: editLecturerIsAdmin,
        courseIds: editLecturerCourseIds
      };
      if (editLecturerPassword) payload.password = editLecturerPassword;
      
      const res = await fetch(`/api/admin/lecturers/${editingLecturer.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Failed to update lecturer");
      }
      setEditingLecturer(null);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  async function editStudent(student: StudentRow) {
    setEditingStudent(student);
    setEditStudentName(student.name);
    setEditStudentId(student.studentId);
    setEditStudentPassword("");
    setEditStudentSupervisorId("");
    setEditStudentAssessorId("");

    // Fetch current details including project and enrollments
    try {
      const [eRes, sRes] = await Promise.all([
        fetch(`/api/admin/students/${student.id}/enrollments`),
        fetch(`/api/admin/students/${student.id}`)
      ]);

      if (eRes.ok) {
        const data = await eRes.json();
        const classIds = data.enrollments?.map((e: { courseClass: { id: string } }) => e.courseClass.id) ?? [];
        setEditStudentEnrollments(classIds);
      }

      if (sRes.ok) {
        const data = await sRes.json();
        if (data.student?.fypProject) {
          setEditStudentSupervisorId(data.student.fypProject.supervisorId || "");
          if (data.student.fypProject.assessorAssignments?.length > 0) {
            setEditStudentAssessorId(data.student.fypProject.assessorAssignments[0].assessorId || "");
          }
        }
      }
    } catch (e) {
      console.error("Failed to load student details:", e);
      setEditStudentEnrollments([]);
    }
  }

  async function submitEditStudent() {
    if (!editingStudent) return;
    setBusy(true);
    setError(null);
    try {
      const payload: Record<string, string | string[]> = { 
        name: editStudentName, 
        studentId: editStudentId,
        enrollments: editStudentEnrollments,
        supervisorId: editStudentSupervisorId || "",
        assessorId: editStudentAssessorId || ""
      };
      if (editStudentPassword) payload.password = editStudentPassword;
      
      const res = await fetch(`/api/admin/students/${editingStudent.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Failed to update student");
      }
      setEditingStudent(null);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-4">
          <div className="text-sm font-medium">Add Lecturer</div>
          <div className="mt-3 space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Staff ID</label>
                <input
                  className="mt-1 w-full rounded-md border border-(--unikl-border) bg-white px-3 py-2"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  placeholder="e.g. 522XXXXXXX"
                />
                <div className="mt-0.5 text-xs text-(--unikl-muted)">Format: 522XXXXXXX</div>
              </div>
              <div>
                <label className="text-sm font-medium">Name</label>
                <input
                  className="mt-1 w-full rounded-md border border-(--unikl-border) bg-white px-3 py-2"
                  value={lecturerName}
                  onChange={(e) => setLecturerName(e.target.value)}
                  placeholder="Lecturer name"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Password</label>
              <input
                type="password"
                className="mt-1 w-full rounded-md border border-(--unikl-border) bg-white px-3 py-2"
                value={lecturerPassword}
                onChange={(e) => setLecturerPassword(e.target.value)}
                placeholder="Min 8 chars, upper, lower, number, special"
              />
              <div className="mt-0.5 text-xs text-(--unikl-muted)">Min 8 chars with uppercase, lowercase, number, and special character.</div>
            </div>

            <div>
              <label className="text-sm font-medium">Role</label>
              <select
                value={lecturerRole}
                onChange={(e) => setLecturerRole(e.target.value as "supervisor" | "assessor")}
                className="mt-1 w-full rounded-md border border-(--unikl-border) bg-white px-3 py-2 text-sm"
              >
                <option value="supervisor">Supervisor</option>
                <option value="assessor">Assessor</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={lecturerIsAdmin} onChange={(e) => setLecturerIsAdmin(e.target.checked)} />
              FYP Coordinator (Admin)
            </label>

            <div>
              <label className="text-sm font-medium">Assign Course(s)</label>
              <select
                multiple
                value={lecturerCourseIds}
                onChange={(e) => setLecturerCourseIds(Array.from(e.target.selectedOptions).map((o) => o.value))}
                className="mt-1 w-full rounded-md border border-(--unikl-border) bg-white px-3 py-2 text-sm"
              >
                {courses.length === 0 ? (
                  <option value="" disabled>
                    No unassigned courses
                  </option>
                ) : (
                  courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))
                )}
              </select>
              {lecturerCourseIds.length > 0 ? (
                <div className="mt-1 text-xs text-(--unikl-muted)">
                  Will create 5 classes for each assigned course.
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => void createLecturer()}
              disabled={busy || !staffId.trim() || !lecturerName.trim() || lecturerPassword.length < 8}
              className="rounded-md bg-(--unikl-blue) px-3 py-2 text-sm font-medium text-white hover:bg-(--unikl-blue-2) disabled:opacity-60"
            >
              Add Lecturer
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-4">
          <div className="text-sm font-medium">Add Student</div>
          <div className="mt-3 space-y-3">
              <div>
                <label className="text-sm font-medium">Student ID</label>
                <input
                  className="mt-1 w-full rounded-md border border-(--unikl-border) bg-white px-3 py-2"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g. 522XXXXXXX"
                />
                <div className="mt-0.5 text-xs text-(--unikl-muted)">Format: 522XXXXXXX</div>
              </div>
            <div>
              <label className="text-sm font-medium">Student Name</label>
              <input
                className="mt-1 w-full rounded-md border border-(--unikl-border) bg-white px-3 py-2"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Student name"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Assign Supervisor (Optional)</label>
                <select
                  value={studentSupervisorId}
                  onChange={(e) => setStudentSupervisorId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-(--unikl-border) bg-white px-3 py-2 text-sm"
                >
                  <option value="">No supervisor</option>
                  {supervisorList.map((l) => (
                    <option key={l.id} value={l.id}>{l.name} ({l.staffId})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Assign Assessor (Optional)</label>
                <select
                  value={studentAssessorId}
                  onChange={(e) => setStudentAssessorId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-(--unikl-border) bg-white px-3 py-2 text-sm"
                >
                  <option value="">No assessor</option>
                  {assessorList.map((l) => (
                    <option key={l.id} value={l.id}>{l.name} ({l.staffId})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-xs text-(--unikl-muted)">
              Password will be automatically set to Student ID.
            </div>

            <button
              type="button"
              onClick={() => void createStudent()}
              disabled={busy || !studentId.trim() || !studentName.trim()}
              className="rounded-md bg-(--unikl-blue) px-3 py-2 text-sm font-medium text-white hover:bg-(--unikl-blue-2) disabled:opacity-60"
            >
              Add Student
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-(--unikl-border) bg-(--unikl-card)">
        <div className="border-b border-(--unikl-border) bg-(--unikl-card) p-4">
          <div className="text-sm font-medium">Lecturers</div>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-(--unikl-bg) text-(--unikl-muted)">
            <tr>
              <th className="px-4 py-2 font-medium">Staff ID</th>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Created</th>
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {lecturers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-3 text-(--unikl-muted)">
                  No lecturers.
                </td>
              </tr>
            ) : (
              lecturers.map((l) => (
                <tr key={l.id} className="border-t border-(--unikl-border)">
                  <td className="px-4 py-2 font-medium">{l.staffId}</td>
                  <td className="px-4 py-2">{l.name}</td>
                  <td className="px-4 py-2">{l.isAdmin ? "Coordinator" : l.role === "assessor" ? "Assessor" : "Supervisor"}</td>
                  <td className="px-4 py-2 text-(--unikl-muted)">{new Date(l.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => editLecturer(l)}
                        disabled={busy}
                        className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteLecturer(l.id, l.name)}
                        disabled={busy}
                        className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="overflow-hidden rounded-lg border border-(--unikl-border) bg-(--unikl-card)">
        <div className="border-b border-(--unikl-border) bg-(--unikl-card) p-4">
          <div className="text-sm font-medium">Students</div>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-(--unikl-bg) text-(--unikl-muted)">
            <tr>
              <th className="px-4 py-2 font-medium">Student ID</th>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Created</th>
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-3 text-(--unikl-muted)">
                  No students.
                </td>
              </tr>
            ) : (
              students.map((s) => (
                <tr key={s.id} className="border-t border-(--unikl-border)">
                  <td className="px-4 py-2 font-medium">{s.studentId}</td>
                  <td className="px-4 py-2">{s.name}</td>
                  <td className="px-4 py-2 text-(--unikl-muted)">{new Date(s.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => editStudent(s)}
                        disabled={busy}
                        className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteStudent(s.id, s.name)}
                        disabled={busy}
                        className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {lecturerCourseIds.length > 0 ? (
        <div className="text-xs text-(--unikl-muted)">
          Selected courses: {lecturerCourseIds.map((id) => courseLabelById.get(id) ?? id).join(", ")}
        </div>
      ) : null}

      {/* Edit Lecturer Modal */}
      {editingLecturer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditingLecturer(null)}>
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Edit Lecturer</h2>
            
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={editLecturerName}
                  onChange={(e) => setEditLecturerName(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter name"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Staff ID</label>
                <input
                  type="text"
                  value={editLecturerStaffId}
                  onChange={(e) => setEditLecturerStaffId(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter staff ID"
                />
                <p className="mt-1 text-xs text-gray-500">Format: 522XXXXXXX</p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  value={editLecturerPassword}
                  onChange={(e) => setEditLecturerPassword(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Leave blank to keep current"
                />
                <p className="mt-1 text-xs text-gray-500">Leave blank to keep current. Min 8 chars with uppercase, lowercase, number, and special character.</p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="editLecturerAdmin"
                  checked={editLecturerIsAdmin}
                  onChange={(e) => setEditLecturerIsAdmin(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="editLecturerAdmin" className="ml-2 text-sm font-medium text-gray-700">
                  Admin Access
                </label>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Assigned Courses</label>
                <div className="max-h-48 overflow-y-auto rounded border border-gray-300 p-2">
                  {courses.length === 0 ? (
                    <p className="text-sm text-gray-500">No courses available</p>
                  ) : (
                    courses.map((course) => (
                      <label key={course.id} className="flex items-center gap-2 py-1 hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={editLecturerCourseIds.includes(course.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditLecturerCourseIds([...editLecturerCourseIds, course.id]);
                            } else {
                              setEditLecturerCourseIds(editLecturerCourseIds.filter(id => id !== course.id));
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600"
                        />
                        <span className="text-sm text-gray-700">{course.code} — {course.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEditingLecturer(null)}
                disabled={busy}
                className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submitEditLecturer}
                disabled={busy || !editLecturerName.trim() || !editLecturerStaffId.trim()}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {busy ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditingStudent(null)}>
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Edit Student</h2>
            
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={editStudentName}
                  onChange={(e) => setEditStudentName(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter name"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Student ID</label>
                <input
                  type="text"
                  value={editStudentId}
                  onChange={(e) => setEditStudentId(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter student ID"
                />
                <p className="mt-1 text-xs text-gray-500">Format: 522XXXXXXX</p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  value={editStudentPassword}
                  onChange={(e) => setEditStudentPassword(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Leave blank to keep current"
                />
                <p className="mt-1 text-xs text-gray-500">Leave blank to keep current. Min 8 chars with uppercase, lowercase, number, and special character.</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Supervisor</label>
                  <select
                    value={editStudentSupervisorId}
                    onChange={(e) => setEditStudentSupervisorId(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">No supervisor</option>
                    {supervisorList.map((l) => (
                      <option key={l.id} value={l.id}>{l.name} ({l.staffId})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Assessor</label>
                  <select
                    value={editStudentAssessorId}
                    onChange={(e) => setEditStudentAssessorId(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">No assessor</option>
                    {assessorList.map((l) => (
                      <option key={l.id} value={l.id}>{l.name} ({l.staffId})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Course Enrollments</label>
                <div className="max-h-48 overflow-y-auto rounded border border-gray-300 p-2">
                  {courseClasses.length === 0 ? (
                    <p className="text-sm text-gray-500">No classes available</p>
                  ) : (
                    courseClasses
                      .reduce((acc, cls) => {
                        const existing = acc.find(g => g.courseId === cls.courseId);
                        if (existing) {
                          existing.classes.push(cls);
                        } else {
                          acc.push({ courseId: cls.courseId, courseCode: cls.courseCode, courseName: cls.courseName, classes: [cls] });
                        }
                        return acc;
                      }, [] as Array<{ courseId: string; courseCode: string; courseName: string; classes: CourseClass[] }>)
                      .map((group) => {
                        const enrolledClassInCourse = group.classes.find(cls => editStudentEnrollments.includes(cls.id));
                        return (
                          <div key={group.courseId} className="mb-3 pb-3 border-b border-gray-200 last:border-b-0 last:pb-0">
                            <div className="mb-2 text-xs font-semibold text-gray-600">{group.courseCode} — {group.courseName}</div>
                            <div className="space-y-1">
                              {group.classes.map((cls) => (
                                <label key={cls.id} className="flex items-center gap-2 pl-3 py-1 hover:bg-gray-50 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`course-${group.courseId}`}
                                    checked={editStudentEnrollments.includes(cls.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        // Remove any other class from this course, add this one
                                        const withoutThisCourse = editStudentEnrollments.filter(id => 
                                          !group.classes.some(c => c.id === id)
                                        );
                                        setEditStudentEnrollments([...withoutThisCourse, cls.id]);
                                      }
                                    }}
                                    className="h-4 w-4 border-gray-300 text-blue-600"
                                  />
                                  <span className="text-sm text-gray-700">{cls.name}</span>
                                </label>
                              ))}
                              {enrolledClassInCourse && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditStudentEnrollments(editStudentEnrollments.filter(id => id !== enrolledClassInCourse.id));
                                  }}
                                  className="ml-7 mt-1 text-xs text-red-600 hover:text-red-700"
                                >
                                  Unenroll from this course
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEditingStudent(null)}
                disabled={busy}
                className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submitEditStudent}
                disabled={busy || !editStudentName.trim() || !editStudentId.trim()}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {busy ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
