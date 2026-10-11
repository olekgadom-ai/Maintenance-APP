"use client";

import {
  ChevronRight,
  ClipboardCheck,
  HardHat,
  LayoutDashboard,
  LoaderCircle,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { signInAsRole, type SignInState } from "@/lib/auth/actions";
import type { Role } from "@/lib/tickets/status";

const roleIcons: Record<Role, typeof HardHat> = {
  area_leader: ClipboardCheck,
  technician: HardHat,
  manager: LayoutDashboard,
};

export function RolePicker({
  accounts,
}: {
  accounts: { role: Role; name: string; detail?: string }[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  const [state, action, pending] = useActionState<SignInState, FormData>(
    signInAsRole,
    { error: null },
  );
  const [chosen, setChosen] = useState<Role | null>(null);

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="locale" value={locale} />
      {accounts.map(({ role, name, detail }) => {
        const Icon = roleIcons[role];
        const loading = pending && chosen === role;
        return (
          <button
            key={role}
            type="submit"
            name="role"
            value={role}
            disabled={pending}
            onClick={() => setChosen(role)}
            className="group flex min-h-20 w-full cursor-pointer items-center gap-4 rounded-xl border bg-surface p-4 text-left transition-colors hover:border-foreground/30 hover:bg-surface-muted disabled:cursor-wait disabled:opacity-60"
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-surface-muted text-foreground group-hover:bg-background">
              <Icon aria-hidden className="size-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">
                {t(`Roles.${role}.name`)}
              </span>
              <span className="block text-sm text-muted-foreground">
                {name}
                {detail && ` · ${detail}`}
              </span>
            </span>
            {loading ? (
              <LoaderCircle
                aria-hidden
                className="size-5 animate-spin text-muted-foreground"
              />
            ) : (
              <ChevronRight
                aria-hidden
                className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              />
            )}
          </button>
        );
      })}
      <p
        role="alert"
        aria-live="polite"
        className="min-h-5 text-sm text-status-rejected"
      >
        {state.error && t(`Login.errors.${state.error}`)}
      </p>
    </form>
  );
}
