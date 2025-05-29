
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CycleCalendar } from "@/components/feature-specific/CycleCalendar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PenSquare, Gift, Sparkles, LogIn, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { PeriodLog } from "@/lib/types";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs, doc, getDoc, Timestamp } from "firebase/firestore";
import { parseISO, isValid, format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface UserProfileData {
  averageCycleLength?: number | null;
  averagePeriodDuration?: number | null;
}

export default function DashboardPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const [periodLogs, setPeriodLogs] = useState<PeriodLog[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [dataLoading, setDataLoading] = useState(true); 
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!currentUser?.uid) {
      console.log("DashboardPage: fetchDashboardData called without currentUser.uid, bailing.");
      setDataLoading(false);
      setPeriodLogs([]);
      setUserProfile(null);
      setError(null); // Clear errors if no user
      return;
    }

    console.log("DashboardPage: Starting fetchDashboardData for user:", currentUser.uid);
    setDataLoading(true);
    setError(null); 

    try {
      const logsCollectionRef = collection(db, "users", currentUser.uid, "periodLogs");
      const q = query(logsCollectionRef, orderBy("startDate", "desc"), limit(24)); // Fetch more logs for AI
      const logsSnapshot = await getDocs(q);
      const fetchedLogs = logsSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        let startDate: Date | null = null;
        if (data.startDate) {
          // Firestore might store dates as Timestamps or strings depending on how they were saved
          if (data.startDate instanceof Timestamp) startDate = data.startDate.toDate();
          else if (typeof data.startDate === 'string') startDate = parseISO(data.startDate);
        }
        // Validate the parsed date
        if (startDate && !isValid(startDate)) {
          console.warn("Invalid startDate from Firestore:", docSnap.id, data.startDate);
          startDate = null; // Treat as invalid
        }

        let endDate: Date | undefined = undefined;
        if (data.endDate) {
          if (data.endDate instanceof Timestamp) endDate = data.endDate.toDate();
          else if (typeof data.endDate === 'string') endDate = parseISO(data.endDate);
        }
        if (endDate && !isValid(endDate)) {
          console.warn("Invalid endDate from Firestore:", docSnap.id, data.endDate);
          endDate = undefined;
        }
        
        if (!startDate) return null; // Skip logs with invalid start dates
        return {
          id: docSnap.id,
          startDate: startDate,
          endDate: endDate,
          symptoms: data.symptoms || [],
        } as PeriodLog;
      }).filter(log => log !== null) as PeriodLog[]; // Filter out any nulls from invalid dates
      setPeriodLogs(fetchedLogs);
      console.log("DashboardPage: Fetched period logs:", fetchedLogs.length);

      const profileDocRef = doc(db, "users", currentUser.uid);
      const profileSnap = await getDoc(profileDocRef);
      if (profileSnap.exists()) {
        const profileData = profileSnap.data();
        setUserProfile({
          averageCycleLength: profileData.averageCycleLength === undefined ? null : profileData.averageCycleLength,
          averagePeriodDuration: profileData.averagePeriodDuration === undefined ? null : profileData.averagePeriodDuration,
        });
        console.log("DashboardPage: Fetched user profile data.");
      } else {
        // No profile document exists, use defaults (nulls)
        setUserProfile({ averageCycleLength: null, averagePeriodDuration: null });
        console.log("DashboardPage: No user profile found, using defaults.");
      }
      console.log("DashboardPage: fetchDashboardData completed successfully.");

    } catch (err: any) {
      console.error("DashboardPage: Raw error object in fetchDashboardData:", err);
      console.error("DashboardPage: Error name:", err.name);
      console.error("DashboardPage: Error message:", err.message);
      console.error("DashboardPage: Error code:", err.code);

      let friendlyErrorMessage = "Failed to load dashboard data. An unexpected error occurred.";
      const errorMessageLower = String(err.message || '').toLowerCase();
      const errStringLower = String(err).toLowerCase(); // Check the whole error object as string

      // More robust check for offline/network errors
      if (err.code === 'unavailable' || 
          errorMessageLower.includes('offline') || 
          errorMessageLower.includes('network request failed') ||
          errorMessageLower.includes('failed to fetch') ||
          errorMessageLower.includes('internet connection') ||
          errStringLower.includes('client is offline')) { // Added check for the specific string
        friendlyErrorMessage = "You appear to be offline or there's a network issue. Please check your internet connection and try again.";
      } else if (err.code === 'permission-denied') {
        friendlyErrorMessage = "You do not have permission to access this data. Please ensure you are logged in with the correct account or contact support if this persists.";
      } else if (err.message) {
        // Use the Firebase error message if it's not one of the handled cases above
        friendlyErrorMessage = `Could not load dashboard data. Error: ${err.message}`;
      }
      
      console.log("DashboardPage: Setting error state to:", friendlyErrorMessage);
      setError(friendlyErrorMessage);
      setPeriodLogs([]); // Clear data on error
      setUserProfile(null); // Clear profile on error
    } finally {
      console.log("DashboardPage: Setting dataLoading to false in finally block.");
      setDataLoading(false);
    }
  }, [currentUser?.uid]); // Depend only on currentUser.uid for stability

  useEffect(() => {
    console.log("DashboardPage: Auth or loading state changed. AuthLoading:", authLoading, "CurrentUser:", !!currentUser);
    if (authLoading) {
      console.log("DashboardPage: Auth is loading, setting dataLoading to true and clearing error.");
      setDataLoading(true); // Ensure dataLoading is true while auth is loading
      setError(null); // Clear previous errors while auth is loading
    } else if (currentUser) {
      console.log("DashboardPage: Auth loaded and user exists, calling fetchDashboardData.");
      fetchDashboardData().catch(e => {
        // This catch is an additional safeguard. Errors should ideally be handled within fetchDashboardData.
        console.error("DashboardPage: Uncaught error from fetchDashboardData promise in useEffect:", e);
        setError("An unexpected error occurred while trying to load dashboard data. Please try refreshing.");
        setDataLoading(false);
      });
    } else { // No currentUser and not authLoading (e.g., logged out)
      console.log("DashboardPage: Auth loaded and no user, clearing data and error states.");
      setPeriodLogs([]);
      setUserProfile(null);
      setError(null);
      setDataLoading(false); // No data to load if not logged in
    }
  }, [currentUser, authLoading, fetchDashboardData]);

  // Log changes to error and dataLoading states for debugging
  useEffect(() => {
    console.log("DashboardPage: Error state is now:", error);
  }, [error]);
  
  useEffect(() => {
    console.log("DashboardPage: dataLoading state is now:", dataLoading);
  }, [dataLoading]);


  // -------- Rendering Logic --------

  if (authLoading) {
    console.log("DashboardPage: Rendering Auth Loading Skeleton.");
    // setError should be null here due to useEffect logic above setting it null when authLoading is true.
    return (
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><Skeleton className="h-7 w-3/5" /><Skeleton className="h-4 w-4/5 mt-1" /></CardHeader>
          <CardContent><Skeleton className="h-[400px] w-full" /></CardContent>
        </Card>
        <div className="space-y-6">
          <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent className="grid gap-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-10 w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  if (!currentUser) { // authLoading is false here
    console.log("DashboardPage: Rendering Not Logged In State.");
    return (
      <Card className="max-w-md mx-auto mt-10 text-center">
        <CardHeader><CardTitle>Welcome to CycleBloom!</CardTitle><CardDescription>Please log in to view your dashboard and track your cycle.</CardDescription></CardHeader>
        <CardContent><Button asChild><Link href="/login"><LogIn className="mr-2 h-5 w-5" />Log In</Link></Button></CardContent>
      </Card>
    );
  }
  
  // currentUser exists, authLoading is false. Now check for errors from data fetching.
  if (error) {
    console.log("DashboardPage: Rendering Error State Card. CurrentUser:", !!currentUser, "Error Message:", error);
    return (
        <Card className="max-w-lg mx-auto mt-10 text-center">
            <CardHeader>
                <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit">
                    <AlertTriangle className="h-10 w-10 text-destructive" />
                </div>
                <CardTitle className="mt-4 text-destructive">Error Loading Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground mb-6">{error}</p>
                <Button onClick={() => {
                  console.log("DashboardPage: Try Again button clicked.");
                  fetchDashboardData().catch(e => { /* Already handled */ });
                }} disabled={dataLoading}>
                  {dataLoading ? "Retrying..." : "Try Again"}
                </Button>
            </CardContent>
        </Card>
    );
  }

  // currentUser exists, authLoading is false, no error. Check dataLoading for Firestore.
  if (dataLoading) { // This means fetchDashboardData is in progress (or hasn't successfully completed)
    console.log("DashboardPage: Rendering Data Loading Skeleton (currentUser exists, no error yet).");
     return (
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><Skeleton className="h-7 w-3/5" /><Skeleton className="h-4 w-4/5 mt-1" /></CardHeader>
          <CardContent><Skeleton className="h-[400px] w-full" /></CardContent>
        </Card>
        <div className="space-y-6">
          <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent className="grid gap-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></CardContent></Card>
          <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-10 w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }
  
  // currentUser exists, authLoading is false, no error, dataLoading is false. Data *should* be loaded.
  // The UserProfile can be null if not yet created by the user, this is a valid state.
  if (userProfile !== null) { // Check userProfile is not null (it can be empty object {} if no data but doc exists, or actual data)
    console.log("DashboardPage: Rendering Data Loaded State. Logs:", periodLogs.length, "Profile:", userProfile);
    // Filter logs one last time to be absolutely sure, though fetchDashboardData should handle this
    const validPeriodLogs = periodLogs.filter(log => log && log.startDate && isValid(log.startDate));

    return (
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Cycle Overview</CardTitle>
            <CardDescription>Your personalized cycle calendar. AI predictions are estimates.</CardDescription>
          </CardHeader>
          <CardContent>
            <CycleCalendar 
              logs={validPeriodLogs} 
              cycleLength={userProfile?.averageCycleLength ?? undefined} // Pass undefined if null
              averagePeriodDuration={userProfile?.averagePeriodDuration ?? undefined} // Pass undefined if null
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              <Button asChild variant="outline" className="w-full justify-start"><Link href="/log-period"><PenSquare className="mr-2 h-5 w-5" />Log Period / Symptoms</Link></Button>
              <Button asChild variant="outline" className="w-full justify-start"><Link href="/recommendations"><Gift className="mr-2 h-5 w-5" />Get Gift Suggestions</Link></Button>
              <Button asChild variant="outline" className="w-full justify-start"><Link href="/wellness"><Sparkles className="mr-2 h-5 w-5" />View Wellness Tips</Link></Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader><CardTitle>Today's Tip</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">Stay hydrated! Drinking enough water can help reduce bloating and fatigue during your cycle.</p></CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Fallback rendering - this should ideally not be reached if logic above is correct.
  // It might be hit briefly if userProfile is null but dataLoading is false, which can happen if the profile doc doesn't exist.
  console.warn("DashboardPage: Reached fallback rendering state. This might be okay if profile doesn't exist yet. State:", { authLoading, currentUser: !!currentUser, error, dataLoading, userProfileExists: !!userProfile });
  return (
    <div className="text-center py-10">
        <p>Loading dashboard or an unexpected state occurred. Please try refreshing the page.</p>
        {error && <p className="text-destructive mt-2">{error}</p>}
        {!dataLoading && !userProfile && !error && currentUser && (
          <Card className="max-w-md mx-auto mt-4">
            <CardHeader><CardTitle>Welcome!</CardTitle></CardHeader>
            <CardContent>
              <p className="mb-4 text-muted-foreground">It looks like your dashboard is ready. You can start by logging your period or setting up your profile.</p>
              <div className="flex gap-2 justify-center">
                <Button asChild><Link href="/log-period">Log Period</Link></Button>
                <Button asChild variant="outline"><Link href="/profile">Set Profile</Link></Button>
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
    

    