import { publicAssetPath } from "@/lib/router-basename";
import { t } from "@/i18n/en";
import { useLang } from "@/i18n/lang";

const NORDLYS_URL = "https://www.nordlyssolutions.com/";

const OUTLINE = "[-webkit-text-stroke:0.5px_#111] [paint-order:stroke_fill]";

export function SiteFooter() {
  const lang = useLang();
  const copyright = t("copyrightNotice").replace(
    "{year}",
    String(new Date().getFullYear()),
  );

  return (
    <footer className="mt-auto shrink-0 border-t bg-background px-4 py-2">
      <div className="mx-auto flex max-w-md flex-col items-center gap-0.5">
        <p
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
          aria-label="Made in Kurdistan"
        >
          <span>{t("madeIn")}</span>
          {lang === "en" ? (
            <span className="inline-flex text-sm font-semibold">
              <span className={`text-[#CE1126] ${OUTLINE}`}>Kur</span>
              <span className={`text-white ${OUTLINE}`}>d</span>
              <span className={`text-[#F8C300] ${OUTLINE}`}>i</span>
              <span className={`text-white ${OUTLINE}`}>s</span>
              <span className={`text-[#27823A] ${OUTLINE}`}>tan</span>
            </span>
          ) : (
            <span className="text-sm font-semibold text-foreground">کوردستان</span>
          )}
        </p>
        <a
          href={NORDLYS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-x-2 rounded-md px-2 py-0.5 transition-colors hover:bg-accent"
        >
          <span className="text-[11px] text-muted-foreground">{t("developedBy")}</span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground">
            <img
              src={publicAssetPath("/nordlys-logo.png")}
              alt=""
              width={20}
              height={20}
              className="h-5 w-5 object-contain"
            />
            {t("nordlysBrand")}
          </span>
        </a>
        <p className="text-[10px] text-muted-foreground">{copyright}</p>
        <p className="text-[10px] text-muted-foreground" dir="ltr">
          {t("mapCredit")}
        </p>
      </div>
    </footer>
  );
}
