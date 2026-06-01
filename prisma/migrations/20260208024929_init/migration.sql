-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "semester" TEXT,
    "year" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Clo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Clo_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weightage" INTEGER NOT NULL,
    "fullMark" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Assessment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssessmentClo" (
    "assessmentId" TEXT NOT NULL,
    "cloId" TEXT NOT NULL,

    PRIMARY KEY ("assessmentId", "cloId"),
    CONSTRAINT "AssessmentClo_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssessmentClo_cloId_fkey" FOREIGN KEY ("cloId") REFERENCES "Clo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarkEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "studentId" TEXT,
    "rawMark" REAL NOT NULL,
    "fullMark" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MarkEntry_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MarkEntry_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GpaScale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "minMark" INTEGER NOT NULL,
    "maxMark" INTEGER NOT NULL,
    "grade" TEXT NOT NULL,
    "gpa" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Course_code_semester_year_key" ON "Course"("code", "semester", "year");

-- CreateIndex
CREATE INDEX "Clo_courseId_idx" ON "Clo"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "Clo_courseId_code_key" ON "Clo"("courseId", "code");

-- CreateIndex
CREATE INDEX "Assessment_courseId_idx" ON "Assessment"("courseId");

-- CreateIndex
CREATE INDEX "AssessmentClo_cloId_idx" ON "AssessmentClo"("cloId");

-- CreateIndex
CREATE INDEX "MarkEntry_courseId_idx" ON "MarkEntry"("courseId");

-- CreateIndex
CREATE INDEX "MarkEntry_assessmentId_idx" ON "MarkEntry"("assessmentId");

-- CreateIndex
CREATE INDEX "GpaScale_minMark_idx" ON "GpaScale"("minMark");
