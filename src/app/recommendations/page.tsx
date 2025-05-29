import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GiftRecommendationDisplay } from "@/components/feature-specific/GiftRecommendationDisplay";
import { HelpCircle } from "lucide-react";

export default function RecommendationsPage() {
  // Mock data that would typically come from user's logged symptoms and profile
  const mockSymptoms = ["cramps", "fatigue", "headache"];
  const mockPreferences = "Loves warm drinks, prefers natural remedies, dislikes strong artificial scents.";
  
  return (
    <div className="max-w-3xl mx-auto">
      <Card className="shadow-xl">
        <CardHeader className="bg-card-foreground/5 dark:bg-card-foreground/10">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <HelpCircle className="h-7 w-7 text-primary"/>
            Personalized Gift Ideas
          </CardTitle>
          <CardDescription className="text-base">
            Discover AI-powered gift suggestions tailored to help with period discomfort, based on your inputs.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <GiftRecommendationDisplay 
            symptoms={mockSymptoms}
            preferences={mockPreferences}
          />
        </CardContent>
      </Card>
    </div>
  );
}
