import { z } from "zod";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSessionValue, getSessionCookieName } from "@/lib/auth";

const LoginSchema = z.object({
  studentId: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const payload = LoginSchema.parse(json);

    const student = await prisma.student.findUnique({ where: { studentId: payload.studentId } });
    if (!student || !student.passwordHash) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await verifyPassword(payload.password, student.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const sessionValue = createSessionValue(undefined, student.id);
    const cookieStore = await cookies();
    cookieStore.set(getSessionCookieName(), sessionValue, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return NextResponse.json({ student: { id: student.id, studentId: student.studentId, name: student.name } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
