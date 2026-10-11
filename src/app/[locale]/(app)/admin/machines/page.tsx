import { ChevronDown, Printer } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { MachineForm } from "@/components/admin-forms";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminMachinesPage() {
  const [t, supabase] = await Promise.all([
    getTranslations("Admin"),
    createClient(),
  ]);
  const [{ data: areas }, { data: machines }] = await Promise.all([
    supabase.from("areas").select("id, code, name").order("code"),
    supabase
      .from("machines")
      .select("id, area_id, code, name, criticality, active")
      .order("code"),
  ]);
  const areaList = areas ?? [];

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <details className="group min-w-0 flex-1 rounded-xl border bg-surface">
          <summary className="flex h-12 cursor-pointer list-none items-center gap-2 px-4 font-semibold">
            {t("machines.add")}
            <ChevronDown
              aria-hidden
              className="size-4 transition-transform group-open:rotate-180"
            />
          </summary>
          <div className="border-t p-4">
            <MachineForm areas={areaList} />
          </div>
        </details>
        <Link
          href="/admin/machines/labels"
          className={buttonVariants({ variant: "secondary" })}
        >
          <Printer aria-hidden />
          {t("machines.labels")}
        </Link>
      </div>

      {areaList.map((area) => {
        const items = (machines ?? []).filter((m) => m.area_id === area.id);
        return (
          <section key={area.id} aria-labelledby={`area-${area.id}`}>
            <h2
              id={`area-${area.id}`}
              className="mb-3 text-sm font-semibold text-muted-foreground"
            >
              {area.code} · {area.name} ({items.length})
            </h2>
            <ul className="grid gap-2">
              {items.map((machine) => (
                <li key={machine.id}>
                  <details className="group rounded-xl border bg-surface">
                    <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-2">
                      <span className="w-28 shrink-0 font-mono text-sm text-muted-foreground">
                        {machine.code}
                      </span>
                      <span className="min-w-0 flex-1 font-medium">
                        {machine.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {t(`criticality.${machine.criticality}`)}
                      </span>
                      {!machine.active && (
                        <span className="rounded-md bg-surface-muted px-2 py-1 text-xs">
                          {t("inactive")}
                        </span>
                      )}
                      <ChevronDown
                        aria-hidden
                        className="size-4 shrink-0 transition-transform group-open:rotate-180"
                      />
                    </summary>
                    <div className="border-t p-4">
                      <MachineForm machine={machine} areas={areaList} />
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
