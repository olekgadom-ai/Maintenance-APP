import { Wrench } from "lucide-react";
import { useTranslations } from "next-intl";

export function AppBrand() {
  const t = useTranslations("Common");
  return (
    <span className="flex items-center gap-2.5 font-semibold">
      <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Wrench aria-hidden className="size-5" />
      </span>
      {t("appName")}
    </span>
  );
}
