import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { t } from "@/i18n/en";

type AppTitleProps = {
  className?: string;
  as?: "h1" | "p" | "span";
  style?: CSSProperties;
};

export function AppTitle({ className, as: Tag = "h1", style }: AppTitleProps) {
  return (
    <Tag lang="en" className={cn("app-title", className)} style={style}>
      {t("appName")}
    </Tag>
  );
}
