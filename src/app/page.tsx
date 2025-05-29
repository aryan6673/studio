
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
    if (!currentUser) {
      setDataLoading(false);
      setPeriodLogs([]);
      setUserProfile(null);
      setError(null); // Clear previous errors if user logs out
      return;
    }

    console.log("DashboardPage: Starting fetchDashboardData for user:", currentUser.uid);
    setDataLoading(true);
    setError(null); // Clear previous errors before new fetch

    try {
      // Fetch period logs
      const logsCollectionRef = collection(db, "users", currentUser.uid, "periodLogs");
      const q = query(logsCollectionRef, orderBy("startDate", "desc"), limit(24));
      const logsSnapshot = await getDocs(q);
      const fetchedLogs = logsSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        let startDate: Date | null = null;

        if (data.startDate) {
          if (data.startDate instanceof Timestamp) {
            startDate = data.startDate.toDate();
          } else if (typeof data.startDate === 'string') {
            startDate = parseISO(data.startDate);
          }
        }
        if (startDate && !isValid(startDate)) {
          console.warn("Invalid startDate from Firestore:", docSnap.id, data.startDate);
          startDate = null;
        }

        let endDate: Date | undefined = undefined;
        if (data.endDate) {
          if (data.endDate instanceof Timestamp) {
            endDate = data.endDate.toDate();
          } else if (typeof data.endDate === 'string') {
            endDate = parseISO(data.endDate);
          }
        }
        if (endDate && !isValid(endDate)) {
          console.warn("Invalid endDate from Firestore:", docSnap.id, data.endDate);
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
      console.log("DashboardPage: Fetched period logs:", fetchedLogs.length);

      // Fetch user profile for cycle settings
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
      const errStringLower = String(err).toLowerCase();

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
      
      console.log("DashboardPage: Setting error state to:", friendlyErrorMessage);
      setError(friendlyErrorMessage);
      setPeriodLogs([]);
      setUserProfile(null);
    } finally {
      console.log("DashboardPage: Setting dataLoading to false.");
      setDataLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    console.log("DashboardPage: Auth state changed. AuthLoading:", authLoading, "CurrentUser:", !!currentUser);
    if (!authLoading) {
      fetchDashboardData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, authLoading]); // fetchDashboardData is memoized via useCallback

  // Debug: Log when error state changes
  useEffect(() => {
    console.log("DashboardPage: Error state is now:", error);
  }, [error]);
  
  // Debug: Log when dataLoading state changes
  useEffect(() => {
    console.log("DashboardPage: dataLoading state is now:", dataLoading);
  }, [dataLoading]);


  if (authLoading) {
    console.log("DashboardPage: Rendering Auth Loading Skeleton.");
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

  if (!currentUser && !authLoading) {
    console.log("DashboardPage: Rendering Not Logged In State.");
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
  
  // This is the crucial part for displaying the error
  if (error) {
    console.log("DashboardPage: Rendering Error State with message:", error);
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

  // Data loading for an already authenticated user
  if (currentUser && dataLoading) {
    console.log("DashboardPage: Rendering Data Loading Skeleton for authenticated user.");
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
  
  // Data Loaded State (currentUser must exist here, and dataLoading is false, and no error)
  if (currentUser && !dataLoading && !error) {
    console.log("DashboardPage: Rendering Data Loaded State.");
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

  // Fallback for any unexpected state
  console.warn("DashboardPage: Reached fallback rendering state. This should not happen.");
  return (
    <div className="text-center py-10">
        <p>Something went wrong or the dashboard is in an unexpected state. Please try refreshing.</p>
    </div>
  );
}
    

    