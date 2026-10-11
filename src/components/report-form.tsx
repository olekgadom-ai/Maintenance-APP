"use client";

import { LoaderCircle, QrCode, Search, TriangleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  startTransition,
  useActionState,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { PhotoPicker, usePhotoSelection } from "@/components/photo-picker";
import { QrScanner } from "@/components/qr-scanner";
import { Button } from "@/components/ui/button";
import { parseMachineQr } from "@/lib/machines/qr";
import { reportTicket, type ReportTicketState } from "@/lib/tickets/actions";
import { PRIORITIES, type Priority } from "@/lib/tickets/status";
import { cn } from "@/lib/utils";

export type MachineOption = {
  id: string;
  code: string;
  name: string;
  qrToken: string;
  areaName: string;
};

const priorityActive: Record<Priority, string> = {
  critical: "border-priority-critical bg-priority-critical text-white",
  high: "border-priority-high bg-priority-high/15 text-priority-high",
  normal: "border-foreground bg-surface-muted text-foreground",
  low: "border-foreground/50 bg-surface-muted text-muted-foreground",
};

const fieldClass =
  "w-full rounded-lg border bg-surface px-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 aria-invalid:border-status-rejected";

export function ReportForm({
  machines,
  initialMachineId,
}: {
  machines: MachineOption[];
  initialMachineId?: string;
}) {
  const t = useTranslations("Report");
  const tp = useTranslations("Priority");
  const te = useTranslations("Errors");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState<
    ReportTicketState,
    FormData
  >(reportTicket, { error: null });

  const [machineId, setMachineId] = useState(initialMachineId ?? "");
  const [query, setQuery] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState(false);
  const [priority, setPriority] = useState<Priority>("normal");
  const photoSelection = usePhotoSelection();
  const { photos, processing } = photoSelection;

  const selected = machines.find((m) => m.id === machineId);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? machines.filter((m) => `${m.code} ${m.name}`.toLowerCase().includes(q))
      : machines;
  }, [machines, query]);
  // Field errors belong to the last submit; editing a field clears its message.
  const [edited, setEdited] = useState({ for: state, fields: [] as string[] });
  const editedFields = edited.for === state ? edited.fields : [];
  const invalid = (field: string) =>
    (state.fields?.includes(field) && !editedFields.includes(field)) ||
    undefined;
  const markEdited = (field: string) =>
    setEdited({ for: state, fields: [...editedFields, field] });

  function handleScan(text: string) {
    setScanning(false);
    const token = parseMachineQr(text);
    const machine = token && machines.find((m) => m.qrToken === token);
    if (machine) {
      setMachineId(machine.id);
      setScanError(false);
    } else {
      setScanError(true);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    for (const photo of photos) data.append("photos", photo.file);
    startTransition(() => formAction(data));
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-8" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="machineId" value={machineId} />
      <input type="hidden" name="priority" value={priority} />

      {/* Machine */}
      <fieldset className="grid gap-3">
        <legend className="mb-3 font-semibold">{t("machine.label")}</legend>
        {selected ? (
          <div className="flex items-center gap-3 rounded-xl border-2 border-foreground bg-surface p-4">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-sm text-muted-foreground">
                {selected.code}
              </p>
              <p className="font-semibold">{selected.name}</p>
              <p className="text-sm text-muted-foreground">
                {selected.areaName}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setMachineId("")}
            >
              {t("machine.change")}
            </Button>
          </div>
        ) : (
          <>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={() => {
                setScanError(false);
                setScanning(true);
              }}
            >
              <QrCode aria-hidden />
              {t("machine.scan")}
            </Button>
            {scanError && (
              <p role="alert" className="text-sm text-status-rejected">
                {t("machine.unknownQr")}
              </p>
            )}
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("machine.search")}
                aria-label={t("machine.search")}
                aria-invalid={invalid("machineId")}
                className={cn(fieldClass, "h-12 pl-10")}
              />
            </div>
            <ul className="grid max-h-80 gap-2 overflow-y-auto">
              {filtered.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setMachineId(m.id)}
                    className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-lg border bg-surface px-3 py-2 text-left hover:bg-surface-muted"
                  >
                    <span className="w-24 shrink-0 font-mono text-sm text-muted-foreground">
                      {m.code}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{m.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {m.areaName}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="px-1 py-2 text-sm text-muted-foreground">
                  {t("machine.noResults")}
                </li>
              )}
            </ul>
            {invalid("machineId") && (
              <p className="text-sm text-status-rejected">
                {t("machine.required")}
              </p>
            )}
          </>
        )}
      </fieldset>

      {/* Machine stopped */}
      <label className="flex cursor-pointer items-center gap-4 rounded-xl border bg-surface p-4 has-checked:border-priority-critical has-checked:bg-priority-critical/8">
        <TriangleAlert
          aria-hidden
          className="size-6 shrink-0 text-priority-critical"
        />
        <span className="flex-1">
          <span className="block font-semibold">{t("stopped.label")}</span>
          <span className="block text-sm text-muted-foreground">
            {t("stopped.hint")}
          </span>
        </span>
        <input type="checkbox" name="machineStopped" className="peer sr-only" />
        <span
          aria-hidden
          className="relative h-8 w-14 shrink-0 rounded-full bg-border transition-colors peer-checked:bg-priority-critical peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring after:absolute after:top-1 after:left-1 after:size-6 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-6"
        />
      </label>

      {/* What happened */}
      <div className="grid gap-2">
        <label htmlFor="title" className="font-semibold">
          {t("title.label")}
        </label>
        <input
          id="title"
          name="title"
          required
          minLength={3}
          maxLength={200}
          onChange={() => markEdited("title")}
          placeholder={t("title.placeholder")}
          aria-invalid={invalid("title")}
          aria-describedby={invalid("title") ? "title-error" : undefined}
          className={cn(fieldClass, "h-12")}
        />
        {invalid("title") && (
          <p id="title-error" className="text-sm text-status-rejected">
            {t("title.error")}
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <label htmlFor="description" className="font-semibold">
          {t("description.label")}{" "}
          <span className="font-normal text-muted-foreground">
            {t("optional")}
          </span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={5000}
          placeholder={t("description.placeholder")}
          className={cn(fieldClass, "py-3")}
        />
      </div>

      {/* Priority */}
      <fieldset>
        <legend className="mb-3 font-semibold">{t("priority")}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PRIORITIES.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={priority === p}
              onClick={() => setPriority(p)}
              className={cn(
                "h-12 cursor-pointer rounded-lg border-2 bg-surface font-medium transition-colors",
                priority === p
                  ? priorityActive[p]
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {tp(p)}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Photos */}
      <fieldset>
        <legend className="mb-3 font-semibold">
          {t("photos.label")}{" "}
          <span className="font-normal text-muted-foreground">
            {t("optional")}
          </span>
        </legend>
        <PhotoPicker selection={photoSelection} />
      </fieldset>

      {/* Submit */}
      <div className="sticky bottom-0 -mx-4 grid gap-2 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        {state.error && state.error !== "invalid" && (
          <p
            role="alert"
            data-testid="form-error"
            className="text-sm text-status-rejected"
          >
            {te(state.error)}
          </p>
        )}
        <Button
          type="submit"
          size="lg"
          disabled={pending || processing}
          className="w-full"
        >
          {pending && <LoaderCircle aria-hidden className="animate-spin" />}
          {pending ? t("submitting") : t("submit")}
        </Button>
      </div>

      {scanning && (
        <QrScanner onResult={handleScan} onClose={() => setScanning(false)} />
      )}
    </form>
  );
}
