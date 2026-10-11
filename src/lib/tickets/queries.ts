import "server-only";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export const TICKET_SUMMARY =
  "id, number, title, status, priority, machine_stopped, reported_at, machines(code, name), assignee:profiles!tickets_assigned_to_fkey(full_name)" as const;

export async function getTechnicians(supabase: Client) {
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "technician")
    .eq("active", true)
    .order("full_name");
  return data ?? [];
}
