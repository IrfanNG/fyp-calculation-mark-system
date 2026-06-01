import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { defaultGpaScale } from "@/lib/gpa";
import { requireAdminForApi } from "@/lib/apiAuth";

const RowSchema = z.object({
  minMark: z.number().int().min(0).max(100),
  maxMark: z.number().int().min(0).max(100),
  grade: z.string().min(1),
  gpa: z.number().min(0).max(4.0),
});

const SaveSchema = z
  .object({ rows: z.array(RowSchema).min(1) })
  .superRefine((val, ctx) => {
    for (const [idx, r] of val.rows.entries()) {
      if (r.minMark > r.maxMark) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "minMark must be <= maxMark",
          path: ["rows", idx],
        });
      }
    }
  });

export async function GET() {
  const { errorResponse } = await requireAdminForApi();
  if (errorResponse) return errorResponse;

  const rows = await prisma.gpaScale.findMany({ orderBy: { minMark: "desc" } });
  if (rows.length === 0) {
    return Response.json({ rows: defaultGpaScale });
  }
  return Response.json({
    rows: rows.map((r) => ({
      minMark: r.minMark,
      maxMark: r.maxMark,
      grade: r.grade,
      gpa: r.gpa,
    })),
  });
}

export async function PUT(request: Request) {
  try {
    const { errorResponse } = await requireAdminForApi();
    if (errorResponse) return errorResponse;

    const json = await request.json();
    const payload = SaveSchema.parse(json);

    await prisma.$transaction(async (tx) => {
      await tx.gpaScale.deleteMany({});
      await tx.gpaScale.createMany({ data: payload.rows });
    });

    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.flatten() }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
