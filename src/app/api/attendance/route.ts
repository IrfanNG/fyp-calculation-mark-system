import { z } from "zod";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName, parseSessionValue } from "@/lib/auth";

const CreateSchema = z.object({
  courseClassId: z.string(),
  sessionDate: z.string(),
  sessionName: z.string(),
  attendance: z.array(z.object({
    studentId: z.string(),
    present: z.boolean(),
  })),
});

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(getSessionCookieName())?.value;
    const session = parseSessionValue(raw);
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const classId = url.searchParams.get("classId");

    if (!classId) {
      return Response.json({ error: "Missing classId" }, { status: 400 });
    }

    const sessions = await prisma.attendanceSession.findMany({
      where: { courseClassId: classId },
      orderBy: { sessionDate: "desc" },
      include: {
        records: {
          include: {
            student: { select: { studentId: true, name: true } },
          },
        },
      },
    });

    return Response.json({ sessions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(getSessionCookieName())?.value;
    const session = parseSessionValue(raw);
    if (!session || !session.lecturerId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const payload = CreateSchema.parse(json);

    const attendanceSession = await prisma.attendanceSession.create({
      data: {
        courseClassId: payload.courseClassId,
        sessionDate: new Date(payload.sessionDate),
        sessionName: payload.sessionName,
        records: {
          createMany: {
            data: payload.attendance.map((a) => ({
              studentId: a.studentId,
              present: a.present,
            })),
          },
        },
      },
    });

    return Response.json({ attendanceSession }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.flatten() }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
