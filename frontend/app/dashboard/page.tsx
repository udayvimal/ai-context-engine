import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();

  return (
    <DashboardClient
      userId={userId}
      email={user?.emailAddresses[0]?.emailAddress ?? ""}
      name={user?.firstName ?? ""}
    />
  );
}
