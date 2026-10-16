import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { t } from "@/i18n/en";
import { useLang } from "@/i18n/lang";

type AppTitleProps = {
  className?: string;
  as?: "h1" | "p" | "span";
  style?: CSSProperties;
};

export function AppTitle({ className, as: Tag = "h1", style }: AppTitleProps) {
  const lang = useLang();
  return (
    <Tag lang={lang} className={cn("app-title", className)} style={style}>
      {t("appName")}
    </Tag>
  );
}
