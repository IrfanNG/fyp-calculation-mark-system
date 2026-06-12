import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getSessionCookieName, parseSessionValue } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const cookieStore = await cookies();
    const raw = cookieStore.get(getSessionCookieName())?.value;
    const session = parseSessionValue(raw);
    
    if (!session || !session.studentId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    const ext = file.name.split(".").pop();
    const filename = `upload_${crypto.randomUUID()}.${ext}`;

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public", "uploads");
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (err) {
      // Directory might already exist, ignore error
    }

    // Write file
    const filepath = join(uploadsDir, filename);
    await writeFile(filepath, buffer);

    // Return public URL
    const fileUrl = `/uploads/${filename}`;

    return Response.json({ fileUrl, filename: file.name });
  } catch (err) {
    console.error("Upload error:", err);
    const message = err instanceof Error ? err.message : "Upload failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
