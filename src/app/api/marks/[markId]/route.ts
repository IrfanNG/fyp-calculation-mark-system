import { z } from "zod";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName, parseSessionValue } from "@/lib/auth";

const UpdateSchema = z.object({
  rawMark: z.number().min(0),
  changedBy: z.string(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ markId: string }> }
) {
  try {
    const { markId } = await context.params;

    const cookieStore = await cookies();
    const raw = cookieStore.get(getSessionCookieName())?.value;
    const session = parseSessionValue(raw);
    if (!session || !session.lecturerId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get lecturer details to check admin status
    const lecturer = await prisma.lecturer.findUnique({
      where: { id: session.lecturerId },
      select: { isAdmin: true },
    });
    if (!lecturer) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const mark = await prisma.markEntry.findUnique({
      where: { id: markId },
      include: {
        course: {
          select: {
            id: true,
            lecturers: {
              where: { lecturerId: session.lecturerId },
              select: { lecturerId: true },
            },
          },
        },
      },
    });

    if (!mark) {
      return Response.json({ error: "Mark not found" }, { status: 404 });
    }

    if (!lecturer.isAdmin && mark.course.lecturers.length === 0) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const json = await request.json();
    const payload = UpdateSchema.parse(json);

    // Create history entry
    await prisma.markHistory.create({
      data: {
        markEntryId: mark.id,
        oldValue: mark.rawMark,
        newValue: payload.rawMark,
        changedBy: payload.changedBy,
      },
    });

    // Update mark
    const updated = await prisma.markEntry.update({
      where: { id: markId },
      data: { rawMark: payload.rawMark },
    });

    return Response.json({ mark: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.flatten() }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ markId: string }> }
) {
  try {
    const { markId } = await context.params;

    const cookieStore = await cookies();
    const raw = cookieStore.get(getSessionCookieName())?.value;
    const session = parseSessionValue(raw);
    if (!session || !session.lecturerId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get lecturer details to check admin status
    const lecturer = await prisma.lecturer.findUnique({
      where: { id: session.lecturerId },
      select: { isAdmin: true },
    });
    if (!lecturer) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const mark = await prisma.markEntry.findUnique({
      where: { id: markId },
      include: {
        course: {
          select: {
            id: true,
            lecturers: {
              where: { lecturerId: session.lecturerId },
              select: { lecturerId: true },
            },
          },
        },
      },
    });

    if (!mark) {
      return Response.json({ error: "Mark not found" }, { status: 404 });
    }

    if (!lecturer.isAdmin && mark.course.lecturers.length === 0) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.markEntry.delete({ where: { id: markId } });

    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
