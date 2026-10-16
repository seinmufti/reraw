import { useEffect } from "react";
import { t } from "@/i18n/en";
import { useLang } from "@/i18n/lang";

/** Keeps <html lang/dir>, the page title and the description in step with the UI language. */
export function useDocumentLocale() {
  const lang = useLang();

  useEffect(() => {
    const root = document.documentElement;
    const prev = { lang: root.lang, dir: root.dir, title: document.title };
    const desc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    const ogDesc = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
    const prevDesc = desc?.content;

    root.lang = lang;
    root.dir = lang === "ckb" ? "rtl" : "ltr";
    document.title = t("pageTitle");
    if (desc) desc.content = t("pageDescription");
    if (ogTitle) ogTitle.content = t("pageTitle");
    if (ogDesc) ogDesc.content = t("pageDescription");

    return () => {
      root.lang = prev.lang;
      root.dir = prev.dir;
      document.title = prev.title;
      if (desc && prevDesc !== undefined) desc.content = prevDesc;
    };
  }, [lang]);
}
