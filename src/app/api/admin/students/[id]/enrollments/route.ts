import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedLecturerForApi } from "@/lib/apiAuth";

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

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: id },
      include: {
        courseClass: {
          select: {
            id: true,
            name: true,
            courseId: true,
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

    return NextResponse.json({ enrollments });
  } catch (error) {
    console.error("Get student enrollments error:", error);
    return NextResponse.json(
      { error: "Failed to get student enrollments" },
      { status: 500 }
    );
  }
}
