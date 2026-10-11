import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { AppBrand } from "@/components/app-brand";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { RolePicker } from "@/components/role-picker";
import { DEMO_ACCOUNTS } from "@/lib/auth/demo-accounts";
import { ROLES } from "@/lib/tickets/status";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Login");
  return { title: t("title") };
}

export default function LoginPage() {
  const t = useTranslations("Login");

  const accounts = ROLES.map((role) => ({
    role,
    name: DEMO_ACCOUNTS[role].name,
    detail: role === "area_leader" ? t("leaderArea") : undefined,
  }));

  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex h-16 w-full max-w-md items-center justify-between px-4">
        <AppBrand />
        <LocaleSwitcher />
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-8 pb-12 sm:justify-center sm:pt-0">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("lead")}</p>
        <div className="mt-8">
          <RolePicker accounts={accounts} />
        </div>
        <p className="mt-4 rounded-lg bg-surface-muted px-3 py-2.5 text-sm text-muted-foreground">
          {t("demoNotice")}
        </p>
      </main>
    </div>
  );
}
