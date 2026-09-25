"use server";

import { redirect } from "next/navigation";
import { fermerSession } from "@/server/auth/cookies";

export async function seDeconnecter(): Promise<void> {
  await fermerSession();
  redirect("/connexion");
}
