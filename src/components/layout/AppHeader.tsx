
"use client";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, UserCircle, LogIn, UserPlus, LogOut } from "lucide-react";
import { AppLogo } from "@/components/icons";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { SidebarNav } from "./SidebarNav";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export function AppHeader() {
  const { isMobile } = useSidebar();
  const { currentUser, logout, loading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      router.push('/login');
    } catch (error) {
      toast({
        title: "Logout Failed",
        description: (error as Error).message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
      {isMobile ? (
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0 md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex flex-col p-0">
            <div className="p-4 border-b">
              <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
                <AppLogo className="h-6 w-6 text-primary" />
                <span>CycleBloom</span>
              </Link>
            </div>
            <SidebarNav isMobile={true} />
          </SheetContent>
        </Sheet>
      ) : (
        <SidebarTrigger className="hidden md:flex" />
      )}

      <div className="flex w-full items-center justify-end gap-4 md:ml-auto md:gap-2 lg:gap-4">
        {currentUser ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar>
                  {/* In a real app, currentUser.photoURL might be available */}
                  <AvatarImage src={currentUser.photoURL || "https://placehold.co/40x40.png?text=" + (currentUser.email?.[0]?.toUpperCase() || 'U')} alt={currentUser.displayName || currentUser.email || "User"} data-ai-hint="user avatar" />
                  <AvatarFallback>
                    {currentUser.email?.[0]?.toUpperCase() || <UserCircle className="h-6 w-6" />}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{currentUser.email || "My Account"}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">Profile</Link>
              </DropdownMenuItem>
              {/* <DropdownMenuItem>Settings</DropdownMenuItem> */} 
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} disabled={loading}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" />
                Login
              </Link>
            </Button>
            <Button asChild>
              <Link href="/signup">
                <UserPlus className="mr-2 h-4 w-4" />
                Sign Up
              </Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
