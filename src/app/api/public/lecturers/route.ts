import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const lecturers = await prisma.lecturer.findMany({
      where: {
        OR: [
          { role: "supervisor" },
          { isAdmin: true }
        ]
      },
      select: {
        id: true,
        staffId: true,
        name: true,
      },
      orderBy: { name: "asc" }
    });

    return Response.json({ lecturers });
  } catch (error) {
    return Response.json({ error: "Failed to fetch lecturers" }, { status: 500 });
  }
}
