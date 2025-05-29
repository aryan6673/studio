
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
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from "firebase/firestore";
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
  const [dataLoading, setDataLoading] = useState(true); // True by default to show initial loading
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!currentUser) {
      setDataLoading(false);
      setPeriodLogs([]); // Clear data if no user
      setUserProfile(null);
      setError(null); // Clear previous errors
      return;
    }

    setDataLoading(true);
    setError(null); // Clear previous errors before fetching

    try {
      // Fetch period logs
      const logsCollectionRef = collection(db, "users", currentUser.uid, "periodLogs");
      const q = query(logsCollectionRef, orderBy("startDate", "desc"), limit(24)); // Fetch more logs if needed by AI
      const logsSnapshot = await getDocs(q);
      const fetchedLogs = logsSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        // Convert Firestore Timestamps or date strings to Date objects
        let startDate: Date | null = null;
        if (data.startDate && typeof data.startDate === 'string') {
          startDate = parseISO(data.startDate);
        } else if (data.startDate?.toDate && typeof data.startDate.toDate === 'function') {
          startDate = data.startDate.toDate();
        }
        if (startDate && !isValid(startDate)) {
          console.warn("Invalid startDate from Firestore:", docSnap.id, data.startDate);
          startDate = null; // Invalidate if parsing failed
        }

        let endDate: Date | undefined = undefined;
        if (data.endDate && typeof data.endDate === 'string') {
          endDate = parseISO(data.endDate);
        } else if (data.endDate?.toDate && typeof data.endDate.toDate === 'function') {
          endDate = data.endDate.toDate();
        }
        if (endDate && !isValid(endDate)) {
          console.warn("Invalid endDate from Firestore:", docSnap.id, data.endDate);
          endDate = undefined; // Invalidate if parsing failed
        }
        
        if (!startDate) return null; // Skip if no valid start date

        return {
          id: docSnap.id,
          startDate: startDate,
          endDate: endDate,
          symptoms: data.symptoms || [],
        } as PeriodLog;
      }).filter(log => log !== null) as PeriodLog[];
      setPeriodLogs(fetchedLogs);

      // Fetch user profile for cycle settings
      const profileDocRef = doc(db, "users", currentUser.uid);
      const profileSnap = await getDoc(profileDocRef);
      if (profileSnap.exists()) {
        const profileData = profileSnap.data();
        setUserProfile({
          averageCycleLength: profileData.averageCycleLength === undefined ? null : profileData.averageCycleLength,
          averagePeriodDuration: profileData.averagePeriodDuration === undefined ? null : profileData.averagePeriodDuration,
        });
      } else {
        // Set defaults if no profile exists, but don't error
        setUserProfile({ averageCycleLength: null, averagePeriodDuration: null });
      }

    } catch (err: any) {
      console.error("Raw error object in fetchDashboardData:", err);
      const errString = String(err).toLowerCase();
      const errMessageString = err.message ? String(err.message).toLowerCase() : "";

      if (errString.includes("offline") || errMessageString.includes("offline") ||
          errString.includes("network request failed") || errMessageString.includes("network request failed") ||
          errString.includes("failed to fetch") || errMessageString.includes("failed to fetch") ||
          errString.includes("internet connection") || errMessageString.includes("internet connection") ||
          (err.code && String(err.code).toLowerCase() === 'unavailable')) {
        setError("You appear to be offline or there's a network issue. Please check your internet connection and try again.");
      } else if (err.code && String(err.code).toLowerCase() === 'permission-denied') {
        setError("You do not have permission to access this data. Please ensure you are logged in with the correct account or contact support if this persists.");
      } else {
        setError(`Could not load dashboard data. Error: ${err.message || 'An unknown error occurred.'}`);
      }
      setPeriodLogs([]); // Clear data on error
      setUserProfile(null);
    } finally {
      setDataLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!authLoading) { // Only proceed if auth state is resolved
        fetchDashboardData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, authLoading]); // Re-fetch if user or authLoading state changes

  // Initial Loading State (Auth loading OR data loading for a logged-in user without prior error)
  if (authLoading || (currentUser && dataLoading && !error) ) {
    return (
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-7 w-3/5" />
            <Skeleton className="h-4 w-4/5 mt-1" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
            <CardContent className="grid gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
            <CardContent><Skeleton className="h-10 w-full" /></CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Not Logged In State
  if (!currentUser && !authLoading) {
    return (
      <Card className="max-w-md mx-auto mt-10 text-center">
        <CardHeader>
          <CardTitle>Welcome to CycleBloom!</CardTitle>
          <CardDescription>Please log in to view your dashboard and track your cycle.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/login">
              <LogIn className="mr-2 h-5 w-5" />
              Log In
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  // Error State (covers any error set by fetchDashboardData)
  if (error) {
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
                <Button onClick={fetchDashboardData} disabled={dataLoading}>
                  {dataLoading ? "Retrying..." : "Try Again"}
                </Button>
            </CardContent>
        </Card>
    );
  }
  
  // Data Loaded State (but might be empty if user has no data yet)
  if (currentUser && !dataLoading && !error) {
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
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/log-period">
                  <PenSquare className="mr-2 h-5 w-5" />
                  Log Period / Symptoms
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/recommendations">
                  <Gift className="mr-2 h-5 w-5" />
                  Get Gift Suggestions
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/wellness">
                  <Sparkles className="mr-2 h-5 w-5" />
                  View Wellness Tips
                </Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Today's Tip</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Stay hydrated! Drinking enough water can help reduce bloating and fatigue during your cycle.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Fallback for any unexpected state (should ideally not be reached)
  return (
    <div className="text-center py-10">
        <p>Something went wrong or the dashboard is in an unexpected state. Please try refreshing.</p>
    </div>
  );
}
    