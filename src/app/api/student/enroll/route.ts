import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedStudentForApi } from "@/lib/requireAuthStudent";

export async function POST(req: NextRequest) {
  try {
    const student = await getAuthenticatedStudentForApi();
    if (!student) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { courseClassId } = body;

    if (!courseClassId) {
      return NextResponse.json(
        { error: "courseClassId is required" },
        { status: 400 }
      );
    }

    // Check if class exists
    const courseClass = await prisma.courseClass.findUnique({
      where: { id: courseClassId },
      include: {
        course: {
          select: {
            code: true,
            name: true,
          },
        },
      },
    });

    if (!courseClass) {
      return NextResponse.json(
        { error: "Course class not found" },
        { status: 404 }
      );
    }

    // Check if already enrolled in ANY class of this course
    const existing = await prisma.enrollment.findFirst({
      where: {
        studentId: student.id,
        courseClass: {
          courseId: courseClass.courseId,
        },
      },
      include: {
        courseClass: {
          select: { name: true },
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `You are already enrolled in ${existing.courseClass.name} of this course` },
        { status: 400 }
      );
    }

    // Check class capacity (default max 50 students per class)
    const MAX_STUDENTS_PER_CLASS = 50;
    const currentEnrollmentCount = await prisma.enrollment.count({
      where: { courseClassId },
    });

    if (currentEnrollmentCount >= MAX_STUDENTS_PER_CLASS) {
      return NextResponse.json(
        { error: `This class is full (${MAX_STUDENTS_PER_CLASS} students max)` },
        { status: 400 }
      );
    }

    // Create enrollment
    const enrollment = await prisma.enrollment.create({
      data: {
        studentId: student.id,
        courseClassId: courseClassId,
      },
      include: {
        courseClass: {
          include: {
            course: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      enrollment,
      message: `Successfully enrolled in ${courseClass.course.code} - ${courseClass.course.name}`,
    });
  } catch (error) {
    console.error("Enrollment error:", error);
    return NextResponse.json(
      { error: "Failed to enroll in course" },
      { status: 500 }
    );
  }
}

// Get available courses for enrollment
export async function GET() {
  try {
    const student = await getAuthenticatedStudentForApi();
    if (!student) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all course classes with enrollment counts
    const allClasses = await prisma.courseClass.findMany({
      include: {
        course: {
          include: {
            lecturers: {
              include: {
                lecturer: {
                  select: {
                    name: true,
                    staffId: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
      orderBy: [
        { course: { code: "asc" } },
        { name: "asc" },
      ],
    });

    // Get student's current enrollments
    const myEnrollments = await prisma.enrollment.findMany({
      where: { studentId: student.id },
      select: {
        courseClassId: true,
        courseClass: {
          select: {
            courseId: true,
          },
        },
      },
    });

    // Build maps
    const enrolledCourseIds = new Set(myEnrollments.map((e) => e.courseClass.courseId));
    const enrolledClassIds = new Set(myEnrollments.map((e) => e.courseClassId));

    // Group classes by course
    const courseGroups = allClasses.reduce((acc, cls) => {
      const courseId = cls.course.id;
      if (!acc[courseId]) {
        const lecturerNames = cls.course.lecturers.map((l) => l.lecturer.name);
        acc[courseId] = {
          courseId: cls.course.id,
          courseCode: cls.course.code,
          courseName: cls.course.name,
          semester: cls.course.semester,
          year: cls.course.year,
          lecturer: lecturerNames.length > 0 ? lecturerNames.join(", ") : "N/A",
          isEnrolled: enrolledCourseIds.has(courseId),
          classes: [],
        };
      }
      acc[courseId].classes.push({
        id: cls.id,
        name: cls.name,
        enrollmentCount: cls._count.enrollments,
        isEnrolled: enrolledClassIds.has(cls.id),
      });
      return acc;
    }, {} as Record<string, { courseId: string; courseCode: string; courseName: string; semester: string | null; year: number | null; lecturer: string; isEnrolled: boolean; classes: Array<{ id: string; name: string; enrollmentCount: number; isEnrolled: boolean }> }>);

    const courses = Object.values(courseGroups);

    return NextResponse.json({ courses });
  } catch (error) {
    console.error("Get courses error:", error);
    return NextResponse.json(
      { error: "Failed to fetch courses" },
      { status: 500 }
    );
  }
}
