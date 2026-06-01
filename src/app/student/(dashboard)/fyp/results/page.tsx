import { requireStudent } from "@/lib/requireAuthStudent";
import { prisma } from "@/lib/prisma";

function getGradeColor(grade: string) {
  if (grade.startsWith("A")) return "text-green-600 bg-green-50 border-green-200";
  if (grade.startsWith("B")) return "text-blue-600 bg-blue-50 border-blue-200";
  if (grade.startsWith("C")) return "text-yellow-600 bg-yellow-50 border-yellow-200";
  if (grade === "D") return "text-orange-600 bg-orange-50 border-orange-200";
  return "text-red-600 bg-red-50 border-red-200";
}

export default async function ResultsPage() {
  const student = await requireStudent();

  const project = await prisma.fypProject.findUnique({
    where: { studentId: student.id },
    include: {
      finalMark: true,
      supervisorMark: true,
      assessorMarks: true,
    },
  });

  if (!project) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Assessment Result</h1>
        <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-8 text-center text-(--unikl-muted)">
          No FYP project assigned yet.
        </div>
      </div>
    );
  }

  if (!project.finalMark || !project.finalMark.isPublished) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Assessment Result</h1>
        <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-8 text-center">
          <div className="text-4xl mb-3">🔒</div>
          <p className="font-medium">Results Not Yet Published</p>
          <p className="text-sm text-(--unikl-muted) mt-1">Your FYP assessment results have not been released yet. Please check back later.</p>
        </div>
      </div>
    );
  }

  const fm = project.finalMark;
  const gradeClass = getGradeColor(fm.grade ?? "F");

  const avgAssessor =
    project.assessorMarks.length > 0
      ? (project.assessorMarks.reduce((s, m) => s + m.mark, 0) / project.assessorMarks.length).toFixed(1)
      : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Assessment Result</h1>
        <p className="text-sm text-(--unikl-muted)">{project.title}</p>
      </div>

      {/* Grade card */}
      <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-6 flex flex-col items-center gap-2">
        <p className="text-sm text-(--unikl-muted)">Final Grade</p>
        <span className={`rounded-xl border-2 px-8 py-3 text-5xl font-bold ${gradeClass}`}>
          {fm.grade ?? "—"}
        </span>
        <p className="text-2xl font-semibold mt-1">{fm.finalMark.toFixed(1)} / 100</p>
      </div>

      {/* Breakdown */}
      <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-4 space-y-3">
        <h2 className="font-semibold text-sm">Mark Breakdown</h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-(--unikl-bg) p-3">
            <p className="text-xs text-(--unikl-muted)">Supervisor Mark</p>
            <p className="text-xl font-bold">{project.supervisorMark?.mark.toFixed(1) ?? "—"}</p>
            <p className="text-xs text-(--unikl-muted)">{fm.supervisorWeight}% weight</p>
          </div>
          <div className="rounded-lg bg-(--unikl-bg) p-3">
            <p className="text-xs text-(--unikl-muted)">Assessor Mark (avg)</p>
            <p className="text-xl font-bold">{avgAssessor ?? "—"}</p>
            <p className="text-xs text-(--unikl-muted)">{fm.assessorWeight}% weight</p>
          </div>
        </div>

        <div className="text-xs text-(--unikl-muted) border-t border-(--unikl-border) pt-2">
          Formula: ({project.supervisorMark?.mark.toFixed(1) ?? "—"} × {fm.supervisorWeight}%) + ({avgAssessor ?? "—"} × {fm.assessorWeight}%) = <span className="font-semibold">{fm.finalMark.toFixed(1)}</span>
        </div>
      </div>

      {project.assessorMarks.length > 0 && (
        <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-4">
          <h2 className="font-semibold text-sm mb-2">Individual Assessor Marks</h2>
          <ul className="space-y-1">
            {project.assessorMarks.map((am, i) => (
              <li key={am.id} className="flex justify-between text-sm">
                <span className="text-(--unikl-muted)">Assessor {i + 1}</span>
                <span className="font-medium">{am.mark.toFixed(1)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
