import { requireAdmin } from "@/lib/requireAuth";
import CoordinatorProjectsClient from "./ui";

export default async function CoordinatorProjectsPage() {
  await requireAdmin();
  return <CoordinatorProjectsClient />;
}
