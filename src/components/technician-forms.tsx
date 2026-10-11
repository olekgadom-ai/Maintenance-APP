"use client";

import { CircleCheck, LoaderCircle, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  startTransition,
  useActionState,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { PhotoPicker, usePhotoSelection } from "@/components/photo-picker";
import { Button } from "@/components/ui/button";
import {
  addPart,
  resolveTicket,
  type ActionState,
} from "@/lib/tickets/actions";
import { PART_UNITS } from "@/lib/tickets/schemas";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full rounded-lg border bg-surface px-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 aria-invalid:border-status-rejected";

function useFieldErrors(state: ActionState) {
  // Errors belong to the last submit; editing a field clears its message.
  const [edited, setEdited] = useState({ for: state, fields: [] as string[] });
  const editedFields = edited.for === state ? edited.fields : [];
  return {
    invalid: (field: string) =>
      (state.fields?.includes(field) && !editedFields.includes(field)) ||
      undefined,
    edit: (field: string) =>
      setEdited({ for: state, fields: [...editedFields, field] }),
  };
}

export function ResolveForm({
  ticketId,
  rootCause,
  resolution,
}: {
  ticketId: string;
  rootCause: string | null;
  resolution: string | null;
}) {
  const t = useTranslations("Tech.resolve");
  const te = useTranslations("Errors");
  const [state, action, pending] = useActionState(resolveTicket, {
    error: null,
  });
  const photoSelection = usePhotoSelection();
  const { invalid, edit } = useFieldErrors(state);
  const locale = useLocale();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    for (const photo of photoSelection.photos)
      data.append("photos", photo.file);
    startTransition(() => action(data));
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <h3 className="font-semibold">{t("heading")}</h3>
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="locale" value={locale} />
      <div className="grid gap-2">
        <label htmlFor="rootCause" className="text-sm font-medium">
          {t("rootCause")}
        </label>
        <textarea
          id="rootCause"
          name="rootCause"
          rows={2}
          maxLength={2000}
          defaultValue={rootCause ?? ""}
          placeholder={t("rootCausePlaceholder")}
          className={cn(fieldClass, "py-2.5")}
        />
      </div>
      <div className="grid gap-2">
        <label htmlFor="resolution" className="text-sm font-medium">
          {t("resolution")}
        </label>
        <textarea
          id="resolution"
          name="resolution"
          rows={4}
          required
          maxLength={5000}
          defaultValue={resolution ?? ""}
          placeholder={t("resolutionPlaceholder")}
          aria-invalid={invalid("resolution")}
          onChange={() => edit("resolution")}
          className={cn(fieldClass, "py-2.5")}
        />
        {invalid("resolution") && (
          <p className="text-sm text-status-rejected">{t("resolutionError")}</p>
        )}
      </div>
      <div className="grid gap-2">
        <p className="text-sm font-medium">{t("photos")}</p>
        <PhotoPicker selection={photoSelection} />
      </div>
      {state.error && state.error !== "invalid" && (
        <p role="alert" className="text-sm text-status-rejected">
          {te(state.error)}
        </p>
      )}
      <Button
        type="submit"
        size="lg"
        disabled={pending || photoSelection.processing}
      >
        {pending ? (
          <LoaderCircle aria-hidden className="animate-spin" />
        ) : (
          <CircleCheck aria-hidden />
        )}
        {t("submit")}
      </Button>
    </form>
  );
}

export function AddPartForm({ ticketId }: { ticketId: string }) {
  const t = useTranslations("Tech.parts");
  const te = useTranslations("Errors");
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(
    async (prev: ActionState, data: FormData) => {
      const result = await addPart(prev, data);
      if (result.ok) formRef.current?.reset();
      return result;
    },
    { error: null },
  );
  const { invalid, edit } = useFieldErrors(state);

  return (
    <form ref={formRef} action={action} noValidate className="grid gap-3">
      <input type="hidden" name="ticketId" value={ticketId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label htmlFor="part-name" className="text-sm font-medium">
            {t("name")}
          </label>
          <input
            id="part-name"
            name="name"
            required
            maxLength={200}
            aria-invalid={invalid("name")}
            onChange={() => edit("name")}
            className={cn(fieldClass, "h-12")}
          />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="part-number" className="text-sm font-medium">
            {t("number")}
          </label>
          <input
            id="part-number"
            name="partNumber"
            maxLength={100}
            className={cn(fieldClass, "h-12 font-mono")}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid w-28 gap-1.5">
          <label htmlFor="part-qty" className="text-sm font-medium">
            {t("quantity")}
          </label>
          <input
            id="part-qty"
            name="quantity"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="any"
            defaultValue="1"
            aria-invalid={invalid("quantity")}
            onChange={() => edit("quantity")}
            className={cn(fieldClass, "h-12")}
          />
        </div>
        <div className="grid w-28 gap-1.5">
          <label htmlFor="part-unit" className="text-sm font-medium">
            {t("unit")}
          </label>
          <select
            id="part-unit"
            name="unit"
            defaultValue="pcs"
            className={cn(fieldClass, "h-12 cursor-pointer")}
          >
            {PART_UNITS.map((u) => (
              <option key={u} value={u}>
                {t(`units.${u}`)}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="submit"
          variant="secondary"
          disabled={pending}
          className="flex-1"
        >
          {pending ? (
            <LoaderCircle aria-hidden className="animate-spin" />
          ) : (
            <Plus aria-hidden />
          )}
          {t("add")}
        </Button>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-status-rejected">
          {te(state.error)}
        </p>
      )}
    </form>
  );
}
