import { z } from "zod";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedStudentForApi } from "@/lib/requireAuthStudent";

const ALLOWED_TYPES = ["report", "slides"] as const;

export async function POST(request: Request) {
  const student = await getAuthenticatedStudentForApi();
  if (!student) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null;

    if (!file) return Response.json({ error: "No file provided" }, { status: 400 });
    if (!type || !ALLOWED_TYPES.includes(type as (typeof ALLOWED_TYPES)[number])) {
      return Response.json({ error: "type must be 'report' or 'slides'" }, { status: 400 });
    }

    // Max 20MB
    if (file.size > 20 * 1024 * 1024) {
      return Response.json({ error: "File exceeds 20MB limit" }, { status: 400 });
    }

    const project = await prisma.fypProject.findUnique({ where: { studentId: student.id } });
    if (!project) return Response.json({ error: "No FYP project assigned" }, { status: 404 });

    const ext = file.name.split(".").pop();
    const filename = `fyp_${type}_${crypto.randomUUID()}.${ext}`;

    const uploadsDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });
    await writeFile(join(uploadsDir, filename), Buffer.from(await file.arrayBuffer()));

    // Count existing versions of this type
    const existingCount = await prisma.fypSubmission.count({
      where: { projectId: project.id, type },
    });

    const submission = await prisma.fypSubmission.create({
      data: {
        projectId: project.id,
        type,
        fileUrl: `/uploads/${filename}`,
        fileName: file.name,
        fileSize: file.size,
        version: existingCount + 1,
      },
    });

    // Update project status to submitted
    if (project.status === "draft" || project.status === "rejected") {
      await prisma.fypProject.update({
        where: { id: project.id },
        data: { status: "submitted" },
      });
    }

    return Response.json({ submission }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
