import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

const BootstrapSchema = z.object({
  secret: z.string(),
  staffId: z.string().min(1),
  name: z.string().min(1),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const payload = BootstrapSchema.parse(json);

    // Check if admin already exists
    const existingAdmin = await prisma.lecturer.findFirst({ where: { isAdmin: true } });
    if (existingAdmin) {
      return Response.json({ error: "Admin already exists" }, { status: 400 });
    }

    // Verify secret from environment
    const expectedSecret = process.env.BOOTSTRAP_SECRET || "unikl-bootstrap-2026";
    if (payload.secret !== expectedSecret) {
      return Response.json({ error: "Invalid secret" }, { status: 403 });
    }

    // Check for duplicate staffId
    const duplicate = await prisma.lecturer.findUnique({ where: { staffId: payload.staffId } });
    if (duplicate) {
      return Response.json({ error: "Staff ID already exists" }, { status: 400 });
    }

    // Create first admin
    const passwordHash = await hashPassword(payload.password);
    const admin = await prisma.lecturer.create({
      data: {
        staffId: payload.staffId,
        name: payload.name,
        passwordHash,
        isAdmin: true,
      },
    });

    return Response.json({ ok: true, adminId: admin.id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.flatten() }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
