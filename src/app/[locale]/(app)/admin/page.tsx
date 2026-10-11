import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { setSelfAssign } from "@/lib/admin/actions";
import { createClient } from "@/lib/supabase/server";

export default async function AdminSettingsPage() {
  const [t, supabase] = await Promise.all([
    getTranslations("Admin"),
    createClient(),
  ]);
  const { data: settings } = await supabase
    .from("app_settings")
    .select("allow_technician_self_assign")
    .single();
  const enabled = Boolean(settings?.allow_technician_self_assign);

  return (
    <section className="rounded-xl border bg-surface p-4">
      <form
        action={setSelfAssign}
        className="flex flex-wrap items-center gap-4"
      >
        <input type="hidden" name="enabled" value={String(!enabled)} />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{t("selfAssign.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("selfAssign.hint")}
          </p>
          <p className="mt-2 text-sm font-medium">
            {enabled ? t("selfAssign.on") : t("selfAssign.off")}
          </p>
        </div>
        <Button type="submit" variant={enabled ? "secondary" : "primary"}>
          {enabled ? t("selfAssign.disable") : t("selfAssign.enable")}
        </Button>
      </form>
    </section>
  );
}
