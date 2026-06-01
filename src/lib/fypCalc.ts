// FYP mark calculation — implements the FYP1 and FYP2 marking scheme.
// All component inputs are on a 0–100 scale (i.e. percentage scored on that component).
// Returned totals are contributions expressed in final-mark points (summing toward 100).

export type Fyp1Inputs = {
  svProgress?: number;        // supervisor progress (0-100) -> contributes 20%
  svPresentation?: number;    // supervisor presentation (0-100) -> 40% of presentation component
  svReport?: number;          // supervisor report (0-100) -> contributes 25%
  assessorPresentations?: number[]; // assessor(s) presentation (0-100) -> 60% of presentation component
  coordinatorProgress?: number;     // coordinator progress (0-100) -> contributes 10%
};

export type Fyp2Inputs = {
  svProgress?: number;
  svPresentation?: number;
  svReport?: number;
  svPaper?: number;                 // paper (SV only) — tracked separately
  assessorPresentations?: number[];
  assessorReports?: number[];
  coordinatorProgress?: number;
  // Presentation and report role-split; default 50/50 if not provided.
  presentationSvWeight?: number;    // 0..1 weight applied to SV within presentation combine
  reportSvWeight?: number;          // 0..1 weight applied to SV within report combine
  includeProgressInFinal?: boolean; // default false per spec ("Presentation 50% + Report 50%")
};

export type FypBreakdown = {
  progressTotal: number;
  presentationTotal: number;
  reportTotal: number;
  paperTotal: number;
  final: number;
};

const avg = (xs?: number[]) =>
  xs && xs.length > 0 ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

const clampPct = (n: number | undefined) => {
  if (n === undefined || n === null || Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
};

// FYP1: Final = Progress(30) + Presentation(35) + Report(25)
//   Progress(30) = SV(20) + Coordinator(10)
//   Presentation raw = SV*0.4 + Assessor*0.6, scaled to 35 pts of final
//   Report(25) = SV report
export function computeFyp1(inputs: Fyp1Inputs): FypBreakdown {
  const svProgress = clampPct(inputs.svProgress);
  const coordProgress = clampPct(inputs.coordinatorProgress);
  const svPres = clampPct(inputs.svPresentation);
  const asrPres = clampPct(avg(inputs.assessorPresentations));
  const svReport = clampPct(inputs.svReport);

  const progressTotal = (svProgress / 100) * 20 + (coordProgress / 100) * 10;

  const presentationRaw = svPres * 0.4 + asrPres * 0.6; // 0..100
  const presentationTotal = (presentationRaw / 100) * 35;

  const reportTotal = (svReport / 100) * 25;

  const final = progressTotal + presentationTotal + reportTotal;

  return {
    progressTotal: round2(progressTotal),
    presentationTotal: round2(presentationTotal),
    reportTotal: round2(reportTotal),
    paperTotal: 0,
    final: round2(final),
  };
}

// FYP2: Final = Presentation(50) + Report(50)  (Progress tracked, Paper tracked, SV-only)
//   Presentation raw = SV*w + Assessor*(1-w), default w=0.5
//   Report raw       = SV*w + Assessor*(1-w), default w=0.5
export function computeFyp2(inputs: Fyp2Inputs): FypBreakdown {
  const pw = inputs.presentationSvWeight ?? 0.5;
  const rw = inputs.reportSvWeight ?? 0.5;

  const svProgress = clampPct(inputs.svProgress);
  const coordProgress = clampPct(inputs.coordinatorProgress);
  const progressTotal = (svProgress / 100) * 20 + (coordProgress / 100) * 10;

  const svPres = clampPct(inputs.svPresentation);
  const asrPres = clampPct(avg(inputs.assessorPresentations));
  const presentationRaw = svPres * pw + asrPres * (1 - pw);
  const presentationTotal = (presentationRaw / 100) * 50;

  const svReport = clampPct(inputs.svReport);
  const asrReport = clampPct(avg(inputs.assessorReports));
  const reportRaw = svReport * rw + asrReport * (1 - rw);
  const reportTotal = (reportRaw / 100) * 50;

  const paperTotal = clampPct(inputs.svPaper); // stored as 0-100; not weighted into final

  const final = inputs.includeProgressInFinal
    ? progressTotal + presentationTotal + reportTotal
    : presentationTotal + reportTotal;

  return {
    progressTotal: round2(progressTotal),
    presentationTotal: round2(presentationTotal),
    reportTotal: round2(reportTotal),
    paperTotal: round2(paperTotal),
    final: round2(final),
  };
}

export function gradeFromMark(mark: number): string {
  if (mark >= 90) return "A+";
  if (mark >= 80) return "A";
  if (mark >= 75) return "A-";
  if (mark >= 70) return "B+";
  if (mark >= 65) return "B";
  if (mark >= 60) return "B-";
  if (mark >= 55) return "C+";
  if (mark >= 50) return "C";
  if (mark >= 45) return "C-";
  if (mark >= 40) return "D";
  return "F";
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
