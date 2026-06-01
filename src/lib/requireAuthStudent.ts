import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName, parseSessionValue } from "@/lib/auth";

export async function getAuthenticatedStudent() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(getSessionCookieName())?.value;
  const session = parseSessionValue(raw);
  if (!session || !session.studentId) return null;
  
  return prisma.student.findUnique({
    where: { id: session.studentId },
    select: { id: true, studentId: true, name: true },
  });
}

export async function requireStudent() {
  const student = await getAuthenticatedStudent();
  if (!student) redirect("/student/login");
  return student;
}

export async function getAuthenticatedStudentForApi() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(getSessionCookieName())?.value;
  const session = parseSessionValue(raw);
  if (!session || !session.studentId) return null;
  
  return prisma.student.findUnique({
    where: { id: session.studentId },
    select: { id: true, studentId: true, name: true },
  });
}
