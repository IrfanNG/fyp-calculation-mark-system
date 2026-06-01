-- CreateTable
CREATE TABLE "FypProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "studentId" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FypProject_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FypProject_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Lecturer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FypSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    CONSTRAINT "FypSubmission_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "FypProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FypFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FypFeedback_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "FypProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FypFeedback_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Lecturer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssessmentSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "scheduledAt" DATETIME NOT NULL,
    "venue" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AssessorAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "assessorId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssessorAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "FypProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssessorAssignment_assessorId_fkey" FOREIGN KEY ("assessorId") REFERENCES "Lecturer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AssessorAssignment_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "AssessmentSchedule" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SupervisorMark" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "mark" REAL NOT NULL,
    "notes" TEXT,
    "gradedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupervisorMark_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "FypProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SupervisorMark_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Lecturer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssessorMark" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "assessorId" TEXT NOT NULL,
    "mark" REAL NOT NULL,
    "notes" TEXT,
    "gradedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AssessorMark_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "FypProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssessorMark_assessorId_fkey" FOREIGN KEY ("assessorId") REFERENCES "Lecturer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinalMark" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "supervisorWeight" REAL NOT NULL DEFAULT 40,
    "assessorWeight" REAL NOT NULL DEFAULT 60,
    "finalMark" REAL NOT NULL,
    "grade" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FinalMark_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "FypProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lecturer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "staffId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "role" TEXT NOT NULL DEFAULT 'supervisor',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Lecturer" ("createdAt", "id", "isAdmin", "name", "passwordHash", "staffId", "updatedAt") SELECT "createdAt", "id", "isAdmin", "name", "passwordHash", "staffId", "updatedAt" FROM "Lecturer";
DROP TABLE "Lecturer";
ALTER TABLE "new_Lecturer" RENAME TO "Lecturer";
CREATE UNIQUE INDEX "Lecturer_staffId_key" ON "Lecturer"("staffId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "FypProject_studentId_key" ON "FypProject"("studentId");

-- CreateIndex
CREATE INDEX "FypProject_supervisorId_idx" ON "FypProject"("supervisorId");

-- CreateIndex
CREATE INDEX "FypSubmission_projectId_idx" ON "FypSubmission"("projectId");

-- CreateIndex
CREATE INDEX "FypFeedback_projectId_idx" ON "FypFeedback"("projectId");

-- CreateIndex
CREATE INDEX "FypFeedback_authorId_idx" ON "FypFeedback"("authorId");

-- CreateIndex
CREATE INDEX "AssessorAssignment_projectId_idx" ON "AssessorAssignment"("projectId");

-- CreateIndex
CREATE INDEX "AssessorAssignment_assessorId_idx" ON "AssessorAssignment"("assessorId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessorAssignment_projectId_assessorId_key" ON "AssessorAssignment"("projectId", "assessorId");

-- CreateIndex
CREATE UNIQUE INDEX "SupervisorMark_projectId_key" ON "SupervisorMark"("projectId");

-- CreateIndex
CREATE INDEX "AssessorMark_projectId_idx" ON "AssessorMark"("projectId");

-- CreateIndex
CREATE INDEX "AssessorMark_assessorId_idx" ON "AssessorMark"("assessorId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessorMark_projectId_assessorId_key" ON "AssessorMark"("projectId", "assessorId");

-- CreateIndex
CREATE UNIQUE INDEX "FinalMark_projectId_key" ON "FinalMark"("projectId");
