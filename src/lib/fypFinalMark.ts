import { prisma } from "@/lib/prisma";
import { computeFyp1, computeFyp2, gradeFromMark } from "@/lib/fypCalc";

type PrismaLike = typeof prisma;

export async function upsertFinalMarkForProject(projectId: string, db: PrismaLike = prisma) {
  const project = await db.fypProject.findUnique({
    where: { id: projectId },
    include: {
      supervisorMark: true,
      assessorMarks: true,
      coordinatorMark: true,
    },
  });

  if (!project) return null;

  const sv = project.supervisorMark;
  const asrs = project.assessorMarks;
  const coord = project.coordinatorMark;

  if (!sv && asrs.length === 0 && !coord) return null;

  const hasComponents =
    sv?.progressMark != null ||
    sv?.presentationMark != null ||
    sv?.reportMark != null ||
    sv?.paperMark != null ||
    asrs.some((a) => a.presentationMark != null || a.reportMark != null) ||
    coord?.progressMark != null;

  let final: number;
  let progressTotal: number | null = null;
  let presentationTotal: number | null = null;
  let reportTotal: number | null = null;
  let paperTotal: number | null = null;

  if (hasComponents) {
    if (project.phase === "FYP2") {
      const breakdown = computeFyp2({
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
      });
      final = breakdown.final;
      progressTotal = breakdown.progressTotal;
      presentationTotal = breakdown.presentationTotal;
      reportTotal = breakdown.reportTotal;
      paperTotal = breakdown.paperTotal;
    } else {
      const breakdown = computeFyp1({
        svProgress: sv?.progressMark ?? undefined,
        svPresentation: sv?.presentationMark ?? undefined,
        svReport: sv?.reportMark ?? undefined,
        assessorPresentations: asrs
          .map((a) => a.presentationMark)
          .filter((n): n is number => n != null),
        coordinatorProgress: coord?.progressMark ?? undefined,
      });
      final = breakdown.final;
      progressTotal = breakdown.progressTotal;
      presentationTotal = breakdown.presentationTotal;
      reportTotal = breakdown.reportTotal;
      paperTotal = breakdown.paperTotal;
    }
  } else {
    const supWeight = 0.4;
    const assWeight = 0.6;
    const supMark = sv?.mark ?? 0;
    const assMarks = asrs.map((m) => m.mark);
    const avgAssessor = assMarks.length > 0 ? assMarks.reduce((a, b) => a + b, 0) / assMarks.length : 0;

    if (!sv) final = avgAssessor;
    else if (asrs.length === 0) final = supMark;
    else final = supMark * supWeight + avgAssessor * assWeight;

    final = Math.round(final * 100) / 100;
  }

  const grade = gradeFromMark(final);

  return db.finalMark.upsert({
    where: { projectId },
    create: {
      projectId,
      supervisorWeight: 40,
      assessorWeight: 60,
      finalMark: final,
      grade,
      phase: project.phase,
      progressTotal,
      presentationTotal,
      reportTotal,
      paperTotal,
    },
    update: {
      supervisorWeight: 40,
      assessorWeight: 60,
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
}
