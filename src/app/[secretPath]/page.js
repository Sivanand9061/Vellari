import { notFound } from "next/navigation";
import StaffDashboard from "./components/StaffDashboard";
import AdminDashboard from "./components/AdminDashboard";

export default async function SecretRoute({ params }) {
  // Resolve params promise (required in Next.js App Router)
  const resolvedParams = await params;
  const { secretPath } = resolvedParams;

  const STAFF_PATH = process.env.NEXT_PUBLIC_STAFF_PATH || "kitchen";
  const ADMIN_PATH = process.env.NEXT_PUBLIC_ADMIN_PATH || "office";

  const STAFF_PIN = process.env.NEXT_PUBLIC_STAFF_PIN || "8867";
  const ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN || "1234";

  if (secretPath === STAFF_PATH) {
    return <StaffDashboard pinCode={STAFF_PIN} />;
  }

  if (secretPath === ADMIN_PATH) {
    return <AdminDashboard pinCode={ADMIN_PIN} />;
  }

  // Any other URL returns a standard 404 Not Found page
  return notFound();
}
