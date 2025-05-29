
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  // LayoutDashboard, // Removed for dashboard
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
  // { href: "/", label: "Dashboard", icon: <LayoutDashboard />, matchExact: true }, // Dashboard link removed
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
  const { currentUser } = useAuth(); // Removed logout as it's in AppHeader

  const navItems = allNavItems.filter(item => {
    if (item.authRequired && !currentUser) return false;
    if (item.publicOnly && currentUser) return false;
    return true;
  });

  // If no items are available (e.g., user logged in and only publicOnly items existed),
  // we might want a fallback or ensure there's always something to show.
  // For now, it will render an empty menu if navItems is empty.
  // A default "Home" link could be added if the dashboard is removed.
  // Let's add a home link if the root "/" is no longer the dashboard.
  const homeLink: NavItem = { href: "/", label: "Home", icon: <LogIn className="h-5 w-5"/>, matchExact: true }; // Using LogIn icon as a placeholder
  const displayNavItems = (pathname === "/" && navItems.some(item => item.href === "/")) ? navItems : [homeLink, ...navItems.filter(item => item.href !== "/")];
  
  // Ensure "Home" is only added if it's not already present (e.g. from allNavItems)
  // and avoid duplicates if the root path behavior changes.
  // A simpler approach for now: If dashboard is removed, "/" should go somewhere, or be the new minimal home.
  // The current page.tsx serves as the home page.
  
  // Refined logic for navItems to ensure "/" (Home) is present if it was the dashboard.
  const dashboardWasPresent = allNavItems.find(item => item.href === "/" && item.label === "Dashboard");
  let finalNavItems = navItems;
  if (!dashboardWasPresent && !navItems.some(item => item.href === "/")) {
    // If dashboard was removed and no other explicit "/" route exists for the current auth state
    // Add a generic Home link.
    // This is a bit complex; the new page.tsx should define what "/" means.
    // For now, the existing logic will filter.
  }


  return (
    <SidebarMenu className={cn("flex-1 overflow-y-auto p-2", isMobile && "gap-1")}>
      {navItems.map((item) => { // Using original filtered navItems
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
