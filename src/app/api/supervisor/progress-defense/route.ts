import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireLecturerForApi } from "@/lib/apiAuth";
import { upsertFinalMarkForProject } from "@/lib/fypFinalMark";

const AssessmentSchema = z.object({
  projectId: z.string().min(1),
  s1_consultation: z.number().min(0).max(10),
  s2_proposal: z.number().min(0).max(10),
  s3_research: z.number().min(0).max(10),
  s4_aim: z.number().min(0).max(10),
  s5_independency: z.number().min(0).max(10),
  comments: z.string().optional(),
});

export async function GET(request: Request) {
  const auth = await requireLecturerForApi();
  if (auth.errorResponse) return auth.errorResponse;

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) return Response.json({ error: "Missing projectId" }, { status: 400 });

  const assessment = await prisma.fypProgressDefenseAssessment.findUnique({
    where: {
      projectId_assessorId: {
        projectId,
        assessorId: auth.lecturer.id,
      },
    },
  });

  return Response.json({ assessment });
}

export async function POST(request: Request) {
  const auth = await requireLecturerForApi();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const json = await request.json();
    const payload = AssessmentSchema.parse(json);

    // Weights for Defense: 4, 4, 4, 4, 4 (Total 20)
    const weightedTotal =
      (payload.s1_consultation / 10 * 4) +
      (payload.s2_proposal / 10 * 4) +
      (payload.s3_research / 10 * 4) +
      (payload.s4_aim / 10 * 4) +
      (payload.s5_independency / 10 * 4);

    const assessment = await prisma.fypProgressDefenseAssessment.upsert({
      where: {
        projectId_assessorId: {
          projectId: payload.projectId,
          assessorId: auth.lecturer.id,
        },
      },
      create: {
        ...payload,
        assessorId: auth.lecturer.id,
        totalWeighted: weightedTotal,
      },
      update: {
        ...payload,
        totalWeighted: weightedTotal,
      },
    });

    // Update Overall Progress Mark (Average of Defense and Week 14)
    await syncOverallProgress(payload.projectId, auth.lecturer.id);
    const finalMark = await upsertFinalMarkForProject(payload.projectId);

    return Response.json({ assessment, finalMark });
  } catch (err) {
    if (err instanceof z.ZodError) return Response.json({ error: err.flatten() }, { status: 400 });
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

async function syncOverallProgress(projectId: string, lecturerId: string) {
  const [defense, week14] = await Promise.all([
    prisma.fypProgressDefenseAssessment.findUnique({
      where: { projectId_assessorId: { projectId, assessorId: lecturerId } }
    }),
    prisma.fypProgressWeek14Assessment.findUnique({
      where: { projectId_assessorId: { projectId, assessorId: lecturerId } }
    })
  ]);

  let totalPct = 0;
  let count = 0;

  if (defense) {
    totalPct += (defense.totalWeighted / 20) * 100;
    count++;
  }
  if (week14) {
    totalPct += (week14.totalWeighted / 21) * 100;
    count++;
  }

  if (count > 0) {
    const averagePct = totalPct / count;
    await prisma.supervisorMark.upsert({
      where: { projectId },
      create: {
        projectId,
        supervisorId: lecturerId,
        mark: averagePct,
        progressMark: averagePct,
      },
      update: {
        progressMark: averagePct,
      }
    });
  }
}
