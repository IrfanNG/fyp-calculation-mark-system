export type GpaScaleRow = {
  minMark: number;
  maxMark: number;
  grade: string;
  gpa: number;
};

export const defaultGpaScale: GpaScaleRow[] = [
  { minMark: 90, maxMark: 100, grade: "A+", gpa: 4.0 },
  { minMark: 80, maxMark: 89, grade: "A", gpa: 4.0 },
  { minMark: 75, maxMark: 79, grade: "A-", gpa: 3.67 },
  { minMark: 70, maxMark: 74, grade: "B+", gpa: 3.33 },
  { minMark: 65, maxMark: 69, grade: "B", gpa: 3.0 },
  { minMark: 60, maxMark: 64, grade: "B-", gpa: 2.67 },
  { minMark: 55, maxMark: 59, grade: "C+", gpa: 2.33 },
  { minMark: 50, maxMark: 54, grade: "C", gpa: 2.0 },
  { minMark: 0, maxMark: 49, grade: "F", gpa: 0.0 },
];

export function clampMark(mark: number): number {
  if (!Number.isFinite(mark)) return 0;
  if (mark < 0) return 0;
  if (mark > 100) return 100;
  return mark;
}

export function getGradeAndGpa(totalMarkOutOf100: number, scale: GpaScaleRow[]) {
  const mark = clampMark(totalMarkOutOf100);
  const row = scale.find((r) => mark >= r.minMark && mark <= r.maxMark);
  if (!row) {
    return { grade: "N/A", gpa: 0 };
  }
  return { grade: row.grade, gpa: row.gpa };
}
