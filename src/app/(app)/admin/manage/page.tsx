import { requireAdmin } from "@/lib/requireAuth";
import AdminManageClient from "./ui";

export default async function AdminManagePage() {
  await requireAdmin();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Admin</h1>
        <p className="text-sm text-(--unikl-muted)">Add lecturers and students.</p>
      </div>
      <AdminManageClient />
    </div>
  );
}
