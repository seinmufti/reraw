import type { ReactNode } from "react";
import { PhoneFrame } from "@/components/PhoneFrame";
import { useIsMobileViewport } from "@/hooks/useMediaQuery";

/** Public pages always use the phone layout: full screen on phones, inside a phone frame on PC. */
export function PublicViewport({ children }: { children: ReactNode }) {
  const isMobile = useIsMobileViewport();

  if (isMobile) {
    return <div className="mobile-shell bg-background">{children}</div>;
  }

  return (
    <div className="flex h-dvh max-h-dvh items-center justify-center overflow-hidden bg-muted/60 p-4">
      <PhoneFrame>{children}</PhoneFrame>
    </div>
  );
}
