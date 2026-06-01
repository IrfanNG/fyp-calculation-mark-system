-- AlterTable
ALTER TABLE "AssessorMark" ADD COLUMN "presentationMark" REAL;
ALTER TABLE "AssessorMark" ADD COLUMN "reportMark" REAL;

-- AlterTable
ALTER TABLE "FinalMark" ADD COLUMN "paperTotal" REAL;
ALTER TABLE "FinalMark" ADD COLUMN "phase" TEXT;
ALTER TABLE "FinalMark" ADD COLUMN "presentationTotal" REAL;
ALTER TABLE "FinalMark" ADD COLUMN "progressTotal" REAL;
ALTER TABLE "FinalMark" ADD COLUMN "reportTotal" REAL;

-- AlterTable
ALTER TABLE "SupervisorMark" ADD COLUMN "paperMark" REAL;
ALTER TABLE "SupervisorMark" ADD COLUMN "presentationMark" REAL;
ALTER TABLE "SupervisorMark" ADD COLUMN "progressMark" REAL;
ALTER TABLE "SupervisorMark" ADD COLUMN "reportMark" REAL;

-- CreateTable
CREATE TABLE "CoordinatorMark" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "coordinatorId" TEXT NOT NULL,
    "progressMark" REAL NOT NULL,
    "notes" TEXT,
    "gradedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CoordinatorMark_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "FypProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CoordinatorMark_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "Lecturer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FypProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "studentId" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "phase" TEXT NOT NULL DEFAULT 'FYP1',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FypProject_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FypProject_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Lecturer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_FypProject" ("createdAt", "description", "id", "status", "studentId", "supervisorId", "title", "updatedAt") SELECT "createdAt", "description", "id", "status", "studentId", "supervisorId", "title", "updatedAt" FROM "FypProject";
DROP TABLE "FypProject";
ALTER TABLE "new_FypProject" RENAME TO "FypProject";
CREATE UNIQUE INDEX "FypProject_studentId_key" ON "FypProject"("studentId");
CREATE INDEX "FypProject_supervisorId_idx" ON "FypProject"("supervisorId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CoordinatorMark_projectId_key" ON "CoordinatorMark"("projectId");

-- CreateIndex
CREATE INDEX "CoordinatorMark_coordinatorId_idx" ON "CoordinatorMark"("coordinatorId");
