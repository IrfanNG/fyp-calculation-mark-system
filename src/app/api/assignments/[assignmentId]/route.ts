import { z } from "zod";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName, parseSessionValue } from "@/lib/auth";

// Get assignment details with submissions (for lecturers)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const { assignmentId } = await params;
    const cookieStore = await cookies();
    const raw = cookieStore.get(getSessionCookieName())?.value;
    const session = parseSessionValue(raw);
    
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get assignment with submissions
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        courseClass: {
          include: {
            course: {
              include: {
                lecturers: session.lecturerId
                  ? { where: { lecturerId: session.lecturerId } }
                  : false,
              },
            },
            enrollments: {
              include: {
                student: {
                  select: {
                    id: true,
                    studentId: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        submissions: {
          include: {
            student: {
              select: {
                id: true,
                studentId: true,
                name: true,
              },
            },
          },
          orderBy: { submittedAt: "desc" },
        },
      },
    });

    if (!assignment) {
      return Response.json({ error: "Assignment not found" }, { status: 404 });
    }

    // Verify lecturer teaches this course (if lecturer)
    if (session.lecturerId) {
      const isTeaching = assignment.courseClass.course.lecturers.length > 0;
      if (!isTeaching) {
        return Response.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    return Response.json({ assignment });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

const GradeSchema = z.object({
  submissionId: z.string(),
  score: z.number().min(0),
});

// Grade a submission (for lecturers)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const { assignmentId } = await params;
    const cookieStore = await cookies();
    const raw = cookieStore.get(getSessionCookieName())?.value;
    const session = parseSessionValue(raw);
    
    if (!session || !session.lecturerId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const payload = GradeSchema.parse(json);

    // Verify assignment belongs to lecturer's course
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        courseClass: {
          include: {
            course: {
              include: {
                lecturers: {
                  where: { lecturerId: session.lecturerId },
                },
              },
            },
          },
        },
      },
    });

    if (!assignment || assignment.courseClass.course.lecturers.length === 0) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Update submission with score
    const submission = await prisma.assignmentSubmission.update({
      where: { id: payload.submissionId },
      data: {
        score: payload.score,
        gradedAt: new Date(),
      },
    });

    return Response.json({ submission });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.flatten() }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
