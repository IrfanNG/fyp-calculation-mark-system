import { requireLecturer } from "@/lib/requireAuth";
import AssessorProjectsClient from "./ui";

export default async function AssessorProjectsPage() {
  await requireLecturer();
  return <AssessorProjectsClient />;
}
