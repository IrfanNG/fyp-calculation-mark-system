"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getGradeAndGpa, type GpaScaleRow } from "@/lib/gpa";

type Assessment = {
  id: string;
  name: string;
  weightage: number;
  fullMark: number | null;
};

type Props = {
  course: { id: string; code: string; name: string };
  assessments: Assessment[];
  gpaScale: GpaScaleRow[];
};

type CourseClass = {
  id: string;
  name: string;
};

type StudentRow = {
  rowId: string;
  studentName: string;
  studentId: string;
  marks: Record<string, string>; // assessmentId -> raw mark (string for input)
  status: "idle" | "saving" | "saved" | "error";
  error: string | null;
};

function makeRow(assessments: Assessment[], init?: Partial<StudentRow>): StudentRow {
  const marks: Record<string, string> = {};
  for (const a of assessments) marks[a.id] = "";
  return {
    rowId: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    studentName: "",
    studentId: "",
    marks,
    status: "idle",
    error: null,
    ...init,
  };
}

function toNumberOrNull(v: string) {
  const trimmed = v.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return n;
}

export default function MarksEntryClient({ course, assessments, gpaScale }: Props) {
  const [rows, setRows] = useState<StudentRow[]>(() => Array.from({ length: 30 }, () => makeRow(assessments)));
  const saveTimers = useRef(new Map<string, number>());
  const [isSavingAll, setIsSavingAll] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [classes, setClasses] = useState<CourseClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");

  const hasMissingFullMark = assessments.some((a) => !a.fullMark || a.fullMark <= 0);

  useEffect(() => {
    let cancelled = false;

    async function loadMarks(classId: string) {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/courses/${course.id}/marks?classId=${encodeURIComponent(classId)}`, {
          method: "GET",
        });
        const json = (await res.json()) as {
          students?: Array<{ studentName: string; studentId: string | null; marks: Record<string, number> }>;
          error?: unknown;
        };
        if (!res.ok) throw new Error(typeof json?.error === "string" ? json.error : "Failed to load marks.");

        const existing = (json.students ?? []).map((s) => {
          const initMarks: Record<string, string> = {};
          for (const a of assessments) {
            const n = s.marks?.[a.id];
            initMarks[a.id] = typeof n === "number" && Number.isFinite(n) ? String(n) : "";
          }
          return makeRow(assessments, {
            studentName: s.studentName,
            studentId: s.studentId ?? "",
            marks: initMarks,
            status: "saved",
          });
        });

        const padded = [...existing];
        while (padded.length < 30) padded.push(makeRow(assessments));
        if (!cancelled) setRows(padded);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/courses/${course.id}/classes`, { method: "GET" });
        const json = (await res.json().catch(() => null)) as { classes?: CourseClass[]; error?: unknown } | null;
        if (!res.ok) throw new Error(typeof json?.error === "string" ? json.error : "Failed to load classes.");

        const list = json?.classes ?? [];
        if (!cancelled) setClasses(list);
        const first = list[0]?.id ?? "";
        if (!cancelled) setSelectedClassId((prev) => prev || first);

        if (first) await loadMarks(first);
        else if (!cancelled) setLoading(false);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Unknown error");
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [course.id, assessments]);

  useEffect(() => {
    let cancelled = false;
    async function reload() {
      if (!selectedClassId) return;
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/courses/${course.id}/marks?classId=${encodeURIComponent(selectedClassId)}`, {
          method: "GET",
        });
        const json = (await res.json()) as {
          students?: Array<{ studentName: string; studentId: string | null; marks: Record<string, number> }>;
          error?: unknown;
        };
        if (!res.ok) throw new Error(typeof json?.error === "string" ? json.error : "Failed to load marks.");

        const existing = (json.students ?? []).map((s) => {
          const initMarks: Record<string, string> = {};
          for (const a of assessments) {
            const n = s.marks?.[a.id];
            initMarks[a.id] = typeof n === "number" && Number.isFinite(n) ? String(n) : "";
          }
          return makeRow(assessments, {
            studentName: s.studentName,
            studentId: s.studentId ?? "",
            marks: initMarks,
            status: "saved",
          });
        });

        const padded = [...existing];
        while (padded.length < 30) padded.push(makeRow(assessments));
        if (!cancelled) setRows(padded);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void reload();
    return () => {
      cancelled = true;
    };
  }, [selectedClassId, course.id, assessments]);

  const computed = useMemo(() => {
    return rows.map((r) => {
      const perAssessment = assessments.map((a) => {
        const raw = toNumberOrNull(r.marks[a.id] ?? "");
        const full = a.fullMark ?? 0;
        const invalid = raw != null && full > 0 && raw > full;
        const valid = raw != null && raw >= 0 && full > 0 && !invalid;
        const weighted = valid ? (raw / full) * a.weightage : 0;
        return { assessment: a, raw, full, invalid, weighted };
      });

      const total = perAssessment.reduce((s, x) => s + x.weighted, 0);
      const safeTotal = Number.isFinite(total) ? total : 0;
      const grade = getGradeAndGpa(safeTotal, gpaScale);
      const hasInvalid = perAssessment.some((x) => x.invalid);
      return { perAssessment, total: safeTotal, grade, hasInvalid };
    });
  }, [rows, assessments, gpaScale]);

  function scheduleSave(rowId: string) {
    const existing = saveTimers.current.get(rowId);
    if (existing) window.clearTimeout(existing);
    const timer = window.setTimeout(() => {
      void saveRow(rowId);
    }, 600);
    saveTimers.current.set(rowId, timer);
  }

  async function saveRow(rowId: string) {
    // Use functional setState to get the latest state
    let currentRow: StudentRow | undefined;
    let currentIdx = -1;
    
    setRows((prev) => {
      currentIdx = prev.findIndex((r) => r.rowId === rowId);
      if (currentIdx >= 0) {
        currentRow = prev[currentIdx];
      }
      return prev;
    });

    if (currentIdx < 0 || !currentRow) return;

    const row = currentRow;
    const calc = computed[currentIdx];

    const name = row.studentName.trim();
    if (!name) return;
    if (hasMissingFullMark) return;
    if (calc?.hasInvalid) return;

    const anyMarkEntered = assessments.some((a) => (row.marks[a.id] ?? "").trim() !== "");
    if (!anyMarkEntered) return;

    setRows((prev) => {
      const next = [...prev];
      next[currentIdx] = { ...next[currentIdx], status: "saving", error: null };
      return next;
    });

    try {
      const payload = {
        studentName: name,
        studentId: row.studentId.trim() || null,
        courseClassId: selectedClassId || null,
        marks: assessments.map((a) => {
          const raw = toNumberOrNull(row.marks[a.id] ?? "");
          return {
            assessmentId: a.id,
            rawMark: raw == null ? 0 : Math.max(0, raw),
            fullMark: a.fullMark,
          };
        }),
      };

      const res = await fetch(`/api/courses/${course.id}/marks?classId=${encodeURIComponent(selectedClassId || "")}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: unknown } | null;
      if (!res.ok) {
        const msg = typeof json?.error === "string" ? json.error : "Failed to save.";
        throw new Error(msg);
      }

      setRows((prev) => {
        const next = [...prev];
        const i = next.findIndex((x) => x.rowId === rowId);
        if (i >= 0) next[i] = { ...next[i], status: "saved", error: null };
        return next;
      });
    } catch (e) {
      setRows((prev) => {
        const next = [...prev];
        const i = next.findIndex((x) => x.rowId === rowId);
        if (i >= 0) next[i] = { ...next[i], status: "error", error: e instanceof Error ? e.message : "Unknown error" };
        return next;
      });
    }
  }

  async function saveAllRows() {
    if (hasMissingFullMark) {
      alert("Cannot save: Some assessments have no Full Mark configured.");
      return;
    }

    setIsSavingAll(true);
    const rowsToSave = rows.filter((r) => {
      const name = r.studentName.trim();
      if (!name) return false;
      const anyMarkEntered = assessments.some((a) => (r.marks[a.id] ?? "").trim() !== "");
      return anyMarkEntered;
    });

    if (rowsToSave.length === 0) {
      setIsSavingAll(false);
      alert("No student data to save.");
      return;
    }

    try {
      const savePromises = rowsToSave.map(async (row) => {
        const payload = {
          studentName: row.studentName.trim(),
          studentId: row.studentId.trim() || null,
          courseClassId: selectedClassId || null,
          marks: assessments.map((a) => {
            const raw = toNumberOrNull(row.marks[a.id] ?? "");
            return {
              assessmentId: a.id,
              rawMark: raw == null ? 0 : Math.max(0, raw),
              fullMark: a.fullMark,
            };
          }),
        };

        const res = await fetch(`/api/courses/${course.id}/marks?classId=${encodeURIComponent(selectedClassId || "")}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const json = await res.json().catch(() => null);
          throw new Error(json?.error || "Failed to save marks");
        }
      });

      await Promise.all(savePromises);

      // Update all rows to "saved" status
      setRows((prev) =>
        prev.map((r) => {
          const name = r.studentName.trim();
          if (!name) return r;
          const anyMarkEntered = assessments.some((a) => (r.marks[a.id] ?? "").trim() !== "");
          if (!anyMarkEntered) return r;
          return { ...r, status: "saved", error: null };
        })
      );

      alert(`Successfully saved ${rowsToSave.length} student(s)`);
    } catch (e) {
      alert(`Error: ${e instanceof Error ? e.message : "Failed to save"}`);
    } finally {
      setIsSavingAll(false);
    }
  }

  if (loading) return <div className="text-sm text-(--unikl-muted)">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-(--unikl-border) bg-(--unikl-card) p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-medium">
            {course.code} — {course.name}
          </div>
          <Link href={`/courses/${course.id}`} className="text-sm underline-offset-4 hover:underline">
            Back to course
          </Link>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="text-sm font-medium">Class</div>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="rounded-md border border-(--unikl-border) bg-white px-3 py-2 text-sm"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={saveAllRows}
            disabled={isSavingAll || hasMissingFullMark}
            className="ml-auto rounded-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSavingAll ? "Saving All Marks..." : "💾 Save All Marks"}
          </button>
        </div>
        {loadError ? <div className="mt-3 text-sm text-red-700">{loadError}</div> : null}
        {hasMissingFullMark ? (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Some assessments have no Full Mark configured. Set Full Mark during course setup.
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-lg border border-(--unikl-border) bg-(--unikl-card)">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-(--unikl-bg) text-(--unikl-muted)">
              <tr>
                <th className="px-3 py-2 font-medium">Student</th>
                <th className="px-3 py-2 font-medium">ID</th>
                {assessments.map((a) => (
                  <th key={a.id} className="px-3 py-2 font-medium whitespace-nowrap">
                    {a.name}
                    <div className="text-xs font-normal text-(--unikl-muted)">
                      / {a.fullMark ?? "-"} • {a.weightage}%
                    </div>
                  </th>
                ))}
                <th className="px-3 py-2 font-medium">Total</th>
                <th className="px-3 py-2 font-medium">Grade</th>
                <th className="px-3 py-2 font-medium">GPA</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const calc = computed[idx];
                return (
                  <tr key={r.rowId} className="border-t border-(--unikl-border) hover:bg-(--unikl-bg)">
                    <td className="px-3 py-2">
                      <input
                        value={r.studentName}
                        onChange={(e) => {
                          const v = e.target.value;
                          setRows((prev) => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], studentName: v, status: "idle", error: null };
                            return next;
                          });
                          scheduleSave(r.rowId);
                        }}
                        className="w-48 rounded-md border border-(--unikl-border) bg-white px-2 py-1.5"
                        placeholder={`Student ${idx + 1}`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={r.studentId}
                        onChange={(e) => {
                          const v = e.target.value;
                          setRows((prev) => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], studentId: v, status: "idle", error: null };
                            return next;
                          });
                          scheduleSave(r.rowId);
                        }}
                        className="w-32 rounded-md border border-(--unikl-border) bg-white px-2 py-1.5"
                        placeholder="Matric"
                      />
                    </td>

                    {assessments.map((a) => {
                      const invalid = calc?.perAssessment.find((x) => x.assessment.id === a.id)?.invalid ?? false;
                      return (
                        <td key={a.id} className="px-3 py-2">
                          <input
                            value={r.marks[a.id] ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setRows((prev) => {
                                const next = [...prev];
                                next[idx] = {
                                  ...next[idx],
                                  marks: { ...next[idx].marks, [a.id]: v },
                                  status: "idle",
                                  error: null,
                                };
                                return next;
                              });
                              scheduleSave(r.rowId);
                            }}
                            className={
                              "w-24 rounded-md border bg-white px-2 py-1.5 " +
                              (invalid ? "border-red-300" : "border-(--unikl-border)")
                            }
                            inputMode="numeric"
                            placeholder="0"
                          />
                        </td>
                      );
                    })}

                    <td className="px-3 py-2 font-medium tabular-nums">{calc.total.toFixed(2)}</td>
                    <td className="px-3 py-2 font-medium">{calc.grade.grade}</td>
                    <td className="px-3 py-2 font-medium tabular-nums">{calc.grade.gpa.toFixed(2)}</td>
                    <td className="px-3 py-2 text-xs text-(--unikl-muted)">
                      {r.status === "saving" ? "Saving..." : r.status === "saved" ? "Saved" : r.status === "error" ? "Error" : ""}
                      {r.error ? <div className="text-red-700">{r.error}</div> : null}
                      {calc.hasInvalid ? <div className="text-red-700">Mark exceeds full mark</div> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
