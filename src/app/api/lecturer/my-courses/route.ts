import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedLecturerForApi } from "@/lib/apiAuth";

export async function GET() {
  try {
    const lecturer = await getAuthenticatedLecturerForApi();
    if (!lecturer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all available courses
    const allCourses = await prisma.course.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        semester: true,
        year: true,
        lecturers: {
          select: {
            lecturerId: true,
          },
        },
      },
      orderBy: { code: "asc" },
    });

    // Get lecturer's current assignments
    const myAssignments = await prisma.courseLecturer.findMany({
      where: { lecturerId: lecturer.id },
      select: { courseId: true },
    });

    const myCourseIds = new Set(myAssignments.map(a => a.courseId));

    const courses = allCourses.map(course => ({
      id: course.id,
      code: course.code,
      name: course.name,
      semester: course.semester,
      year: course.year,
      isAssigned: myCourseIds.has(course.id),
      lecturerCount: course.lecturers.length,
    }));

    return NextResponse.json({ courses });
  } catch (error) {
    console.error("Get lecturer courses error:", error);
    return NextResponse.json(
      { error: "Failed to fetch courses" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const lecturer = await getAuthenticatedLecturerForApi();
    if (!lecturer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { courseIds } = body;

    if (!Array.isArray(courseIds)) {
      return NextResponse.json(
        { error: "courseIds must be an array" },
        { status: 400 }
      );
    }

    // Validate max 3 courses
    if (courseIds.length > 3) {
      return NextResponse.json(
        { error: "Lecturers can teach a maximum of 3 courses" },
        { status: 400 }
      );
    }

    // Validate minimum 1 course
    if (courseIds.length < 1) {
      return NextResponse.json(
        { error: "Lecturers must teach at least 1 course" },
        { status: 400 }
      );
    }

    // Validate all course IDs exist
    const courses = await prisma.course.findMany({
      where: { id: { in: courseIds } },
      select: { id: true },
    });

    if (courses.length !== courseIds.length) {
      return NextResponse.json(
        { error: "One or more course IDs are invalid" },
        { status: 400 }
      );
    }

    // Get current assignments
    const currentAssignments = await prisma.courseLecturer.findMany({
      where: { lecturerId: lecturer.id },
      select: { courseId: true },
    });

    const currentCourseIds = new Set(currentAssignments.map(a => a.courseId));
    const newCourseIds = new Set(courseIds);

    // Delete removed assignments
    const toDelete = currentAssignments.filter(a => !newCourseIds.has(a.courseId));
    if (toDelete.length > 0) {
      await prisma.courseLecturer.deleteMany({
        where: {
          lecturerId: lecturer.id,
          courseId: { in: toDelete.map(a => a.courseId) },
        },
      });
    }

    // Add new assignments
    const toAdd = courseIds.filter((courseId: string) => !currentCourseIds.has(courseId));
    if (toAdd.length > 0) {
      await prisma.courseLecturer.createMany({
        data: toAdd.map((courseId: string) => ({
          lecturerId: lecturer.id,
          courseId: courseId,
        })),
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated course assignments (${courseIds.length} courses)`,
    });
  } catch (error) {
    console.error("Update lecturer courses error:", error);
    return NextResponse.json(
      { error: "Failed to update course assignments" },
      { status: 500 }
    );
  }
}
