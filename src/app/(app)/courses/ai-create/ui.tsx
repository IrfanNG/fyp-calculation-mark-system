"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CloDraft = { code: string; description?: string | null };

type AssessmentDraft = {
  name: string;
  weightage: number;
  fullMark?: number | null;
  cloCodes: string[];
};

type ExtractedDraft = {
  code?: string | null;
  name?: string | null;
  semester?: string | null;
  year?: number | null;
  clos: CloDraft[];
  assessments: AssessmentDraft[];
  confidence: number;
  warnings: string[];
};

function normalizeCloCode(code: string) {
  const trimmed = code.trim().toUpperCase();
  const m = trimmed.match(/CLO\s*(\d+)/);
  if (m) return `CLO${m[1]}`;
  return trimmed;
}

export default function AiCreateCourseClient() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<ExtractedDraft | null>(null);

  const cloCodes = useMemo(
    () => (draft?.clos ?? []).map((c) => normalizeCloCode(c.code)).filter(Boolean),
    [draft]
  );

  const validation = useMemo(() => {
    if (!draft) return { ok: false, errors: ["No draft yet."] as string[] };

    const errors: string[] = [];
    if (!draft.code || draft.code.trim().length === 0) errors.push("Course code is required.");
    if (!draft.name || draft.name.trim().length === 0) errors.push("Course name is required.");

    if (!draft.clos || draft.clos.length === 0) errors.push("At least one CLO is required.");

    const sum = (draft.assessments ?? []).reduce((s, a) => s + (Number.isFinite(a.weightage) ? a.weightage : 0), 0);
    if (sum !== 100) errors.push(`Total assessment weightage must equal 100% (got ${sum}%).`);

    const missingMapping = (draft.assessments ?? []).filter((a) => (a.cloCodes ?? []).length === 0);
    if (missingMapping.length > 0) errors.push("Each assessment must be linked to at least one CLO.");

    const invalidWeights = (draft.assessments ?? []).some(
      (a) => !Number.isFinite(a.weightage) || a.weightage <= 0 || a.weightage > 100
    );
    if (invalidWeights) errors.push("Each assessment weightage must be between 1 and 100.");

    return { ok: errors.length === 0, errors };
  }, [draft]);

  async function onAnalyze() {
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      if (file) form.set("file", file);
      if (text.trim()) form.set("text", text);

      const res = await fetch("/api/ai/extract-course", {
        method: "POST",
        body: form,
      });
      const json = (await res.json()) as ExtractedDraft & { error?: unknown };
      if (!res.ok) {
        const msg = typeof json?.error === "string" ? json.error : "Failed to analyze.";
        throw new Error(msg);
      }

      const normalized: ExtractedDraft = {
        ...json,
        code: json.code ?? "",
        name: json.name ?? "",
        semester: json.semester ?? "",
        year: json.year ?? undefined,
        clos: (json.clos ?? []).map((c) => ({ ...c, code: normalizeCloCode(c.code) })),
        assessments: (json.assessments ?? []).map((a) => ({
          ...a,
          name: a.name ?? "Assessment",
          weightage: Number(a.weightage ?? 0),
          fullMark: a.fullMark ?? a.weightage,
          cloCodes: (a.cloCodes ?? []).map(normalizeCloCode),
        })),
      };

      setDraft(normalized);
    } catch (e) {
      setDraft(null);
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function onSave() {
    if (!draft) return;
    setLoading(true);
    setError(null);
    try {
      const payload = {
        code: draft.code?.trim(),
        name: draft.name?.trim(),
        semester: draft.semester?.trim() || null,
        year: draft.year ?? null,
        clos: draft.clos.map((c) => ({
          code: normalizeCloCode(c.code),
          description: c.description?.toString().trim() || null,
        })),
        assessments: draft.assessments.map((a) => ({
          name: a.name.trim(),
          weightage: Number(a.weightage),
          fullMark: a.fullMark ?? null,
          cloCodes: a.cloCodes.map(normalizeCloCode),
        })),
      };

      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { courseId?: string; error?: unknown };
      if (!res.ok) {
        const msg = typeof json?.error === "string" ? json.error : "Failed to save course.";
        throw new Error(msg);
      }

      if (!json.courseId) throw new Error("Missing courseId");
      router.push(`/courses/${json.courseId}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {!draft ? (
        <div className="space-y-3 rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Upload CLP PDF</label>
              <input
                type="file"
                accept="application/pdf"
                className="block w-full rounded-md border border-(--unikl-border) bg-white p-2 text-sm"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-(--unikl-muted)">Optional. You can also paste text instead.</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Paste CLO / assessment text</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                className="block w-full rounded-md border border-(--unikl-border) bg-white p-2 text-sm"
                placeholder={`Example:\nTest (CLO1) - 20%\nLab Exercise (CLO2) - 20%\nHands-on Test (CLO3) - 40%\nGroup Project (CLO1) - 20%`}
              />
            </div>
          </div>

          {error ? <div className="text-sm text-red-700">{error}</div> : null}

          <button
            type="button"
            onClick={onAnalyze}
            disabled={loading}
            className="rounded-md bg-(--unikl-blue) px-3 py-2 text-sm font-medium text-white hover:bg-(--unikl-blue-2) disabled:opacity-60"
          >
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-medium">Preview</div>
                <div className="text-xs text-(--unikl-muted)">Edit anything before saving.</div>
              </div>
              <div className="text-xs text-(--unikl-muted)">Confidence: {Math.round(draft.confidence * 100)}%</div>
            </div>

            {(draft.confidence < 0.7 || (draft.warnings ?? []).length > 0) && (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <div className="font-medium">Please confirm detected items</div>
                <ul className="mt-1 list-disc pl-5">
                  {(draft.warnings ?? ["Low confidence extraction."]).map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Course Code</label>
                <input
                  value={draft.code ?? ""}
                  onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                  className="w-full rounded-md border border-(--unikl-border) p-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Course Name</label>
                <input
                  value={draft.name ?? ""}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="w-full rounded-md border border-(--unikl-border) p-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Semester</label>
                <input
                  value={draft.semester ?? ""}
                  onChange={(e) => setDraft({ ...draft, semester: e.target.value })}
                  className="w-full rounded-md border border-(--unikl-border) p-2 text-sm"
                  placeholder="e.g. Semester 1"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Year</label>
                <input
                  value={draft.year ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, year: e.target.value ? Number(e.target.value) : undefined })
                  }
                  className="w-full rounded-md border border-(--unikl-border) p-2 text-sm"
                  inputMode="numeric"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">CLOs</div>
              <button
                type="button"
                className="text-sm underline-offset-4 hover:underline"
                onClick={() =>
                  setDraft({
                    ...draft,
                    clos: [...draft.clos, { code: `CLO${draft.clos.length + 1}`, description: "" }],
                  })
                }
              >
                Add CLO
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {draft.clos.map((c, idx) => (
                <div key={idx} className="grid gap-2 md:grid-cols-[160px_1fr_80px]">
                  <input
                    value={c.code}
                    onChange={(e) => {
                      const next = [...draft.clos];
                      next[idx] = { ...next[idx], code: e.target.value };
                      setDraft({ ...draft, clos: next });
                    }}
                    className="rounded-md border border-(--unikl-border) p-2 text-sm"
                  />
                  <input
                    value={c.description ?? ""}
                    onChange={(e) => {
                      const next = [...draft.clos];
                      next[idx] = { ...next[idx], description: e.target.value };
                      setDraft({ ...draft, clos: next });
                    }}
                    className="rounded-md border border-(--unikl-border) p-2 text-sm"
                    placeholder="Description (optional)"
                  />
                  <button
                    type="button"
                    className="rounded-md border border-(--unikl-border) px-2 py-2 text-sm hover:bg-(--unikl-bg)"
                    onClick={() => {
                      const next = draft.clos.filter((_, i) => i !== idx);
                      setDraft({ ...draft, clos: next });
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Assessments</div>
              <button
                type="button"
                className="text-sm underline-offset-4 hover:underline"
                onClick={() =>
                  setDraft({
                    ...draft,
                    assessments: [
                      ...draft.assessments,
                      { name: "Assessment", weightage: 0, fullMark: null, cloCodes: [] },
                    ],
                  })
                }
              >
                Add Assessment
              </button>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-(--unikl-bg) text-(--unikl-muted)">
                  <tr>
                    <th className="px-3 py-2 font-medium">Assessment</th>
                    <th className="px-3 py-2 font-medium">Weightage (%)</th>
                    <th className="px-3 py-2 font-medium">Full Mark</th>
                    <th className="px-3 py-2 font-medium">CLO Mapping</th>
                    <th className="px-3 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {draft.assessments.map((a, idx) => (
                    <tr key={idx} className="border-t border-(--unikl-border) align-top">
                      <td className="px-3 py-2">
                        <input
                          value={a.name}
                          onChange={(e) => {
                            const next = [...draft.assessments];
                            next[idx] = { ...next[idx], name: e.target.value };
                            setDraft({ ...draft, assessments: next });
                          }}
                          className="w-56 rounded-md border border-(--unikl-border) p-2 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={Number.isFinite(a.weightage) ? a.weightage : 0}
                          onChange={(e) => {
                            const next = [...draft.assessments];
                            next[idx] = { ...next[idx], weightage: Number(e.target.value) };
                            setDraft({ ...draft, assessments: next });
                          }}
                          className="w-28 rounded-md border border-(--unikl-border) p-2 text-sm"
                          inputMode="numeric"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={a.fullMark ?? ""}
                          onChange={(e) => {
                            const next = [...draft.assessments];
                            next[idx] = {
                              ...next[idx],
                              fullMark: e.target.value ? Number(e.target.value) : null,
                            };
                            setDraft({ ...draft, assessments: next });
                          }}
                          className="w-28 rounded-md border border-(--unikl-border) p-2 text-sm"
                          inputMode="numeric"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          {cloCodes.length === 0 ? (
                            <span className="text-xs text-(--unikl-muted)">No CLOs yet</span>
                          ) : (
                            cloCodes.map((code) => {
                              const checked = (a.cloCodes ?? []).map(normalizeCloCode).includes(code);
                              return (
                                <label key={code} className="flex items-center gap-1 text-xs">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const next = [...draft.assessments];
                                      const current = new Set(next[idx].cloCodes.map(normalizeCloCode));
                                      if (e.target.checked) current.add(code);
                                      else current.delete(code);
                                      next[idx] = { ...next[idx], cloCodes: Array.from(current) };
                                      setDraft({ ...draft, assessments: next });
                                    }}
                                  />
                                  {code}
                                </label>
                              );
                            })
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="rounded-md border border-(--unikl-border) px-2 py-2 text-sm hover:bg-(--unikl-bg)"
                          onClick={() => {
                            const next = draft.assessments.filter((_, i) => i !== idx);
                            setDraft({ ...draft, assessments: next });
                          }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {validation.errors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <div className="font-medium">Fix before saving</div>
              <ul className="mt-1 list-disc pl-5">
                {validation.errors.map((e, idx) => (
                  <li key={idx}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          {error ? <div className="text-sm text-red-700">{error}</div> : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDraft(null)}
              disabled={loading}
              className="rounded-md border border-(--unikl-border) bg-(--unikl-card) px-3 py-2 text-sm hover:bg-(--unikl-bg) disabled:opacity-60"
            >
              Back
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={loading || !validation.ok}
              className="rounded-md bg-(--unikl-blue) px-3 py-2 text-sm font-medium text-white hover:bg-(--unikl-blue-2) disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save Course"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
