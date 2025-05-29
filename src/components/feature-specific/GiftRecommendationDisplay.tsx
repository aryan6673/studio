
"use client";

import { recommendGifts, type RecommendGiftsInput, type RecommendGiftsOutput } from "@/ai/flows/recommend-gifts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Gift, RefreshCw, ExternalLink } from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";

interface GiftRecommendationDisplayProps {
  symptoms: string[];
  preferences: string;
}

export function GiftRecommendationDisplay({ symptoms, preferences }: GiftRecommendationDisplayProps) {
  const [recommendation, setRecommendation] = useState<RecommendGiftsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchRecommendation = useCallback(async () => {
    setIsLoading(true);
    setRecommendation(null);
    try {
      const input: RecommendGiftsInput = {
        symptoms,
        preferences,
      };
      const result = await recommendGifts(input);
      setRecommendation(result);
    } catch (error) {
      console.error("Failed to get gift recommendation:", error);
      let errorMessage = "Could not fetch gift recommendation. Please try again.";
      if (error instanceof Error && error.message) {
        if (error.message.includes("503 Service Unavailable") || error.message.toLowerCase().includes("model is overloaded")) {
          errorMessage = "The AI model is currently overloaded. Please try again in a few moments.";
        } else {
          errorMessage = "An AI error occurred. Please try again."; 
        }
      }
      toast({
        title: "Recommendation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [symptoms, preferences, toast]);
  
  useEffect(() => {
    fetchRecommendation();
  }, [fetchRecommendation]);

  const renderBuyButtons = () => {
    if (!recommendation || !recommendation.giftRecommendation) return null;

    const searchTerm = encodeURIComponent(recommendation.giftRecommendation);
    const blinkitUrl = `https://blinkit.com/s/?q=${searchTerm}`;
    const instamartUrl = `https://www.swiggy.com/instamart/search?query=${searchTerm}`;
    const amazonUrl = `https://www.amazon.com/s?k=${searchTerm}`;

    return (
      <div className="mt-6 pt-6 border-t">
        <h4 className="text-md font-semibold mb-3 text-foreground/90 dark:text-foreground/80">Find this gift:</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button asChild variant="outline">
            <a href={blinkitUrl} target="_blank" rel="noopener noreferrer">
              Search on Blinkit <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={instamartUrl} target="_blank" rel="noopener noreferrer">
              Search on Instamart <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={amazonUrl} target="_blank" rel="noopener noreferrer">
              Search on Amazon <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Button onClick={fetchRecommendation} disabled={isLoading} className="w-full sm:w-auto">
        <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        {isLoading ? "Getting New Suggestion..." : "Get New Suggestion"}
      </Button>

      {isLoading && (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="h-4 w-full mt-2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      )}

      {recommendation && !isLoading && (
        <Card className="overflow-hidden shadow-lg">
          <CardHeader className="bg-accent/30 dark:bg-accent/20">
            <CardTitle className="flex items-center gap-3">
              <Gift className="h-7 w-7 text-primary" />
              AI Gift Suggestion
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div>
              <h3 className="text-xl lg:text-2xl font-semibold text-primary">{recommendation.giftRecommendation}</h3>
              <p className="text-sm text-muted-foreground mt-1">A thoughtful idea based on your inputs.</p>
            </div>
            
            <div>
              <h4 className="font-semibold text-md lg:text-lg mb-1">Why this gift?</h4>
              <p className="text-sm text-foreground/90 dark:text-foreground/80 leading-relaxed bg-muted/30 dark:bg-muted/20 p-3 rounded-md border border-border">
                {recommendation.reasoning}
              </p>
            </div>
            {renderBuyButtons()}
          </CardContent>
        </Card>
      )}

      {!isLoading && !recommendation && (
         <Card>
            <CardContent className="pt-6">
                 <p className="text-center text-muted-foreground py-8">No recommendations available at the moment, or an error occurred. Try refreshing.</p>
            </CardContent>
         </Card>
      )}
    </div>
  );
}
