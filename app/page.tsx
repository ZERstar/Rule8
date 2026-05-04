import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth-server";
import { LandingPage } from "@/components/landing/LandingPage";

export default async function HomePage() {
  const authed = await isAuthenticated();
  if (authed) redirect("/dashboard");
  return <LandingPage />;
}
