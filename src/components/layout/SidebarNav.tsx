
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, // Restored for dashboard
  PenSquare,
  Gift,
  Sparkles,
  User,
  LogIn,
  UserPlus,
  // LogOut, // LogOut is handled in AppHeader
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
  { href: "/", label: "Dashboard", icon: <LayoutDashboard />, matchExact: true, authRequired: true }, 
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
  const { currentUser } = useAuth(); 

  const navItems = allNavItems.filter(item => {
    if (item.authRequired && !currentUser) return false;
    if (item.publicOnly && currentUser) return false;
    return true;
  });
  
  // Add a default "Home" link if not logged in and dashboard is authRequired
  // Or if no items would be shown at all (which shouldn't happen with login/signup)
  let displayNavItems = navItems;
  if (!currentUser && !navItems.some(item => item.href === "/")) {
    const homeLinkForPublic: NavItem = { href: "/", label: "Home", icon: <LayoutDashboard /> , matchExact: true };
    // Prepend if no existing "/" or ensure it's there
    if (!displayNavItems.find(i => i.href === "/")) {
      displayNavItems = [homeLinkForPublic, ...displayNavItems];
    }
  } else if (currentUser && !navItems.some(item => item.href === "/")) {
    // Logged in, but maybe "/" was filtered out. If so, ensure "Dashboard" is there.
    const dashboardLink = allNavItems.find(item => item.href === "/" && item.label === "Dashboard");
    if (dashboardLink && !displayNavItems.find(i => i.href === "/")) {
       displayNavItems = [dashboardLink, ...displayNavItems.filter(item => item.href !== "/")];
    }
  }


  return (
    <SidebarMenu className={cn("flex-1 overflow-y-auto p-2", isMobile && "gap-1")}>
      {displayNavItems.map((item) => {
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
