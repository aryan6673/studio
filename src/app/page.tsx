
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CycleCalendar } from "@/components/feature-specific/CycleCalendar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PenSquare, Gift, Sparkles, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { PeriodLog } from "@/lib/types";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from "firebase/firestore";
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
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!currentUser) {
      setDataLoading(false);
      setPeriodLogs([]);
      setUserProfile(null);
      return;
    }

    setDataLoading(true);
    setError(null);
    try {
      // Fetch period logs
      const logsCollectionRef = collection(db, "users", currentUser.uid, "periodLogs");
      const q = query(logsCollectionRef, orderBy("startDate", "desc"), limit(24));
      const logsSnapshot = await getDocs(q);
      const fetchedLogs = logsSnapshot.docs.map(doc => {
        const data = doc.data();
        const startDate = data.startDate && typeof data.startDate === 'string' ? parseISO(data.startDate) : null;
        const endDate = data.endDate && typeof data.endDate === 'string' ? parseISO(data.endDate) : undefined;
        
        if (!startDate || !isValid(startDate)) {
            console.warn("Invalid startDate found in Firestore log:", doc.id, data.startDate);
            return null; // Skip this log or handle as error
        }
        if (data.endDate && (!endDate || !isValid(endDate))) {
            console.warn("Invalid endDate found in Firestore log:", doc.id, data.endDate);
             //Potentially set endDate to undefined or skip
        }

        return {
          id: doc.id,
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
        setUserProfile({ averageCycleLength: null, averagePeriodDuration: null }); // Default if no profile
      }

    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Could not load dashboard data. Please try refreshing.");
      setPeriodLogs([]);
      setUserProfile(null);
    } finally {
      setDataLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!authLoading) {
      fetchDashboardData();
    }
  }, [currentUser, authLoading, fetchDashboardData]);

  if (authLoading || (dataLoading && currentUser)) {
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

  if (!currentUser) {
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
  
  if (error) {
    return (
        <Card className="max-w-md mx-auto mt-10 text-center">
            <CardHeader>
                <CardTitle className="text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent>
                <p>{error}</p>
                <Button onClick={fetchDashboardData} className="mt-4">Try Again</Button>
            </CardContent>
        </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Cycle Overview</CardTitle>
          <CardDescription>Your personalized cycle calendar. AI predictions are estimates.</CardDescription>
        </CardHeader>
        <CardContent>
          <CycleCalendar 
            logs={periodLogs} 
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
                Get Gift Recommendations
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
