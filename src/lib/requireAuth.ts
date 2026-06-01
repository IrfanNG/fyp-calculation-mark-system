import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName, parseSessionValue } from "@/lib/auth";

export async function getAuthenticatedLecturer() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(getSessionCookieName())?.value;
  const session = parseSessionValue(raw);
  if (!session) return null;
  return prisma.lecturer.findUnique({
    where: { id: session.lecturerId },
    select: { id: true, staffId: true, name: true, isAdmin: true, role: true },
  });
}

export async function requireLecturer() {
  const lecturer = await getAuthenticatedLecturer();
  if (!lecturer) redirect("/login");
  return lecturer;
}

export async function requireAdmin() {
  const lecturer = await requireLecturer();
  if (!lecturer.isAdmin) redirect("/");
  return lecturer;
}
