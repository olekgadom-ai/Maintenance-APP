import { ClipboardCheck, HardHat, LayoutDashboard, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { PRIORITIES, type Role, type TicketStatus } from "@/lib/tickets/status";

const roleIcons: Record<Role, typeof Wrench> = {
  area_leader: ClipboardCheck,
  technician: HardHat,
  manager: LayoutDashboard,
};

const happyPath: TicketStatus[] = [
  "new",
  "assigned",
  "in_progress",
  "resolved",
  "confirmed",
  "closed",
];

export default function HomePage() {
  const t = useTranslations();

  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <span className="flex items-center gap-2.5 font-semibold">
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Wrench aria-hidden className="size-5" />
            </span>
            {t("Common.appName")}
          </span>
          <LocaleSwitcher />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-10 pb-16 sm:pt-16">
        <p className="text-sm font-medium text-muted-foreground">
          {t("Home.eyebrow")}
        </p>
        <h1 className="mt-3 max-w-2xl text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
          {t("Home.title")}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-pretty text-muted-foreground">
          {t("Home.lead")}
        </p>

        <section className="mt-12" aria-labelledby="roles">
          <h2
            id="roles"
            className="text-sm font-semibold text-muted-foreground"
          >
            {t("Home.rolesHeading")}
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {(Object.keys(roleIcons) as Role[]).map((role) => {
              const Icon = roleIcons[role];
              return (
                <li key={role} className="rounded-xl border bg-surface p-5">
                  <Icon aria-hidden className="size-6 text-muted-foreground" />
                  <p className="mt-4 font-semibold">
                    {t(`Roles.${role}.name`)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t(`Roles.${role}.summary`)}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-12" aria-labelledby="lifecycle">
          <h2
            id="lifecycle"
            className="text-sm font-semibold text-muted-foreground"
          >
            {t("Home.lifecycleHeading")}
          </h2>
          <ol className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-3">
            {happyPath.map((status, i) => (
              <li key={status} className="flex items-center gap-2">
                <StatusBadge status={status} />
                {i < happyPath.length - 1 && (
                  <span aria-hidden className="text-muted-foreground">
                    →
                  </span>
                )}
              </li>
            ))}
          </ol>
          <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <StatusBadge status="rejected" />
            {t("Home.lifecycleNote")}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {PRIORITIES.map((p) => (
              <PriorityBadge key={p} priority={p} />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
