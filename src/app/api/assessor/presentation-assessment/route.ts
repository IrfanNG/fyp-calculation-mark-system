import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireLecturerForApi } from "@/lib/apiAuth";

const AssessmentSchema = z.object({
  projectId: z.string().min(1),
  s1_introClarity: z.number().min(0).max(10),
  s2_objClarity: z.number().min(0).max(10),
  s3_contOriginality: z.number().min(0).max(10),
  s3_contStructure: z.number().min(0).max(10),
  s3_contAppropriate: z.number().min(0).max(10),
  s3_contBackground: z.number().min(0).max(10),
  s3_contMethod: z.number().min(0).max(10),
  s3_contDiagrams: z.number().min(0).max(10),
  s4_protoCreativity: z.number().min(0).max(10),
  s4_protoDifficulty: z.number().min(0).max(10),
  s5_qaAbility: z.number().min(0).max(10),
  s5_qaUnderstanding: z.number().min(0).max(10),
  s5_qaInterpersonal: z.number().min(0).max(10),
  s6_mediaSuitability: z.number().min(0).max(10),
  s6_mediaSlides: z.number().min(0).max(10),
  s7_skillsAttire: z.number().min(0).max(10),
  s7_skillsOrg: z.number().min(0).max(10),
  comments: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  const auth = await requireLecturerForApi();
  if (auth.errorResponse) return auth.errorResponse;

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) return Response.json({ error: "Missing projectId" }, { status: 400 });

  try {
    const assessment = await (prisma as any).fypPresentationAssessment.findUnique({
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

    // Weights from Excel (Total 35)
    const weights = {
      s1_1: 1, s2_1: 2,
      s3_1: 2, s3_2: 3, s3_3: 2, s3_4: 3, s3_5: 3, s3_6: 2,
      s4_1: 2, s4_2: 3,
      s5_1: 2, s5_2: 2, s5_3: 2,
      s6_1: 1, s6_2: 2,
      s7_1: 2, s7_2: 1
    };

    const weightedTotal =
      (payload.s1_introClarity / 10 * weights.s1_1) +
      (payload.s2_objClarity / 10 * weights.s2_1) +
      (payload.s3_contOriginality / 10 * weights.s3_1) +
      (payload.s3_contStructure / 10 * weights.s3_2) +
      (payload.s3_contAppropriate / 10 * weights.s3_3) +
      (payload.s3_contBackground / 10 * weights.s3_4) +
      (payload.s3_contMethod / 10 * weights.s3_5) +
      (payload.s3_contDiagrams / 10 * weights.s3_6) +
      (payload.s4_protoCreativity / 10 * weights.s4_1) +
      (payload.s4_protoDifficulty / 10 * weights.s4_2) +
      (payload.s5_qaAbility / 10 * weights.s5_1) +
      (payload.s5_qaUnderstanding / 10 * weights.s5_2) +
      (payload.s5_qaInterpersonal / 10 * weights.s5_3) +
      (payload.s6_mediaSuitability / 10 * weights.s6_1) +
      (payload.s6_mediaSlides / 10 * weights.s6_2) +
      (payload.s7_skillsAttire / 10 * weights.s7_1) +
      (payload.s7_skillsOrg / 10 * weights.s7_2);

    const scaledMark = (weightedTotal / 35) * 100;

    const { projectId: _, ...dataOnly } = payload;
    const assessment = await (prisma as any).fypPresentationAssessment.upsert({
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
        mark: scaledMark,
        presentationMark: scaledMark,
      },
      update: {
        presentationMark: scaledMark,
        // Mark is usually an aggregate, here we set it to presentation for FYP1
        mark: scaledMark,
      },
    });

    return Response.json({ assessment });
  } catch (err) {
    console.error("Assessor Presentation POST Error:", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
