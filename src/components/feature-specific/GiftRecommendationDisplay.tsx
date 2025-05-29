"use client";

import { recommendGifts, type RecommendGiftsInput, type RecommendGiftsOutput } from "@/ai/flows/recommend-gifts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Gift, Send } from "lucide-react";
import Image from "next/image";
import React, { useState, useEffect } from "react";

interface GiftRecommendationDisplayProps {
  symptoms: string[];
  preferences: string;
  productWebpageData: string;
}

export function GiftRecommendationDisplay({ symptoms, preferences, productWebpageData }: GiftRecommendationDisplayProps) {
  const [recommendation, setRecommendation] = useState<RecommendGiftsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchRecommendation = async () => {
    setIsLoading(true);
    setRecommendation(null);
    try {
      const input: RecommendGiftsInput = {
        symptoms,
        preferences,
        productWebpageData,
      };
      const result = await recommendGifts(input);
      setRecommendation(result);
    } catch (error) {
      console.error("Failed to get gift recommendation:", error);
      toast({
        title: "Error",
        description: "Could not fetch gift recommendation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    // Auto-fetch on initial load for demo purposes
    fetchRecommendation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symptoms, preferences, productWebpageData]);


  const handleArrangeDelivery = () => {
    // Mock delivery arrangement
    toast({
      title: "Delivery Arranged (Mock)",
      description: `"${recommendation?.giftRecommendation}" will be delivered soon. Credits deducted from wallet.`,
    });
  };

  return (
    <div className="space-y-6">
      <Button onClick={fetchRecommendation} disabled={isLoading} className="w-full sm:w-auto">
        {isLoading ? "Getting Recommendation..." : "Refresh Recommendation"}
      </Button>

      {isLoading && (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Skeleton className="h-24 w-24 rounded-md" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-32" />
          </CardFooter>
        </Card>
      )}

      {recommendation && !isLoading && (
        <Card className="overflow-hidden shadow-lg">
          <CardHeader className="bg-accent/50">
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-6 w-6 text-primary" />
              Our Top Suggestion For You
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <Image
                src="https://placehold.co/200x200.png?text=Gift+Idea"
                alt={recommendation.giftRecommendation}
                width={150}
                height={150}
                className="rounded-lg border object-cover aspect-square"
                data-ai-hint="chocolate gift"
              />
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-primary">{recommendation.giftRecommendation}</h3>
                <p className="text-sm text-muted-foreground mt-1">Based on your symptoms and preferences.</p>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-md mb-1">Why this gift?</h4>
              <p className="text-sm text-foreground/80 leading-relaxed">{recommendation.reasoning}</p>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/50 p-4">
            <Button onClick={handleArrangeDelivery} className="w-full sm:w-auto ml-auto">
              <Send className="mr-2 h-4 w-4" />
              Arrange Gift Delivery (Mock)
            </Button>
          </CardFooter>
        </Card>
      )}

      {!isLoading && !recommendation && (
         <p className="text-center text-muted-foreground py-8">No recommendations available at the moment. Try refreshing.</p>
      )}
    </div>
  );
}
