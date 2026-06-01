import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedLecturerForApi } from "@/lib/apiAuth";
import { hashPassword } from "@/lib/auth";
import { isValidUniklId, isStrongPassword, UNIKL_ID_MESSAGE, PASSWORD_POLICY_MESSAGE } from "@/lib/validation";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const lecturer = await getAuthenticatedLecturerForApi();
    if (!lecturer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!lecturer.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { staffId, name, password, isAdmin, courseIds } = body;

    if (staffId !== undefined && !isValidUniklId(staffId)) {
      return NextResponse.json({ error: UNIKL_ID_MESSAGE }, { status: 400 });
    }

    if (password && !isStrongPassword(password)) {
      return NextResponse.json({ error: PASSWORD_POLICY_MESSAGE }, { status: 400 });
    }

    const updateData: Record<string, string | boolean> = {};
    
    if (staffId !== undefined) {
      // Check if staffId is already taken
      const existing = await prisma.lecturer.findFirst({
        where: {
          staffId,
          NOT: { id },
        },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Staff ID already exists" },
          { status: 400 }
        );
      }
      updateData.staffId = staffId;
    }

    if (name !== undefined) updateData.name = name;
    if (password) updateData.passwordHash = await hashPassword(password);
    if (isAdmin !== undefined) updateData.isAdmin = Boolean(isAdmin);

    const updatedLecturer = await prisma.lecturer.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        staffId: true,
        name: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Handle course assignments if provided
    if (courseIds !== undefined && Array.isArray(courseIds)) {
      // Validate max 3 courses (can be bypassed by admin)
      if (courseIds.length > 3) {
        return NextResponse.json(
          { error: "Lecturers can teach a maximum of 3 courses" },
          { status: 400 }
        );
      }

      // Get current course assignments
      const currentAssignments = await prisma.courseLecturer.findMany({
        where: { lecturerId: id },
        select: { courseId: true },
      });
      const currentCourseIds = new Set(currentAssignments.map(a => a.courseId));
      const newCourseIds = new Set(courseIds);

      // Delete removed assignments
      const toDelete = currentAssignments.filter(a => !newCourseIds.has(a.courseId));
      if (toDelete.length > 0) {
        await prisma.courseLecturer.deleteMany({
          where: {
            lecturerId: id,
            courseId: { in: toDelete.map(a => a.courseId) },
          },
        });
      }

      // Add new assignments
      const toAdd = courseIds.filter((courseId: string) => !currentCourseIds.has(courseId));
      if (toAdd.length > 0) {
        await prisma.courseLecturer.createMany({
          data: toAdd.map((courseId: string) => ({
            lecturerId: id,
            courseId: courseId,
          })),
        });
      }
    }

    return NextResponse.json({ lecturer: updatedLecturer });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === "P2025") {
      return NextResponse.json({ error: "Lecturer not found" }, { status: 404 });
    }
    console.error("Update lecturer error:", error);
    return NextResponse.json(
      { error: "Failed to update lecturer" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const lecturer = await getAuthenticatedLecturerForApi();
    if (!lecturer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!lecturer.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    // Don't allow deleting yourself
    if (lecturer.id === id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    await prisma.lecturer.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === "P2025") {
      return NextResponse.json({ error: "Lecturer not found" }, { status: 404 });
    }
    console.error("Delete lecturer error:", error);
    return NextResponse.json(
      { error: "Failed to delete lecturer" },
      { status: 500 }
    );
  }
}
