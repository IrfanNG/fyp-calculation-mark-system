import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const includeAll = searchParams.get('includeAll') === 'true';

  const courses = await prisma.course.findMany({
    where: includeAll ? {} : {
      lecturers: {
        none: {},
      },
    },
    orderBy: [{ code: "asc" }, { createdAt: "desc" }],
    select: { id: true, code: true, name: true, semester: true, year: true },
  });

  return Response.json({ courses });
}
