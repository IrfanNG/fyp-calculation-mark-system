import { requireAdmin } from "@/lib/requireAuth";
import AssignAssessorClient from "./ui";

export default async function AssignAssessorPage() {
  await requireAdmin();
  return <AssignAssessorClient />;
}
