/*
  Warnings:

  - You are about to drop the column `lecturerId` on the `Course` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "CourseLecturer" (
    "courseId" TEXT NOT NULL,
    "lecturerId" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("courseId", "lecturerId"),
    CONSTRAINT "CourseLecturer_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CourseLecturer_lecturerId_fkey" FOREIGN KEY ("lecturerId") REFERENCES "Lecturer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Course" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "semester" TEXT,
    "year" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Course" ("code", "createdAt", "id", "name", "semester", "updatedAt", "year") SELECT "code", "createdAt", "id", "name", "semester", "updatedAt", "year" FROM "Course";
DROP TABLE "Course";
ALTER TABLE "new_Course" RENAME TO "Course";
CREATE UNIQUE INDEX "Course_code_semester_year_key" ON "Course"("code", "semester", "year");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CourseLecturer_courseId_idx" ON "CourseLecturer"("courseId");

-- CreateIndex
CREATE INDEX "CourseLecturer_lecturerId_idx" ON "CourseLecturer"("lecturerId");
