import { z } from "zod";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword, createSessionValue, getSessionCookieName } from "@/lib/auth";
import { isValidUniklId, isStrongPassword, UNIKL_ID_MESSAGE, PASSWORD_POLICY_MESSAGE } from "@/lib/validation";

const SignupSchema = z.object({
  studentId: z.string().min(1),
  name: z.string().min(1),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const payload = SignupSchema.parse(json);

    if (!isValidUniklId(payload.studentId)) {
      return NextResponse.json({ error: UNIKL_ID_MESSAGE }, { status: 400 });
    }

    if (!isStrongPassword(payload.password)) {
      return NextResponse.json({ error: PASSWORD_POLICY_MESSAGE }, { status: 400 });
    }

    const existing = await prisma.student.findUnique({ where: { studentId: payload.studentId } });
    if (existing) {
      return NextResponse.json({ error: "Student ID already registered" }, { status: 400 });
    }

    const passwordHash = await hashPassword(payload.password);
    const student = await prisma.student.create({
      data: {
        studentId: payload.studentId,
        name: payload.name,
        passwordHash,
      },
    });

    const sessionValue = createSessionValue(undefined, student.id);
    const cookieStore = await cookies();
    cookieStore.set(getSessionCookieName(), sessionValue, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12, // 12 hours
    });

    return NextResponse.json({ student: { id: student.id, studentId: student.studentId, name: student.name } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : "Signup failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
