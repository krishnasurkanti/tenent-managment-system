"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type AvatarDef = {
  emoji: string;
  bg: string;
  anim: "float" | "wobble" | "pulse" | "none";
};

export const AVATARS: AvatarDef[] = [
  { emoji: "🦊", bg: "linear-gradient(135deg,#f97316,#fbbf24)", anim: "float"  },
  { emoji: "🐯", bg: "linear-gradient(135deg,#d97706,#fde68a)", anim: "wobble" },
  { emoji: "🐼", bg: "linear-gradient(135deg,#475569,#94a3b8)", anim: "pulse"  },
  { emoji: "🦁", bg: "linear-gradient(135deg,#b45309,#fcd34d)", anim: "none"   },
  { emoji: "🐸", bg: "linear-gradient(135deg,#16a34a,#4ade80)", anim: "float"  },
  { emoji: "🦝", bg: "linear-gradient(135deg,#6b7280,#d1d5db)", anim: "wobble" },
  { emoji: "🐉", bg: "linear-gradient(135deg,#7c3aed,#a78bfa)", anim: "float"  },
  { emoji: "🤖", bg: "linear-gradient(135deg,#2563eb,#38bdf8)", anim: "wobble" },
  { emoji: "👾", bg: "linear-gradient(135deg,#9333ea,#f472b6)", anim: "pulse"  },
  { emoji: "🦸", bg: "linear-gradient(135deg,#dc2626,#fb923c)", anim: "none"   },
  { emoji: "🧙", bg: "linear-gradient(135deg,#4338ca,#8b5cf6)", anim: "float"  },
  { emoji: "🦄", bg: "linear-gradient(135deg,#db2777,#c084fc)", anim: "wobble" },
  { emoji: "🐺", bg: "linear-gradient(135deg,#374151,#9ca3af)", anim: "none"   },
  { emoji: "🦋", bg: "linear-gradient(135deg,#0284c7,#67e8f9)", anim: "float"  },
  { emoji: "🐬", bg: "linear-gradient(135deg,#0891b2,#7dd3fc)", anim: "wobble" },
  { emoji: "🦅", bg: "linear-gradient(135deg,#92400e,#f59e0b)", anim: "none"   },
  { emoji: "🎭", bg: "linear-gradient(135deg,#be123c,#fb7185)", anim: "pulse"  },
  { emoji: "🌟", bg: "linear-gradient(135deg,#ca8a04,#fef08a)", anim: "wobble" },
  { emoji: "🚀", bg: "linear-gradient(135deg,#1d4ed8,#818cf8)", anim: "float"  },
  { emoji: "🎯", bg: "linear-gradient(135deg,#b91c1c,#f97316)", anim: "none"   },
];

function tenantHash(id: string): number {
  let h = 0;
  for (const c of id) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function readOverride(tenantId: string): number | null {
  try {
    const v = localStorage.getItem(`av_${tenantId}`);
    return v !== null ? Number(v) : null;
  } catch { return null; }
}

function writeOverride(tenantId: string, idx: number) {
  try { localStorage.setItem(`av_${tenantId}`, String(idx)); } catch {}
}

type Props = {
  tenantId: string;
  size?: "sm" | "md";
  readOnly?: boolean;
};

export function TenantAvatar({ tenantId, size = "sm", readOnly = false }: Props) {
  const [idx, setIdx] = useState<number>(() => {
    const ov = readOverride(tenantId);
    return ov ?? tenantHash(tenantId) % AVATARS.length;
  });
  const [pickerOpen, setPickerOpen] = useState(false);

  const avatar = AVATARS[idx];
  const dim = size === "sm" ? 36 : 44;
  const fontSize = size === "sm" ? "1.1rem" : "1.4rem";

  const animClass =
    avatar.anim === "float"  ? "avatar-float"  :
    avatar.anim === "wobble" ? "avatar-wobble" :
    avatar.anim === "pulse"  ? "avatar-pulse"  : "";

  const handleSelect = (i: number) => {
    setIdx(i);
    writeOverride(tenantId, i);
    setPickerOpen(false);
  };

  return (
    <>
      {readOnly ? (
        <div className="shrink-0 rounded-full" style={{ width: dim, height: dim }}>
          <div
            className="flex h-full w-full items-center justify-center rounded-full shadow-md"
            style={{ background: avatar.bg }}
          >
            <span className={animClass} style={{ fontSize, display: "block", lineHeight: 1, userSelect: "none" }}>
              {avatar.emoji}
            </span>
          </div>
        </div>
      ) : null}
      {!readOnly && (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          style={{ width: dim, height: dim }}
          aria-label="Change avatar"
        >
          <div
            className="flex h-full w-full items-center justify-center rounded-full shadow-md"
            style={{ background: avatar.bg }}
          >
            <span
              className={animClass}
              style={{ fontSize, display: "block", lineHeight: 1, userSelect: "none" }}
            >
              {avatar.emoji}
            </span>
          </div>
        </button>
      )}

      {!readOnly && pickerOpen && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9998] flex items-end justify-center sm:items-center"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="w-full max-w-[340px] rounded-t-[28px] border border-white/10 bg-[#0d0f1e] px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 shadow-2xl sm:rounded-[28px] sm:pb-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Choose Avatar</p>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="rounded-full p-1 text-white/40 hover:text-white/70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-5 gap-2.5">
              {AVATARS.map((av, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelect(i)}
                  className="relative flex items-center justify-center rounded-full transition active:scale-90"
                  style={{ width: 52, height: 52 }}
                >
                  {i === idx && (
                    <span className="absolute inset-[-2px] rounded-full border-2 border-white/70" />
                  )}
                  <div
                    className="flex h-full w-full items-center justify-center rounded-full shadow"
                    style={{ background: av.bg }}
                  >
                    <span style={{ fontSize: "1.45rem", lineHeight: 1 }}>{av.emoji}</span>
                  </div>
                </button>
              ))}
            </div>
            <p className="mt-3 text-center text-[10px] text-white/25">Tap an avatar to select</p>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
