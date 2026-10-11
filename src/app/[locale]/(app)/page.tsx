import { ChevronRight, CircleAlert, Inbox, Plus } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const CLOSED_STATUSES = "(confirmed,closed,cancelled)";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  const user = await requireUser(locale);
  const [t, format, supabase] = await Promise.all([
    getTranslations("Home"),
    getFormatter(),
    createClient(),
  ]);

  // RLS narrows this to what the role may see: the leader's area,
  // the technician's own tickets plus the pool, or everything for the manager.
  const { data: tickets, error } = await supabase
    .from("tickets")
    .select(
      "id, number, title, status, priority, machine_stopped, reported_at, machines(code, name)",
    )
    .not("status", "in", CLOSED_STATUSES)
    .order("machine_stopped", { ascending: false })
    .order("priority")
    .order("reported_at");

  const heading =
    user.role === "area_leader"
      ? t("heading.area_leader", { area: user.area?.name ?? "" })
      : t(`heading.${user.role}`);

  const canReport = user.role !== "technician";

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {t("greeting", { name: user.fullName.split(" ")[0] })}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {heading}
          </h1>
        </div>
        {canReport && (
          <Link
            href="/tickets/new"
            className={cn(
              buttonVariants({ size: "lg" }),
              "hidden sm:inline-flex",
            )}
          >
            <Plus aria-hidden />
            {t("report")}
          </Link>
        )}
      </div>

      {error ? (
        <p className="mt-8 flex items-center gap-2 text-status-rejected">
          <CircleAlert aria-hidden className="size-5" />
          {t("loadError")}
        </p>
      ) : tickets.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center">
          <Inbox aria-hidden className="size-8 text-muted-foreground" />
          <p className="mt-3 font-medium">{t("empty")}</p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <Link
                href={`/tickets/${ticket.id}`}
                className="flex items-center gap-3 rounded-xl border bg-surface p-4 transition-colors hover:bg-surface-muted"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {ticket.number}
                    </span>
                    <PriorityBadge priority={ticket.priority} />
                    {ticket.machine_stopped && (
                      <span className="inline-flex h-7 items-center rounded-md bg-priority-critical/12 px-2 text-xs font-semibold text-priority-critical">
                        {t("machineStopped")}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 font-semibold">{ticket.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {ticket.machines?.code} · {ticket.machines?.name} ·{" "}
                    {format.dateTime(new Date(ticket.reported_at), {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                  <StatusBadge status={ticket.status} className="mt-3" />
                </div>
                <ChevronRight
                  aria-hidden
                  className="size-5 shrink-0 text-muted-foreground"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {canReport && (
        <div className="fixed inset-x-0 bottom-0 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:hidden">
          <Link
            href="/tickets/new"
            className={cn(buttonVariants({ size: "lg" }), "w-full")}
          >
            <Plus aria-hidden />
            {t("report")}
          </Link>
        </div>
      )}
    </>
  );
}
