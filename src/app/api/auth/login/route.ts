import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSessionValue, getSessionCookieName, verifyPassword } from "@/lib/auth";

const BodySchema = z.object({
  staffId: z.string().trim().min(3).max(32),
  password: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { staffId, password } = parsed.data;
  const lecturer = await prisma.lecturer.findUnique({ where: { staffId } });
  if (!lecturer || !verifyPassword(password, lecturer.passwordHash)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const res = NextResponse.json(
    { lecturer: { id: lecturer.id, staffId: lecturer.staffId, name: lecturer.name, isAdmin: lecturer.isAdmin } },
    { status: 200 }
  );
  res.cookies.set({
    name: getSessionCookieName(),
    value: createSessionValue(lecturer.id),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return res;
}
