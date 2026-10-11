import { CircleCheck, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { BackLink } from "@/components/back-link";
import { LiveRefresh } from "@/components/live-refresh";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import {
  AssignForm,
  PriorityForm,
  TransitionButton,
} from "@/components/ticket-actions";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getTechnicians } from "@/lib/tickets/queries";
import { ASSIGNABLE, type Priority } from "@/lib/tickets/status";

const UUID = /^[0-9a-f-]{36}$/i;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/tickets/[id]">): Promise<Metadata> {
  const { id } = await params;
  const t = await getTranslations("Ticket");
  return { title: t("metaTitle", { id: id.slice(0, 8) }) };
}

export default async function TicketPage({
  params,
  searchParams,
}: PageProps<"/[locale]/tickets/[id]">) {
  const { locale, id } = await params;
  const user = await requireUser(locale);
  if (!UUID.test(id)) notFound();

  const [t, ta, ts, tp, format, supabase, query] = await Promise.all([
    getTranslations("Ticket"),
    getTranslations("Actions"),
    getTranslations("Status"),
    getTranslations("Priority"),
    getFormatter(),
    createClient(),
    searchParams,
  ]);

  // RLS returns nothing for tickets the user may not see, so they 404 like missing ones.
  const { data: ticket } = await supabase
    .from("tickets")
    .select(
      `id, number, title, description, status, priority, machine_stopped, assigned_to,
       root_cause, resolution, reported_at,
       machines(code, name), areas(name),
       reporter:profiles!tickets_reported_by_fkey(full_name),
       assignee:profiles!tickets_assigned_to_fkey(full_name),
       ticket_attachments(id, storage_path, kind),
       ticket_events(id, event_type, from_status, to_status, comment, payload, created_at, actor:profiles(full_name))`,
    )
    .eq("id", id)
    .order("created_at", { referencedTable: "ticket_events" })
    .maybeSingle();
  if (!ticket) notFound();

  const paths = ticket.ticket_attachments.map((a) => a.storage_path);
  const { data: signed } = paths.length
    ? await supabase.storage.from("ticket-photos").createSignedUrls(paths, 3600)
    : { data: [] };
  const photos = (signed ?? []).flatMap((s) =>
    s.signedUrl && s.path ? [{ path: s.path, url: s.signedUrl }] : [],
  );

  const isManager = user.role === "manager";
  const technicians = isManager ? await getTechnicians(supabase) : [];
  const open = !["confirmed", "closed", "cancelled"].includes(ticket.status);

  const when = (iso: string) =>
    format.dateTime(new Date(iso), { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="mx-auto max-w-2xl">
      <LiveRefresh ticketId={ticket.id} />
      <BackLink href="/" label={t("back")} />

      {query.reported && (
        <p
          role="status"
          className="mt-3 flex items-center gap-2 rounded-lg bg-status-done/12 px-3 py-2.5 text-sm font-medium text-status-done"
        >
          <CircleCheck aria-hidden className="size-5" />
          {t("reported")}
        </p>
      )}
      {query.photos === "failed" && (
        <p
          role="alert"
          className="mt-3 flex items-center gap-2 rounded-lg bg-status-progress/14 px-3 py-2.5 text-sm font-medium text-status-progress"
        >
          <TriangleAlert aria-hidden className="size-5" />
          {t("photosFailed")}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm text-muted-foreground">
          {ticket.number}
        </span>
        <StatusBadge status={ticket.status} />
        <PriorityBadge priority={ticket.priority} />
      </div>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-balance">
        {ticket.title}
      </h1>

      {ticket.machine_stopped && (
        <p className="mt-4 flex items-center gap-2 rounded-lg bg-priority-critical px-3 py-2.5 font-semibold text-white">
          <TriangleAlert aria-hidden className="size-5" />
          {t("machineStopped")}
        </p>
      )}

      <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 rounded-xl border bg-surface p-4 sm:grid-cols-2">
        <Field label={t("machine")}>
          <span className="font-mono text-sm">{ticket.machines?.code}</span>{" "}
          {ticket.machines?.name}
        </Field>
        <Field label={t("area")}>{ticket.areas?.name}</Field>
        <Field label={t("reportedBy")}>
          {ticket.reporter?.full_name} · {when(ticket.reported_at)}
        </Field>
        <Field label={t("assignee")}>
          {ticket.assignee?.full_name ?? (
            <span className="text-muted-foreground">{t("unassigned")}</span>
          )}
        </Field>
      </dl>

      {isManager && (
        <section
          aria-labelledby="manager-actions"
          className="mt-6 grid gap-5 rounded-xl border bg-surface p-4"
        >
          <h2 id="manager-actions" className="font-semibold">
            {ta("managerHeading")}
          </h2>
          {ASSIGNABLE.includes(ticket.status) && (
            <div className="grid gap-2">
              <p className="text-sm font-medium text-muted-foreground">
                {ta("technician")}
              </p>
              <AssignForm
                ticketId={ticket.id}
                technicians={technicians}
                currentId={ticket.assigned_to}
              />
            </div>
          )}
          {open && (
            <div className="grid gap-2">
              <p className="text-sm font-medium text-muted-foreground">
                {ta("priority")}
              </p>
              <PriorityForm ticketId={ticket.id} current={ticket.priority} />
            </div>
          )}
          {ticket.status === "confirmed" && (
            <TransitionButton
              ticketId={ticket.id}
              to="closed"
              label={ta("close")}
            />
          )}
          {(ticket.status === "new" || ticket.status === "assigned") && (
            <TransitionButton
              ticketId={ticket.id}
              to="cancelled"
              label={ta("cancel")}
              variant="secondary"
            />
          )}
        </section>
      )}

      {ticket.description && (
        <Section title={t("description")}>
          <p className="whitespace-pre-line">{ticket.description}</p>
        </Section>
      )}

      {photos.length > 0 && (
        <Section title={t("photos")}>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {photos.map((photo) => (
              <li key={photo.path}>
                <a
                  href={photo.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block aspect-square overflow-hidden rounded-lg border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
                  <img
                    src={photo.url}
                    alt=""
                    className="size-full object-cover"
                  />
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(ticket.root_cause || ticket.resolution) && (
        <Section title={t("repair")}>
          <dl className="grid gap-3">
            {ticket.root_cause && (
              <Field label={t("rootCause")}>{ticket.root_cause}</Field>
            )}
            {ticket.resolution && (
              <Field label={t("resolution")}>{ticket.resolution}</Field>
            )}
          </dl>
        </Section>
      )}

      <Section title={t("history")}>
        <ol className="relative grid gap-5 border-l pl-5">
          {ticket.ticket_events.map((event) => (
            <li key={event.id} className="relative">
              <span
                aria-hidden
                className="absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-background bg-muted-foreground"
              />
              <p className="font-medium">
                {event.event_type === "created"
                  ? t("events.created")
                  : event.event_type === "assigned"
                    ? t("events.assigned")
                    : event.event_type === "priority_changed"
                      ? t(
                          "events.priority_changed",
                          priorityChange(event.payload, tp),
                        )
                      : t("events.status_changed", {
                          status: event.to_status ? ts(event.to_status) : "",
                        })}
              </p>
              <p className="text-sm text-muted-foreground">
                {event.actor?.full_name ?? t("system")} ·{" "}
                {when(event.created_at)}
              </p>
              {event.comment && (
                <p className="mt-1 rounded-lg bg-surface-muted px-3 py-2 text-sm whitespace-pre-line">
                  {event.comment}
                </p>
              )}
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function priorityChange(
  payload: unknown,
  tp: (key: Priority) => string,
): { from: string; to: string } {
  const { from, to } = (payload ?? {}) as { from?: Priority; to?: Priority };
  return { from: from ? tp(from) : "?", to: to ? tp(to) : "?" };
}
