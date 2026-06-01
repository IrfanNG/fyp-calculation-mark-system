import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminForApi } from "@/lib/apiAuth";
import { computeFyp1, computeFyp2, gradeFromMark } from "@/lib/fypCalc";

const GenerateSchema = z.object({
  // Legacy weights — retained for backward compatibility when component marks are absent.
  supervisorWeight: z.number().min(0).max(100).default(40),
  assessorWeight: z.number().min(0).max(100).default(60),
  projectIds: z.array(z.string()).optional(),
  // FYP2 role-split weights (within presentation / report combine). Default 0.5.
  presentationSvWeight: z.number().min(0).max(1).optional(),
  reportSvWeight: z.number().min(0).max(1).optional(),
  // FYP2 only: whether progress contributes to final. Default false per spec.
  includeProgressInFinal: z.boolean().optional(),
});

const PublishSchema = z.object({
  projectIds: z.array(z.string()).optional(),
});

// GET: list all final marks
export async function GET() {
  const auth = await requireAdminForApi();
  if (auth.errorResponse) return auth.errorResponse;

  const marks = await prisma.finalMark.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      project: {
        include: {
          student: { select: { studentId: true, name: true } },
          supervisor: { select: { staffId: true, name: true } },
          supervisorMark: true,
          assessorMarks: {
            include: { assessor: { select: { staffId: true, name: true } } },
          },
          coordinatorMark: true,
        },
      },
    },
  });

  return Response.json({ marks });
}

// POST: generate final marks using the updated FYP1/FYP2 scheme.
// Falls back to a simple weighted SV/Assessor average when component marks are missing.
export async function POST(request: Request) {
  const auth = await requireAdminForApi();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const json = await request.json().catch(() => null);
    const payload = GenerateSchema.parse(json ?? {});

    const whereClause = payload.projectIds?.length
      ? { id: { in: payload.projectIds } }
      : {};

    const projects = await prisma.fypProject.findMany({
      where: whereClause,
      include: {
        supervisorMark: true,
        assessorMarks: true,
        coordinatorMark: true,
      },
    });

    const results: {
      projectId: string;
      phase: string;
      finalMark: number;
      grade: string;
      breakdown: {
        progressTotal: number;
        presentationTotal: number;
        reportTotal: number;
        paperTotal: number;
      };
    }[] = [];

    await prisma.$transaction(async (tx) => {
      for (const project of projects) {
        const sv = project.supervisorMark;
        const asrs = project.assessorMarks;
        const coord = project.coordinatorMark;

        // Nothing to grade on
        if (!sv && asrs.length === 0 && !coord) continue;

        const hasComponents =
          sv?.progressMark != null ||
          sv?.presentationMark != null ||
          sv?.reportMark != null ||
          sv?.paperMark != null ||
          asrs.some((a) => a.presentationMark != null || a.reportMark != null) ||
          coord?.progressMark != null;

        let final: number;
        let grade: string;
        let progressTotal: number | null = null;
        let presentationTotal: number | null = null;
        let reportTotal: number | null = null;
        let paperTotal: number | null = null;

        if (hasComponents) {
          if (project.phase === "FYP2") {
            const b = computeFyp2({
              svProgress: sv?.progressMark ?? undefined,
              svPresentation: sv?.presentationMark ?? undefined,
              svReport: sv?.reportMark ?? undefined,
              svPaper: sv?.paperMark ?? undefined,
              assessorPresentations: asrs
                .map((a) => a.presentationMark)
                .filter((n): n is number => n != null),
              assessorReports: asrs
                .map((a) => a.reportMark)
                .filter((n): n is number => n != null),
              coordinatorProgress: coord?.progressMark ?? undefined,
              presentationSvWeight: payload.presentationSvWeight,
              reportSvWeight: payload.reportSvWeight,
              includeProgressInFinal: payload.includeProgressInFinal,
            });
            final = b.final;
            progressTotal = b.progressTotal;
            presentationTotal = b.presentationTotal;
            reportTotal = b.reportTotal;
            paperTotal = b.paperTotal;
          } else {
            const b = computeFyp1({
              svProgress: sv?.progressMark ?? undefined,
              svPresentation: sv?.presentationMark ?? undefined,
              svReport: sv?.reportMark ?? undefined,
              assessorPresentations: asrs
                .map((a) => a.presentationMark)
                .filter((n): n is number => n != null),
              coordinatorProgress: coord?.progressMark ?? undefined,
            });
            final = b.final;
            progressTotal = b.progressTotal;
            presentationTotal = b.presentationTotal;
            reportTotal = b.reportTotal;
            paperTotal = b.paperTotal;
          }
          grade = gradeFromMark(final);
        } else {
          // Legacy fallback: simple weighted SV/Assessor average.
          const supWeight = payload.supervisorWeight / 100;
          const assWeight = payload.assessorWeight / 100;
          const supMark = sv?.mark ?? 0;
          const assMarksArr = asrs.map((m) => m.mark);
          const avgAssessor =
            assMarksArr.length > 0
              ? assMarksArr.reduce((a, b) => a + b, 0) / assMarksArr.length
              : 0;

          if (!sv) final = avgAssessor;
          else if (asrs.length === 0) final = supMark;
          else final = supMark * supWeight + avgAssessor * assWeight;

          final = Math.round(final * 100) / 100;
          grade = gradeFromMark(final);
        }

        await tx.finalMark.upsert({
          where: { projectId: project.id },
          create: {
            projectId: project.id,
            supervisorWeight: payload.supervisorWeight,
            assessorWeight: payload.assessorWeight,
            finalMark: final,
            grade,
            phase: project.phase,
            progressTotal,
            presentationTotal,
            reportTotal,
            paperTotal,
          },
          update: {
            supervisorWeight: payload.supervisorWeight,
            assessorWeight: payload.assessorWeight,
            finalMark: final,
            grade,
            phase: project.phase,
            progressTotal,
            presentationTotal,
            reportTotal,
            paperTotal,
            isPublished: false,
            publishedAt: null,
          },
        });

        results.push({
          projectId: project.id,
          phase: project.phase,
          finalMark: final,
          grade,
          breakdown: {
            progressTotal: progressTotal ?? 0,
            presentationTotal: presentationTotal ?? 0,
            reportTotal: reportTotal ?? 0,
            paperTotal: paperTotal ?? 0,
          },
        });
      }
    });

    return Response.json({ generated: results.length, results });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.flatten() }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 400 });
  }
}

// PATCH: publish results
export async function PATCH(request: Request) {
  const auth = await requireAdminForApi();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const json = await request.json().catch(() => null);
    const payload = PublishSchema.parse(json ?? {});

    const whereClause = payload.projectIds?.length
      ? { projectId: { in: payload.projectIds } }
      : {};

    const count = await prisma.finalMark.updateMany({
      where: whereClause,
      data: { isPublished: true, publishedAt: new Date() },
    });

    return Response.json({ published: count.count });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.flatten() }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 400 });
  }
}
