"use server";

import { refresh } from "next/cache";
import { hasLocale } from "next-intl";
import { z } from "zod";
import { redirect } from "next/navigation";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { toTicketError, type TicketError } from "./errors";
import {
  isAcceptedPhoto,
  MAX_PHOTOS,
  partSchema,
  reportTicketSchema,
  resolveTicketSchema,
} from "./schemas";
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

type Client = Awaited<ReturnType<typeof createClient>>;

function localeOf(formData: FormData) {
  const locale = formData.get("locale");
  return typeof locale === "string" && hasLocale(routing.locales, locale)
    ? locale
    : routing.defaultLocale;
}

// Uploads accepted photos to the ticket's folder and records them.
// Returns true if any photo failed, so callers can warn without failing the step.
async function uploadPhotos(
  supabase: Client,
  ticketId: string,
  entries: FormDataEntryValue[],
  kind: "report" | "repair",
): Promise<boolean> {
  const photos = entries
    .filter((f): f is File => f instanceof File && isAcceptedPhoto(f))
    .slice(0, MAX_PHOTOS);
  let failed = false;
  for (const photo of photos) {
    const path = `${ticketId}/${crypto.randomUUID()}.${PHOTO_EXTENSIONS[photo.type] ?? "jpg"}`;
    const upload = await supabase.storage
      .from("ticket-photos")
      .upload(path, photo, { contentType: photo.type });
    const insert = upload.error
      ? upload
      : await supabase
          .from("ticket_attachments")
          .insert({ ticket_id: ticketId, storage_path: path, kind });
    if (insert.error) {
      console.error("Photo upload failed", ticketId, insert.error.message);
      failed = true;
    }
  }
  return failed;
}

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
  const photosFailed = await uploadPhotos(
    supabase,
    ticket.id,
    formData.getAll("photos"),
    "report",
  );

  redirect(
    `/${localeOf(formData)}/tickets/${ticket.id}${photosFailed ? "?photos=failed" : "?reported=1"}`,
  );
}

// Workflow actions ------------------------------------------------------------
// Each returns an error key for the form, or refreshes the page on success.

export type ActionState = {
  error: TicketError | "invalid" | null;
  ok?: boolean;
  fields?: string[];
};

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

// Technician finishes the repair: records cause and work done, adds repair
// photos, then hands the ticket to the area leader for sign-off.
export async function resolveTicket(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resolveTicketSchema.safeParse({
    ticketId: formData.get("ticketId"),
    rootCause: formData.get("rootCause") ?? undefined,
    resolution: formData.get("resolution"),
  });
  if (!parsed.success) {
    return {
      error: "invalid",
      fields: [...new Set(parsed.error.issues.map((i) => String(i.path[0])))],
    };
  }
  const { ticketId, rootCause, resolution } = parsed.data;

  const supabase = await createClient();
  const { data: updated, error: updateError } = await supabase
    .from("tickets")
    .update({ root_cause: rootCause || null, resolution })
    .eq("id", ticketId)
    .select("id");
  if (updateError) return { error: toTicketError(updateError) };
  if (!updated?.length) return { error: "not_assignee" };

  const photosFailed = await uploadPhotos(
    supabase,
    ticketId,
    formData.getAll("photos"),
    "repair",
  );

  const { error } = await supabase.rpc("transition_ticket", {
    p_ticket_id: ticketId,
    p_to: "resolved",
  });
  if (error) return { error: toTicketError(error) };
  if (photosFailed) {
    redirect(`/${localeOf(formData)}/tickets/${ticketId}?photos=failed`);
  }
  refresh();
  return { error: null, ok: true };
}

export async function addPart(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = partSchema.safeParse({
    ticketId: formData.get("ticketId"),
    name: formData.get("name"),
    partNumber: formData.get("partNumber") ?? undefined,
    quantity: formData.get("quantity"),
    unit: formData.get("unit") ?? undefined,
  });
  if (!parsed.success) {
    return {
      error: "invalid",
      fields: [...new Set(parsed.error.issues.map((i) => String(i.path[0])))],
    };
  }
  const part = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("ticket_parts").insert({
    ticket_id: part.ticketId,
    name: part.name,
    part_number: part.partNumber || null,
    quantity: part.quantity,
    unit: part.unit,
  });
  // RLS rejects parts on tickets the user is not working on.
  if (error)
    return {
      error: error.code === "42501" ? "not_assignee" : toTicketError(error),
    };
  refresh();
  return { error: null, ok: true };
}

export async function removePart(formData: FormData) {
  const partId = uuid.safeParse(formData.get("partId"));
  if (!partId.success) return;
  const supabase = await createClient();
  await supabase.from("ticket_parts").delete().eq("id", partId.data);
  refresh();
}
