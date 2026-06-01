import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName, parseSessionValue } from "@/lib/auth";

export async function getAuthenticatedLecturer() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(getSessionCookieName())?.value;
  const session = parseSessionValue(raw);
  if (!session || !session.lecturerId) return null;
  
  return prisma.lecturer.findUnique({
    where: { id: session.lecturerId },
    select: { id: true, name: true },
  });
}

export async function requireLecturer() {
  const lecturer = await getAuthenticatedLecturer();
  if (!lecturer) redirect("/login");
  return lecturer;
}

export async function getAuthenticatedLecturerForApi() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(getSessionCookieName())?.value;
  const session = parseSessionValue(raw);
  if (!session || !session.lecturerId) return null;
  
  return prisma.lecturer.findUnique({
    where: { id: session.lecturerId },
    select: { id: true, name: true },
  });
}
