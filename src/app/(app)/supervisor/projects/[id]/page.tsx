import { requireLecturer } from "@/lib/requireAuth";
import SupervisorProjectDetailClient from "./ui";

export default async function SupervisorProjectDetailPage() {
  await requireLecturer();
  return <SupervisorProjectDetailClient />;
}
