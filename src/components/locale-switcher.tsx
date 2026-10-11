"use client";

import { useLocale, useTranslations } from "next-intl";
import { Suspense, useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

// usePathname() reads URL data, which must sit behind Suspense on dynamic routes.
// The fallback renders the same control, inert, until the path is known.
export function LocaleSwitcher() {
  return (
    <Suspense fallback={<Switcher />}>
      <ConnectedSwitcher />
    </Suspense>
  );
}

function ConnectedSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  return (
    <Switcher
      pending={pending}
      onSelect={(locale) =>
        startTransition(() => router.replace(pathname, { locale }))
      }
    />
  );
}

function Switcher({
  pending,
  onSelect,
}: {
  pending?: boolean;
  onSelect?: (locale: Locale) => void;
}) {
  const t = useTranslations("Common");
  const current = useLocale();

  return (
    <div
      role="group"
      aria-label={t("language")}
      className={cn(
        "inline-flex rounded-lg border bg-surface p-1",
        pending && "opacity-60",
      )}
    >
      {routing.locales.map((locale) => (
        <button
          key={locale}
          type="button"
          aria-pressed={locale === current}
          disabled={!onSelect}
          onClick={() => onSelect?.(locale)}
          className={cn(
            "h-9 min-w-11 cursor-pointer rounded-md px-2 text-sm font-semibold uppercase transition-colors",
            locale === current
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {locale}
        </button>
      ))}
    </div>
  );
}
