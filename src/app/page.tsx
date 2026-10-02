import { redirect } from "next/navigation";

// Home redirects to the class list — the subject list lives at /subjects.
export default function DashboardPage() {
  redirect("/classes");
}
