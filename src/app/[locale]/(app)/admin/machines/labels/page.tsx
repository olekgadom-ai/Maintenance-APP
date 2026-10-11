import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import QRCode from "qrcode";
import { BackLink } from "@/components/back-link";
import { PrintButton } from "@/components/print-button";
import { machineQrUrl } from "@/lib/machines/qr";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

// Base path of this zone (next.config.ts). Labels must carry the public address.
const BASE_PATH = "/UR";

export default async function MachineLabelsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/machines/labels">) {
  const [{ locale }, { area }, t, supabase, h] = await Promise.all([
    params,
    searchParams,
    getTranslations("Admin"),
    createClient(),
    headers(),
  ]);
  // Behind the forgework.space rewrite the public host arrives as x-forwarded-host.
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = `${proto}://${host}${BASE_PATH}`;

  const [{ data: areas }, { data: machines }] = await Promise.all([
    supabase.from("areas").select("id, code, name").order("code"),
    supabase
      .from("machines")
      .select("id, code, name, qr_token, area_id")
      .eq("active", true)
      .order("code"),
  ]);
  const selected = (areas ?? []).find((a) => a.code === area);
  const list = (machines ?? []).filter(
    (m) => !selected || m.area_id === selected.id,
  );
  const areaName = new Map((areas ?? []).map((a) => [a.id, a.name]));

  const labels = await Promise.all(
    list.map(async (m) => ({
      ...m,
      svg: await QRCode.toString(machineQrUrl(origin, locale, m.qr_token), {
        type: "svg",
        margin: 0,
        errorCorrectionLevel: "M",
      }),
    })),
  );

  return (
    <div>
      <div className="mb-6 grid gap-4 print:hidden">
        <BackLink href="/admin/machines" label={t("tabs.machines")} />
        <p className="text-sm text-muted-foreground">{t("labels.hint")}</p>
        <div className="flex flex-wrap items-center gap-2">
          {[{ code: undefined, name: t("labels.all") }, ...(areas ?? [])].map(
            (a) => (
              <a
                key={a.code ?? "all"}
                href={`?${a.code ? `area=${a.code}` : ""}`}
                aria-current={selected?.code === a.code ? "page" : undefined}
                className={cn(
                  "inline-flex h-11 items-center rounded-lg border px-3 text-sm",
                  selected?.code === a.code
                    ? "border-foreground bg-surface-muted font-medium"
                    : "bg-surface",
                )}
              >
                {a.code ?? a.name}
              </a>
            ),
          )}
          <span className="flex-1" />
          <PrintButton label={t("labels.print")} />
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 print:grid-cols-3 print:gap-3">
        {labels.map((m) => (
          <li
            key={m.id}
            className="flex break-inside-avoid flex-col items-center rounded-xl border bg-white p-4 text-center text-black print:rounded-none print:border-black"
          >
            <div
              data-qr
              className="aspect-square w-full max-w-40 [&_svg]:size-full"
              // Generated locally from the machine's token; no user input.
              dangerouslySetInnerHTML={{ __html: m.svg }}
            />
            <p className="mt-3 font-mono text-lg font-bold">{m.code}</p>
            <p className="text-sm leading-tight">{m.name}</p>
            <p className="mt-1 text-xs text-neutral-600">
              {areaName.get(m.area_id)}
            </p>
            <p className="mt-2 text-xs font-medium">{t("labels.scan")}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
