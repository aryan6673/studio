
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
  const [isDataLoading, setIsDataLoading] = useState(true); // True initially to show loading for auth then data
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    console.log("DashboardPage: FetchError state changed to:", fetchError);
  }, [fetchError]);

  const fetchDashboardData = useCallback(async (userId: string) => {
    console.log(`DashboardPage: Starting fetchDashboardData for userId: ${userId}`);
    setIsDataLoading(true);
    // Do NOT setFetchError(null) here; it's cleared by retry or auth change

    try {
      console.log("DashboardPage: Attempting to fetch period logs.");
      const logsCollectionRef = collection(db, "users", userId, "periodLogs");
      // Fetch up to 24 most recent logs, sorted by start date descending from Firestore.
      // The AI flow sorts them ascending later if needed.
      const logsQuery = query(logsCollectionRef, orderBy("startDate", "desc"), limit(24));
      const logsSnapshot = await getDocs(logsQuery);
      const fetchedLogs: PeriodLog[] = logsSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        let startDate: Date | null = null;
        // Handle both Timestamp and string dates from Firestore
        if (data.startDate) {
          if (data.startDate instanceof Timestamp) {
            startDate = data.startDate.toDate();
          } else if (typeof data.startDate === 'string') {
            const parsed = parseISO(data.startDate); // Expects "YYYY-MM-DD" or full ISO
            if (isValid(parsed)) startDate = parsed;
          }
        }
        if (!startDate || !isValid(startDate)) {
            console.warn("DashboardPage: Invalid or missing startDate from Firestore doc:", docSnap.id, "Data:", data.startDate);
            return null; // Skip this log
        }

        let endDate: Date | undefined = undefined;
        if (data.endDate) {
          if (data.endDate instanceof Timestamp) {
            endDate = data.endDate.toDate();
          } else if (typeof data.endDate === 'string') {
            const parsed = parseISO(data.endDate);
            if (isValid(parsed)) endDate = parsed;
          }
        }
        if (endDate && !isValid(endDate)) {
            console.warn("DashboardPage: Invalid endDate from Firestore doc:", docSnap.id, "Data:", data.endDate);
            endDate = undefined; // Treat as if no end date
        }
        
        return {
          id: docSnap.id,
          startDate: startDate,
          endDate: endDate,
          symptoms: data.symptoms || [],
          // cycleLength: data.cycleLength, // cycleLength is part of userProfile now
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
        setUserProfile({ averageCycleLength: null, averagePeriodDuration: null }); // Default if no profile
        console.log("DashboardPage: No user profile document found, using defaults.");
      }
      console.log("DashboardPage: fetchDashboardData completed successfully.");
      setFetchError(null); // Clear error only on successful fetch

    } catch (err: any) {
      console.error("DashboardPage: --- RAW ERROR OBJECT IN fetchDashboardData ---", err);
      console.error("DashboardPage: Error Name:", err.name);
      console.error("DashboardPage: Error Message:", err.message);
      console.error("DashboardPage: Error Code:", err.code);

      let friendlyErrorMessage: string;

      if (err.name === 'FirebaseError') {
        if (err.code === 'permission-denied') {
          friendlyErrorMessage = "Permission Denied: You do not have permission to access this data. Please ensure Firestore security rules allow reads for the authenticated user on 'users/{userId}' and 'users/{userId}/periodLogs'.";
        } else if (err.code === 'unavailable') {
          friendlyErrorMessage = "Network Issue: Could not connect to services. Please check your internet connection and try again.";
        } else {
          // For other Firebase errors, be more specific
          friendlyErrorMessage = `Firebase Error (code: ${err.code}): ${err.message || 'Please try again.'}`;
        }
      } else if (typeof err.message === 'string' && (
          err.message.toLowerCase().includes('network request failed') ||
          err.message.toLowerCase().includes('failed to fetch') ||
          err.message.toLowerCase().includes('no internet connection')
        )
      ) {
        friendlyErrorMessage = "Network Issue: Could not connect to services. Please check your internet connection and try again.";
      } else {
        friendlyErrorMessage = `Error loading dashboard data: ${err.message || 'An unknown error occurred.'}`;
      }
      
      console.log("DashboardPage: Setting fetchError to:", friendlyErrorMessage);
      setFetchError(friendlyErrorMessage);
    } finally {
      console.log("DashboardPage: Setting isDataLoading to false in fetchDashboardData finally block.");
      setIsDataLoading(false);
    }
  }, []); // No dependencies, userId is passed as argument

  useEffect(() => {
    console.log("DashboardPage: Auth or loading state changed. AuthLoading:", authLoading, "CurrentUser:", !!currentUser?.uid, "Existing fetchError:", fetchError);
    if (authLoading) {
      console.log("DashboardPage: Auth is loading. Setting isDataLoading=true, clearing fetchError.");
      setIsDataLoading(true); // Keep true while auth resolves
      setFetchError(null); 
    } else if (currentUser && currentUser.uid) {
      // Only fetch if there's no current error that needs user action (like "Try Again")
      // or if we haven't loaded data yet for this user.
      // The `isDataLoading` also acts as a guard against re-fetching if data is already loaded.
      if (!fetchError) { // If there is a fetchError, user must click "Try Again"
        console.log("DashboardPage: User is authenticated, no current error. Calling fetchDashboardData.");
        fetchDashboardData(currentUser.uid).catch(e => {
            // This catch is for unhandled promise rejections from fetchDashboardData,
            // though fetchDashboardData itself has a try/catch.
            console.error("DashboardPage: Critical error during fetchDashboardData invocation or its promise chain:", e);
            setFetchError("A critical error occurred while trying to load dashboard data.");
            setIsDataLoading(false); 
        });
      } else {
        console.log("DashboardPage: User is authenticated, but an error exists. Not refetching automatically. Error:", fetchError);
        setIsDataLoading(false); // Ensure loading is false if an error is already present
      }
    } else if (!currentUser && !authLoading) {
      console.log("DashboardPage: No user and not authLoading. Clearing data/error, setting isDataLoading=false.");
      setIsDataLoading(false);
      setFetchError(null);
      setPeriodLogs([]);
      setUserProfile(null);
    }
  // fetchDashboardData is memoized and stable.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid, authLoading]);

  const handleRetry = () => {
    console.log("DashboardPage: Retry button clicked.");
    if (currentUser && currentUser.uid) {
      setFetchError(null); // Explicitly clear error before retrying
      // isDataLoading will be set to true at the start of fetchDashboardData
      fetchDashboardData(currentUser.uid);
    } else {
      console.warn("DashboardPage: Retry clicked, but no current user. Prompting login.");
      setFetchError("Please log in to load your dashboard.");
    }
  };

  // ----- RENDER LOGIC -----

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
  
  // Display error if one exists. This takes precedence after auth loading.
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
  
  if (!currentUser) { // No error, but no user means prompt login
    console.log("DashboardPage: RENDERING - Not Logged In State.");
    return (
      <Card className="max-w-md mx-auto mt-10 text-center">
        <CardHeader><CardTitle>Welcome to CycleBloom!</CardTitle><CardDescription>Please log in to view your dashboard and track your cycle.</CardDescription></CardHeader>
        <CardContent><Button asChild><Link href="/login"><LogIn className="mr-2 h-5 w-5" />Log In</Link></Button></CardContent>
      </Card>
    );
  }

  // User exists, no error yet, but data is still loading (e.g., first load for this user)
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
  
  // Success State: User exists, no error, data finished loading
  console.log("DashboardPage: RENDERING - Data Loaded State. Logs:", periodLogs.length, "Profile:", userProfile);
  // Ensure periodLogs is an array and filter out any null/invalid logs again, just in case.
  const validPeriodLogs = Array.isArray(periodLogs) ? periodLogs.filter(log => log && log.startDate && isValid(log.startDate)) : [];
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
            cycleLength={displayProfile.averageCycleLength ?? undefined} // Pass undefined if null
            averagePeriodDuration={displayProfile.averagePeriodDuration ?? undefined} // Pass undefined if null
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

    