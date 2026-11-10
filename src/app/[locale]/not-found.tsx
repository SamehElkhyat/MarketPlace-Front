import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getI18n } from "@/i18n/server";

/** Designed 404 (not the framework default). */
export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <main className="page-container flex min-h-[70dvh] flex-col items-center justify-center gap-6 py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="text-2xl">{t("errors.notFound.title")}</h1>
      <p className="max-w-md text-muted-foreground">{t("errors.notFound.body")}</p>
      <Button asChild size="lg">
        <Link href="/">{t("errors.backHome")}</Link>
      </Button>
    </main>
  );
}
