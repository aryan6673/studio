
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogIn } from "lucide-react";

export default function HomePage() {
  const { currentUser, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-lg mx-auto mt-10 text-center">
        <CardHeader>
          <CardTitle>Welcome to CycleBloom!</CardTitle>
          <CardDescription>
            Your personal wellness companion.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentUser ? (
            <p>You are logged in as {currentUser.email}. Explore other features using the sidebar.</p>
          ) : (
            <>
              <p className="mb-4">Please log in or sign up to get started.</p>
              <div className="flex gap-4 justify-center">
                <Button asChild>
                  <Link href="/login"><LogIn className="mr-2 h-5 w-5" />Log In</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/signup">Sign Up</Link>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
