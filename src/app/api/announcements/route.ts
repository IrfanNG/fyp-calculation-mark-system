import { z } from "zod";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName, parseSessionValue } from "@/lib/auth";

const CreateSchema = z.object({
  courseClassId: z.string().optional(),
  title: z.string().min(1),
  content: z.string().min(1),
});

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(getSessionCookieName())?.value;
    const session = parseSessionValue(raw);
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const courseClassId = url.searchParams.get("classId");

    const announcements = await prisma.announcement.findMany({
      where: courseClassId ? { courseClassId } : {},
      orderBy: { publishedAt: "desc" },
      include: {
        lecturer: { select: { name: true } },
        courseClass: {
          select: {
            name: true,
            course: { select: { code: true, name: true } },
          },
        },
      },
    });

    return Response.json({ announcements });
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

    const announcement = await prisma.announcement.create({
      data: {
        lecturerId: session.lecturerId,
        courseClassId: payload.courseClassId || null,
        title: payload.title,
        content: payload.content,
      },
    });

    return Response.json({ announcement }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.flatten() }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
