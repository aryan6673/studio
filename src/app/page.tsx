
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
  const [isDataLoading, setIsDataLoading] = useState(true); // Initialize to true
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    console.log("DashboardPage: FetchError state changed to:", fetchError);
  }, [fetchError]);


  const fetchDashboardData = useCallback(async (userId: string) => {
    console.log(`DashboardPage: fetchDashboardData called for userId: ${userId}`);
    setIsDataLoading(true);
    // DO NOT setFetchError(null) here initially to make error state stickier until explicit clear by retry or auth change

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
          else if (typeof data.startDate === 'string') {
            const parsed = parseISO(data.startDate);
            if (isValid(parsed)) startDate = parsed;
          }
        }
        if (!startDate || !isValid(startDate)) {
            console.warn("DashboardPage: Invalid startDate from Firestore:", docSnap.id, data.startDate);
            return null;
        }

        let endDate: Date | undefined = undefined;
        if (data.endDate) {
          if (data.endDate instanceof Timestamp) endDate = data.endDate.toDate();
          else if (typeof data.endDate === 'string') {
            const parsed = parseISO(data.endDate);
            if (isValid(parsed)) endDate = parsed;
          }
        }
        if (endDate && !isValid(endDate)) {
            console.warn("DashboardPage: Invalid endDate from Firestore:", docSnap.id, data.endDate);
            endDate = undefined;
        }
        
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
        console.log("DashboardPage: User profile data fetched:", { averageCycleLength: profileData.averageCycleLength, averagePeriodDuration: profileData.averagePeriodDuration });
      } else {
        setUserProfile({ averageCycleLength: null, averagePeriodDuration: null });
        console.log("DashboardPage: No user profile document found, using defaults.");
      }
      console.log("DashboardPage: fetchDashboardData completed successfully.");
      setFetchError(null); // Clear error only on successful fetch

    } catch (err: any) {
      console.error("DashboardPage: --- RAW ERROR OBJECT IN fetchDashboardData ---", err);
      console.error("DashboardPage: Error Name:", err.name);
      console.error("DashboardPage: Error Message:", err.message);
      console.error("DashboardPage: Error Code:", err.code);

      let friendlyErrorMessage = "Failed to load dashboard data. An unexpected error occurred.";
      const errStringLower = String(err).toLowerCase();
      const errMessageLower = String(err.message || '').toLowerCase();

      if (err.code === 'unavailable' ||
          errStringLower.includes('client is offline') ||
          errMessageLower.includes('offline') ||
          errMessageLower.includes('network request failed') ||
          errMessageLower.includes('failed to fetch') ||
          errMessageLower.includes('internet connection')) {
        friendlyErrorMessage = "You appear to be offline or there's a network issue. Please check your internet connection and try again.";
      } else if (err.code === 'permission-denied') {
        friendlyErrorMessage = "You do not have permission to access this data. Please ensure you are logged in with the correct account or contact support if this persists.";
      } else if (err.message) {
        friendlyErrorMessage = `Could not load dashboard data. Error: ${err.message}`;
      }
      
      console.log("DashboardPage: Setting fetchError to:", friendlyErrorMessage);
      setFetchError(friendlyErrorMessage);
      // Do not clear logs/profile here, let them persist if they were fetched before error
    } finally {
      console.log("DashboardPage: Setting isDataLoading to false in fetchDashboardData finally block.");
      setIsDataLoading(false);
    }
  }, []); // Empty dependency array makes fetchDashboardData stable

  useEffect(() => {
    console.log("DashboardPage: Auth or loading state changed. AuthLoading:", authLoading, "CurrentUser:", !!currentUser?.uid);
    if (authLoading) {
      console.log("DashboardPage: Auth is loading. Setting isDataLoading=true, clearing fetchError.");
      setIsDataLoading(true);
      setFetchError(null); // Explicitly clear error when auth is re-evaluating
      // setPeriodLogs([]); // Keep potentially stale data until new data is loaded or confirmed no user
      // setUserProfile(null);
    } else if (currentUser && currentUser.uid) {
      if (!isDataLoading && !fetchError) { // Only fetch if not already loading AND no prior persistent error
        console.log("DashboardPage: User is authenticated, no current error, not loading. Calling fetchDashboardData.");
        fetchDashboardData(currentUser.uid).catch(e => {
            console.error("DashboardPage: Critical error during fetchDashboardData invocation or its promise chain:", e);
            setFetchError("A critical error occurred while trying to load dashboard data. Please check console.");
            setIsDataLoading(false); 
        });
      } else if (fetchError) {
        console.log("DashboardPage: User is authenticated, but an error exists. Not refetching automatically. Error:", fetchError);
      } else if (isDataLoading) {
        console.log("DashboardPage: User is authenticated, but data is already loading. Not refetching automatically.");
      }
    } else if (!currentUser && !authLoading) {
      console.log("DashboardPage: No user and not authLoading. Clearing data/error, setting isDataLoading=false.");
      setIsDataLoading(false); // Ensure loading is false
      setFetchError(null); // Clear error as there's no user context for an error
      setPeriodLogs([]);
      setUserProfile(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid, authLoading]); // fetchDashboardData is stable and not needed as dependency

  const handleRetry = () => {
    console.log("DashboardPage: Retry button clicked.");
    if (currentUser && currentUser.uid) {
      setFetchError(null); // Explicitly clear error before retrying
      // setIsDataLoading(true); // fetchDashboardData will set this
      fetchDashboardData(currentUser.uid);
    } else {
      console.warn("DashboardPage: Retry clicked, but no current user.");
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

  // 2. Error State (If an error occurred, this takes precedence)
  if (fetchError) { 
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
  
  // 3. No Current User State (After auth, no error)
  if (!currentUser) { 
    console.log("DashboardPage: RENDERING - Not Logged In State.");
    return (
      <Card className="max-w-md mx-auto mt-10 text-center">
        <CardHeader><CardTitle>Welcome to CycleBloom!</CardTitle><CardDescription>Please log in to view your dashboard and track your cycle.</CardDescription></CardHeader>
        <CardContent><Button asChild><Link href="/login"><LogIn className="mr-2 h-5 w-5" />Log In</Link></Button></CardContent>
      </Card>
    );
  }

  // 4. Data Loading State (User exists, no error, data is fetching)
  if (isDataLoading) { 
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
  
  // 5. Success State (User exists, no error, data finished loading, profile potentially exists)
  if (currentUser && !isDataLoading && !fetchError) {
    console.log("DashboardPage: RENDERING - Data Loaded State. Logs:", periodLogs.length, "Profile:", userProfile);
    const validPeriodLogs = periodLogs.filter(log => log && log.startDate && isValid(log.startDate));
    
    const displayProfile = userProfile || { averageCycleLength: null, averagePeriodDuration: null };

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
              cycleLength={displayProfile.averageCycleLength ?? undefined}
              averagePeriodDuration={displayProfile.averagePeriodDuration ?? undefined}
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

  // 6. Fallback / Should not be commonly reached if logic above is correct
  console.warn("DashboardPage: RENDERING - Fallback State. User:", currentUser?.uid, "isDataLoading:", isDataLoading, "fetchError:", fetchError, "userProfile:", userProfile);
  return (
    <Card className="max-w-md mx-auto mt-10 text-center">
      <CardHeader><CardTitle>Loading Dashboard</CardTitle></CardHeader>
      <CardContent>
        <p className="mb-4 text-muted-foreground">
          Just a moment while we get things ready...
        </p>
        {fetchError && <p className="text-destructive text-sm mt-4">Error: {fetchError}</p>} {/* Also show error in fallback */}
        <Button onClick={handleRetry} className="mt-4" variant="ghost" disabled={isDataLoading}>
            {isDataLoading ? "Loading..." : "Refresh Dashboard"}
        </Button>
      </CardContent>
    </Card>
  );
}
    

    