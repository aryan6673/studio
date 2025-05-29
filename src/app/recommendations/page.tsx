import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GiftRecommendationDisplay } from "@/components/feature-specific/GiftRecommendationDisplay";

export default function RecommendationsPage() {
  // Mock data that would typically come from user's logged symptoms and profile
  const mockSymptoms = ["cramps", "fatigue"];
  const mockPreferences = "Loves dark chocolate, no nuts.";
  
  // Mock product data - in a real app, this might be fetched or selected by the user
  const mockProductWebpageData = `
    Product Name: Artisan Dark Chocolate Bar with Sea Salt
    Description: A rich and decadent 70% cacao dark chocolate bar, handcrafted with premium cocoa beans and a sprinkle of sea salt. 
    Perfect for a moment of indulgence.
    Ingredients: Cocoa beans, cane sugar, cocoa butter, sea salt.
    Benefits: Dark chocolate is known for its mood-boosting properties and antioxidants.
    Price: $7.99
  `;

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Personalized Gift Recommendations</CardTitle>
          <CardDescription>
            Based on your logged symptoms and profile preferences, here are some thoughtful gift ideas.
            For this demo, we are using a sample product.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GiftRecommendationDisplay 
            symptoms={mockSymptoms}
            preferences={mockPreferences}
            productWebpageData={mockProductWebpageData}
          />
        </CardContent>
      </Card>
    </div>
  );
}
