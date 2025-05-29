import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CycleCalendar } from "@/components/feature-specific/CycleCalendar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PenSquare, Gift, Sparkles } from "lucide-react";

export default function DashboardPage() {
  // Mock data for demonstration
  const periodLogs = [
    { id: '1', startDate: new Date(2024, 5, 10), endDate: new Date(2024, 5, 14), symptoms: ['cramps', 'fatigue'] },
    { id: '2', startDate: new Date(2024, 6, 8), symptoms: ['bloating', 'headache'] }, // Ongoing or end date not logged
  ];
  const userCycleLength = 28; // Example cycle length

  return (
    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Cycle Overview</CardTitle>
          <CardDescription>Your personalized cycle calendar. Predicted dates are estimates.</CardDescription>
        </CardHeader>
        <CardContent>
          <CycleCalendar logs={periodLogs} cycleLength={userCycleLength} />
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
