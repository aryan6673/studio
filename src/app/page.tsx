
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc, query, orderBy } from 'firebase/firestore';
import { format, parseISO, startOfMonth, addMonths } from 'date-fns';
import CycleCalendar from '@/components/feature-specific/CycleCalendar';
import { predictCycle, type PredictCycleInput, type PredictCycleOutput } from '@/ai/flows/predict-cycle-flow';
import type { PeriodLog, UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, LogIn, AlertTriangle, CalendarDays } from 'lucide-react';

interface StoredUserProfile extends UserProfile {
  averageCycleLength?: number | null;
  averagePeriodDuration?: number | null;
}

interface StoredPeriodLog {
  id: string;
  startDate: string; // Stored as YYYY-MM-DD string
  endDate?: string | null; // Stored as YYYY-MM-DD string
  symptoms: string[];
  // loggedAt will be a Firestore Timestamp, but we only care about start/end for calendar
}

export default function DashboardPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();

  const [periodLogs, setPeriodLogs] = useState<PeriodLog[]>([]);
  const [userProfile, setUserProfile] = useState<Partial<StoredUserProfile> | null>(null);
  const [aiPredictions, setAiPredictions] = useState<PredictCycleOutput | null>(null);
  
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(startOfMonth(new Date()));

  const handlePreviousMonth = () => setCurrentCalendarMonth(prev => addMonths(prev, -1));
  const handleNextMonth = () => setCurrentCalendarMonth(prev => addMonths(prev, 1));

  const fetchDashboardData = useCallback(async (userId: string) => {
    console.log("DashboardPage: fetchDashboardData called for userId:", userId);
    setIsDataLoading(true);
    setFetchError(null);

    try {
      // Fetch user profile
      console.log("DashboardPage: Attempting to fetch user profile.");
      const profileRef = doc(db, "users", userId);
      const profileSnap = await getDoc(profileRef);
      let fetchedProfileData: Partial<StoredUserProfile> = {};
      if (profileSnap.exists()) {
        fetchedProfileData = profileSnap.data() as StoredUserProfile;
        setUserProfile(fetchedProfileData);
        console.log("DashboardPage: User profile fetched:", fetchedProfileData);
      } else {
        setUserProfile(null); // No profile found
        console.log("DashboardPage: No user profile found in Firestore.");
      }

      // Fetch period logs
      console.log("DashboardPage: Attempting to fetch period logs.");
      const logsCollectionRef = collection(db, "users", userId, "periodLogs");
      const logsQuery = query(logsCollectionRef, orderBy("startDate", "desc"));
      const logsSnapshot = await getDocs(logsQuery);
      
      const fetchedLogs: PeriodLog[] = [];
      logsSnapshot.docs.forEach(logDoc => {
        const data = logDoc.data() as StoredPeriodLog;
        try {
          // Firestore dates might be strings or Timestamps, ensure robust parsing
          const startDate = typeof data.startDate === 'string' ? parseISO(data.startDate) : (data.startDate as any)?.toDate?.() || null;
          const endDate = data.endDate ? (typeof data.endDate === 'string' ? parseISO(data.endDate) : (data.endDate as any)?.toDate?.() || null) : undefined;

          if (startDate) {
            fetchedLogs.push({
              id: logDoc.id,
              startDate: startDate,
              endDate: endDate,
              symptoms: data.symptoms || [],
            });
          } else {
            console.warn("DashboardPage: Skipping log with invalid start date:", data);
          }
        } catch (parseError) {
          console.error("DashboardPage: Error parsing date for log:", data, parseError);
        }
      });
      setPeriodLogs(fetchedLogs);
      console.log(`DashboardPage: Processed ${fetchedLogs.length} period logs.`);

      // After fetching logs and profile, trigger AI prediction
      if (fetchedLogs.length > 0 || fetchedProfileData.averageCycleLength) {
        setIsAiLoading(true);
        const aiInput: PredictCycleInput = {
          pastPeriods: fetchedLogs.map(log => ({
            startDate: format(log.startDate, 'yyyy-MM-dd'),
            endDate: log.endDate ? format(log.endDate, 'yyyy-MM-dd') : undefined,
          })).slice(0, 20), // Limit to most recent 20 logs for AI
          averageCycleLength: fetchedProfileData.averageCycleLength || undefined,
          averagePeriodDuration: fetchedProfileData.averagePeriodDuration || undefined,
          currentDate: format(new Date(), 'yyyy-MM-dd'),
        };
        console.log("DashboardPage: Calling AI predictCycle with input:", aiInput);
        try {
          const predictions = await predictCycle(aiInput);
          setAiPredictions(predictions);
          console.log("DashboardPage: AI predictions received:", predictions);
        } catch (aiError: any) {
          console.error("DashboardPage: AI prediction error:", aiError);
          setAiPredictions({ predictedPeriods:[], predictedFertileWindows:[], predictedOvulationDates:[], aiNote: `AI Error: ${aiError.message || 'Failed to get predictions.'}`});
        } finally {
          setIsAiLoading(false);
        }
      } else {
        setAiPredictions({ predictedPeriods:[], predictedFertileWindows:[], predictedOvulationDates:[], aiNote: 'Not enough data for AI prediction. Log some periods or set cycle averages in your profile.' });
        setIsAiLoading(false);
      }

    } catch (err: any) {
      console.error("DashboardPage: --- RAW ERROR OBJECT IN fetchDashboardData CATCH ---", err);
      let friendlyErrorMessage = "Failed to load dashboard data. An unexpected error occurred.";
      if (err.name === 'FirebaseError') {
        if (err.code === 'permission-denied') {
          friendlyErrorMessage = "Permission Denied: You do not have access to this data.";
        } else if (err.code === 'unavailable' || (err.message && String(err.message).toLowerCase().includes("offline"))) {
          friendlyErrorMessage = "Network Issue: Could not connect to services. Please check your internet connection and try again.";
        } else {
          friendlyErrorMessage = `Firebase Error (code: ${err.code || 'unknown'}): ${err.message || 'Please try again.'}`;
        }
      } else if (err.message) {
        friendlyErrorMessage = `Error: ${err.message}`;
      }
      console.error("DashboardPage: Setting fetchError state to:", friendlyErrorMessage);
      setFetchError(friendlyErrorMessage);
      setPeriodLogs([]);
      setUserProfile(null);
      setAiPredictions(null);
    } finally {
      setIsDataLoading(false);
      console.log("DashboardPage: fetchDashboardData finally block. Setting isDataLoading to false.");
    }
  }, []);

  useEffect(() => {
    console.log("DashboardPage: Auth or loading state changed. AuthLoading:", authLoading, "CurrentUser:", !!currentUser);
    if (authLoading) {
      setIsDataLoading(true);
      setFetchError(null); // Clear errors while auth is resolving
      return;
    }
    if (currentUser) {
      if (!fetchError) { // Only fetch if no persistent error
        fetchDashboardData(currentUser.uid);
      }
    } else {
      // No user, clear data and potentially set component to "not logged in" state
      setPeriodLogs([]);
      setUserProfile(null);
      setAiPredictions(null);
      setIsDataLoading(false);
      setFetchError(null); // Clear errors if user logs out
    }
  }, [currentUser, authLoading, fetchDashboardData]); // fetchDashboardData is stable due to useCallback([])

  const handleRetry = () => {
    console.log("DashboardPage: Retry button clicked.");
    if (currentUser) {
      setFetchError(null); // Clear error to allow re-fetch
      setIsDataLoading(true); // Set loading state before fetching
      fetchDashboardData(currentUser.uid);
    } else {
      router.push('/login?redirect=/');
    }
  };
  
  // Render logic
  if (authLoading) {
    console.log("DashboardPage: RENDERING - Auth Loading Skeleton");
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" /> <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <Skeleton className="h-[400px] w-full md:col-span-2" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!currentUser) {
    console.log("DashboardPage: RENDERING - Not Logged In");
    return (
      <Card className="max-w-lg mx-auto mt-10 text-center">
        <CardHeader>
          <CardTitle>Welcome to CycleBloom!</CardTitle>
          <CardDescription>Please log in to view your dashboard and track your cycle.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/login?redirect=/"><LogIn className="mr-2 h-5 w-5" /> Log In</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  if (fetchError) {
    console.log("DashboardPage: RENDERING - Error State Card. Message:", fetchError);
    return (
      <Card className="max-w-md mx-auto mt-10 text-center border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center justify-center gap-2">
            <AlertTriangle className="h-6 w-6" /> Error Loading Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-muted-foreground">{fetchError}</p>
          <Button onClick={handleRetry}>Try Again</Button>
        </CardContent>
      </Card>
    );
  }
  
  if (isDataLoading) {
     console.log("DashboardPage: RENDERING - Data Loading Skeleton (User exists, no error yet).");
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" /> <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <Skeleton className="h-[400px] w-full md:col-span-2" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  console.log("DashboardPage: RENDERING - Main Dashboard Content.");
  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="h-7 w-7 text-primary" />
            Your Cycle Dashboard
          </h1>
          <p className="text-muted-foreground">
            View your logged periods and AI-powered predictions.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePreviousMonth} disabled={isDataLoading || isAiLoading}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Prev
          </Button>
          <Button variant="outline" onClick={handleNextMonth} disabled={isDataLoading || isAiLoading}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </header>

      <CycleCalendar
        loggedPeriods={periodLogs}
        aiPredictions={aiPredictions}
        currentMonth={currentCalendarMonth}
        onMonthChange={setCurrentCalendarMonth}
      />
      
      {(isDataLoading || isAiLoading) && 
        <div className="fixed bottom-4 right-4 bg-secondary text-secondary-foreground p-3 rounded-lg shadow-lg text-sm animate-pulse">
          {isDataLoading ? "Loading cycle data..." : "Getting AI predictions..."}
        </div>
      }
    </div>
  );
}
