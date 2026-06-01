"use client";

import { useState } from "react";

export default function UploadSlidesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setSuccess(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "slides");

      const res = await fetch("/api/student/fyp/submit", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to upload");
        return;
      }
      setSuccess(`Slides uploaded successfully! Version ${data.submission.version}`);
      setFile(null);
      (e.target as HTMLFormElement).reset();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 max-w-xl">
      <div>
        <h1 className="text-xl font-semibold">Upload Presentation Slides</h1>
        <p className="text-sm text-(--unikl-muted)">Upload your FYP presentation slides. Accepted: PDF, PPT, PPTX.</p>
      </div>

      {success && (
        <div className="rounded-md bg-green-50 border border-green-200 p-4 text-sm text-green-800">
          ✓ {success}
        </div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Presentation File</label>
            <input
              type="file"
              accept=".pdf,.ppt,.pptx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-md border border-(--unikl-border) px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-(--unikl-blue) file:px-3 file:py-1 file:text-xs file:font-medium file:text-white"
              required
            />
            {file && (
              <p className="mt-1 text-xs text-(--unikl-muted)">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div className="rounded-md bg-(--unikl-bg) p-3 text-xs text-(--unikl-muted) space-y-1">
            <p>• Max file size: 20MB</p>
            <p>• Accepted formats: PDF, PPT, PPTX</p>
            <p>• Each upload creates a new version</p>
          </div>

          <button
            type="submit"
            disabled={loading || !file}
            className="w-full rounded-md bg-(--unikl-blue) px-4 py-2.5 text-sm font-medium text-white hover:bg-(--unikl-blue-2) disabled:opacity-50"
          >
            {loading ? "Uploading…" : "Upload Slides"}
          </button>
        </form>
      </div>
    </div>
  );
}
