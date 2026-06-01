"use client";

import { useEffect, useMemo, useState } from "react";
import type { GpaScaleRow } from "@/lib/gpa";

export default function GpaScaleClient() {
  const [rows, setRows] = useState<GpaScaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/gpa-scale");
        const json = (await res.json()) as { rows?: GpaScaleRow[]; error?: unknown };
        if (!res.ok) throw new Error(typeof json?.error === "string" ? json.error : "Failed to load.");
        if (!cancelled) setRows(json.rows ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const validation = useMemo(() => {
    const errs: string[] = [];
    if (rows.length === 0) errs.push("At least one row is required.");
    for (const r of rows) {
      if (r.minMark > r.maxMark) errs.push("Each row must have minMark <= maxMark.");
      if (r.minMark < 0 || r.maxMark > 100) errs.push("Marks must be within 0..100.");
      if (r.gpa < 0 || r.gpa > 4.0) errs.push("GPA must be within 0..4.0.");
    }
    return { ok: errs.length === 0, errors: errs };
  }, [rows]);

  async function onSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      if (!validation.ok) throw new Error("Fix validation errors first.");
      const res = await fetch("/api/admin/gpa-scale", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: unknown };
      if (!res.ok) throw new Error(typeof json?.error === "string" ? json.error : "Failed to save.");
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-sm text-(--unikl-muted)">Loading...</div>;

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-(--unikl-border) bg-(--unikl-card)">
        <table className="w-full text-left text-sm">
          <thead className="bg-(--unikl-bg) text-(--unikl-muted)">
            <tr>
              <th className="px-4 py-2 font-medium">Min</th>
              <th className="px-4 py-2 font-medium">Max</th>
              <th className="px-4 py-2 font-medium">Grade</th>
              <th className="px-4 py-2 font-medium">GPA</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx} className="border-t border-(--unikl-border)">
                <td className="px-4 py-2">
                  <input
                    value={r.minMark}
                    onChange={(e) => {
                      const next = [...rows];
                      next[idx] = { ...next[idx], minMark: Number(e.target.value) };
                      setRows(next);
                    }}
                    className="w-20 rounded-md border border-(--unikl-border) p-2 text-sm"
                    inputMode="numeric"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    value={r.maxMark}
                    onChange={(e) => {
                      const next = [...rows];
                      next[idx] = { ...next[idx], maxMark: Number(e.target.value) };
                      setRows(next);
                    }}
                    className="w-20 rounded-md border border-(--unikl-border) p-2 text-sm"
                    inputMode="numeric"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    value={r.grade}
                    onChange={(e) => {
                      const next = [...rows];
                      next[idx] = { ...next[idx], grade: e.target.value };
                      setRows(next);
                    }}
                    className="w-24 rounded-md border border-(--unikl-border) p-2 text-sm"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    value={r.gpa}
                    onChange={(e) => {
                      const next = [...rows];
                      next[idx] = { ...next[idx], gpa: Number(e.target.value) };
                      setRows(next);
                    }}
                    className="w-24 rounded-md border border-(--unikl-border) p-2 text-sm"
                    inputMode="decimal"
                  />
                </td>
                <td className="px-4 py-2">
                  <button
                    type="button"
                    className="rounded-md border border-(--unikl-border) px-2 py-2 text-sm hover:bg-(--unikl-bg)"
                    onClick={() => setRows(rows.filter((_, i) => i !== idx))}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        className="text-sm underline-offset-4 hover:underline"
        onClick={() => setRows([...rows, { minMark: 0, maxMark: 0, grade: "", gpa: 0 }])}
      >
        Add row
      </button>

      {validation.errors.length > 0 ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="font-medium">Fix before saving</div>
          <ul className="mt-1 list-disc pl-5">
            {validation.errors.map((e, idx) => (
              <li key={idx}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? <div className="text-sm text-red-700">{error}</div> : null}
      {saved ? <div className="text-sm text-emerald-700">Saved.</div> : null}

      <button
        type="button"
        onClick={onSave}
        disabled={saving || !validation.ok}
        className="rounded-md bg-(--unikl-blue) px-3 py-2 text-sm font-medium text-white hover:bg-(--unikl-blue-2) disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save GPA Scale"}
      </button>
    </div>
  );
}
