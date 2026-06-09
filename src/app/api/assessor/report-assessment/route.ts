import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireLecturerForApi } from "@/lib/apiAuth";
import { upsertFinalMarkForProject } from "@/lib/fypFinalMark";

const AssessmentSchema = z.object({
  projectId: z.string().min(1),
  s1_bg: z.number().min(0).max(10),
  s1_problem: z.number().min(0).max(10),
  s1_significance: z.number().min(0).max(10),
  s1_objScope: z.number().min(0).max(10),
  s2_theory: z.number().min(0).max(10),
  s2_relevancy: z.number().min(0).max(10),
  s3_material: z.number().min(0).max(10),
  s3_analysis: z.number().min(0).max(10),
  s3_standard: z.number().min(0).max(10),
  s3_plan: z.number().min(0).max(10),
  s4_language: z.number().min(0).max(10),
  s5_abide: z.number().min(0).max(10),
  s5_org: z.number().min(0).max(10),
  comments: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  const auth = await requireLecturerForApi();
  if (auth.errorResponse) return auth.errorResponse;

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) return Response.json({ error: "Missing projectId" }, { status: 400 });

  try {
    const assessment = await prisma.fypReportAssessment.findUnique({
      where: {
        projectId_assessorId: {
          projectId,
          assessorId: auth.lecturer.id,
        },
      },
    });
    return Response.json({ assessment });
  } catch (err) {
    return Response.json({ assessment: null });
  }
}

export async function POST(request: Request) {
  const auth = await requireLecturerForApi();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const json = await request.json();
    const payload = AssessmentSchema.parse(json);

    // Weights from Excel (Report FYP1)
    const weights = {
      s1_1: 2, s1_2: 2, s1_3: 2, s1_4: 2, // Intro: 8
      s2_1: 5, s2_2: 5,                   // Lit: 10
      s3_1: 2, s3_2: 3, s3_3: 3, s3_4: 2, // Method: 10
      s4_1: 3,                            // Lang: 3
      s5_1: 2, s5_2: 2,                   // Format: 4
    };

    const weightedTotal =
      (payload.s1_bg / 10 * weights.s1_1) +
      (payload.s1_problem / 10 * weights.s1_2) +
      (payload.s1_significance / 10 * weights.s1_3) +
      (payload.s1_objScope / 10 * weights.s1_4) +
      (payload.s2_theory / 10 * weights.s2_1) +
      (payload.s2_relevancy / 10 * weights.s2_2) +
      (payload.s3_material / 10 * weights.s3_1) +
      (payload.s3_analysis / 10 * weights.s3_2) +
      (payload.s3_standard / 10 * weights.s3_3) +
      (payload.s3_plan / 10 * weights.s3_4) +
      (payload.s4_language / 10 * weights.s4_1) +
      (payload.s5_abide / 10 * weights.s5_1) +
      (payload.s5_org / 10 * weights.s5_2);

    const scaledMark = (weightedTotal / 35) * 100;

    const { projectId: _, ...dataOnly } = payload;
    const assessment = await prisma.fypReportAssessment.upsert({
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

    // Sync to AssessorMark
    const am = await prisma.assessorMark.findUnique({
      where: { projectId_assessorId: { projectId: payload.projectId, assessorId: auth.lecturer.id } }
    });

    const presMark = am?.presentationMark ?? 0;
    // Calculate aggregate mark: for Assessor in FYP1, it might be just Presentation or Report weighted.
    // Assuming same logic as supervisor marks sync if applicable.
    // Usually mark = presentationTotal * weight + reportTotal * weight.
    // For now keeping it simple: if both exist, average or similar.
    const finalMark = am?.presentationMark != null ? (presMark + scaledMark) / 2 : scaledMark;

    await prisma.assessorMark.upsert({
      where: {
        projectId_assessorId: {
          projectId: payload.projectId,
          assessorId: auth.lecturer.id,
        },
      },
      create: {
        projectId: payload.projectId,
        assessorId: auth.lecturer.id,
        mark: finalMark,
        reportMark: scaledMark,
      },
      update: {
        reportMark: scaledMark,
        mark: finalMark,
      },
    });

    const updatedFinalMark = await upsertFinalMarkForProject(payload.projectId);

    return Response.json({ assessment, finalMark: updatedFinalMark });
  } catch (err) {
    console.error("Assessor Report POST Error:", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
