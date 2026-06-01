import { requireAdmin } from "@/lib/requireAuth";
import ScheduleClient from "./ui";

export default async function SchedulePage() {
  await requireAdmin();
  return <ScheduleClient />;
}
