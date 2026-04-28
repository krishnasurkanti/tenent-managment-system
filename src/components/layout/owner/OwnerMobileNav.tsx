"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Home, Hotel, Users } from "lucide-react";
import { cn } from "@/utils/cn";

const items = [
  { href: "/owner/dashboard", label: "Home", icon: Home },
  { href: "/owner/payments", label: "Payments", icon: CreditCard },
  { href: "/owner/rooms", label: "Rooms", icon: Hotel },
  { href: "/owner/tenants", label: "Tenants", icon: Users },
];

export function OwnerMobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 max-w-full overflow-hidden border-t border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(15,23,42,0.96)_0%,rgba(30,41,59,0.94)_100%)] px-2 pb-[calc(0.6rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-14px_34px_rgba(2,6,23,0.24)] backdrop-blur xl:hidden">
      <div className="mx-auto grid w-full max-w-md min-w-0 grid-cols-4 gap-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-14 min-w-0 flex-col items-center justify-center rounded-2xl px-1 text-[10px] font-semibold transition",
                active
                  ? "bg-[color:var(--surface-strong)] text-[color:var(--accent)] shadow-[0_8px_18px_rgba(249,193,42,0.12)]"
                  : "text-[color:var(--fg-secondary)] hover:text-[color:var(--fg-primary)]",
              )}
            >
              <item.icon className={cn("h-4.5 w-4.5", active ? "text-[var(--accent)]" : "")} />
              <span className="mt-1 max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
