
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
import { parseISO, isValid } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface UserProfileData {
  averageCycleLength?: number | null;
  averagePeriodDuration?: number | null;
}

export default function DashboardPage() {
  const { currentUser, loading: authLoading } = useAuth();

  const [periodLogs, setPeriodLogs] = useState<PeriodLog[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  console.log(`DashboardPage: Initial render. AuthLoading: ${authLoading}, CurrentUser: ${!!currentUser}`);

  const fetchDashboardData = useCallback(async (userId: string) => {
    console.log(`DashboardPage: fetchDashboardData called for userId: ${userId}`);
    setIsDataLoading(true);
    setFetchError(null);
    // Reset data states before fetching to avoid showing stale data during load
    setPeriodLogs([]);
    setUserProfile(null);

    try {
      console.log("DashboardPage: Attempting to fetch period logs.");
      const logsCollectionRef = collection(db, "users", userId, "periodLogs");
      const logsQuery = query(logsCollectionRef, orderBy("startDate", "desc"), limit(24));
      const logsSnapshot = await getDocs(logsQuery);
      const fetchedLogs: PeriodLog[] = logsSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        let startDate: Date | null = null;
        if (data.startDate) {
          if (data.startDate instanceof Timestamp) startDate = data.startDate.toDate();
          else if (typeof data.startDate === 'string') startDate = parseISO(data.startDate);
        }
        if (startDate && !isValid(startDate)) {
            console.warn("DashboardPage: Invalid startDate from Firestore:", docSnap.id, data.startDate);
            startDate = null;
        }

        let endDate: Date | undefined = undefined;
        if (data.endDate) {
          if (data.endDate instanceof Timestamp) endDate = data.endDate.toDate();
          else if (typeof data.endDate === 'string') endDate = parseISO(data.endDate);
        }
        if (endDate && !isValid(endDate)) {
            console.warn("DashboardPage: Invalid endDate from Firestore:", docSnap.id, data.endDate);
            endDate = undefined;
        }
        
        if (!startDate) return null; 
        return {
          id: docSnap.id,
          startDate: startDate,
          endDate: endDate,
          symptoms: data.symptoms || [],
        } as PeriodLog;
      }).filter(log => log !== null) as PeriodLog[];
      
      setPeriodLogs(fetchedLogs);
      console.log(`DashboardPage: Fetched ${fetchedLogs.length} period logs.`);

      console.log("DashboardPage: Attempting to fetch user profile.");
      const profileDocRef = doc(db, "users", userId);
      const profileSnap = await getDoc(profileDocRef);

      if (profileSnap.exists()) {
        const profileData = profileSnap.data();
        setUserProfile({
          averageCycleLength: profileData.averageCycleLength === undefined ? null : profileData.averageCycleLength,
          averagePeriodDuration: profileData.averagePeriodDuration === undefined ? null : profileData.averagePeriodDuration,
        });
        console.log("DashboardPage: User profile data fetched:", userProfile);
      } else {
        setUserProfile({ averageCycleLength: null, averagePeriodDuration: null });
        console.log("DashboardPage: No user profile document found, using defaults.");
      }
      console.log("DashboardPage: fetchDashboardData completed successfully.");

    } catch (err: any) {
      console.error("DashboardPage: --- RAW ERROR OBJECT IN fetchDashboardData ---", err);
      console.error("DashboardPage: Error Name:", err.name);
      console.error("DashboardPage: Error Message:", err.message);
      console.error("DashboardPage: Error Code:", err.code);
      // console.error("DashboardPage: Error Stack:", err.stack); // Can be very verbose

      let friendlyErrorMessage = "Failed to load dashboard data. An unexpected error occurred.";
      const errorMessageLower = String(err.message || '').toLowerCase();
      const errStringLower = String(err).toLowerCase(); // Check the whole error object as string

      if (err.code === 'unavailable' || 
          errorMessageLower.includes('offline') || 
          errorMessageLower.includes('network request failed') ||
          errorMessageLower.includes('failed to fetch') ||
          errorMessageLower.includes('internet connection') ||
          errStringLower.includes('client is offline')) {
        friendlyErrorMessage = "You appear to be offline or there's a network issue. Please check your internet connection and try again.";
      } else if (err.code === 'permission-denied') {
        friendlyErrorMessage = "You do not have permission to access this data. Please ensure you are logged in with the correct account or contact support if this persists.";
      } else if (err.message) {
        friendlyErrorMessage = `Could not load dashboard data. Error: ${err.message}`;
      }
      
      console.log("DashboardPage: Setting fetchError to:", friendlyErrorMessage);
      setFetchError(friendlyErrorMessage);
      setPeriodLogs([]); 
      setUserProfile(null);
    } finally {
      console.log("DashboardPage: Setting isDataLoading to false in fetchDashboardData finally block.");
      setIsDataLoading(false);
    }
  }, []); // db, collection, query, orderBy, limit, getDocs, doc, getDoc, Timestamp, parseISO, isValid are stable imports

  useEffect(() => {
    console.log("DashboardPage: useEffect for auth/user changes triggered. AuthLoading:", authLoading, "CurrentUser:", !!currentUser?.uid);
    if (authLoading) {
      console.log("DashboardPage: Auth is loading. Setting isDataLoading=true, clearing fetchError, logs, and profile.");
      setIsDataLoading(true); // Show loading skeleton while auth resolves
      setFetchError(null);
      setPeriodLogs([]);
      setUserProfile(null);
    } else if (currentUser && currentUser.uid) {
      console.log("DashboardPage: User is authenticated. Calling fetchDashboardData.");
      fetchDashboardData(currentUser.uid).catch(e => {
          console.error("DashboardPage: Critical error calling fetchDashboardData from useEffect:", e);
          setFetchError("A critical error occurred while initiating data load.");
          setIsDataLoading(false);
      });
    } else if (!currentUser && !authLoading) {
      // No user, and auth is done loading (i.e., user is logged out or never logged in)
      console.log("DashboardPage: No user and not authLoading. Clearing data/error, setting isDataLoading=false.");
      setIsDataLoading(false);
      setFetchError(null);
      setPeriodLogs([]);
      setUserProfile(null);
    }
  }, [currentUser?.uid, authLoading, fetchDashboardData]); // Re-run if user.uid changes or authLoading status changes

  useEffect(() => {
    console.log("DashboardPage: fetchError state changed to:", fetchError);
  }, [fetchError]);

  useEffect(() => {
    console.log("DashboardPage: isDataLoading state changed to:", isDataLoading);
  }, [isDataLoading]);


  const handleRetry = () => {
    console.log("DashboardPage: Retry button clicked.");
    if (currentUser && currentUser.uid) {
      // Reset error and trigger fetch
      setFetchError(null);
      setIsDataLoading(true); // Manually set loading true before fetch
      fetchDashboardData(currentUser.uid);
    } else {
      console.warn("DashboardPage: Retry clicked, but no current user. This scenario should ideally be handled by redirecting to login if auth fails.");
      setFetchError("Please log in to load your dashboard.");
    }
  };

  // ----- RENDER LOGIC -----

  // 1. Auth Loading State (Highest priority)
  if (authLoading) {
    console.log("DashboardPage: RENDERING - Auth Loading Skeleton.");
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

  // 2. Error State (If an error occurred during data fetching for an authenticated user)
  // This should show *even if* currentUser exists, if fetchError is set.
  if (fetchError && currentUser) { // Only show this specific error UI if there was a user context for the fetch
    console.log("DashboardPage: RENDERING - Error State Card. Message:", fetchError);
    return (
        <Card className="max-w-lg mx-auto mt-10 text-center">
            <CardHeader>
                <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit">
                    <AlertTriangle className="h-10 w-10 text-destructive" />
                </div>
                <CardTitle className="mt-4 text-destructive">Error Loading Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground mb-6">{fetchError}</p>
                <Button onClick={handleRetry} disabled={isDataLoading}>
                  {isDataLoading ? "Retrying..." : "Try Again"}
                </Button>
            </CardContent>
        </Card>
    );
  }
  
  // 3. No Current User State (After auth has loaded and if no error from a previous fetch attempt with a user)
  if (!currentUser) {
    console.log("DashboardPage: RENDERING - Not Logged In State.");
    return (
      <Card className="max-w-md mx-auto mt-10 text-center">
        <CardHeader><CardTitle>Welcome to CycleBloom!</CardTitle><CardDescription>Please log in to view your dashboard and track your cycle.</CardDescription></CardHeader>
        <CardContent><Button asChild><Link href="/login"><LogIn className="mr-2 h-5 w-5" />Log In</Link></Button></CardContent>
      </Card>
    );
  }

  // 4. Data Loading State (User is logged in, no error yet, data is fetching)
  if (isDataLoading) { // currentUser must exist here
    console.log("DashboardPage: RENDERING - Data Loading Skeleton (User exists, no error yet).");
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
  
  // 5. Success State (User logged in, no error, data finished loading)
  // userProfile *should* be non-null here if isDataLoading is false and no fetchError
  if (userProfile) { 
    console.log("DashboardPage: RENDERING - Data Loaded State. Logs:", periodLogs.length, "Profile:", userProfile);
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
              cycleLength={userProfile?.averageCycleLength ?? undefined}
              averagePeriodDuration={userProfile?.averagePeriodDuration ?? undefined}
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

  // 6. Fallback / Initial Profile Setup Prompt (User is logged in, data loading done, no error, but profile might be new)
  // This state implies currentUser exists, isDataLoading is false, fetchError is null, but userProfile might still be null
  // (e.g., after a fresh signup where profile document hasn't been created via profile page yet).
  console.warn("DashboardPage: RENDERING - Fallback or Initial Setup State. User:", currentUser?.uid, "isDataLoading:", isDataLoading, "fetchError:", fetchError, "userProfile:", userProfile);
  return (
    <Card className="max-w-md mx-auto mt-10 text-center">
      <CardHeader><CardTitle>Welcome to CycleBloom!</CardTitle></CardHeader>
      <CardContent>
        <p className="mb-4 text-muted-foreground">
          Your dashboard is ready! Start by logging your period or setting up your cycle preferences in your profile.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button asChild><Link href="/log-period">Log Your First Period</Link></Button>
          <Button asChild variant="outline"><Link href="/profile">Set Up Profile</Link></Button>
        </div>
        {fetchError && <p className="text-destructive text-sm mt-4">{fetchError}</p>} 
        <Button onClick={handleRetry} className="mt-4" variant="ghost" disabled={isDataLoading}>
            {isDataLoading ? "Loading..." : "Refresh Dashboard"}
        </Button>
      </CardContent>
    </Card>
  );
}
    
