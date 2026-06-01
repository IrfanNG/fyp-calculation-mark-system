/*
  Warnings:

  - A unique constraint covering the columns `[code,semester,year,lecturerId]` on the table `Course` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Course_code_semester_year_key";

-- CreateTable
CREATE TABLE "CourseClass" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CourseClass_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Lecturer" ("createdAt", "id", "name", "passwordHash", "staffId", "updatedAt") SELECT "createdAt", "id", "name", "passwordHash", "staffId", "updatedAt" FROM "Lecturer";
DROP TABLE "Lecturer";
ALTER TABLE "new_Lecturer" RENAME TO "Lecturer";
CREATE UNIQUE INDEX "Lecturer_staffId_key" ON "Lecturer"("staffId");
CREATE TABLE "new_MarkEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "courseClassId" TEXT,
    "assessmentId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "studentId" TEXT,
    "rawMark" REAL NOT NULL,
    "fullMark" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MarkEntry_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MarkEntry_courseClassId_fkey" FOREIGN KEY ("courseClassId") REFERENCES "CourseClass" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MarkEntry_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MarkEntry" ("assessmentId", "courseId", "createdAt", "fullMark", "id", "rawMark", "studentId", "studentName", "updatedAt") SELECT "assessmentId", "courseId", "createdAt", "fullMark", "id", "rawMark", "studentId", "studentName", "updatedAt" FROM "MarkEntry";
DROP TABLE "MarkEntry";
ALTER TABLE "new_MarkEntry" RENAME TO "MarkEntry";
CREATE INDEX "MarkEntry_courseId_idx" ON "MarkEntry"("courseId");
CREATE INDEX "MarkEntry_courseClassId_idx" ON "MarkEntry"("courseClassId");
CREATE INDEX "MarkEntry_assessmentId_idx" ON "MarkEntry"("assessmentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CourseClass_courseId_idx" ON "CourseClass"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseClass_courseId_name_key" ON "CourseClass"("courseId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Student_studentId_key" ON "Student"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Course_code_semester_year_lecturerId_key" ON "Course"("code", "semester", "year", "lecturerId");
