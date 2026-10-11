import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("NotFound");
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <Link href="/" className={buttonVariants({ variant: "secondary" })}>
        {t("back")}
      </Link>
    </main>
  );
}
