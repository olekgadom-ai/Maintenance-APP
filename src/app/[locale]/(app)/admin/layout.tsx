import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AdminTabs } from "@/components/admin-tabs";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { requireUser } from "@/lib/auth/session";

export default async function AdminLayout({
  children,
  params,
}: LayoutProps<"/[locale]/admin">) {
  const { locale } = await params;
  const user = await requireUser(locale);
  if (user.role !== "manager")
    redirect({ href: "/", locale: locale as Locale });
  const t = await getTranslations("Admin");

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight print:hidden">
        {t("heading")}
      </h1>
      <Suspense>
        <AdminTabs />
      </Suspense>
      <div className="pt-6">{children}</div>
    </div>
  );
}
