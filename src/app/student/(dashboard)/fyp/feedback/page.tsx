import { requireStudent } from "@/lib/requireAuthStudent";
import { prisma } from "@/lib/prisma";

export default async function FeedbackPage() {
  const student = await requireStudent();

  const project = await prisma.fypProject.findUnique({
    where: { studentId: student.id },
    include: {
      feedbacks: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { name: true, staffId: true, role: true } } },
      },
    },
  });

  if (!project) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Feedback</h1>
        <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-8 text-center text-(--unikl-muted)">
          No FYP project assigned yet.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Feedback</h1>
        <p className="text-sm text-(--unikl-muted)">{project.feedbacks.length} feedback(s) received for "{project.title}"</p>
      </div>

      {project.feedbacks.length === 0 ? (
        <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-8 text-center text-(--unikl-muted)">
          No feedback received yet. Your supervisor or assessors will leave feedback here.
        </div>
      ) : (
        <div className="space-y-3">
          {project.feedbacks.map((f) => (
            <div key={f.id} className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{f.author.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${f.author.role === "assessor" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                    {f.author.role === "assessor" ? "Assessor" : "Supervisor"}
                  </span>
                </div>
                <span className="text-xs text-(--unikl-muted)">
                  {new Date(f.createdAt).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </div>
              <p className="text-sm leading-relaxed">{f.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
