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

    const assignments = await prisma.courseLecturer.findMany({
      where: { lecturerId: id },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            name: true,
            semester: true,
            year: true,
          },
        },
      },
    });

    const courses = assignments.map(a => a.course);

    return NextResponse.json({ courses });
  } catch (error) {
    console.error("Get lecturer courses error:", error);
    return NextResponse.json(
      { error: "Failed to get lecturer courses" },
      { status: 500 }
    );
  }
}
