import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useIsMobileViewport } from "@/hooks/useMediaQuery";
import { t } from "@/i18n/en";

export function AdminPcOnlyGate({ children }: { children: ReactNode }) {
  const isMobile = useIsMobileViewport();

  if (isMobile) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t("adminTitle")}</h1>
        <p className="max-w-sm text-muted-foreground">{t("adminPcOnly")}</p>
        <Button variant="outline" asChild>
          <Link to="/">{t("backToMap")}</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
