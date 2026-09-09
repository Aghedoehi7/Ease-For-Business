import { getCurrentUser } from "@/lib/session";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  return <DashboardClient user={user} />;
}