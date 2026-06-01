import { prisma } from "./prisma";

/**
 * Check if a lecturer has access to a course (either assigned or admin)
 */
export async function lecturerHasAccessToCourse(
  lecturerId: string,
  courseId: string
): Promise<boolean> {
  const assignment = await prisma.courseLecturer.findFirst({
    where: {
      courseId,
      lecturerId,
    },
  });

  return assignment !== null;
}

/**
 * Check if a course has any lecturers assigned
 */
export async function courseHasLecturers(courseId: string): Promise<boolean> {
  const count = await prisma.courseLecturer.count({
    where: { courseId },
  });

  return count > 0;
}

/**
 * Get all lecturer IDs for a course
 */
export async function getCourseLecturerIds(courseId: string): Promise<string[]> {
  const assignments = await prisma.courseLecturer.findMany({
    where: { courseId },
    select: { lecturerId: true },
  });

  return assignments.map((a) => a.lecturerId);
}
