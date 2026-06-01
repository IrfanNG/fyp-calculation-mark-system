import { PDFParse } from "pdf-parse";
import { extractCourseFromText } from "@/lib/aiExtract";

export const runtime = "nodejs";

// Next.js (Turbopack) bundles `pdfjs-dist` and its default worker path becomes relative
// to the compiled chunk in `.next/`, which doesn't contain `pdf.worker.mjs`.
// Point the workerSrc to a real module in node_modules so fake-worker setup can import it.
PDFParse.setWorker("pdfjs-dist/legacy/build/pdf.worker.mjs");

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    let text = "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      const pasted = form.get("text");

      if (typeof pasted === "string" && pasted.trim().length > 0) {
        text = pasted;
      }

      if (file instanceof Blob) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Only PDF is supported for upload in this endpoint
        const parser = new PDFParse({ data: buffer, disableWorker: true } as unknown as {
          data: Buffer;
          disableWorker: boolean;
        });
        const parsed = await parser.getText();
        await parser.destroy();
        const pdfText = parsed.text ?? "";

        text = [text, pdfText].filter(Boolean).join("\n\n");
      }
    } else {
      const body = (await request.json().catch(() => ({}))) as { text?: string };
      text = body.text ?? "";
    }

    if (!text || text.trim().length < 10) {
      return Response.json(
        { error: "No content provided. Upload a CLP PDF or paste CLO/assessment text." },
        { status: 400 }
      );
    }

    const extracted = extractCourseFromText(text);

    return Response.json(extracted);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
