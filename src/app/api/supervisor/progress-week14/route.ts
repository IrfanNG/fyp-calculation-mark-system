import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireLecturerForApi } from "@/lib/apiAuth";
import { upsertFinalMarkForProject } from "@/lib/fypFinalMark";

const AssessmentSchema = z.object({
  projectId: z.string().min(1),
  s1_consultation: z.number().min(0).max(10),
  s2_timelines: z.number().min(0).max(10),
  s3_components: z.number().min(0).max(10),
  s4_alignment: z.number().min(0).max(10),
  s5_independency: z.number().min(0).max(10),
  comments: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  const auth = await requireLecturerForApi();
  if (auth.errorResponse) return auth.errorResponse;

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) return Response.json({ error: "Missing projectId" }, { status: 400 });

  try {
    // Pastikan model fypProgressWeek14Assessment wujud dalam prisma object
    const assessment = await (prisma as any).fypProgressWeek14Assessment.findUnique({
      where: {
        projectId_assessorId: {
          projectId,
          assessorId: auth.lecturer.id,
        },
      },
    });
    return Response.json({ assessment });
  } catch (err) {
    console.error("GET Week 14 Error:", err);
    return Response.json({ assessment: null });
  }
}

export async function POST(request: Request) {
  const auth = await requireLecturerForApi();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const json = await request.json();
    const payload = AssessmentSchema.parse(json);

    // 1. Verify project exists
    const project = await prisma.fypProject.findUnique({
      where: { id: payload.projectId },
      select: { id: true, supervisorId: true }
    });

    if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

    // 2. Calculate Weighted Total (All weights are 4 -> Total 20)
    const weightedTotal =
      (payload.s1_consultation / 10 * 4) +
      (payload.s2_timelines / 10 * 4) +
      (payload.s3_components / 10 * 4) +
      (payload.s4_alignment / 10 * 4) +
      (payload.s5_independency / 10 * 4);

    // 3. Save the assessment
    const { projectId: _, ...dataOnly } = payload;

    // Gunakan (prisma as any) buat sementara jika TypeScript masih complain,
    // tetapi npx prisma generate adalah penyelesaian sebenar.
    const assessment = await (prisma as any).fypProgressWeek14Assessment.upsert({
      where: {
        projectId_assessorId: {
          projectId: payload.projectId,
          assessorId: auth.lecturer.id,
        },
      },
      create: {
        projectId: payload.projectId,
        assessorId: auth.lecturer.id,
        ...dataOnly,
        totalWeighted: weightedTotal,
      },
      update: {
        ...dataOnly,
        totalWeighted: weightedTotal,
      },
    });

    // 4. Sync Overall Progress
    try {
      await syncOverallProgress(payload.projectId, auth.lecturer.id, project.supervisorId);
      await upsertFinalMarkForProject(payload.projectId);
    } catch (syncErr) {
      console.error("Progress Week 14 Sync Mark Error (non-fatal):", syncErr);
    }

    return Response.json({ assessment });
  } catch (err) {
    console.error("POST Progress Week 14 Error:", err);
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Invalid data format", details: err.flatten() }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return Response.json({ error: message }, { status: 500 });
  }
}

async function syncOverallProgress(projectId: string, lecturerId: string, assignedSupervisorId: string | null) {
  const [defense, week14] = await Promise.all([
    (prisma as any).fypProgressDefenseAssessment.findUnique({
      where: { projectId_assessorId: { projectId, assessorId: lecturerId } }
    }),
    (prisma as any).fypProgressWeek14Assessment.findUnique({
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
    totalPct += (week14.totalWeighted / 20) * 100;
    count++;
  }

  if (count > 0) {
    const averagePct = totalPct / count;
    const finalSupervisorId = assignedSupervisorId || lecturerId;

    await prisma.supervisorMark.upsert({
      where: { projectId },
      create: {
        projectId,
        supervisorId: finalSupervisorId,
        mark: averagePct,
        progressMark: averagePct,
      },
      update: {
        progressMark: averagePct,
      }
    });
  }
}
