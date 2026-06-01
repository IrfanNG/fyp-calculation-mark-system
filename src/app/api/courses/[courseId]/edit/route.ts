import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedLecturerForApi } from "@/lib/apiAuth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const lecturer = await getAuthenticatedLecturerForApi();
    if (!lecturer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { courseId } = await params;
    const body = await req.json();
    const { code, name, semester, year, lecturerIds } = body;

    const updateData: any = {};
    
    if (code !== undefined) updateData.code = code;
    if (name !== undefined) updateData.name = name;
    if (semester !== undefined) updateData.semester = semester;
    if (year !== undefined) updateData.year = year;

    // Update course basic info
    const course = await prisma.course.update({
      where: { id: courseId },
      data: updateData,
    });

    // Update lecturers if provided
    if (lecturerIds !== undefined && Array.isArray(lecturerIds)) {
      // Remove old assignments
      await prisma.courseLecturer.deleteMany({
        where: { courseId },
      });

      // Add new assignments
      if (lecturerIds.length > 0) {
        await prisma.courseLecturer.createMany({
          data: lecturerIds.map((lecturerId: string) => ({
            courseId,
            lecturerId,
          })),
        });
      }
    }

    // Fetch updated course with lecturers
    const updatedCourse = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        lecturers: {
          include: {
            lecturer: {
              select: {
                id: true,
                staffId: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ course: updatedCourse });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    console.error("Update course error:", error);
    return NextResponse.json(
      { error: "Failed to update course" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const lecturer = await getAuthenticatedLecturerForApi();
    if (!lecturer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!lecturer.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { courseId } = await params;
    await prisma.course.delete({
      where: { id: courseId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    console.error("Delete course error:", error);
    return NextResponse.json(
      { error: "Failed to delete course" },
      { status: 500 }
    );
  }
}
