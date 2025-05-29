"use client";

import React from "react"; // Added React import
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Gift,
  HeartPulse,
  LayoutDashboard,
  Settings,
  Sparkles,
  User,
  Wallet,
  PenSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactElement;
  matchExact?: boolean;
}

export const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: <LayoutDashboard />, matchExact: true },
  { href: "/log-period", label: "Log Period", icon: <PenSquare /> },
  { href: "/recommendations", label: "Recommendations", icon: <Gift /> },
  { href: "/wellness", label: "Wellness Tips", icon: <Sparkles /> },
  { href: "/wallet", label: "Wallet", icon: <Wallet /> },
  { href: "/profile", label: "Profile", icon: <User /> },
];

export function SidebarNav({ isMobile = false }: { isMobile?: boolean }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarMenu className={cn("flex-1 overflow-y-auto p-2", isMobile && "gap-1")}>
      {navItems.map((item) => {
        const isActive = item.matchExact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href} passHref legacyBehavior>
              <SidebarMenuButton
                isActive={isActive}
                tooltip={{ children: item.label, className: "md:block hidden" }}
                onClick={isMobile ? () => setOpenMobile(false) : undefined}
                className={cn(isMobile && "text-base h-12")}
              >
                {React.cloneElement(item.icon, { className: "h-5 w-5" })}
                <span className={cn(isMobile ? "inline" : "group-data-[collapsible=icon]:hidden")}>
                  {item.label}
                </span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
