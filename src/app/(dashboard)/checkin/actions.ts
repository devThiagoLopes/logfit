"use server";

import { headers } from "next/headers";

import { auth } from "@/lib/auth/auth";
import { hasRole } from "@/lib/permissions";
import { getCheckinsRecentes } from "@/services/checkins";

async function requireStaff() {
  const session = await auth.api.getSession({ headers: await headers() });
  return hasRole(session?.user, ["admin", "instrutor"]);
}

export async function getCheckinsRecentesAction() {
  if (!(await requireStaff())) {
    return { error: "Você não tem permissão para ver o check-in." };
  }

  const checkins = await getCheckinsRecentes();
  return { success: true as const, checkins };
}
