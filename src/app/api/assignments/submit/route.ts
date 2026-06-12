import { z } from "zod";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName, parseSessionValue } from "@/lib/auth";

const SubmitSchema = z.object({
  assignmentId: z.string(),
  comment: z.string().optional(),
  fileUrl: z.string().optional(),
});

// Submit or update submission
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(getSessionCookieName())?.value;
    const session = parseSessionValue(raw);
    
    if (!session || !session.studentId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const payload = SubmitSchema.parse(json);
    
    // Check if assignment exists
    const assignment = await prisma.assignment.findUnique({
      where: { id: payload.assignmentId },
      include: {
        courseClass: true,
      },
    });

    if (!assignment) {
      return Response.json({ error: "Assignment not found" }, { status: 404 });
    }

    // Check if student is enrolled in this class
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        studentId: session.studentId,
        courseClassId: assignment.courseClassId,
      },
    });

    if (!enrollment) {
      return Response.json(
        { error: "You are not enrolled in this class" },
        { status: 403 }
      );
    }

    // Check if submission already exists
    const existing = await prisma.assignmentSubmission.findUnique({
      where: {
        assignmentId_studentId: {
          assignmentId: payload.assignmentId,
          studentId: session.studentId,
        },
      },
    });

    if (existing) {
      // Update existing submission
      const updated = await prisma.assignmentSubmission.update({
        where: { id: existing.id },
        data: {
          comment: payload.comment || null,
          fileUrl: payload.fileUrl || null,
          submittedAt: new Date(),
        },
      });
      return Response.json({ submission: updated });
    } else {
      // Create new submission
      const submission = await prisma.assignmentSubmission.create({
        data: {
          assignmentId: payload.assignmentId,
          studentId: session.studentId,
          comment: payload.comment || null,
          fileUrl: payload.fileUrl || null,
        },
      });
      return Response.json({ submission }, { status: 201 });
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.flatten() }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
