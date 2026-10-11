import { LogOut, Settings } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { signOut } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/session";

export async function UserMenu() {
  const [user, locale, t] = await Promise.all([
    getCurrentUser(),
    getLocale(),
    getTranslations(),
  ]);
  if (!user) return null;

  return (
    <form action={signOut} className="flex items-center gap-2">
      <input type="hidden" name="locale" value={locale} />
      <span className="hidden text-right leading-tight sm:block">
        <span className="block text-sm font-medium">{user.fullName}</span>
        <span className="block text-xs text-muted-foreground">
          {t(`Roles.${user.role}.name`)}
        </span>
      </span>
      {user.role === "manager" && (
        <Link
          href="/admin"
          aria-label={t("Common.admin")}
          title={t("Common.admin")}
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <Settings aria-hidden />
        </Link>
      )}
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        aria-label={t("Common.signOut")}
        title={t("Common.signOut")}
      >
        <LogOut aria-hidden />
      </Button>
    </form>
  );
}
