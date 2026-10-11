"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ROLES } from "@/lib/tickets/status";

// Admin writes rely on RLS and admin_update_profile for authorisation:
// only managers may change areas, machines, settings and people.

export type AdminState = {
  error:
    | "invalid"
    | "duplicate"
    | "forbidden"
    | "cannot_change_self"
    | "area_required"
    | "unknown"
    | null;
  ok?: boolean;
  fields?: string[];
};

function fieldsOf(error: z.ZodError) {
  return [...new Set(error.issues.map((i) => String(i.path[0])))];
}

function toAdminError(error: { code?: string; message?: string }): AdminState {
  if (error.code === "23505") return { error: "duplicate" };
  if (error.code === "42501") return { error: "forbidden" };
  if (error.message === "cannot_change_self")
    return { error: "cannot_change_self" };
  if (error.message === "area_required") return { error: "area_required" };
  console.error("Admin action failed", error);
  return { error: "unknown" };
}

const code = z
  .string()
  .trim()
  .min(1)
  .max(30)
  .transform((s) => s.toUpperCase());

const areaSchema = z.object({
  id: z.uuid().optional(),
  code,
  name: z.string().trim().min(2).max(100),
});

export async function saveArea(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const parsed = areaSchema.safeParse({
    id: formData.get("id") || undefined,
    code: formData.get("code"),
    name: formData.get("name"),
  });
  if (!parsed.success)
    return { error: "invalid", fields: fieldsOf(parsed.error) };
  const { id, ...area } = parsed.data;

  const supabase = await createClient();
  const { data, error } = id
    ? await supabase.from("areas").update(area).eq("id", id).select("id")
    : await supabase.from("areas").insert(area).select("id");
  if (error) return toAdminError(error);
  if (!data?.length) return { error: "forbidden" };
  refresh();
  return { error: null, ok: true };
}

const machineSchema = z.object({
  id: z.uuid().optional(),
  area_id: z.uuid(),
  code,
  name: z.string().trim().min(2).max(120),
  criticality: z.enum(["A", "B", "C"]),
  active: z.boolean(),
});

export async function saveMachine(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const parsed = machineSchema.safeParse({
    id: formData.get("id") || undefined,
    area_id: formData.get("area_id"),
    code: formData.get("code"),
    name: formData.get("name"),
    criticality: formData.get("criticality"),
    // New machines start active; the edit form sends a checkbox ("true" when ticked).
    active: formData.get("id")
      ? formData.getAll("active").includes("true")
      : true,
  });
  if (!parsed.success)
    return { error: "invalid", fields: fieldsOf(parsed.error) };
  const { id, ...machine } = parsed.data;

  const supabase = await createClient();
  const { data, error } = id
    ? await supabase.from("machines").update(machine).eq("id", id).select("id")
    : await supabase.from("machines").insert(machine).select("id");
  if (error) return toAdminError(error);
  if (!data?.length) return { error: "forbidden" };
  refresh();
  return { error: null, ok: true };
}

const userSchema = z.object({
  id: z.uuid(),
  role: z.enum(ROLES),
  area_id: z.uuid().nullable(),
  active: z.boolean(),
});

export async function updateUser(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const parsed = userSchema.safeParse({
    id: formData.get("id"),
    role: formData.get("role"),
    area_id: formData.get("area_id") || null,
    active: formData.get("active") === "on",
  });
  if (!parsed.success)
    return { error: "invalid", fields: fieldsOf(parsed.error) };
  const user = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_profile", {
    p_user_id: user.id,
    p_role: user.role,
    p_area_id: user.area_id,
    p_active: user.active,
  });
  if (error) return toAdminError(error);
  refresh();
  return { error: null, ok: true };
}

export async function setSelfAssign(formData: FormData) {
  const supabase = await createClient();
  await supabase
    .from("app_settings")
    .update({
      allow_technician_self_assign: formData.get("enabled") === "true",
    })
    .eq("id", true);
  refresh();
}
