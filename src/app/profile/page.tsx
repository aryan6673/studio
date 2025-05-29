
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserProfileForm, type UserProfileFormData } from "@/components/feature-specific/UserProfileForm";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface StoredUserProfileData {
  name?: string;
  allergies?: string[];
  foodPreferences?: string[];
  timezone?: string;
  averageCycleLength?: number | null;
  averagePeriodDuration?: number | null;
}

export default function ProfilePage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [profileData, setProfileData] = useState<Partial<UserProfileFormData> | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const fetchProfileData = useCallback(async () => {
    if (!currentUser) {
      setDataLoading(false);
      return;
    }
    setDataLoading(true);
    try {
      const docRef = doc(db, "users", currentUser.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as StoredUserProfileData;
        setProfileData({
          name: data.name || currentUser.displayName || "",
          email: currentUser.email || "",
          allergies: data.allergies || [],
          foodPreferences: data.foodPreferences || [],
          timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          averageCycleLength: data.averageCycleLength === undefined ? null : data.averageCycleLength,
          averagePeriodDuration: data.averagePeriodDuration === undefined ? null : data.averagePeriodDuration,
        });
      } else {
        // No document, use defaults
        setProfileData({
          name: currentUser.displayName || "",
          email: currentUser.email || "",
          allergies: [],
          foodPreferences: [],
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          averageCycleLength: null,
          averagePeriodDuration: null,
        });
      }
    } catch (error) {
      console.error("Error fetching profile data:", error);
      toast({
        title: "Error",
        description: "Could not load your profile data.",
        variant: "destructive",
      });
      // Fallback to auth data if Firestore fails
       setProfileData({
        name: currentUser.displayName || "",
        email: currentUser.email || "",
        allergies: [],
        foodPreferences: [],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        averageCycleLength: null,
        averagePeriodDuration: null,
      });
    } finally {
      setDataLoading(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.replace('/login?redirect=/profile');
    } else if (currentUser) {
      fetchProfileData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, authLoading, router]); // fetchProfileData is memoized


  if (authLoading || dataLoading) {
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
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!currentUser) {
    return (
      <div className="max-w-2xl mx-auto text-center py-10">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Please log in to view and edit your profile.</p>
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
            Manage your personal information for CycleBloom.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {profileData && <UserProfileForm defaultValues={profileData} onSaveSuccess={fetchProfileData} />}
        </CardContent>
      </Card>
    </div>
  );
}
