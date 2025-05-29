import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PeriodLoggerForm } from "@/components/feature-specific/PeriodLoggerForm";

export default function LogPeriodPage() {
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
