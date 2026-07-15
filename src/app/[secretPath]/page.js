import { notFound } from "next/navigation";
import StaffDashboard from "./components/StaffDashboard";
import AdminDashboard from "./components/AdminDashboard";
import SuperAdminDashboard from "./components/SuperAdminDashboard";

export default async function SecretRoute({ params }) {
  // Resolve params promise (required in Next.js App Router)
  const resolvedParams = await params;
  const { secretPath } = resolvedParams;

  const STAFF_PATH = process.env.NEXT_PUBLIC_STAFF_PATH || "kitchen";
  const ADMIN_PATH = process.env.NEXT_PUBLIC_ADMIN_PATH || "office";
  const SUPERADMIN_PATH = process.env.NEXT_PUBLIC_SUPERADMIN_PATH || "superadmin";

  if (secretPath === STAFF_PATH) {
    return <StaffDashboard />;
  }

  if (secretPath === ADMIN_PATH) {
    return <AdminDashboard />;
  }

  if (secretPath === SUPERADMIN_PATH) {
    return <SuperAdminDashboard />;
  }

  // Any other URL returns a standard 404 Not Found page
  return notFound();
}
