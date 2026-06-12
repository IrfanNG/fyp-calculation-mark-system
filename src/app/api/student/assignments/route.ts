import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName, parseSessionValue } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(getSessionCookieName())?.value;
    const session = parseSessionValue(raw);
    
    if (!session || !session.studentId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get enrolled class IDs
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: session.studentId },
      select: { courseClassId: true },
    });
    const classIds = enrollments.map((e) => e.courseClassId);

    // Get assignments for enrolled classes
    const assignments = await prisma.assignment.findMany({
      where: {
        courseClassId: { in: classIds },
      },
      orderBy: { dueDate: "asc" },
      include: {
        courseClass: {
          select: {
            name: true,
            course: { select: { code: true, name: true } },
          },
        },
        submissions: {
          where: { studentId: session.studentId },
        },
        _count: {
          select: { submissions: true },
        },
      },
    });

    return Response.json({ assignments });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
