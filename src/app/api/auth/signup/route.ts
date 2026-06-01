import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSessionValue, getSessionCookieName, hashPassword } from "@/lib/auth";
import { isValidUniklId, isStrongPassword, UNIKL_ID_MESSAGE, PASSWORD_POLICY_MESSAGE } from "@/lib/validation";

const BodySchema = z.object({
  staffId: z.string().trim().min(3).max(32),
  name: z.string().trim().min(2).max(80),
  password: z.string().min(6).max(200),
  courseIds: z.array(z.string().min(1)).max(20).optional(),
});

function defaultClassNames() {
  return ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5"];
}

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { staffId, name, password, courseIds } = parsed.data;

  if (!isValidUniklId(staffId)) {
    return NextResponse.json({ error: UNIKL_ID_MESSAGE }, { status: 400 });
  }

  if (!isStrongPassword(password)) {
    return NextResponse.json({ error: PASSWORD_POLICY_MESSAGE }, { status: 400 });
  }

  const existing = await prisma.lecturer.findUnique({ where: { staffId } });
  if (existing) {
    return NextResponse.json({ error: "Staff ID already exists" }, { status: 409 });
  }

  let lecturer:
    | {
        id: string;
        staffId: string;
        name: string;
        isAdmin: boolean;
      }
    | undefined;
  try {
    lecturer = await prisma.$transaction(async (tx) => {
      const created = await tx.lecturer.create({
        data: {
          staffId,
          name,
          passwordHash: hashPassword(password),
        },
        select: { id: true, staffId: true, name: true, isAdmin: true },
      });

      const ids = (courseIds ?? []).filter(Boolean);
      for (const courseId of ids) {
        const course = await tx.course.findUnique({
          where: { id: courseId },
          select: {
            id: true,
            lecturers: { select: { lecturerId: true } },
          },
        });
        if (!course) {
          throw new Error("Selected course not found");
        }
        if (course.lecturers.length > 0) {
          throw new Error("Selected course is already assigned to a lecturer");
        }

        await tx.courseLecturer.create({
          data: {
            courseId,
            lecturerId: created.id,
          },
        });
        const existingClasses = await tx.courseClass.count({ where: { courseId } });
        if (existingClasses === 0) {
          await tx.courseClass.createMany({
            data: defaultClassNames().map((n) => ({ courseId, name: n })),
          });
        }
      }

      return created;
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Signup failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const res = NextResponse.json({ lecturer }, { status: 201 });
  res.cookies.set({
    name: getSessionCookieName(),
    value: createSessionValue(lecturer.id),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return res;
}
