import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName, parseSessionValue } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(getSessionCookieName())?.value;
  const session = parseSessionValue(raw);
  if (!session) {
    return NextResponse.json({ lecturer: null }, { status: 200 });
  }

  const lecturer = await prisma.lecturer.findUnique({
    where: { id: session.lecturerId },
    select: { id: true, staffId: true, name: true, isAdmin: true },
  });

  return NextResponse.json({ lecturer: lecturer ?? null }, { status: 200 });
}
