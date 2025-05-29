
"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PeriodLoggerForm } from "@/components/feature-specific/PeriodLoggerForm";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function LogPeriodPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.replace('/login?redirect=/log-period');
    }
  }, [currentUser, authLoading, router]);

  if (authLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/2 mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full mt-4" />
            <Skeleton className="h-10 w-full mt-6" />
            <Skeleton className="h-20 w-full mt-6" />
            <Skeleton className="h-10 w-full mt-6" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentUser) {
     // This state might be brief due to redirect, but good for robustness
    return (
      <div className="max-w-2xl mx-auto text-center py-10">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Please log in to record your period data.</p>
            <Button asChild>
              <Link href="/login?redirect=/log-period">Go to Login</Link>
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
          <CardTitle>Log Your Period</CardTitle>
          <CardDescription>
            Provide details about your current or past cycle. This helps in predicting future cycles and offering personalized recommendations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PeriodLoggerForm />
        </CardContent>
      </Card>
    </div>
  );
}
