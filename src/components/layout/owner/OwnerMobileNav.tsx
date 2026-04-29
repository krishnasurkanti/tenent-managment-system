"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Home, Hotel, Users } from "lucide-react";
import { cn } from "@/utils/cn";

const items = [
  { href: "/owner/dashboard", label: "Home",     icon: Home       },
  { href: "/owner/payments",  label: "Payments", icon: CreditCard },
  { href: "/owner/rooms",     label: "Rooms",    icon: Hotel      },
  { href: "/owner/tenants",   label: "Tenants",  icon: Users      },
];

export function OwnerMobileNav() {
  const pathname = usePathname();

  return (
    /*
      Fixed at bottom. Total height matches --nav-h (62px) including safe-area padding.
      xl:hidden — replaced by sidebar on wide screens.
    */
    <nav
      className="fixed inset-x-0 bottom-0 z-50 max-w-full border-t border-white/[0.07] bg-[rgba(9,9,11,0.94)] backdrop-blur-xl xl:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto grid w-full max-w-sm grid-cols-4 gap-0.5 px-2 py-1.5">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-[3px] rounded-xl px-1 py-2 text-[10px] font-semibold transition",
                active
                  ? "bg-[rgba(99,102,241,0.14)] text-[#818cf8]"
                  : "text-white/38 hover:text-white/65",
              )}
            >
              <item.icon
                className={cn(
                  "h-[17px] w-[17px] transition",
                  active ? "stroke-[2.2]" : "stroke-[1.8]",
                )}
              />
              <span className="max-w-full truncate leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
