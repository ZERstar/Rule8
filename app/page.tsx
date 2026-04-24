import { redirect } from "next/navigation";

import { getToken } from "@/lib/auth-server";

export default async function HomePage() {
  const token = await getToken();

  if (token) {
    redirect("/dashboard");
  }

  redirect("/sign-in");
}
