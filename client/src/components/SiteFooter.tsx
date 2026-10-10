import { t } from "@/i18n/en";

const NORDLYS_URL = "https://www.nordlyssolutions.com/";

export function SiteFooter() {
  const copyright = t("copyrightNotice").replace(
    "{year}",
    String(new Date().getFullYear()),
  );

  return (
    <footer className="shrink-0 border-t bg-background px-4 py-3">
      <div className="mx-auto flex max-w-md flex-col items-center gap-1">
        <a
          href={NORDLYS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-md px-3 py-1 text-center transition-colors hover:bg-accent"
        >
          <span className="text-xs text-muted-foreground">{t("developedBy")}</span>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <img
              src="/nordlys-logo.png"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
            />
            {t("nordlysBrand")}
          </span>
        </a>
        <p className="text-[10px] text-muted-foreground">{copyright}</p>
      </div>
    </footer>
  );
}
