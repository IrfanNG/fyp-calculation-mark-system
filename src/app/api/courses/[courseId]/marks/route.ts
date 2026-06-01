import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getSessionCookieName, parseSessionValue } from "@/lib/auth";

const MarkSchema = z.object({
  assessmentId: z.string().min(1),
  rawMark: z.number().min(0),
  fullMark: z.number().min(0).optional().nullable(),
});

const SaveMarksSchema = z.object({
  studentName: z.string().min(1),
  studentId: z.string().optional().nullable(),
  courseClassId: z.string().min(1).optional().nullable(),
  marks: z.array(MarkSchema).min(1),
});

export async function POST(request: Request, ctx: { params: Promise<{ courseId: string }> }) {
  try {
    const { courseId } = await ctx.params;

    const cookieStore = await cookies();
    const raw = cookieStore.get(getSessionCookieName())?.value;
    const session = parseSessionValue(raw);
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Get lecturer details to check admin status
    const lecturer = await prisma.lecturer.findUnique({
      where: { id: session.lecturerId },
      select: { isAdmin: true },
    });
    if (!lecturer) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        lecturers: {
          where: { lecturerId: session.lecturerId },
          select: { lecturerId: true },
        },
      },
    });
    if (!course) return Response.json({ error: "Course not found" }, { status: 404 });
    if (!lecturer.isAdmin && course.lecturers.length === 0) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const json = await request.json();
    const payload = SaveMarksSchema.parse(json);

    const url = new URL(request.url);
    const classId = payload.courseClassId ?? url.searchParams.get("classId");
    if (classId) {
      const cls = await prisma.courseClass.findUnique({ where: { id: classId }, select: { courseId: true } });
      if (!cls || cls.courseId !== courseId) {
        return Response.json({ error: "Invalid class" }, { status: 400 });
      }
    }

    const assessmentIds = payload.marks.map((m) => m.assessmentId);

    await prisma.$transaction(async (tx) => {
      await tx.markEntry.deleteMany({
        where: {
          courseId,
          courseClassId: classId ?? null,
          assessmentId: { in: assessmentIds },
          studentName: payload.studentName,
          studentId: payload.studentId ?? null,
        },
      });

      await tx.markEntry.createMany({
        data: payload.marks.map((m) => ({
          courseId,
          courseClassId: classId ?? null,
          assessmentId: m.assessmentId,
          studentName: payload.studentName,
          studentId: payload.studentId ?? null,
          rawMark: m.rawMark,
          fullMark: m.fullMark ?? null,
        })),
      });
    });

    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.flatten() }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request, ctx: { params: Promise<{ courseId: string }> }) {
  try {
    const { courseId } = await ctx.params;

    const cookieStore = await cookies();
    const raw = cookieStore.get(getSessionCookieName())?.value;
    const session = parseSessionValue(raw);
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Get lecturer details to check admin status
    const lecturer = await prisma.lecturer.findUnique({
      where: { id: session.lecturerId },
      select: { isAdmin: true },
    });
    if (!lecturer) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        lecturers: {
          where: { lecturerId: session.lecturerId },
          select: { lecturerId: true },
        },
      },
    });
    if (!course) return Response.json({ error: "Course not found" }, { status: 404 });
    if (!lecturer.isAdmin && course.lecturers.length === 0) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    const classId = url.searchParams.get("classId");

    if (classId) {
      const cls = await prisma.courseClass.findUnique({ where: { id: classId }, select: { courseId: true } });
      if (!cls || cls.courseId !== courseId) {
        return Response.json({ error: "Invalid class" }, { status: 400 });
      }
    }

    // Get all enrolled students for the class
    const enrollments = await prisma.enrollment.findMany({
      where: classId ? { courseClassId: classId } : { courseClass: { courseId } },
      include: {
        student: {
          select: {
            name: true,
            studentId: true,
          },
        },
      },
      orderBy: { student: { name: "asc" } },
    });

    // Get existing mark entries
    const entries = await prisma.markEntry.findMany({
      where: classId ? { courseId, courseClassId: classId } : { courseId },
      orderBy: [{ studentName: "asc" }, { assessmentId: "asc" }],
    });

    // Build marks map by student
    const marksByStudent = new Map<string, Record<string, number>>();
    for (const e of entries) {
      const key = `${e.studentName}::${e.studentId ?? ""}`;
      const marks = marksByStudent.get(key) ?? {};
      marks[e.assessmentId] = e.rawMark;
      marksByStudent.set(key, marks);
    }

    // Build result based on enrolled students
    const students = enrollments.map((enrollment) => {
      const key = `${enrollment.student.name}::${enrollment.student.studentId}`;
      const marks = marksByStudent.get(key) ?? {};
      return {
        studentName: enrollment.student.name,
        studentId: enrollment.student.studentId,
        marks,
      };
    });

    return Response.json({
      students,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.flatten() }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
