import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/tickets/status";

export type CurrentUser = {
  id: string;
  fullName: string;
  role: Role;
  area: { code: string; name: string } | null;
};

// Data access layer: the single place that turns the session cookie into a user.
// Wrapped in cache() so a request reads it once however many components ask.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, active, areas(code, name)")
    .eq("id", userId)
    .single();
  if (!profile?.active) return null;

  return {
    id: profile.id,
    fullName: profile.full_name,
    role: profile.role,
    area: profile.areas,
  };
});

export async function requireUser(locale: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  return user;
}
