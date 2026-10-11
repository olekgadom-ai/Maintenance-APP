import { ChevronDown } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { UserForm } from "@/components/admin-forms";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function AdminUsersPage() {
  const [t, tr, supabase, me] = await Promise.all([
    getTranslations("Admin"),
    getTranslations("Roles"),
    createClient(),
    getCurrentUser(),
  ]);
  const [{ data: areas }, { data: users }] = await Promise.all([
    supabase.from("areas").select("id, code, name").order("code"),
    supabase
      .from("profiles")
      .select("id, full_name, role, area_id, active, areas(code)")
      .order("full_name"),
  ]);

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">{t("users.hint")}</p>
      <ul className="grid gap-2">
        {(users ?? []).map((user) => (
          <li key={user.id}>
            <details className="group rounded-xl border bg-surface">
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">
                    {user.full_name || "—"}
                    {user.id === me?.id && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {t("users.you")}
                      </span>
                    )}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {tr(`${user.role}.name`)}
                    {user.areas && ` · ${user.areas.code}`}
                  </span>
                </span>
                {!user.active && (
                  <span className="rounded-md bg-surface-muted px-2 py-1 text-xs">
                    {t("inactive")}
                  </span>
                )}
                <ChevronDown
                  aria-hidden
                  className="size-4 shrink-0 transition-transform group-open:rotate-180"
                />
              </summary>
              <div className="border-t p-4">
                <UserForm
                  user={user}
                  areas={areas ?? []}
                  isSelf={user.id === me?.id}
                />
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
