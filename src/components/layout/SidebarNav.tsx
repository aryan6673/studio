
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PenSquare,
  Gift,
  Sparkles,
  User,
  LogIn,
  UserPlus,
  LogOut, 
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext"; 

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactElement;
  matchExact?: boolean;
  authRequired?: boolean; 
  publicOnly?: boolean; 
}

const allNavItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: <LayoutDashboard />, matchExact: true },
  { href: "/log-period", label: "Log Period", icon: <PenSquare />, authRequired: true },
  { href: "/recommendations", label: "Recommendations", icon: <Gift />, authRequired: true },
  { href: "/wellness", label: "Wellness Tips", icon: <Sparkles /> }, 
  { href: "/profile", label: "Profile", icon: <User />, authRequired: true },
  { href: "/login", label: "Login", icon: <LogIn />, publicOnly: true },
  { href: "/signup", label: "Sign Up", icon: <UserPlus />, publicOnly: true },
];

export function SidebarNav({ isMobile = false }: { isMobile?: boolean }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const { currentUser, logout } = useAuth(); 

  const navItems = allNavItems.filter(item => {
    if (item.authRequired && !currentUser) return false;
    if (item.publicOnly && currentUser) return false;
    return true;
  });

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
