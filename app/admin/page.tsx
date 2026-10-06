import { requireAdminPage } from "@/lib/admin-auth";
import { AdminDashboard } from "./admin-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireAdminPage("/admin");
  return <AdminDashboard adminName={user.username} />;
}
