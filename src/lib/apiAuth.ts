import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName, parseSessionValue } from "@/lib/auth";

export async function getAuthenticatedLecturerForApi() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(getSessionCookieName())?.value;
  const session = parseSessionValue(raw);
  if (!session) return null;
  return prisma.lecturer.findUnique({
    where: { id: session.lecturerId },
    select: { id: true, staffId: true, name: true, isAdmin: true, role: true },
  });
}

export async function requireLecturerForApi() {
  const lecturer = await getAuthenticatedLecturerForApi();
  if (!lecturer) {
    return { lecturer: null, errorResponse: Response.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }
  return { lecturer, errorResponse: null } as const;
}

export async function requireAdminForApi() {
  const lecturer = await getAuthenticatedLecturerForApi();
  if (!lecturer) {
    return { lecturer: null, errorResponse: Response.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }
  if (!lecturer.isAdmin) {
    return { lecturer: null, errorResponse: Response.json({ error: "Forbidden" }, { status: 403 }) } as const;
  }
  return { lecturer, errorResponse: null } as const;
}

export async function requireSupervisorForApi() {
  const lecturer = await getAuthenticatedLecturerForApi();
  if (!lecturer) {
    return { lecturer: null, errorResponse: Response.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }
  if (lecturer.role !== "supervisor" && !lecturer.isAdmin) {
    return { lecturer: null, errorResponse: Response.json({ error: "Forbidden: supervisor only" }, { status: 403 }) } as const;
  }
  return { lecturer, errorResponse: null } as const;
}

export async function requireAssessorForApi() {
  const lecturer = await getAuthenticatedLecturerForApi();
  if (!lecturer) {
    return { lecturer: null, errorResponse: Response.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }
  if (lecturer.role !== "assessor" && !lecturer.isAdmin) {
    return { lecturer: null, errorResponse: Response.json({ error: "Forbidden: assessor only" }, { status: 403 }) } as const;
  }
  return { lecturer, errorResponse: null } as const;
}
