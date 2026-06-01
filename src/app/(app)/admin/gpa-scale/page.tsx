import { requireAdmin } from "@/lib/requireAuth";
import GpaScaleClient from "./ui";

export default async function GpaScalePage() {
  await requireAdmin();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">GPA Scale</h1>
        <p className="text-sm text-(--unikl-muted)">Configure grade thresholds used for GPA calculation.</p>
      </div>
      <GpaScaleClient />
    </div>
  );
}
