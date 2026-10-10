import { publicAssetPath } from "@/lib/router-basename";
import { t } from "@/i18n/en";

const NORDLYS_URL = "https://www.nordlyssolutions.com/";

export function SiteFooter() {
  const copyright = t("copyrightNotice").replace(
    "{year}",
    String(new Date().getFullYear()),
  );

  return (
    <footer className="mt-auto shrink-0 border-t bg-background px-4 py-3 pb-8">
      <div className="mx-auto flex max-w-md flex-col items-center gap-1">
        <p
          className="flex flex-wrap items-center justify-center gap-x-1.5 text-xs text-muted-foreground"
          aria-label="Made in Kurdistan"
        >
          <span>Made in</span>
          <span className="inline-flex rounded-sm bg-neutral-950 px-1.5 py-0.5 text-[13px] font-semibold tracking-wide">
            <span className="text-[#CE1126]">Kur</span>
            <span className="text-white">d</span>
            <span className="text-[#F8C300]">i</span>
            <span className="text-white">s</span>
            <span className="text-[#27823A]">tan</span>
          </span>
        </p>
        <a
          href={NORDLYS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-md px-3 py-1 text-center transition-colors hover:bg-accent"
        >
          <span className="text-xs text-muted-foreground">{t("developedBy")}</span>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <img
              src={publicAssetPath("/nordlys-logo.png")}
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
