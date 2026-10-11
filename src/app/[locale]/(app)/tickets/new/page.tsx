import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/back-link";
import { ReportForm, type MachineOption } from "@/components/report-form";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireUser } from "@/lib/auth/session";
import { parseMachineQr } from "@/lib/machines/qr";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Report");
  return { title: t("heading") };
}

export default async function NewTicketPage({
  params,
  searchParams,
}: PageProps<"/[locale]/tickets/new">) {
  const { locale } = await params;
  const user = await requireUser(locale);
  // Technicians fix breakdowns; reporting is for area leaders and the manager.
  if (user.role === "technician")
    redirect({ href: "/", locale: locale as Locale });

  const [t, supabase, { m }] = await Promise.all([
    getTranslations("Report"),
    createClient(),
    searchParams,
  ]);

  let query = supabase
    .from("machines")
    .select("id, code, name, qr_token, area_id, areas(name)")
    .eq("active", true)
    .order("code");
  if (user.role === "area_leader")
    query = query.eq("area_id", user.area?.id ?? "");
  const { data } = await query;

  const machines: MachineOption[] = (data ?? []).map((m) => ({
    id: m.id,
    code: m.code,
    name: m.name,
    qrToken: m.qr_token,
    areaName: m.areas?.name ?? "",
  }));

  // Opened from a machine label: ?m=<qr_token> preselects the machine.
  const token = typeof m === "string" ? parseMachineQr(m) : null;
  const initialMachineId = token
    ? machines.find((machine) => machine.qrToken === token)?.id
    : undefined;

  return (
    <div className="mx-auto max-w-xl">
      <BackLink href="/" label={t("back")} />
      <h1 className="mt-2 mb-6 text-2xl font-semibold tracking-tight">
        {t("heading")}
      </h1>
      <ReportForm machines={machines} initialMachineId={initialMachineId} />
    </div>
  );
}
