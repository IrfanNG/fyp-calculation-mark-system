-- Step 1: Create CourseLecturer table
CREATE TABLE IF NOT EXISTS "CourseLecturer" (
    "courseId" TEXT NOT NULL,
    "lecturerId" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("courseId", "lecturerId")
);

-- Step 2: Migrate existing data
INSERT INTO "CourseLecturer" ("courseId", "lecturerId")
SELECT "id", "lecturerId" 
FROM "Course" 
WHERE "lecturerId" IS NOT NULL;

-- Step 3: Drop unique constraint and recreate without lecturerId
CREATE TABLE "Course_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "semester" TEXT,
    "year" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Copy data
INSERT INTO "Course_new" SELECT "id", "code", "name", "semester", "year", "createdAt", "updatedAt" FROM "Course";

-- Drop old table and rename
DROP TABLE "Course";
ALTER TABLE "Course_new" RENAME TO "Course";

-- Create new unique index
CREATE UNIQUE INDEX "Course_code_semester_year_key" ON "Course"("code", "semester", "year");

-- Create indexes for CourseLecturer
CREATE INDEX "CourseLecturer_courseId_idx" ON "CourseLecturer"("courseId");
CREATE INDEX "CourseLecturer_lecturerId_idx" ON "CourseLecturer"("lecturerId");
