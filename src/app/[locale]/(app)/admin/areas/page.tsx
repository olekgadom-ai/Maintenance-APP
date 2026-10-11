import { getTranslations } from "next-intl/server";
import { AreaForm } from "@/components/admin-forms";
import { createClient } from "@/lib/supabase/server";

export default async function AdminAreasPage() {
  const [t, supabase] = await Promise.all([
    getTranslations("Admin"),
    createClient(),
  ]);
  const { data: areas } = await supabase
    .from("areas")
    .select("id, code, name, machines(count)")
    .order("code");

  return (
    <div className="grid gap-6">
      <section className="rounded-xl border bg-surface p-4">
        <h2 className="mb-3 font-semibold">{t("areas.add")}</h2>
        <AreaForm />
      </section>
      <ul className="grid gap-3">
        {(areas ?? []).map((area) => (
          <li key={area.id} className="rounded-xl border bg-surface p-4">
            <p className="mb-3 text-sm text-muted-foreground">
              {t("areas.machines", { count: area.machines[0]?.count ?? 0 })}
            </p>
            <AreaForm area={area} />
          </li>
        ))}
      </ul>
    </div>
  );
}
