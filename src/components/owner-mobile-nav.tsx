"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Ellipsis, Home, Hotel, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/owner/dashboard", label: "Home", icon: Home },
  { href: "/owner/payments", label: "Payments", icon: CreditCard },
  { href: "/owner/rooms", label: "Rooms", icon: Hotel },
  { href: "/owner/tenants", label: "Tenants", icon: Users },
  { href: "/owner/settings", label: "More", icon: Ellipsis },
];

export function OwnerMobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/80 bg-white/95 px-2 pb-[calc(0.6rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur xl:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center rounded-2xl px-1 text-[10px] font-semibold transition",
                active ? "bg-[var(--pill-gradient)] text-[var(--accent)]" : "text-slate-500 hover:text-slate-800",
              )}
            >
              <item.icon className={cn("h-4.5 w-4.5", active ? "text-[var(--accent)]" : "")} />
              <span className="mt-1 truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
