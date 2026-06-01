import { z } from "zod";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName, parseSessionValue } from "@/lib/auth";

const CreateSchema = z.object({
  courseClassId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  maxScore: z.number().default(100),
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

    const assignments = await prisma.assignment.findMany({
      where: { courseClassId: classId },
      orderBy: { createdAt: "desc" },
      include: {
        submissions: {
          include: {
            student: { select: { studentId: true, name: true } },
          },
        },
      },
    });

    return Response.json({ assignments });
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

    const assignment = await prisma.assignment.create({
      data: {
        courseClassId: payload.courseClassId,
        title: payload.title,
        description: payload.description || null,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
        maxScore: payload.maxScore,
      },
    });

    return Response.json({ assignment }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.flatten() }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
