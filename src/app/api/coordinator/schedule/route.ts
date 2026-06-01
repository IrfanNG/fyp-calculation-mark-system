import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminForApi } from "@/lib/apiAuth";

const CreateScheduleSchema = z.object({
  title: z.string().trim().min(3).max(200),
  scheduledAt: z.string().datetime(),
  venue: z.string().trim().max(200).optional(),
});

const UpdateScheduleSchema = CreateScheduleSchema.partial().extend({
  id: z.string().min(1),
});

export async function GET() {
  const auth = await requireAdminForApi();
  if (auth.errorResponse) return auth.errorResponse;

  const schedules = await prisma.assessmentSchedule.findMany({
    orderBy: { scheduledAt: "asc" },
    include: {
      assignments: {
        include: {
          project: {
            include: { student: { select: { studentId: true, name: true } } },
          },
          assessor: { select: { id: true, staffId: true, name: true } },
        },
      },
    },
  });

  return Response.json({ schedules });
}

export async function POST(request: Request) {
  const auth = await requireAdminForApi();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const json = await request.json().catch(() => null);
    const payload = CreateScheduleSchema.parse(json);

    const schedule = await prisma.assessmentSchedule.create({
      data: {
        title: payload.title,
        scheduledAt: new Date(payload.scheduledAt),
        venue: payload.venue,
      },
    });

    return Response.json({ schedule }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.flatten() }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminForApi();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const json = await request.json().catch(() => null);
    const payload = UpdateScheduleSchema.parse(json);
    const { id, ...data } = payload;

    const schedule = await prisma.assessmentSchedule.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.scheduledAt && { scheduledAt: new Date(data.scheduledAt) }),
        ...(data.venue !== undefined && { venue: data.venue }),
      },
    });

    return Response.json({ schedule });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.flatten() }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdminForApi();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id } = await request.json().catch(() => ({}));
    if (!id) return Response.json({ error: "id required" }, { status: 400 });

    await prisma.assessmentSchedule.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 400 });
  }
}
