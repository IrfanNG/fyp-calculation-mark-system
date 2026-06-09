import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireLecturerForApi } from "@/lib/apiAuth";
import { upsertFinalMarkForProject } from "@/lib/fypFinalMark";

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
  comments: z.string().optional(),
});

export async function GET(request: Request) {
  const auth = await requireLecturerForApi();
  if (auth.errorResponse) return auth.errorResponse;

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) return Response.json({ error: "Missing projectId" }, { status: 400 });

  const assessment = await prisma.fypPresentationAssessment.findUnique({
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

    // Weights from Excel
    const weights = {
      s1_1: 1,
      s2_1: 2,
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

    // Final total is out of 35.
    // To sync with supervisorMark.presentationMark (which is 0-100),
    // we scale it: (weightedTotal / 35) * 100
    const scaledPresentationMark = (weightedTotal / 35) * 100;

    const assessment = await prisma.fypPresentationAssessment.upsert({
      where: {
        projectId_assessorId: {
          projectId: payload.projectId,
          assessorId: auth.lecturer.id,
        },
      },
      create: {
        projectId: payload.projectId,
        assessorId: auth.lecturer.id,
        ...payload,
        totalWeighted: weightedTotal,
      },
      update: {
        ...payload,
        totalWeighted: weightedTotal,
      },
    });

    // Sync to SupervisorMark
    await prisma.supervisorMark.upsert({
      where: { projectId: payload.projectId },
      create: {
        projectId: payload.projectId,
        supervisorId: auth.lecturer.id,
        mark: scaledPresentationMark, // legacy
        presentationMark: scaledPresentationMark,
      },
      update: {
        presentationMark: scaledPresentationMark,
      },
    });

    const finalMark = await upsertFinalMarkForProject(payload.projectId);

    return Response.json({ assessment, finalMark });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.flatten() }, { status: 400 });
    }
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
