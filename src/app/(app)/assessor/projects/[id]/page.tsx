import { requireLecturer } from "@/lib/requireAuth";
import AssessorProjectDetailClient from "./ui";

export default async function AssessorProjectDetailPage() {
  await requireLecturer();
  return <AssessorProjectDetailClient />;
}
