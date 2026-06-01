import { requireLecturer } from "@/lib/requireAuth";
import SupervisorProjectsClient from "./ui";

export default async function SupervisorProjectsPage() {
  await requireLecturer();
  return <SupervisorProjectsClient />;
}
