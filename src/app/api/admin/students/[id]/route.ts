import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedLecturerForApi } from "@/lib/apiAuth";
import { hashPassword } from "@/lib/auth";
import { isValidUniklId, isStrongPassword, UNIKL_ID_MESSAGE, PASSWORD_POLICY_MESSAGE } from "@/lib/validation";

export async function GET(
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
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        fypProject: {
          include: {
            assessorAssignments: true
          }
        }
      }
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({ student });
  } catch (error) {
    console.error("Fetch student error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

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
    const { studentId, name, password, enrollments, supervisorId, assessorId } = body;

    if (studentId !== undefined && !isValidUniklId(studentId)) {
      return NextResponse.json({ error: UNIKL_ID_MESSAGE }, { status: 400 });
    }

    if (password && !isStrongPassword(password)) {
      return NextResponse.json({ error: PASSWORD_POLICY_MESSAGE }, { status: 400 });
    }

    const updateData: any = {};
    
    if (studentId !== undefined) {
      const existing = await prisma.student.findFirst({
        where: {
          studentId,
          NOT: { id },
        },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Student ID already exists" },
          { status: 400 }
        );
      }
      updateData.studentId = studentId;
    }

    if (name !== undefined) updateData.name = name;
    if (password) updateData.passwordHash = hashPassword(password);

    const student = await prisma.student.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        studentId: true,
        name: true,
      },
    });

    // Handle FYP Project (Supervisor & Assessor)
    if (supervisorId !== undefined) {
      const existingProject = await prisma.fypProject.findUnique({
        where: { studentId: id }
      });

      if (supervisorId) {
        let projectId = existingProject?.id;
        if (existingProject) {
          await prisma.fypProject.update({
            where: { id: existingProject.id },
            data: { supervisorId }
          });
        } else {
          const newProject = await prisma.fypProject.create({
            data: {
              title: "Pending Title",
              studentId: id,
              supervisorId,
              phase: "FYP1",
              status: "draft"
            }
          });
          projectId = newProject.id;
        }

        // Handle Assessor if projectId is available
        if (projectId && assessorId !== undefined) {
          // Remove old assessors
          await prisma.assessorAssignment.deleteMany({
            where: { projectId }
          });

          if (assessorId) {
            await prisma.assessorAssignment.create({
              data: {
                projectId,
                assessorId
              }
            });
          }
        }
      } else if (existingProject) {
        // If supervisorId is set to null/empty, should we delete the project?
        // For now just keep it or optionally delete. Let's keep it but without supervisor (prisma might complain if field is required)
        // Since supervisorId is required in schema, we can't set it to null.
        // So we either delete the project or keep existing. Usually we don't delete projects easily.
      }
    }

    // Handle enrollment changes if provided
    if (enrollments !== undefined && Array.isArray(enrollments)) {
      const classData = await prisma.courseClass.findMany({
        where: { id: { in: enrollments } },
        select: { id: true, courseId: true },
      });
      
      const courseIds = classData.map(c => c.courseId);
      const uniqueCourseIds = new Set(courseIds);
      
      if (courseIds.length !== uniqueCourseIds.size) {
        return NextResponse.json(
          { error: "Student can only be enrolled in one class per course" },
          { status: 400 }
        );
      }

      const currentEnrollments = await prisma.enrollment.findMany({
        where: { studentId: id },
        select: { courseClassId: true },
      });
      const currentClassIds = new Set(currentEnrollments.map(e => e.courseClassId));
      const newClassIds = new Set(enrollments);

      const toDelete = currentEnrollments.filter(e => !newClassIds.has(e.courseClassId));
      if (toDelete.length > 0) {
        await prisma.enrollment.deleteMany({
          where: {
            studentId: id,
            courseClassId: { in: toDelete.map(e => e.courseClassId) },
          },
        });
      }

      const toAdd = enrollments.filter((classId: string) => !currentClassIds.has(classId));
      if (toAdd.length > 0) {
        await prisma.enrollment.createMany({
          data: toAdd.map((classId: string) => ({
            studentId: id,
            courseClassId: classId,
          })),
        });
      }
    }

    return NextResponse.json({ student });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    console.error("Update student error:", error);
    return NextResponse.json(
      { error: "Failed to update student" },
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
    await prisma.student.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    console.error("Delete student error:", error);
    return NextResponse.json(
      { error: "Failed to delete student" },
      { status: 500 }
    );
  }
}
