import { CircleAlert, Inbox, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LiveRefresh } from "@/components/live-refresh";
import { ManagerBoard } from "@/components/manager-board";
import { TicketCard } from "@/components/ticket-card";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getTechnicians, TICKET_SUMMARY } from "@/lib/tickets/queries";
import { cn } from "@/lib/utils";

const CLOSED_STATUSES = "(closed,cancelled)";
const LEADER_DONE = "(confirmed,closed,cancelled)";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  const user = await requireUser(locale);
  const [t, supabase] = await Promise.all([
    getTranslations("Home"),
    createClient(),
  ]);
  const isManager = user.role === "manager";

  // RLS narrows this to what the role may see: the leader's area,
  // the technician's own tickets plus the pool, or everything for the manager.
  // Confirmed tickets stay on the manager's board until closed.
  const [{ data: tickets, error }, technicians] = await Promise.all([
    supabase
      .from("tickets")
      .select(TICKET_SUMMARY)
      .not("status", "in", isManager ? CLOSED_STATUSES : LEADER_DONE)
      .order("machine_stopped", { ascending: false })
      .order("priority")
      .order("reported_at"),
    isManager ? getTechnicians(supabase) : Promise.resolve([]),
  ]);
  const now = new Date();

  const heading =
    user.role === "area_leader"
      ? t("heading.area_leader", { area: user.area?.name ?? "" })
      : t(`heading.${user.role}`);
  const canReport = user.role !== "technician";

  return (
    // Room for the fixed report button on phones.
    <div className={cn(canReport && "pb-24 sm:pb-0")}>
      <LiveRefresh />
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
      ) : isManager ? (
        <ManagerBoard tickets={tickets} technicians={technicians} now={now} />
      ) : user.role === "technician" ? (
        <div className="mt-6 grid max-w-3xl gap-8">
          {[
            {
              key: "mine",
              items: tickets.filter((x) => x.status !== "new"),
            },
            {
              key: "pool",
              items: tickets.filter((x) => x.status === "new"),
            },
          ].map(({ key, items }) => (
            <section key={key} aria-labelledby={`tech-${key}`}>
              <h2
                id={`tech-${key}`}
                className="mb-3 flex items-center gap-2 text-sm font-semibold"
              >
                {t(key as "mine" | "pool")}
                <span className="inline-grid h-6 min-w-6 place-items-center rounded-full bg-surface-muted px-1.5 text-xs text-muted-foreground">
                  {items.length}
                </span>
              </h2>
              {items.length === 0 ? (
                <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                  {key === "mine" ? t("emptyMine") : t("empty")}
                </p>
              ) : (
                <ul className="grid gap-3">
                  {items.map((ticket) => (
                    <li key={ticket.id}>
                      <TicketCard ticket={ticket} now={now} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div className="mt-8 flex max-w-3xl flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center">
          <Inbox aria-hidden className="size-8 text-muted-foreground" />
          <p className="mt-3 font-medium">{t("empty")}</p>
        </div>
      ) : (
        <ul className="mt-6 grid max-w-3xl gap-3">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <TicketCard ticket={ticket} now={now} />
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
    </div>
  );
}
