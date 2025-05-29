
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
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    console.log(`DashboardPage State Change: authLoading: ${authLoading}, currentUser: ${!!currentUser}, isDataLoading: ${isDataLoading}, fetchError: "${fetchError}"`);
  }, [authLoading, currentUser, isDataLoading, fetchError]);

  const fetchDashboardData = useCallback(async (userId: string) => {
    console.log(`DashboardPage: fetchDashboardData called for userId: ${userId}`);
    setIsDataLoading(true);
    // fetchError is NOT cleared here intentionally. It's cleared by retry or auth changes.

    let localError: string | null = null;

    try {
      console.log("DashboardPage: Attempting to fetch period logs.");
      const logsCollectionRef = collection(db, "users", userId, "periodLogs");
      const logsQuery = query(logsCollectionRef, orderBy("startDate", "desc"), limit(24));
      const logsSnapshot = await getDocs(logsQuery);
      
      const fetchedLogsProcessing: PeriodLog[] = [];
      logsSnapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        try {
          let startDate: Date | null = null;
          if (data.startDate) {
            if (data.startDate instanceof Timestamp) {
              startDate = data.startDate.toDate();
            } else if (typeof data.startDate === 'string') {
              const parsed = parseISO(data.startDate);
              if (isValid(parsed)) startDate = parsed;
              else console.warn(`DashboardPage: Invalid startDate string from Firestore doc ${docSnap.id}:`, data.startDate);
            }
          }
          if (!startDate || !isValid(startDate)) {
              console.error(`DashboardPage: Skipping log due to invalid/missing startDate. Doc ID: ${docSnap.id}, Data:`, data);
              return; 
          }

          let endDate: Date | undefined = undefined;
          if (data.endDate) {
            if (data.endDate instanceof Timestamp) {
              endDate = data.endDate.toDate();
            } else if (typeof data.endDate === 'string') {
              const parsedEndDate = parseISO(data.endDate);
              if (isValid(parsedEndDate)) endDate = parsedEndDate;
              else console.warn(`DashboardPage: Invalid endDate string from Firestore doc ${docSnap.id}:`, data.endDate);
            }
          }
          
          fetchedLogsProcessing.push({
            id: docSnap.id,
            startDate: startDate,
            endDate: endDate,
            symptoms: data.symptoms || [],
          } as PeriodLog);

        } catch (parseError: any) {
            console.error(`DashboardPage: Error parsing date during log mapping for doc ${docSnap.id}:`, parseError.message, "Data:", data);
        }
      });
      setPeriodLogs(fetchedLogsProcessing);
      console.log(`DashboardPage: Processed ${fetchedLogsProcessing.length} period logs.`);

      console.log("DashboardPage: Attempting to fetch user profile.");
      const profileDocRef = doc(db, "users", userId);
      const profileSnap = await getDoc(profileDocRef);

      if (profileSnap.exists()) {
        const profileData = profileSnap.data();
        setUserProfile({
          averageCycleLength: profileData.averageCycleLength === undefined ? null : profileData.averageCycleLength,
          averagePeriodDuration: profileData.averagePeriodDuration === undefined ? null : profileData.averagePeriodDuration,
        });
        console.log("DashboardPage: User profile data fetched.");
      } else {
        setUserProfile({ averageCycleLength: null, averagePeriodDuration: null });
        console.log("DashboardPage: No user profile document found, using defaults.");
      }
      
      console.log("DashboardPage: Data fetch successful. Clearing any previous fetchError.");
      // Success, clear any previous error if it existed
      if (fetchError) setFetchError(null); 

    } catch (err: any) {
      console.error("DashboardPage: --- RAW ERROR OBJECT IN fetchDashboardData CATCH ---", err);
      console.error("DashboardPage: Error Name:", err.name, "Code:", err.code, "Message:", err.message);

      if (err.name === 'FirebaseError') {
        if (err.code === 'permission-denied') {
          localError = "Permission Denied: You don't have access to this data. Please check Firestore rules.";
        } else if (err.code === 'unavailable') {
          localError = "Service Unavailable: Could not connect to Firestore. This might be a temporary network issue or a problem with Firestore service/configuration. Please check your connection and Firebase project settings. (Error: " + err.message + ")";
        } else {
          localError = `Firebase Error (code: ${err.code || 'unknown'}): ${err.message || 'An error occurred with Firebase.'}`;
        }
      } else if (typeof err.message === 'string' && (err.message.toLowerCase().includes('offline') || err.message.toLowerCase().includes('network'))) {
        localError = "Network Issue: A network problem occurred. Please check your connection.";
      } else {
        localError = `Error loading dashboard data: ${err.message || 'An unknown error occurred.'}`;
      }
      console.log("DashboardPage: Setting fetchError state to:", localError);
      setFetchError(localError);
      setPeriodLogs([]); 
      setUserProfile(null);
    } finally {
      console.log("DashboardPage: fetchDashboardData finally block. Setting isDataLoading to false.");
      setIsDataLoading(false);
    }
  }, [fetchError]); // Added fetchError here to allow clearing it on success

  useEffect(() => {
    console.log(`DashboardPage Effect Trigger: authLoading: ${authLoading}, currentUser: ${!!currentUser?.uid}, isDataLoading: ${isDataLoading}, fetchError: "${fetchError}"`);

    if (authLoading) {
        console.log("DashboardPage: Auth is loading. Setting isDataLoading to true, clearing fetchError (if any).");
        setIsDataLoading(true); // Show loading skeleton
        if (fetchError) setFetchError(null); // Clear previous errors on auth load
        setPeriodLogs([]);   
        setUserProfile(null); 
        return;
    }

    if (currentUser && currentUser.uid) {
        // If there's an error, don't try to fetch data again unless explicitly retried.
        // The retry mechanism will clear fetchError and set isDataLoading.
        if (fetchError) {
            console.log("DashboardPage: User authenticated, but fetchError is present. Waiting for retry. Error:", fetchError);
            setIsDataLoading(false); // Ensure loading is off if there's an error
            return;
        }

        // Only fetch if data isn't already loading and isn't already present.
        const dataIsNotPresent = periodLogs.length === 0 && userProfile === null;
        if (!isDataLoading && dataIsNotPresent) {
            console.log("DashboardPage: User authenticated, no error, not loading, data not present. Calling fetchDashboardData.");
            fetchDashboardData(currentUser.uid);
        } else if (!isDataLoading && !dataIsNotPresent) {
            console.log("DashboardPage: User authenticated, no error, not loading, data IS present. Doing nothing.");
        } else {
            console.log("DashboardPage: User authenticated, but conditions not met for new fetch (e.g., isDataLoading is true, or error exists).");
        }
    } else {
        // No currentUser and auth is not loading (i.e., user is logged out or session ended)
        console.log("DashboardPage: No user or auth not loading. Clearing data and fetchError.");
        setPeriodLogs([]);
        setUserProfile(null);
        if (fetchError) setFetchError(null); 
        setIsDataLoading(false);
    }
  }, [currentUser?.uid, authLoading, fetchDashboardData, fetchError, isDataLoading, periodLogs, userProfile]);


  const handleRetry = () => {
    console.log("DashboardPage: Retry button clicked.");
    if (currentUser && currentUser.uid) {
      setFetchError(null); // Clear the error
      // setIsDataLoading(true); // fetchDashboardData will set this
      fetchDashboardData(currentUser.uid); // Re-fetch
    } else {
      setFetchError("Please log in again to load your dashboard."); 
      setIsDataLoading(false);
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
  
  // Error display takes precedence if an error occurred
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
                <p className="text-muted-foreground mb-6 whitespace-pre-wrap">{fetchError}</p>
                <Button onClick={handleRetry} disabled={isDataLoading}>
                  {isDataLoading ? "Retrying..." : "Try Again"}
                </Button>
            </CardContent>
        </Card>
    );
  }
  
  if (!currentUser) { 
    console.log("DashboardPage: RENDERING - Not Logged In State.");
    return (
      <Card className="max-w-md mx-auto mt-10 text-center">
        <CardHeader><CardTitle>Welcome to CycleBloom!</CardTitle><CardDescription>Please log in to view your dashboard and track your cycle.</CardDescription></CardHeader>
        <CardContent><Button asChild><Link href="/login"><LogIn className="mr-2 h-5 w-5" />Log In</Link></Button></CardContent>
      </Card>
    );
  }

  // User exists, no error, but data is still loading (e.g., first load)
  if (isDataLoading || (periodLogs.length === 0 && userProfile === null)) { 
    console.log("DashboardPage: RENDERING - Data Loading Skeleton (User exists, no error, initial load or data still loading). isDataLoading:", isDataLoading);
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
  console.log("DashboardPage: RENDERING - Data Loaded State. Logs:", periodLogs.length, "Profile:", !!userProfile);
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
    
