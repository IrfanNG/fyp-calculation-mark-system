import { prisma } from "@/lib/prisma";
import { getAuthenticatedStudentForApi } from "@/lib/requireAuthStudent";
import { z } from "zod";

const SubmitProposalSchema = z.object({
  title: z.string().min(5).max(255),
  description: z.string().optional(),
});

export async function GET() {
  const student = await getAuthenticatedStudentForApi();
  if (!student) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.fypProject.findUnique({
    where: { studentId: student.id },
    include: {
      supervisor: { select: { id: true, staffId: true, name: true } },
      submissions: { orderBy: { submittedAt: "desc" } },
      feedbacks: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { name: true, staffId: true } } },
      },
      assessorAssignments: {
        include: {
          assessor: { select: { staffId: true, name: true } },
          schedule: true,
        },
      },
      finalMark: true,
    },
  });

  return Response.json({ project });
}

export async function POST(req: Request) {
  const student = await getAuthenticatedStudentForApi();
  if (!student) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const json = await req.json();
    const { title, description } = SubmitProposalSchema.parse(json);

    const existing = await prisma.fypProject.findUnique({
      where: { studentId: student.id },
    });

    if (existing && (existing.status === "approved" || existing.status === "completed")) {
      return Response.json({ error: "Cannot modify an approved or completed project" }, { status: 400 });
    }

    let project;
    if (existing) {
      project = await prisma.fypProject.update({
        where: { id: existing.id },
        data: {
          title,
          description,
          status: "submitted",
        },
      });
    } else {
      project = await prisma.fypProject.create({
        data: {
          title,
          description,
          studentId: student.id,
          status: "submitted",
        },
      });
    }

    return Response.json({ project });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldErrors = Object.values(error.flatten().fieldErrors)
        .flat()
        .filter(Boolean);
      return Response.json(
        { error: fieldErrors[0] || "Invalid data" },
        { status: 400 }
      );
    }
    return Response.json({ error: "Failed to submit proposal" }, { status: 500 });
  }
}
