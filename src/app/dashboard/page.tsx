import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

// Role-based redirect after login
export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const role = session.user.role;
  if (role === "BAND") redirect("/band/dashboard");
  if (role === "VENUE") redirect("/venue/dashboard");
  if (role === "ADMIN") redirect("/admin");

  redirect("/");
}
