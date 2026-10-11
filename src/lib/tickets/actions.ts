"use server";

import { refresh } from "next/cache";
import { hasLocale } from "next-intl";
import { z } from "zod";
import { redirect } from "next/navigation";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { toTicketError, type TicketError } from "./errors";
import { isAcceptedPhoto, MAX_PHOTOS, reportTicketSchema } from "./schemas";
import { PRIORITIES, TICKET_STATUSES } from "./status";

export type ReportTicketState = {
  error: TicketError | "invalid" | null;
  fields?: string[];
};

const PHOTO_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

export async function reportTicket(
  _prev: ReportTicketState,
  formData: FormData,
): Promise<ReportTicketState> {
  const parsed = reportTicketSchema.safeParse({
    machineId: formData.get("machineId"),
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    priority: formData.get("priority") ?? undefined,
    machineStopped: formData.get("machineStopped") ?? undefined,
  });
  if (!parsed.success) {
    return {
      error: "invalid",
      fields: [...new Set(parsed.error.issues.map((i) => String(i.path[0])))],
    };
  }
  const input = parsed.data;

  const supabase = await createClient();
  const { data: ticket, error } = await supabase.rpc("create_ticket", {
    p_machine_id: input.machineId,
    p_title: input.title,
    p_description: input.description,
    p_priority: input.priority,
    p_machine_stopped: input.machineStopped,
  });
  if (error || !ticket) return { error: toTicketError(error) };

  // The ticket exists from here on; a failed photo must not lose the report.
  const photos = formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File && isAcceptedPhoto(f))
    .slice(0, MAX_PHOTOS);
  let photosFailed = false;
  for (const photo of photos) {
    const path = `${ticket.id}/${crypto.randomUUID()}.${PHOTO_EXTENSIONS[photo.type] ?? "jpg"}`;
    const upload = await supabase.storage
      .from("ticket-photos")
      .upload(path, photo, { contentType: photo.type });
    const insert = upload.error
      ? upload
      : await supabase
          .from("ticket_attachments")
          .insert({ ticket_id: ticket.id, storage_path: path, kind: "report" });
    if (insert.error) {
      console.error("Photo upload failed", ticket.id, insert.error.message);
      photosFailed = true;
    }
  }

  const locale = formData.get("locale");
  const prefix =
    typeof locale === "string" && hasLocale(routing.locales, locale)
      ? locale
      : routing.defaultLocale;
  redirect(
    `/${prefix}/tickets/${ticket.id}${photosFailed ? "?photos=failed" : "?reported=1"}`,
  );
}

// Workflow actions ------------------------------------------------------------
// Each returns an error key for the form, or refreshes the page on success.

export type ActionState = { error: TicketError | null; ok?: boolean };

const uuid = z.uuid();

export async function assignTicket(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ticketId = uuid.safeParse(formData.get("ticketId"));
  const technicianId = uuid.safeParse(formData.get("technicianId"));
  if (!ticketId.success || !technicianId.success) {
    return { error: "invalid_technician" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("assign_ticket", {
    p_ticket_id: ticketId.data,
    p_technician_id: technicianId.data,
  });
  if (error) return { error: toTicketError(error) };
  refresh();
  return { error: null, ok: true };
}

export async function setTicketPriority(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ticketId = uuid.safeParse(formData.get("ticketId"));
  const priority = z.enum(PRIORITIES).safeParse(formData.get("priority"));
  if (!ticketId.success || !priority.success) return { error: "unknown" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tickets")
    .update({ priority: priority.data })
    .eq("id", ticketId.data)
    .select("id");
  if (error) return { error: toTicketError(error) };
  // RLS filters the update silently for users who may not edit the ticket.
  if (!data?.length) return { error: "forbidden" };
  refresh();
  return { error: null, ok: true };
}

export async function transitionTicket(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ticketId = uuid.safeParse(formData.get("ticketId"));
  const to = z.enum(TICKET_STATUSES).safeParse(formData.get("to"));
  if (!ticketId.success || !to.success) return { error: "invalid_transition" };
  const comment = String(formData.get("comment") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase.rpc("transition_ticket", {
    p_ticket_id: ticketId.data,
    p_to: to.data,
    p_comment: comment || undefined,
  });
  if (error) return { error: toTicketError(error) };
  refresh();
  return { error: null, ok: true };
}
