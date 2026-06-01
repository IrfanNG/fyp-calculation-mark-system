-- CreateTable
CREATE TABLE "FypReportAssessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "assessorId" TEXT NOT NULL,
    "s1_bg" REAL NOT NULL DEFAULT 0,
    "s1_problem" REAL NOT NULL DEFAULT 0,
    "s1_significance" REAL NOT NULL DEFAULT 0,
    "s1_objScope" REAL NOT NULL DEFAULT 0,
    "s2_theory" REAL NOT NULL DEFAULT 0,
    "s2_relevancy" REAL NOT NULL DEFAULT 0,
    "s3_material" REAL NOT NULL DEFAULT 0,
    "s3_analysis" REAL NOT NULL DEFAULT 0,
    "s3_standard" REAL NOT NULL DEFAULT 0,
    "s3_plan" REAL NOT NULL DEFAULT 0,
    "s4_language" REAL NOT NULL DEFAULT 0,
    "s5_abide" REAL NOT NULL DEFAULT 0,
    "s5_org" REAL NOT NULL DEFAULT 0,
    "totalWeighted" REAL NOT NULL DEFAULT 0,
    "comments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FypReportAssessment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "FypProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FypReportAssessment_assessorId_fkey" FOREIGN KEY ("assessorId") REFERENCES "Lecturer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FypProgressDefenseAssessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "assessorId" TEXT NOT NULL,
    "s1_consultation" REAL NOT NULL DEFAULT 0,
    "s2_proposal" REAL NOT NULL DEFAULT 0,
    "s3_research" REAL NOT NULL DEFAULT 0,
    "s4_aim" REAL NOT NULL DEFAULT 0,
    "s5_independency" REAL NOT NULL DEFAULT 0,
    "totalWeighted" REAL NOT NULL DEFAULT 0,
    "comments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FypProgressDefenseAssessment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "FypProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FypProgressDefenseAssessment_assessorId_fkey" FOREIGN KEY ("assessorId") REFERENCES "Lecturer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FypProgressWeek14Assessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "assessorId" TEXT NOT NULL,
    "s1_consultation" REAL NOT NULL DEFAULT 0,
    "s2_timelines" REAL NOT NULL DEFAULT 0,
    "s3_components" REAL NOT NULL DEFAULT 0,
    "s4_alignment" REAL NOT NULL DEFAULT 0,
    "s5_independency" REAL NOT NULL DEFAULT 0,
    "totalWeighted" REAL NOT NULL DEFAULT 0,
    "comments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FypProgressWeek14Assessment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "FypProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FypProgressWeek14Assessment_assessorId_fkey" FOREIGN KEY ("assessorId") REFERENCES "Lecturer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "FypReportAssessment_projectId_assessorId_key" ON "FypReportAssessment"("projectId", "assessorId");

-- CreateIndex
CREATE UNIQUE INDEX "FypProgressDefenseAssessment_projectId_assessorId_key" ON "FypProgressDefenseAssessment"("projectId", "assessorId");

-- CreateIndex
CREATE UNIQUE INDEX "FypProgressWeek14Assessment_projectId_assessorId_key" ON "FypProgressWeek14Assessment"("projectId", "assessorId");
