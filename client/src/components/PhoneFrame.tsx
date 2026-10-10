import type { CSSProperties, ReactNode } from "react";

/** iPhone 17 display (1206×2622 physical px) at 3× — the same screen size Catalogue+ previews on PC. */
const IPHONE_W = 1206 / 3;
const IPHONE_H = 2622 / 3;
/** Bezel padding (`p-2`) on each side plus the page inset (`p-4`) on each side. */
const BEZEL_PX = 16;
const PAGE_INSET_PX = 32;

// Sized with real CSS dimensions rather than transform: scale(), which would throw off map click positions.
const screenStyle: CSSProperties = {
  width: `min(${IPHONE_W}px, calc(100vw - ${PAGE_INSET_PX + BEZEL_PX}px), calc((100dvh - ${PAGE_INSET_PX + BEZEL_PX}px) * ${IPHONE_W} / ${IPHONE_H}))`,
  aspectRatio: `${IPHONE_W} / ${IPHONE_H}`,
};

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[2.5rem] bg-neutral-950 p-2 shadow-2xl ring-1 ring-neutral-800">
      <div
        className="relative overflow-hidden rounded-[2rem] bg-background"
        style={screenStyle}
      >
        <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto">
          {children}
        </div>
        <div
          className="pointer-events-none absolute inset-x-0 bottom-2 z-10 flex justify-center"
          aria-hidden
        >
          <div className="h-1 w-[34%] min-w-[6.5rem] max-w-[8.75rem] rounded-full bg-foreground/35" />
        </div>
      </div>
    </div>
  );
}
