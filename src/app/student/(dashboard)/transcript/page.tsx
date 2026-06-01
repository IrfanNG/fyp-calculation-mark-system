import { requireStudent } from "@/lib/requireAuthStudent";
import { prisma } from "@/lib/prisma";
import { defaultGpaScale } from "@/lib/gpa";

export default async function StudentTranscriptPage() {
  const student = await requireStudent();

  // Get all enrollments with marks
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: student.id },
    include: {
      courseClass: {
        include: {
          course: {
            select: {
              id: true,
              code: true,
              name: true,
              semester: true,
              year: true,
              assessments: {
                select: {
                  id: true,
                  name: true,
                  weightage: true,
                  fullMark: true,
                },
              },
            },
          },
          markEntries: {
            where: {
              studentId: student.studentId,
            },
          },
        },
      },
    },
  });

  // Get GPA scale
  const scaleRows = await prisma.gpaScale.findMany({
    orderBy: { minMark: "desc" },
  });
  const scale =
    scaleRows.length === 0
      ? defaultGpaScale
      : scaleRows.map((r) => ({
          minMark: r.minMark,
          maxMark: r.maxMark,
          grade: r.grade,
          gpa: r.gpa,
        }));

  // Calculate grades for each course
  const courseGrades = enrollments.map((enrollment) => {
    const course = enrollment.courseClass.course;
    const marks = enrollment.courseClass.markEntries;

    let totalWeighted = 0;
    const assessmentMarks: Record<string, number> = {};

    marks.forEach((mark) => {
      const assessment = course.assessments.find((a) => a.id === mark.assessmentId);
      if (assessment && assessment.fullMark) {
        const percentage = (mark.rawMark / assessment.fullMark) * 100;
        const weighted = (percentage / 100) * assessment.weightage;
        totalWeighted += weighted;
        assessmentMarks[assessment.name] = mark.rawMark;
      }
    });

    // Find grade
    let grade = "F";
    let gpa = 0;
    for (const row of scale) {
      if (totalWeighted >= row.minMark && totalWeighted <= row.maxMark) {
        grade = row.grade;
        gpa = row.gpa;
        break;
      }
    }

    return {
      courseCode: course.code,
      courseName: course.name,
      className: enrollment.courseClass.name,
      semester: course.semester,
      year: course.year,
      totalWeighted,
      grade,
      gpa,
      hasMarks: marks.length > 0,
    };
  });

  // Calculate overall GPA
  const coursesWithMarks = courseGrades.filter((c) => c.hasMarks);
  const overallGPA =
    coursesWithMarks.length > 0
      ? coursesWithMarks.reduce((sum, c) => sum + c.gpa, 0) / coursesWithMarks.length
      : 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Academic Transcript</h1>
        <p className="text-sm text-(--unikl-muted)">
          Your grades and GPA summary
        </p>
      </div>

      {/* GPA Summary Card */}
      <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="text-center">
            <div className="text-3xl font-bold text-(--unikl-blue)">
              {overallGPA.toFixed(2)}
            </div>
            <div className="text-sm text-(--unikl-muted) mt-1">Overall GPA</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-(--unikl-blue)">
              {coursesWithMarks.length}
            </div>
            <div className="text-sm text-(--unikl-muted) mt-1">
              Courses Graded
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-(--unikl-blue)">
              {enrollments.length}
            </div>
            <div className="text-sm text-(--unikl-muted) mt-1">
              Total Enrolled
            </div>
          </div>
        </div>
      </div>

      {/* Course Grades Table */}
      <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) overflow-hidden">
        <div className="border-b border-(--unikl-border) bg-(--unikl-bg) px-4 py-3">
          <h2 className="font-medium">Course Grades</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-(--unikl-bg) text-(--unikl-muted)">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Course Code</th>
                <th className="px-4 py-2 text-left font-medium">Course Name</th>
                <th className="px-4 py-2 text-left font-medium">Class</th>
                <th className="px-4 py-2 text-left font-medium">Semester</th>
                <th className="px-4 py-2 text-right font-medium">Total (%)</th>
                <th className="px-4 py-2 text-center font-medium">Grade</th>
                <th className="px-4 py-2 text-right font-medium">GPA</th>
              </tr>
            </thead>
            <tbody>
              {courseGrades.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-(--unikl-muted)"
                  >
                    No courses enrolled yet
                  </td>
                </tr>
              ) : (
                courseGrades.map((course, idx) => (
                  <tr
                    key={idx}
                    className="border-t border-(--unikl-border) hover:bg-(--unikl-bg)"
                  >
                    <td className="px-4 py-3 font-medium">{course.courseCode}</td>
                    <td className="px-4 py-3">{course.courseName}</td>
                    <td className="px-4 py-3 text-(--unikl-muted)">
                      {course.className}
                    </td>
                    <td className="px-4 py-3 text-(--unikl-muted)">
                      {course.semester} {course.year}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {course.hasMarks ? course.totalWeighted.toFixed(2) : "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={
                          "inline-block px-2 py-1 rounded text-xs font-medium " +
                          (course.hasMarks
                            ? course.gpa >= 3.0
                              ? "bg-green-100 text-green-800"
                              : course.gpa >= 2.0
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-500")
                        }
                      >
                        {course.hasMarks ? course.grade : "N/A"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {course.hasMarks ? course.gpa.toFixed(2) : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-4">
        <h3 className="font-medium text-sm mb-2">Grading Scale</h3>
        <div className="flex flex-wrap gap-4 text-xs">
          {scale.map((row, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="font-medium">{row.grade}:</span>
              <span className="text-(--unikl-muted)">
                {row.minMark}-{row.maxMark}% (GPA: {row.gpa})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
