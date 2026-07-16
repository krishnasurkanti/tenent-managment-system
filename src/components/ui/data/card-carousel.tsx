"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/utils/cn";

/*
 * CardCarousel — horizontal snap carousel (rebuild).
 *
 * Implements the ONLY carousel pattern the brief permits (it was a recurring
 * bug source):
 *   - track: overflow-x auto, snap-x mandatory, scroll-padding-left = lead
 *   - cards: snap-start, shrink-0  (never snap-center)
 *   - a trailing spacer guarantees the last card is fully reachable
 *   - NO negative -mx breakout inside an overflow-x:hidden ancestor
 *
 * Dot indicators + prev/next reflect scroll position. Optional auto-advance.
 */

export function CardCarousel({
  children,
  leadPadding = 16,
  gap = 12,
  ariaLabel = "carousel",
  autoAdvanceMs,
  align = "start",
  className,
}: {
  children: React.ReactNode[];
  leadPadding?: number;
  gap?: number;
  ariaLabel?: string;
  autoAdvanceMs?: number;
  /** "center" centres the cards when they don't fill the width, still scrolls when they overflow */
  align?: "start" | "center";
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const count = children.length;

  function scrollToIndex(i: number) {
    const track = trackRef.current;
    if (!track) return;
    const card = track.children[i] as HTMLElement | undefined;
    if (card) track.scrollTo({ left: card.offsetLeft - leadPadding, behavior: "smooth" });
  }

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    function onScroll() {
      const cards = Array.from(track!.children) as HTMLElement[];
      const x = track!.scrollLeft + leadPadding;
      let nearest = 0;
      let best = Infinity;
      cards.forEach((c, i) => {
        const d = Math.abs(c.offsetLeft - leadPadding - x + leadPadding);
        if (d < best) {
          best = d;
          nearest = i;
        }
      });
      setActive(nearest);
    }
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, [leadPadding]);

  useEffect(() => {
    if (!autoAdvanceMs || count <= 1) return;
    const id = window.setInterval(() => {
      setActive((prev) => {
        const next = (prev + 1) % count;
        scrollToIndex(next);
        return next;
      });
    }, autoAdvanceMs);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAdvanceMs, count]);

  return (
    <div className={cn("relative", className)}>
      <div
        ref={trackRef}
        role="group"
        aria-label={ariaLabel}
        className={cn(
          "flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          // w-fit + max-w-full + mx-auto centres a short row and still scrolls a full one
          align === "center" && "mx-auto w-fit max-w-full",
        )}
        style={{
          gap,
          paddingLeft: leadPadding,
          paddingRight: leadPadding,
          scrollPaddingLeft: leadPadding,
          touchAction: "pan-x pan-y",
        }}
      >
        {children.map((child, i) => (
          <div key={i} className="min-w-0 shrink-0 snap-start">
            {child}
          </div>
        ))}
        {/* trailing spacer keeps the final card fully reachable */}
        <div aria-hidden className="shrink-0" style={{ width: 1 }} />
      </div>

      {count > 1 ? (
        <div className="mt-2 flex items-center justify-center gap-1.5">
          {children.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to item ${i + 1}`}
              aria-current={i === active}
              onClick={() => scrollToIndex(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-[var(--duration-normal)]",
                i === active
                  ? "w-4 bg-[color:var(--brand)]"
                  : "w-1.5 bg-[color:var(--border-strong)]",
              )}
            />
          ))}
        </div>
      ) : null}

      {count > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous"
            onClick={() => scrollToIndex(Math.max(0, active - 1))}
            className="absolute -left-1 top-[38%] hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--bg-elevated)] text-[color:var(--fg-secondary)] hover:text-[color:var(--fg-primary)] xl:flex"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => scrollToIndex(Math.min(count - 1, active + 1))}
            className="absolute -right-1 top-[38%] hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--bg-elevated)] text-[color:var(--fg-secondary)] hover:text-[color:var(--fg-primary)] xl:flex"
          >
            <ChevronRight size={16} />
          </button>
        </>
      ) : null}
    </div>
  );
}
