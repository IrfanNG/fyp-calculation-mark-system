import { requireAdmin } from "@/lib/requireAuth";
import FinalMarksClient from "./ui";

export default async function FinalMarksPage() {
  await requireAdmin();
  return <FinalMarksClient />;
}
