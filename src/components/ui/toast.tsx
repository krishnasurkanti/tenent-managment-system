"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { cn } from "@/utils/cn";

type ToastVariant = "success" | "error" | "info" | "warning";

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const variantClass: Record<ToastVariant, string> = {
  success: "border-[color:var(--success)] bg-[color:var(--success-soft)] text-[color:var(--success)]",
  error: "border-[color:var(--error)] bg-[color:var(--error-soft)] text-[color:var(--error)]",
  warning: "border-[color:var(--warning)] bg-[color:var(--warning-soft)] text-[color:var(--warning)]",
  info: "border-[color:var(--brand)] bg-[color:var(--brand-soft)] text-[color:var(--brand)]",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const toast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-5 right-4 z-[9999] flex flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto min-w-[220px] max-w-xs rounded-xl border px-4 py-2.5 text-sm font-medium shadow-lg animate-[float-up_var(--motion-medium)_var(--ease-enter)_both]",
              variantClass[t.variant],
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
