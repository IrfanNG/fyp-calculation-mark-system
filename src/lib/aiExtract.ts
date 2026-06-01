export type ExtractedAssessmentDraft = {
  name: string;
  weightage: number;
  fullMark?: number | null;
  cloCodes: string[];
};

export type ExtractedCloDraft = {
  code: string;
  description?: string | null;
};

export type ExtractedCourseDraft = {
  code?: string | null;
  name?: string | null;
  semester?: string | null;
  year?: number | null;
  clos: ExtractedCloDraft[];
  assessments: ExtractedAssessmentDraft[];
  confidence: number;
  warnings: string[];
  rawTextSample?: string;
};

const assessmentKeywordRegex = /(test|quiz|lab|laboratory|exercise|assignment|project|hands[- ]on|handson|practical|presentation|final|exam|assessment)/i;

function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[\u2022\u25CF\u25AA\u25E6]/g, "-")
    .replace(/[–—]/g, "-")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .trim();
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function normalizeAssessmentName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(s\)/g, "s")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function titleCaseSimple(name: string): string {
  const clean = name.replace(/\s{2,}/g, " ").trim();
  if (!clean) return clean;
  // Preserve all-caps acronyms
  return clean
    .split(" ")
    .map((w) => {
      if (w.length <= 2) return w.toUpperCase();
      return w[0].toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

function toCloCode(raw: string): string {
  const m = raw.match(/\d+/);
  if (!m) return raw.toUpperCase();
  return `CLO${m[0]}`;
}

function extractCourseMeta(lines: string[]) {
  const joined = lines.join("\n");

  // UniKL CLP often has: "Course: IBB32203 Sem: January Year: 2020"
  const courseLine = lines.find((l) => /^Course\s*:/i.test(l) && /\b[A-Z]{3,6}\s*\d{3,5}[A-Z]?\b/i.test(l));
  const codeFromCourseLine = courseLine?.match(/\b([A-Z]{3,6})\s*(\d{3,5})([A-Z]?)\b/i)?.slice(1, 4).join("") ?? null;
  const semFromCourseLine = courseLine?.match(/\bSem\s*[:\-]\s*(.+?)(?=\s+Year\b|$)/i)?.[1]?.trim() ?? null;
  const yearFromCourseLine = courseLine?.match(/\bYear\s*[:\-]\s*(20\d{2})\b/i)?.[1] ?? null;

  // Alternative header: "SEMESTER JANUARY 2021"
  const semHeader = joined.match(/\bSEMESTER\s+([A-Z][A-Z ]{2,20})\s+(20\d{2})\b/i);
  const semFromHeader = semHeader?.[1]?.trim() ?? null;
  const yearFromHeader = semHeader?.[2]?.trim() ?? null;

  // Some CLPs have a separate "YYYY MONTH" line near course details (e.g., "2025 OCTOBER").
  // Prefer this if present, since templates sometimes contain older "SEMESTER ..." lines.
  const ymCandidates: Array<{ year: string; semester: string; idx: number }> = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i]?.match(/^\s*(20\d{2})\s+([A-Z]{3,15})\s*$/i);
    if (!m) continue;
    const semester = m[2].trim();
    // Filter out common non-semester tokens.
    if (/^(TOTAL|WEEK|PAGE)$/i.test(semester)) continue;
    ymCandidates.push({ year: m[1], semester, idx: i });
  }

  const codeFromLabel = joined.match(/Course\s*Code\s*[:\-]\s*([A-Z]{3,6}\s*\d{3,5}[A-Z]?)/i)?.[1];
  const codeFromInline = joined.match(/\b([A-Z]{3,6}\d{3,5}[A-Z]?)\b\s+COURSE\s*CODE\b/i)?.[1];
  const codeFromPattern = joined.match(/\b([A-Z]{3,6}\s*\d{3,5}[A-Z]?)\b/)?.[1];
  const code = (codeFromCourseLine ?? codeFromInline ?? codeFromLabel ?? codeFromPattern)?.replace(/\s+/g, "").toUpperCase() ?? null;

  const nameFromLabel = joined.match(/Course\s*(Title|Name)\s*[:\-]\s*(.+)/i)?.[2]?.trim();
  let name = nameFromLabel ?? null;

  if (!name) {
    // Prefer UniKL header line: "UNIVERSITI KUALA LUMPUR COURSE:Network Operating System"
    const uniCourseLine = lines.find(
      (l) => /\bUNIVERSITI\b/i.test(l) && /\bCOURSE\s*:\s*/i.test(l) && !/\bCOURSE\s*CODE\b/i.test(l)
    );
    const candidateLine = uniCourseLine ?? lines.find((l) => /\bCOURSE\s*:\s*/i.test(l) && !/\bCOURSE\s*CODE\b/i.test(l));
    if (candidateLine) {
      const candidate = candidateLine.split(/COURSE\s*:/i).slice(1).join(":").trim();
      const bad = /\b(course learning plan|to be shared with students|section\s+[ab]:|appendix)\b/i.test(candidate);
      if (candidate && candidate.length >= 4 && !bad && !/\b[A-Z]{3,6}\s*\d{3,5}[A-Z]?\b/i.test(candidate)) {
        name = candidate;
      }
    }
  }

  if (!name) {
    // Another UniKL pattern: "COURSE:Network Operating System" without the university prefix
    const plainCourseLine = lines.find((l) => /^UNIVERSITI\b/i.test(l) === false && /\bCOURSE\s*:\s*/i.test(l) && !/\bCOURSE\s*CODE\b/i.test(l));
    if (plainCourseLine) {
      const candidate = plainCourseLine.split(/COURSE\s*:/i).slice(1).join(":").trim();
      const bad = /\b(course learning plan|to be shared with students|section\s+[ab]:|appendix|course code)\b/i.test(candidate);
      if (candidate && candidate.length >= 4 && !bad) name = candidate;
    }
  }

  if (!name && code) {
    // Heuristic: pick a line close to the course code that looks like a title
    const codeIdx = lines.findIndex((l) => l.toUpperCase().includes(code));
    for (const offset of [1, -1, 2, -2]) {
      const candidate = lines[codeIdx + offset];
      const bad =
        !candidate ||
        candidate.length < 6 ||
        /^SECTION\s+[AB]\b/i.test(candidate) ||
        /\bCOURSE\s+DETAILS\b/i.test(candidate) ||
        /\bCourse Learning Outcomes\b/i.test(candidate) ||
        /\bProgramme Learning Outcomes\b/i.test(candidate) ||
        candidate.toLowerCase().includes("semester") ||
        candidate.toLowerCase().includes("year") ||
        /\b(name of course|course code|course learning plan|to be shared with students)\b/i.test(candidate) ||
        /:\s*$/.test(candidate);

      if (!bad) {
        name = candidate.trim();
        break;
      }
    }
  }

  if (name && /^(method|assessment\s*method|teaching\s*method)$/i.test(name.trim())) {
    name = null;
  }

  // CLP variants sometimes put the true title near the synopsis line.
  // Example: the line right before "This subject involves ..." is the course title.
  if (!name || /^SECTION\s+[AB]\b/i.test(name) || /\bCOURSE\s+DETAILS\b/i.test(name)) {
    const synopsisIdx = lines.findIndex((l) => /\bThis subject involves\b/i.test(l));
    const synopsisIdx2 =
      synopsisIdx >= 0
        ? synopsisIdx
        : lines.findIndex((l) => /\bThis\s*course\s*aimed\s*at\b/i.test(l) || /\bThiscourseaimedat\b/i.test(l));
    const idx = synopsisIdx2;
    if (idx > 0) {
      let best: { candidate: string; score: number } | null = null;
      const from = Math.max(0, idx - 10);
      const to = Math.min(lines.length - 1, idx + 10);
      for (let j = from; j <= to; j++) {
        if (j === idx) continue;
        const candidate = lines[j]?.trim();
        if (!candidate) continue;
        const lettersOnly = candidate.replace(/[^A-Za-z]/g, "");
        const upperRatio =
          lettersOnly.length > 0 ? lettersOnly.replace(/[^A-Z]/g, "").length / lettersOnly.length : 0;
        const wordCount = candidate.split(/\s+/).filter(Boolean).length;
        const bad =
          /^SEMESTER\b/i.test(candidate) ||
          /^UNIVERSITI\b/i.test(candidate) ||
          /^SECTION\s+[AB]\b/i.test(candidate) ||
          /\bCOURSE\s+LEARNING\s+PLAN\b/i.test(candidate) ||
          /\bTO BE SHARED WITH STUDENTS\b/i.test(candidate) ||
          /\bCOURSE\s+CODE\b/i.test(candidate) ||
          /\bCOURSE\s+DETAILS\b/i.test(candidate) ||
          /^(method|assessment\s*method|teaching\s*method)$/i.test(candidate) ||
          /\bProgramme Learning Outcomes\b/i.test(candidate) ||
          /\bCourse Learning Outcomes\b/i.test(candidate) ||
          /\bOutcomes\s*\(\s*CLO\s*\)\b/i.test(candidate) ||
          /\bAt the end of the course\b/i.test(candidate) ||
          /:\s*$/.test(candidate);

        if (bad || candidate.length < 6) continue;

        // Score: strongly prefer short-ish all-caps titles.
        const capped = upperRatio >= 0.85;
        const len = candidate.length;
        const score =
          (capped ? 100 : 0) +
          Math.round(upperRatio * 20) +
          (wordCount >= 2 && wordCount <= 8 ? 15 : 0) +
          (len >= 10 && len <= 60 ? 10 : 0) -
          (len > 80 ? 20 : 0);

        if (!best || score > best.score) {
          best = { candidate, score };
        }
      }

      if (best) name = best.candidate;
    }
  }

  // Pick the best "YYYY MONTH" candidate by proximity to the course code occurrence, if any.
  let semFromYm: string | null = null;
  let yearFromYm: string | null = null;
  if (ymCandidates.length > 0) {
    const codeIdx = code ? lines.findIndex((l) => l.toUpperCase().includes(code)) : -1;
    const best = ymCandidates
      .map((c) => ({ ...c, dist: codeIdx >= 0 ? Math.abs(c.idx - codeIdx) : c.idx }))
      .sort((a, b) => a.dist - b.dist)[0];
    semFromYm = best?.semester ?? null;
    yearFromYm = best?.year ?? null;
  }

  const semMatch = semFromCourseLine ?? semFromYm ?? semFromHeader ?? joined.match(/\bSem\s*[:\-]\s*(.+?)(?=\s+Year\b|$)/i)?.[1]?.trim() ?? null;
  const semesterMatch = semMatch ?? joined.match(/Semester\s*[:\-]?\s*([A-Za-z0-9/ ]{1,20})/i)?.[1]?.trim() ?? null;
  const semesterClean = semesterMatch ? semesterMatch.replace(/\s{2,}/g, " ") : null;
  const semester = semesterClean && !/^No\.?$/i.test(semesterClean) ? semesterClean : null;

  const yearMatch = yearFromCourseLine ?? yearFromYm ?? yearFromHeader ?? joined.match(/\b(20\d{2})\b/)?.[1] ?? null;
  const year = yearMatch ? Number.parseInt(yearMatch, 10) : null;

  return { code, name, semester, year };
}

function extractClos(text: string): ExtractedCloDraft[] {
  const matches = text.match(/CLO\s*\d+/gi) ?? [];
  const codes = uniq(matches.map((m) => toCloCode(m))).sort((a, b) => {
    const na = Number.parseInt(a.replace(/\D/g, ""), 10);
    const nb = Number.parseInt(b.replace(/\D/g, ""), 10);
    return na - nb;
  });

  // Try to capture simple descriptions like "CLO1: ..." when present
  const lines = text.split("\n");
  const descriptions: Record<string, string> = {};
  for (const line of lines) {
    const m = line.match(/\b(CLO\s*\d+)\s*[:\-]\s*(.+)/i);
    if (!m) continue;
    const code = toCloCode(m[1]);
    const desc = m[2].trim();
    if (desc && !descriptions[code]) descriptions[code] = desc;
  }

  return codes.map((code) => ({ code, description: descriptions[code] ?? null }));
}

function parseAssessmentLine(line: string): ExtractedAssessmentDraft | null {
  if (/^\s*100\s*%\s*$/i.test(line)) return null;
  if (/^\s*Total\b/i.test(line)) return null;

  const percent = line.match(/(\d{1,3})\s*%/);
  const cloMatches = line.match(/CLO\s*\d+/gi) ?? [];
  const cloCodes = uniq(cloMatches.map((m) => toCloCode(m)));

  // Percent-driven extraction (most common in CLP)
  if (percent) {
    const weightage = Number.parseInt(percent[1], 10);
    if (!Number.isFinite(weightage) || weightage <= 0 || weightage > 100) return null;

    // Ignore total rows like "Total 100%" / "100%" which are not actual assessments.
    if (/\btotal\b/i.test(line) && weightage === 100) return null;

    let namePart = line.slice(0, percent.index).trim();
    namePart = namePart.replace(/\(.*?CLO.*?\)/gi, "").trim();
    namePart = namePart.replace(/\bCLO\s*\d+(\s*,\s*CLO\s*\d+)*\b/gi, "").trim();
    namePart = namePart.replace(/[\-:]+\s*$/g, "").trim();

    const name = namePart || "Assessment";

    if (/^assessment$/i.test(name) && weightage === 100) return null;

    return {
      name,
      weightage,
      cloCodes,
      fullMark: null,
    };
  }

  // Table-ish lines: "Test CLO1 20" (no % sign)
  const tableish = line.match(/^(.*?)(CLO\s*\d+(?:\s*,\s*CLO\s*\d+)*)\s+(\d{1,3})\b/i);
  if (tableish) {
    const weightage = Number.parseInt(tableish[3], 10);
    if (!Number.isFinite(weightage) || weightage <= 0 || weightage > 100) return null;
    const name = tableish[1].trim().replace(/[\-:]+\s*$/g, "").trim() || "Assessment";
    const cloCodes = uniq((tableish[2].match(/CLO\s*\d+/gi) ?? []).map((m) => toCloCode(m)));

    return { name, weightage, cloCodes, fullMark: null };
  }

  // Ignore lines that don't look like assessments
  if (!assessmentKeywordRegex.test(line) || !/\d/.test(line)) return null;
  return null;
}

type WeightCandidate = { value: number; lineIndex: number };

function pickWeightsThatSumToTarget(candidates: WeightCandidate[], count: number, target: number): WeightCandidate[] {
  const filtered = candidates
    .filter((c) => c.value > 0 && c.value < 100)
    .sort((a, b) => a.value - b.value);

  const res: WeightCandidate[] = [];
  function backtrack(start: number, remainingCount: number, remainingSum: number): boolean {
    if (remainingCount === 0) return remainingSum === 0;
    for (let i = start; i < filtered.length; i++) {
      const c = filtered[i];
      if (c.value > remainingSum) continue;
      res.push(c);
      if (backtrack(i + 1, remainingCount - 1, remainingSum - c.value)) return true;
      res.pop();
    }
    return false;
  }

  const ok = backtrack(0, count, target);
  return ok ? [...res] : [];
}

function extractAssessmentsFromAssessmentMethodsBlock(lines: string[]): ExtractedAssessmentDraft[] {
  // CLP2-style: names and weights appear near "Assessments Type Methods" / "Total 4 assessment methods"
  const anchorIdx =
    lines.findIndex((l) => /\bAssessments\s*Type\s*Methods\b/i.test(l)) >= 0
      ? lines.findIndex((l) => /\bAssessments\s*Type\s*Methods\b/i.test(l))
      : lines.findIndex((l) => /\bTotal\s+\d+\s+assessment\s+methods\b/i.test(l));

  if (anchorIdx < 0) return [];
  const start = Math.max(0, anchorIdx - 40);
  const end = Math.min(lines.length, anchorIdx + 40);
  const window = lines.slice(start, end);

  // Prefer extracting weights directly from the Weightage (%) section to avoid table index numbers.
  const weightHeaderRel = window.findIndex((l) => /Weightage\s*\(\s*%\s*\)/i.test(l) || /^Weightage\b/i.test(l));
  const weightsInOrder: number[] = [];
  if (weightHeaderRel >= 0) {
    for (let i = start + weightHeaderRel + 1; i < Math.min(lines.length, start + weightHeaderRel + 30); i++) {
      const l = (lines[i] ?? "").trim();
      if (!l) continue;
      if (/^Other additional information\b/i.test(l)) break;
      if (/^References\b/i.test(l)) break;
      if (/^UNIVERSITI\b/i.test(l)) break;
      if (/^Total\b/i.test(l)) break;
      if (/^100\s*%\s*$/i.test(l)) break;

      const m = l.match(/^(\d{1,3})(?:\s*%\s*)?$/);
      if (!m) continue;
      const n = Number.parseInt(m[1], 10);
      if (!Number.isFinite(n) || n <= 0 || n >= 100) continue;
      weightsInOrder.push(n);
    }
  }

  const extractAssessmentNames = (): string[] => {
    const names: string[] = [];
    const push = (raw: string) => {
      const cleaned = titleCaseSimple(stripCloFromName(raw));
      const key = normalizeAssessmentName(cleaned);
      if (!key) return;
      if (names.some((n) => normalizeAssessmentName(n) === key)) return;
      names.push(cleaned);
    };

    for (let i = start; i < end; i++) {
      const l = (lines[i] ?? "").trim();
      if (!l) continue;

      // Lines like: "Continuous Assessment(s) Quiz"
      const ca = l.match(/Continuous\s+Assessment\(s\)\s+(.+)$/i);
      if (ca && ca[1]) {
        const part = ca[1].trim();
        for (const seg of part.split(/\s*[\/;,]\s*/)) {
          if (assessmentKeywordRegex.test(seg) || /mini\s*project/i.test(seg)) push(seg);
        }
        continue;
      }

      if (assessmentKeywordRegex.test(l) || /mini\s*project/i.test(l)) {
        // Exclude generic headings
        if (/\bAssessment\s*Method\b/i.test(l)) continue;
        if (/\bTeaching\s*Method\b/i.test(l)) continue;
        if (/\bAssessments\s*Type\s*Methods\b/i.test(l)) continue;
        if (/^Methods$/i.test(l)) continue;
        if (/^Weightage\b/i.test(l)) continue;
        if (/^Total\b/i.test(l)) continue;
        if (/^100\s*%\s*$/i.test(l)) continue;

        // Normalize common patterns
        if (/^Final\s+Test\b/i.test(l)) push("Final Test");
        else if (/^Final\s+Assessment/i.test(l)) push("Final Assessment");
        else if (/mini\s*project/i.test(l)) push("Mini Project");
        else push(l);
      }
    }

    return names;
  };

  const extractedNames = extractAssessmentNames();

  const weightSumInOrder = weightsInOrder.reduce((s, n) => s + n, 0);
  if (weightsInOrder.length > 0 && weightSumInOrder === 100) {
    const hasQuizLocal = window.some((l) => /\bQuiz\b/i.test(l));
    const hasAssignmentLocal = window.some((l) => /^Assignment\b/i.test(l) || /\bAssignments\b/i.test(l));
    const hasTestLocal = window.some((l) => /^Test\b/i.test(l) || /\bTest\b/i.test(l));
    const hasFinalLocal = window.some((l) => /\bFinal\b/i.test(l) || /\bFinal\s*Assessment/i.test(l));
    const hasMiniProject = window.some((l) => /\bMini\s*Project\b/i.test(l));
    const hasFinalTest = window.some((l) => /^Final\s+Test\b/i.test(l) || /\bFinal\s+Test\b/i.test(l));

    // CLP3 usually expects: Quiz, Assignment, Test, Mini Project, Final Test
    const prioritizedNames: string[] = [];
    if (hasQuizLocal) prioritizedNames.push("Quiz");
    if (hasAssignmentLocal) prioritizedNames.push("Assignment");
    if (hasTestLocal) prioritizedNames.push("Test");
    if (hasMiniProject) prioritizedNames.push("Mini Project");
    if (hasFinalTest) prioritizedNames.push("Final Test");
    else if (hasFinalLocal) prioritizedNames.push("Final Assessment");

    if (prioritizedNames.length === weightsInOrder.length) {
      return prioritizedNames.map((name, i) => ({ name, weightage: weightsInOrder[i] ?? 0, cloCodes: [], fullMark: null }));
    }

    if (extractedNames.length === weightsInOrder.length) {
      return extractedNames.map((name, i) => ({ name, weightage: weightsInOrder[i] ?? 0, cloCodes: [], fullMark: null }));
    }
  }

  // If the names and weights line up, pair sequentially (best for CLP3-style blocks)
  if (weightsInOrder.length > 0 && extractedNames.length === weightsInOrder.length) {
    return extractedNames.map((name, i) => ({ name, weightage: weightsInOrder[i] ?? 0, cloCodes: [], fullMark: null }));
  }

  // Detect canonical names (keep stable ordering)
  const hasTest = window.some((l) => /^Test\b/i.test(l) || /\bTest\b/i.test(l));
  const hasAssignment = window.some((l) => /^Assignment\b/i.test(l) || /\bAssignments\b/i.test(l));
  const hasQuiz = window.some((l) => /\bQuiz\b/i.test(l));
  const hasFinal = window.some((l) => /\bFinal\b/i.test(l) || /\bFinal\s*Assessment/i.test(l));

  const names: string[] = [];
  if (hasTest) names.push("Test");
  if (hasAssignment) names.push("Assignment");
  if (hasQuiz) names.push("Quiz");
  if (hasFinal) names.push("Final Assessment");
  if (names.length < 2) return [];

  // Deterministic CLP2 parse when the canonical 4 assessment types exist.
  // Typical flattened layout:
  // Test
  // Assignment
  // 5
  // 10
  // 45
  // Final Assessment(s)
  // ... plus "... Quiz" elsewhere in the same block.
  if (names.length === 4 && names[0] === "Test" && names[1] === "Assignment" && names[2] === "Quiz" && names[3] === "Final Assessment") {
    const findExactIdx = (re: RegExp) => {
      for (let i = start; i < end; i++) {
        if (re.test(lines[i] ?? "")) return i;
      }
      return -1;
    };

    const testIdx = findExactIdx(/^Test\b/i);
    const assignmentIdx = findExactIdx(/^Assignment\b/i);
    const finalIdx = findExactIdx(/^Final\b/i);

    const nums: WeightCandidate[] = [];
    for (let i = start; i < end; i++) {
      const l = (lines[i] ?? "").trim();
      const m = l.match(/^(\d{1,3})(?:\s*%\s*)?$/);
      if (!m) continue;
      const n = Number.parseInt(m[1], 10);
      if (!Number.isFinite(n) || n <= 0 || n >= 100) continue;
      if (n <= 4) continue;
      nums.push({ value: n, lineIndex: i });
    }

    const nearestAfter = (idx: number, maxDelta: number) => {
      if (idx < 0) return null;
      let best: WeightCandidate | null = null;
      let bestD = Number.POSITIVE_INFINITY;
      for (const c of nums) {
        const d = c.lineIndex - idx;
        if (d >= 1 && d <= maxDelta && d < bestD) {
          bestD = d;
          best = c;
        }
      }
      return best;
    };
    const nearestBefore = (idx: number, maxDelta: number) => {
      if (idx < 0) return null;
      let best: WeightCandidate | null = null;
      let bestD = Number.POSITIVE_INFINITY;
      for (const c of nums) {
        const d = idx - c.lineIndex;
        if (d >= 1 && d <= maxDelta && d < bestD) {
          bestD = d;
          best = c;
        }
      }
      return best;
    };

    let wTest = nearestAfter(testIdx, 8);
    let wAssignment = nearestAfter(assignmentIdx, 8);
    const wFinal = nearestBefore(finalIdx, 4) ?? nearestAfter(finalIdx, 4);

    // Special-case: labels come first, then a run of numbers.
    // If Test and Assignment are adjacent, the first two numbers after Assignment are typically Test then Assignment.
    if (testIdx >= 0 && assignmentIdx >= 0 && assignmentIdx > testIdx && assignmentIdx - testIdx <= 3) {
      const seq = nums
        .filter((n) => n.lineIndex > assignmentIdx && n.lineIndex <= assignmentIdx + 12)
        .sort((a, b) => a.lineIndex - b.lineIndex);
      if (seq.length >= 2) {
        wTest = seq[0];
        wAssignment = seq[1];
      }
    }

    if (wTest && wAssignment && wFinal) {
      const quizWeight = 100 - (wTest.value + wAssignment.value + wFinal.value);
      if (quizWeight > 0 && quizWeight < 100) {
        const out = [
          { name: "Test", weightage: wTest.value, cloCodes: [], fullMark: null },
          { name: "Assignment", weightage: wAssignment.value, cloCodes: [], fullMark: null },
          { name: "Quiz", weightage: quizWeight, cloCodes: [], fullMark: null },
          { name: "Final Assessment", weightage: wFinal.value, cloCodes: [], fullMark: null },
        ];
        const sum = out.reduce((s, a) => s + a.weightage, 0);
        if (sum === 100) return out;
      }
    }
  }

  // Weight candidates from the same window, plus a small lookback before the nearby Weightage (%) header
  const weightCandidates: WeightCandidate[] = [];
  for (let i = start; i < end; i++) {
    const l = lines[i]?.trim();
    if (!l) continue;
    const m = l.match(/^(\d{1,3})(?:\s*%\s*)?$/);
    if (!m) continue;
    const n = Number.parseInt(m[1], 10);
    if (!Number.isFinite(n) || n <= 0 || n >= 100) continue;
    // Filter out tiny index-like numbers that commonly appear in CLP tables
    if (n <= 4) continue;
    weightCandidates.push({ value: n, lineIndex: i });
  }

  if (weightCandidates.length === 0) return [];

  // Try to find a set of weights that sums to 100 for the detected number of assessments.
  const picked = pickWeightsThatSumToTarget(weightCandidates, names.length, 100);
  if (picked.length !== names.length) return [];

  // Associate weights to names by proximity in the text.
  // Prefer nearest weight within +/-6 lines of the name occurrence; otherwise assign remaining.
  const remaining = [...picked];
  const assessments: ExtractedAssessmentDraft[] = [];

  const nameLineIndex = (name: string) => {
    const idx = lines.findIndex((l, i) => i >= start && i < end && new RegExp(`\\b${name.split(" ")[0]}\\b`, "i").test(l));
    return idx >= 0 ? idx : start;
  };

  for (const name of names) {
    const idx = nameLineIndex(name === "Final Assessment" ? "Final" : name);
    let best: WeightCandidate | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const w of remaining) {
      const d = Math.abs(w.lineIndex - idx);
      if (d < bestDist) {
        bestDist = d;
        best = w;
      }
    }

    // If very far, just leave for later and fill remaining sequentially.
    if (best && bestDist <= 6) {
      assessments.push({ name, weightage: best.value, cloCodes: [], fullMark: null });
      remaining.splice(remaining.indexOf(best), 1);
    } else {
      assessments.push({ name, weightage: 0, cloCodes: [], fullMark: null });
    }
  }

  // Fill any zero weights with remaining picked weights (stable order)
  for (const a of assessments) {
    if (a.weightage !== 0) continue;
    const w = remaining.shift();
    if (!w) break;
    a.weightage = w.value;
  }

  // Final sanity: must sum to 100
  const sum = assessments.reduce((s, a) => s + a.weightage, 0);
  if (sum !== 100) return [];

  return assessments;
}

function stripCloFromName(name: string) {
  return name
    .replace(/\(\s*CLO\s*\d+(?:\s*,\s*CLO\s*\d+)*\s*\)/gi, "")
    .replace(/\bCLO\s*\d+(?:\s*,\s*CLO\s*\d+)*\b/gi, "")
    .replace(/[\-:]+\s*$/g, "")
    .trim();
}

function extractCloAssessmentHints(lines: string[]) {
  // Lines like: "CLO 1 √ Lecture Test / Final Assessment / Quiz"
  const map = new Map<string, Set<string>>();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/\bCLO\s*(\d+)\s*(?:[√Xx]|\u221A)\s*(.+)$/i);
    if (!m) continue;
    const clo = `CLO${m[1]}`;
    let tail = m[2]
      .replace(/\bLecture\b/gi, " ")
      .replace(/\bPractical\b/gi, " ")
      .replace(/\bLab\b/gi, " ")
      .replace(/\bTest\s*\/\s*Final\b/gi, "Test / Final")
      .trim();

    // Some PDFs wrap the assessment list to the next line (e.g., "Assesment / Quiz")
    const next = lines[i + 1]?.trim();
    if (next && !/^CLO\b/i.test(next) && !/^PLO\b/i.test(next) && assessmentKeywordRegex.test(next)) {
      tail = `${tail} / ${next}`;
    }

    const parts = tail
      .split(/\s*[\/;,]\s*/)
      .map((p) => p.trim())
      .filter(Boolean);

    for (const p of parts) {
      if (!assessmentKeywordRegex.test(p)) continue;
      const norm = normalizeAssessmentName(p);
      if (!norm) continue;
      if (!map.has(norm)) map.set(norm, new Set());
      map.get(norm)!.add(clo);
    }
  }
  return map;
}

function getHintCloCodes(cloAssessmentHints: Map<string, Set<string>>, assessmentName: string): string[] {
  const norm = normalizeAssessmentName(assessmentName);
  const exact = cloAssessmentHints.get(norm);
  if (exact) return Array.from(exact);

  // Fuzzy match: "assignment" should match "practical assignments" etc.
  const hits: string[] = [];
  for (const [k, set] of cloAssessmentHints.entries()) {
    if (!k) continue;
    const contains = k.includes(norm) || norm.includes(k);
    const keywordMatch =
      (norm.includes("assignment") && k.includes("assignment")) ||
      (norm.includes("quiz") && k.includes("quiz")) ||
      (norm.includes("test") && k.includes("test")) ||
      (norm.includes("final") && k.includes("final"));
    if (contains || keywordMatch) {
      hits.push(...Array.from(set));
    }
  }
  return uniq(hits);
}

function extractMethodsBlockAssessments(lines: string[]): Array<Omit<ExtractedAssessmentDraft, "weightage">> {
  const startIdx = lines.findIndex((l) => /^Methods$/i.test(l) || /^Assessment\s*Methods$/i.test(l));
  if (startIdx < 0) return [];

  const out: Array<Omit<ExtractedAssessmentDraft, "weightage">> = [];
  for (let i = startIdx + 1; i < Math.min(lines.length, startIdx + 40); i++) {
    const l = lines[i].trim();
    if (!l) continue;
    if (/^Total$/i.test(l)) break;
    if (/^UNIVERSITI\b/i.test(l)) break;

    // We only consider lines that look like assessment method entries.
    if (!assessmentKeywordRegex.test(l) && !/CLO\s*\d+/i.test(l)) continue;

    const cloMatches = l.match(/CLO\s*\d+/gi) ?? [];
    const cloCodes = uniq(cloMatches.map((m) => toCloCode(m)));
    const name = stripCloFromName(l) || "Assessment";

    // ignore non-method lines
    if (name.length < 2) continue;

    out.push({ name, cloCodes, fullMark: null });
  }

  // Deduplicate by normalized name
  const seen = new Set<string>();
  return out.filter((a) => {
    const key = a.name.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractWeightagesBlock(lines: string[]): number[] {
  const idx = lines.findIndex((l) => /Weightage\s*\(\s*%\s*\)/i.test(l) || /^Weightage\b/i.test(l));
  if (idx < 0) return [];

  const weights: number[] = [];
  for (let i = idx + 1; i < Math.min(lines.length, idx + 30); i++) {
    const l = lines[i].trim();
    if (!l) continue;

    if (/^Total$/i.test(l)) break;
    if (/^UNIVERSITI\b/i.test(l)) break;

    // Match plain numbers or e.g. "100%"
    const m = l.match(/^(\d{1,3})(?:\s*%\s*)?$/);
    if (!m) continue;

    const n = Number.parseInt(m[1], 10);
    if (!Number.isFinite(n) || n < 0 || n > 100) continue;
    if (n === 100) {
      // Usually the total row; stop once we hit it.
      break;
    }
    weights.push(n);
  }

  return weights;
}

function extractAssessmentNamesAroundWeightage(lines: string[]): string[] {
  const idx = lines.findIndex((l) => /Weightage\s*\(\s*%\s*\)/i.test(l) || /^Weightage\b/i.test(l));
  if (idx < 0) return [];

  const names: string[] = [];
  for (let i = Math.max(0, idx - 20); i < Math.min(lines.length, idx + 20); i++) {
    const l = lines[i].trim();
    if (!l) continue;
    if (/\bWeightage\b/i.test(l)) continue;
    if (/^Total$/i.test(l)) continue;
    if (/^\d{1,3}%?$/.test(l)) continue;
    if (/^UNIVERSITI\b/i.test(l)) continue;

    // Some PDFs flatten: "Test  Assignment  Quiz  Final Assessment(s)"
    if (assessmentKeywordRegex.test(l) && /\s{2,}/.test(l)) {
      const parts = l
        .split(/\s{2,}/)
        .map((p) => p.trim())
        .filter(Boolean);
      for (const p of parts) {
        if (assessmentKeywordRegex.test(p)) names.push(stripCloFromName(p));
      }
      continue;
    }

    if (assessmentKeywordRegex.test(l) && l.length <= 40) {
      names.push(stripCloFromName(l));
    }
  }

  const dedup: string[] = [];
  const seen = new Set<string>();
  for (const n of names) {
    const key = normalizeAssessmentName(n);
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(titleCaseSimple(n));
  }
  return dedup;
}

function extractAssessmentsFromNameAndWeightage(lines: string[]): ExtractedAssessmentDraft[] {
  const weights = extractWeightagesBlock(lines);
  if (weights.length === 0) return [];
  const names = extractAssessmentNamesAroundWeightage(lines);
  if (names.length === 0) return [];
  if (names.length !== weights.length) return [];

  return names.map((name, i) => ({ name, weightage: weights[i] ?? 0, fullMark: null, cloCodes: [] }));
}

function extractAssessmentsByPairingMethodsAndWeightage(lines: string[]): ExtractedAssessmentDraft[] {
  const methods = extractMethodsBlockAssessments(lines);
  const weights = extractWeightagesBlock(lines);
  if (methods.length === 0 || weights.length === 0) return [];
  if (methods.length !== weights.length) return [];

  return methods.map((m, i) => ({
    name: m.name,
    cloCodes: m.cloCodes,
    fullMark: null,
    weightage: weights[i] ?? 0,
  }));
}

export function extractCourseFromText(inputText: string): ExtractedCourseDraft {
  const text = normalizeText(inputText);
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const meta = extractCourseMeta(lines);
  const clos = extractClos(text);

  const cloAssessmentHints = extractCloAssessmentHints(lines);

  // First try the common UniKL CLP structure:
  // Methods list (with CLO mapping) + Weightage (%) list (numbers only)
  const pairedAssessments = extractAssessmentsByPairingMethodsAndWeightage(lines);

  // Next try: extract names around Weightage header + numbers (for flattened tables)
  const nameWeightAssessments = pairedAssessments.length > 0 ? [] : extractAssessmentsFromNameAndWeightage(lines);

  // Next try: CLP2 variant around "Assessments Type Methods" / "Total 4 assessment methods"
  const methodsBlockAssessments =
    pairedAssessments.length > 0 || nameWeightAssessments.length > 0 ? [] : extractAssessmentsFromAssessmentMethodsBlock(lines);

  const assessmentsRaw: ExtractedAssessmentDraft[] =
    pairedAssessments.length > 0
      ? pairedAssessments
      : nameWeightAssessments.length > 0
        ? nameWeightAssessments
        : methodsBlockAssessments.length > 0
          ? methodsBlockAssessments
          : [];
  if (assessmentsRaw.length === 0) {
    for (const line of lines) {
      const a = parseAssessmentLine(line);
      if (a) assessmentsRaw.push(a);
    }
  }

  // Deduplicate by normalized name
  const seen = new Set<string>();
  const assessments: ExtractedAssessmentDraft[] = [];
  for (const a of assessmentsRaw) {
    const key = a.name.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(key)) continue;
    seen.add(key);
    // Apply hint mapping if we have it (e.g. CLO √ ... Quiz/Final/Test)
    const hintCloCodes = getHintCloCodes(cloAssessmentHints, a.name);
    const mergedCloCodes = uniq([...(a.cloCodes ?? []), ...hintCloCodes]);
    assessments.push({ ...a, cloCodes: mergedCloCodes });
  }

  // If CLO list is empty but we see CLO references in assessments, infer them
  const cloFromAssessments = uniq(assessments.flatMap((a) => a.cloCodes));
  const finalClos = clos.length > 0 ? clos : cloFromAssessments.map((code) => ({ code, description: null }));

  const warnings: string[] = [];
  if (!meta.code) warnings.push("Course code not confidently detected.");
  if (!meta.name) warnings.push("Course name not confidently detected.");
  if (assessments.length === 0) warnings.push("No assessments detected. Try pasting the assessment section or use a clearer CLP.");
  if (finalClos.length === 0) warnings.push("No CLOs detected.");

  const weightSum = assessments.reduce((sum, a) => sum + (Number.isFinite(a.weightage) ? a.weightage : 0), 0);
  if (assessments.length > 0 && weightSum !== 100) {
    warnings.push(`Total assessment weightage is ${weightSum}%, not 100%.`);
  }
  if (assessments.some((a) => a.cloCodes.length === 0)) {
    warnings.push("Some assessments have no CLO mapping.");
  }

  let confidence = 1.0;
  if (!meta.code) confidence -= 0.1;
  if (!meta.name) confidence -= 0.1;
  if (finalClos.length === 0) confidence -= 0.2;
  if (assessments.length === 0) confidence -= 0.5;
  if (assessments.length > 0 && weightSum !== 100) confidence -= 0.2;
  if (assessments.some((a) => a.cloCodes.length === 0)) confidence -= 0.2;
  confidence = Math.max(0, Math.min(1, confidence));

  return {
    code: meta.code,
    name: meta.name,
    semester: meta.semester,
    year: meta.year,
    clos: finalClos,
    assessments,
    confidence,
    warnings,
    rawTextSample: text.slice(0, 4000),
  };
}
