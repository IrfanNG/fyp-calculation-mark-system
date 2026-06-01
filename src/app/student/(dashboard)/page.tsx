import { requireStudent } from "@/lib/requireAuthStudent";
import { redirect } from "next/navigation";

export default async function StudentDashboardPage() {
  await requireStudent();
  redirect("/student/fyp");
}
