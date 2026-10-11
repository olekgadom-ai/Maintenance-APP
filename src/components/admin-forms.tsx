"use client";

import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  startTransition,
  useActionState,
  useState,
  type FormEvent,
} from "react";
import { Button } from "@/components/ui/button";
import {
  saveArea,
  saveMachine,
  updateUser,
  type AdminState,
} from "@/lib/admin/actions";
import { ROLES, type Role } from "@/lib/tickets/status";
import { cn } from "@/lib/utils";

const field =
  "h-12 w-full rounded-lg border bg-surface px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 aria-invalid:border-status-rejected";

type Area = { id: string; code: string; name: string };

function Status({ state }: { state: AdminState }) {
  const t = useTranslations("Admin");
  if (state.error)
    return (
      <p role="alert" className="text-sm text-status-rejected">
        {t(`errors.${state.error}`)}
      </p>
    );
  if (state.ok)
    return (
      <p role="status" className="text-sm text-status-done">
        {t("saved")}
      </p>
    );
  return null;
}

// Submit without React's automatic form reset: these forms edit existing
// records, and a reset would snap fields back to the values from before the save.
function submitWith(action: (data: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  };
}

function Label({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium">
      {children}
    </label>
  );
}

function Submit({ pending, label }: { pending: boolean; label: string }) {
  return (
    <Button type="submit" disabled={pending}>
      {pending && <LoaderCircle aria-hidden className="animate-spin" />}
      {label}
    </Button>
  );
}

export function AreaForm({ area }: { area?: Area }) {
  const t = useTranslations("Admin");
  const [state, action, pending] = useActionState(saveArea, { error: null });
  const id = area?.id ?? "new";
  const bad = (f: string) => state.fields?.includes(f) || undefined;

  return (
    <form
      // Adding clears the form for the next area; editing keeps what was saved.
      {...(area ? { onSubmit: submitWith(action) } : { action })}
      className="grid gap-3 sm:grid-cols-[8rem_1fr_auto] sm:items-end"
    >
      {area && <input type="hidden" name="id" value={area.id} />}
      <div className="grid gap-1.5">
        <Label htmlFor={`area-code-${id}`}>{t("fields.code")}</Label>
        <input
          id={`area-code-${id}`}
          name="code"
          defaultValue={area?.code}
          maxLength={30}
          aria-invalid={bad("code")}
          className={cn(field, "font-mono uppercase")}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`area-name-${id}`}>{t("fields.name")}</Label>
        <input
          id={`area-name-${id}`}
          name="name"
          defaultValue={area?.name}
          maxLength={100}
          aria-invalid={bad("name")}
          className={field}
        />
      </div>
      <Submit pending={pending} label={area ? t("save") : t("add")} />
      <div className="sm:col-span-3">
        <Status state={state} />
      </div>
    </form>
  );
}

export function MachineForm({
  machine,
  areas,
}: {
  machine?: {
    id: string;
    area_id: string;
    code: string;
    name: string;
    criticality: "A" | "B" | "C";
    active: boolean;
  };
  areas: Area[];
}) {
  const t = useTranslations("Admin");
  const [state, action, pending] = useActionState(saveMachine, { error: null });
  const id = machine?.id ?? "new";
  const bad = (f: string) => state.fields?.includes(f) || undefined;

  return (
    <form
      {...(machine ? { onSubmit: submitWith(action) } : { action })}
      className="grid gap-3"
    >
      {machine && <input type="hidden" name="id" value={machine.id} />}
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
        <div className="grid gap-1.5">
          <Label htmlFor={`m-code-${id}`}>{t("fields.code")}</Label>
          <input
            id={`m-code-${id}`}
            name="code"
            defaultValue={machine?.code}
            maxLength={30}
            aria-invalid={bad("code")}
            className={cn(field, "font-mono uppercase")}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`m-name-${id}`}>{t("fields.name")}</Label>
          <input
            id={`m-name-${id}`}
            name="name"
            defaultValue={machine?.name}
            maxLength={120}
            aria-invalid={bad("name")}
            className={field}
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
        <div className="grid gap-1.5">
          <Label htmlFor={`m-area-${id}`}>{t("fields.area")}</Label>
          <select
            id={`m-area-${id}`}
            name="area_id"
            defaultValue={machine?.area_id ?? areas[0]?.id}
            className={cn(field, "cursor-pointer")}
          >
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} · {a.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`m-crit-${id}`}>{t("fields.criticality")}</Label>
          <select
            id={`m-crit-${id}`}
            name="criticality"
            defaultValue={machine?.criticality ?? "B"}
            className={cn(field, "cursor-pointer")}
          >
            {(["A", "B", "C"] as const).map((c) => (
              <option key={c} value={c}>
                {t(`criticality.${c}`)}
              </option>
            ))}
          </select>
        </div>
        {machine && (
          <label className="flex h-12 cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              name="active"
              value="true"
              defaultChecked={machine.active}
              className="size-5 accent-current"
            />
            <span className="text-sm">{t("fields.active")}</span>
          </label>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Submit pending={pending} label={machine ? t("save") : t("add")} />
        <Status state={state} />
      </div>
    </form>
  );
}

export function UserForm({
  user,
  areas,
  isSelf,
}: {
  user: { id: string; role: Role; area_id: string | null; active: boolean };
  areas: Area[];
  isSelf: boolean;
}) {
  const t = useTranslations("Admin");
  const tr = useTranslations("Roles");
  const [state, action, pending] = useActionState(updateUser, { error: null });
  const [role, setRole] = useState<Role>(user.role);

  return (
    <form onSubmit={submitWith(action)} className="grid gap-3">
      <input type="hidden" name="id" value={user.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`u-role-${user.id}`}>{t("fields.role")}</Label>
          <select
            id={`u-role-${user.id}`}
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            disabled={isSelf}
            className={cn(field, "cursor-pointer")}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {tr(`${r}.name`)}
              </option>
            ))}
          </select>
          {isSelf && <input type="hidden" name="role" value={role} />}
        </div>
        {role === "area_leader" && (
          <div className="grid gap-1.5">
            <Label htmlFor={`u-area-${user.id}`}>{t("fields.area")}</Label>
            <select
              id={`u-area-${user.id}`}
              name="area_id"
              defaultValue={user.area_id ?? ""}
              className={cn(field, "cursor-pointer")}
            >
              <option value="">{t("chooseArea")}</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} · {a.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex h-12 cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            name="active"
            defaultChecked={user.active}
            disabled={isSelf}
            className="size-5"
          />
          <span className="text-sm">{t("fields.activeAccount")}</span>
          {isSelf && <input type="hidden" name="active" value="on" />}
        </label>
        <Submit pending={pending} label={t("save")} />
        <Status state={state} />
      </div>
    </form>
  );
}
