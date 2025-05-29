
"use client";

import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserProfileForm } from "@/components/feature-specific/UserProfileForm";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  // In a real app, fetch existing user profile data here based on currentUser.uid
  // For now, we'll pre-fill email if user is logged in.
  const userProfileDefaults = currentUser
    ? {
        name: currentUser.displayName || "", // Firebase Auth displayName
        email: currentUser.email || "",
        // Other fields would come from your database (e.g., Firestore)
        allergies: [], 
        foodPreferences: [],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Guess timezone
      }
    : {
        name: "",
        email: "",
        allergies: [],
        foodPreferences: [],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

  useEffect(() => {
    if (!loading && !currentUser) {
      router.replace('/login?redirect=/profile'); // Redirect to login if not authenticated
    }
  }, [currentUser, loading, router]);


  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent className="space-y-8">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!currentUser) {
     // This state should ideally be brief due to the useEffect redirect
    return (
      <div className="max-w-2xl mx-auto text-center py-10">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Please log in to view your profile.</p>
            <Button asChild>
              <Link href="/login?redirect=/profile">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
          <CardDescription>
            Manage your personal information for CycleBloom. Email is managed via your authentication provider.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserProfileForm defaultValues={userProfileDefaults} />
        </CardContent>
      </Card>
    </div>
  );
}
