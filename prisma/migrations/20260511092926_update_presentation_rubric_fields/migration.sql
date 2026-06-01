-- CreateTable
CREATE TABLE "FypPresentationAssessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "assessorId" TEXT NOT NULL,
    "s1_introClarity" REAL NOT NULL DEFAULT 0,
    "s2_objClarity" REAL NOT NULL DEFAULT 0,
    "s3_contOriginality" REAL NOT NULL DEFAULT 0,
    "s3_contStructure" REAL NOT NULL DEFAULT 0,
    "s3_contAppropriate" REAL NOT NULL DEFAULT 0,
    "s3_contBackground" REAL NOT NULL DEFAULT 0,
    "s3_contMethod" REAL NOT NULL DEFAULT 0,
    "s3_contDiagrams" REAL NOT NULL DEFAULT 0,
    "s4_protoCreativity" REAL NOT NULL DEFAULT 0,
    "s4_protoDifficulty" REAL NOT NULL DEFAULT 0,
    "s5_qaAbility" REAL NOT NULL DEFAULT 0,
    "s5_qaUnderstanding" REAL NOT NULL DEFAULT 0,
    "s5_qaInterpersonal" REAL NOT NULL DEFAULT 0,
    "s6_mediaSuitability" REAL NOT NULL DEFAULT 0,
    "s6_mediaSlides" REAL NOT NULL DEFAULT 0,
    "s7_skillsAttire" REAL NOT NULL DEFAULT 0,
    "s7_skillsOrg" REAL NOT NULL DEFAULT 0,
    "totalWeighted" REAL NOT NULL DEFAULT 0,
    "comments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FypPresentationAssessment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "FypProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FypPresentationAssessment_assessorId_fkey" FOREIGN KEY ("assessorId") REFERENCES "Lecturer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FypProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "studentId" TEXT NOT NULL,
    "supervisorId" TEXT,
    "phase" TEXT NOT NULL DEFAULT 'FYP1',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FypProject_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FypProject_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Lecturer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_FypProject" ("createdAt", "description", "id", "phase", "status", "studentId", "supervisorId", "title", "updatedAt") SELECT "createdAt", "description", "id", "phase", "status", "studentId", "supervisorId", "title", "updatedAt" FROM "FypProject";
DROP TABLE "FypProject";
ALTER TABLE "new_FypProject" RENAME TO "FypProject";
CREATE UNIQUE INDEX "FypProject_studentId_key" ON "FypProject"("studentId");
CREATE INDEX "FypProject_supervisorId_idx" ON "FypProject"("supervisorId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "FypPresentationAssessment_projectId_assessorId_key" ON "FypPresentationAssessment"("projectId", "assessorId");
