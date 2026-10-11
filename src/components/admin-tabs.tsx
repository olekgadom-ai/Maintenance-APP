"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin", key: "settings" },
  { href: "/admin/machines", key: "machines" },
  { href: "/admin/areas", key: "areas" },
  { href: "/admin/users", key: "users" },
] as const;

export function AdminTabs() {
  const t = useTranslations("Admin.tabs");
  const pathname = usePathname();
  return (
    <nav className="-mx-4 overflow-x-auto px-4 print:hidden">
      <ul className="flex gap-1 border-b">
        {TABS.map(({ href, key }) => {
          const active =
            href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <li key={key}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex h-12 items-center border-b-2 px-3 text-sm font-medium whitespace-nowrap",
                  active
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
