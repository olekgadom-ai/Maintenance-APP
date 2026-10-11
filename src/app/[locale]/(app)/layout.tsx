import { Suspense } from "react";
import { AppBrand } from "@/components/app-brand";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { UserMenu } from "@/components/user-menu";

export default function AppLayout({ children }: LayoutProps<"/[locale]">) {
  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4">
          <AppBrand />
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <Suspense
              fallback={
                <span className="size-12 animate-pulse rounded-lg bg-surface-muted" />
              }
            >
              <UserMenu />
            </Suspense>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-16">
        {children}
      </main>
    </>
  );
}
