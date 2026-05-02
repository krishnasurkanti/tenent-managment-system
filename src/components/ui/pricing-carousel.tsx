"use client";

import { useRef, useState, useEffect } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { PRICING_PLANS, type PlanId } from "@/config/pricing";
import { cn } from "@/utils/cn";

interface PricingCarouselProps {
  currentPlanId?: PlanId;
  onSelect: (planId: PlanId) => void | Promise<void>;
  onSkip?: () => void;
  submittingPlanId?: PlanId | null;
  /** Show "skip" as "Continue with Free" instead of just "Skip" */
  onboardingMode?: boolean;
}

const TONE_MAP: Record<PlanId, string> = {
  free: "border-white/10 bg-[linear-gradient(180deg,#111827_0%,#0c1018_100%)]",
  starter: "border-white/15 bg-[linear-gradient(180deg,#141a27_0%,#0e1420_100%)]",
  growth:
    "border-[rgba(56,189,248,0.25)] bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.10),transparent_55%),linear-gradient(180deg,#0e1a2e_0%,#0b101c_100%)] shadow-[0_0_0_1px_rgba(56,189,248,0.12),0_16px_40px_rgba(37,99,235,0.18)]",
  pro: "border-[rgba(168,85,247,0.30)] bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.12),transparent_55%),linear-gradient(180deg,#130e28_0%,#0d0a1e_100%)] shadow-[0_0_0_1px_rgba(168,85,247,0.15),0_16px_40px_rgba(109,40,217,0.18)]",
};

const BADGE_COLOR: Record<PlanId, string> = {
  free: "bg-white/10 text-white/50",
  starter: "bg-white/10 text-white/70",
  growth: "bg-[rgba(56,189,248,0.15)] text-[#38bdf8]",
  pro: "bg-[rgba(168,85,247,0.15)] text-[#c084fc]",
};

const BTN_COLOR: Record<PlanId, string> = {
  free: "bg-white/10 text-white hover:bg-white/15",
  starter:
    "bg-[linear-gradient(90deg,#b86f18,#efaf2f,#ffd95f)] text-[#1b1207] hover:brightness-105",
  growth:
    "bg-[linear-gradient(90deg,#0369a1,#0ea5e9,#38bdf8)] text-white hover:brightness-105",
  pro: "bg-[linear-gradient(90deg,#6d28d9,#9333ea,#c084fc)] text-white hover:brightness-105",
};

export function PricingCarousel({
  currentPlanId,
  onSelect,
  onSkip,
  submittingPlanId,
  onboardingMode = false,
}: PricingCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  // Sync dot indicator with scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const cardWidth = el.scrollWidth / PRICING_PLANS.length;
      setActiveIdx(Math.round(el.scrollLeft / cardWidth));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.scrollWidth / PRICING_PLANS.length;
    el.scrollTo({ left: cardWidth * idx, behavior: "smooth" });
  };

  return (
    <div className="w-full">
      {/* Carousel track */}
      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory overflow-x-auto scrollbar-hide gap-3 pb-2 px-4 sm:px-0"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {PRICING_PLANS.map((plan) => {
          const isCurrentPlan = plan.id === currentPlanId;
          const isSubmitting = submittingPlanId === plan.id;

          return (
            <div
              key={plan.id}
              className={cn(
                "snap-center shrink-0 w-[min(calc(100vw-4rem),300px)] sm:w-[260px] rounded-[20px] border p-4 flex flex-col gap-3 transition-all duration-200",
                TONE_MAP[plan.id],
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
                    {plan.id === "free" ? "Trial" : "Plan"}
                  </p>
                  <p className="mt-0.5 text-xl font-bold text-white">{plan.title}</p>
                </div>
                {plan.badge ? (
                  <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold", BADGE_COLOR[plan.id])}>
                    {plan.badge}
                  </span>
                ) : null}
              </div>

              {/* Price */}
              <div>
                {plan.monthlyPrice === 0 ? (
                  <p className="text-2xl font-bold text-white">
                    Free <span className="text-sm font-medium text-white/45">/ 30 days</span>
                  </p>
                ) : (
                  <p className="text-2xl font-bold text-white">
                    ₹{plan.monthlyPrice}
                    <span className="text-sm font-medium text-white/45"> / month</span>
                  </p>
                )}
                <p className="mt-0.5 text-[11px] text-white/45 leading-snug">{plan.valueLine}</p>
              </div>

              {/* Features */}
              <ul className="flex-1 space-y-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[12px] text-white/65">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#4ade80]" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                type="button"
                disabled={isCurrentPlan || !!submittingPlanId}
                onClick={() => void onSelect(plan.id)}
                className={cn(
                  "mt-auto inline-flex min-h-[42px] w-full items-center justify-center rounded-2xl text-sm font-semibold transition disabled:opacity-50",
                  BTN_COLOR[plan.id],
                  isCurrentPlan && "cursor-default",
                )}
              >
                {isSubmitting
                  ? "Saving…"
                  : isCurrentPlan
                    ? "Current plan"
                    : plan.id === "free"
                      ? onboardingMode ? "Start free trial" : "Switch to free"
                      : `Choose ${plan.title}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Dot indicators + arrows */}
      <div className="mt-3 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => scrollTo(Math.max(0, activeIdx - 1))}
          disabled={activeIdx === 0}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/8 text-white/50 disabled:opacity-25 hover:bg-white/15"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1.5">
          {PRICING_PLANS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollTo(i)}
              className={cn(
                "rounded-full transition-all",
                i === activeIdx ? "h-2 w-5 bg-[#f7bf53]" : "h-2 w-2 bg-white/20 hover:bg-white/40",
              )}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => scrollTo(Math.min(PRICING_PLANS.length - 1, activeIdx + 1))}
          disabled={activeIdx === PRICING_PLANS.length - 1}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/8 text-white/50 disabled:opacity-25 hover:bg-white/15"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Skip */}
      {onSkip ? (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onSkip}
            disabled={!!submittingPlanId}
            className="text-sm text-white/40 transition hover:text-white/70 disabled:opacity-50"
          >
            {onboardingMode ? "Skip for now — I'll decide later" : "Keep current plan"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
