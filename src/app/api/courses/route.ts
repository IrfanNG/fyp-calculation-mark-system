import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getSessionCookieName, parseSessionValue } from "@/lib/auth";

const CloSchema = z.object({
  code: z.string().min(1),
  description: z.string().optional().nullable(),
});

const AssessmentSchema = z.object({
  name: z.string().min(1),
  weightage: z.number().int().min(1).max(100),
  fullMark: z.number().int().positive().optional().nullable(),
  cloCodes: z.array(z.string().min(1)).min(1),
});

const CreateCourseSchema = z
  .object({
    code: z.string().min(1),
    name: z.string().min(1),
    semester: z.string().optional().nullable(),
    year: z.number().int().optional().nullable(),
    clos: z.array(CloSchema).min(1),
    assessments: z.array(AssessmentSchema).min(1),
  })
  .superRefine((val, ctx) => {
    const sum = val.assessments.reduce((s, a) => s + a.weightage, 0);
    if (sum !== 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Total assessment weightage must equal 100% (got ${sum}%).`,
        path: ["assessments"],
      });
    }
  });

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(getSessionCookieName())?.value;
    const session = parseSessionValue(raw);
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const json = await request.json();
    const payload = CreateCourseSchema.parse(json);

    const course = await prisma.course.create({
      data: {
        code: payload.code.trim().toUpperCase(),
        name: payload.name.trim(),
        semester: payload.semester?.trim() || null,
        year: payload.year ?? null,
      },
    });

    // Assign the creating lecturer to the course
    if (session.lecturerId) {
      await prisma.courseLecturer.create({
        data: {
          courseId: course.id,
          lecturerId: session.lecturerId,
        },
      });
    }

    await prisma.courseClass.createMany({
      data: ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5"].map((name) => ({
        courseId: course.id,
        name,
      })),
    });

    await prisma.clo.createMany({
      data: payload.clos.map((c) => ({
        courseId: course.id,
        code: c.code.trim().toUpperCase(),
        description: c.description?.trim() || null,
      })),
    });

    const cloRows = await prisma.clo.findMany({ where: { courseId: course.id } });
    const cloIdByCode = new Map(cloRows.map((c) => [c.code.toUpperCase(), c.id] as const));

    for (const a of payload.assessments) {
      const assessment = await prisma.assessment.create({
        data: {
          courseId: course.id,
          name: a.name.trim(),
          weightage: a.weightage,
          fullMark: a.fullMark ?? null,
        },
      });

      const mappingIds = a.cloCodes
        .map((code) => cloIdByCode.get(code.trim().toUpperCase()))
        .filter((id): id is string => Boolean(id));

      if (mappingIds.length === 0) {
        return Response.json(
          { error: `Assessment '${a.name}' must be linked to at least one CLO.` },
          { status: 400 }
        );
      }

      await prisma.assessmentClo.createMany({
        data: mappingIds.map((cloId) => ({
          assessmentId: assessment.id,
          cloId,
        })),
      });
    }

    return Response.json({ courseId: course.id }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.flatten() }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(getSessionCookieName())?.value;
  const session = parseSessionValue(raw);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const courses = await prisma.course.findMany({
    where: {
      OR: [
        {
          lecturers: {
            some: {
              lecturerId: session.lecturerId,
            },
          },
        },
        {
          lecturers: {
            none: {},
          },
        },
      ],
    },
    include: {
      lecturers: {
        include: {
          lecturer: {
            select: {
              id: true,
              staffId: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return Response.json({ courses });
}
