import type { PropsWithChildren } from "react";
import Link from "next/link";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AppLogo } from "@/components/icons";
import { AppHeader } from "./AppHeader";
import { SidebarNav } from "./SidebarNav";
import { UserCircle } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";

export function AppLayout({ children }: PropsWithChildren) {
  return (
    <SidebarProvider defaultOpen={true} collapsible="icon">
      <Sidebar>
        <SidebarHeader>
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold py-2 px-1 group-data-[collapsible=icon]:justify-center">
            <AppLogo className="h-7 w-7 text-primary transition-all group-hover:scale-110" />
            <span className="group-data-[collapsible=icon]:hidden">CycleBloom</span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav />
        </SidebarContent>
        <SidebarFooter className="group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:py-2">
           {/* Placeholder for footer content, e.g. user avatar or settings */}
           <div className="flex items-center gap-2 px-1 group-data-[collapsible=icon]:hidden">
             <Avatar className="h-8 w-8">
                <AvatarImage src="https://placehold.co/40x40.png" alt="User" data-ai-hint="user avatar" />
                <AvatarFallback><UserCircle className="h-5 w-5"/></AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">Jane Doe</span>
                <span className="text-xs text-sidebar-foreground/70">jane.doe@example.com</span>
              </div>
           </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}
