import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WellnessTipCard } from "@/components/feature-specific/WellnessTipCard";
import type { WellnessTip } from "@/lib/types";
import { Lightbulb } from "lucide-react";

const mockWellnessTips: WellnessTip[] = [
  {
    id: "1",
    title: "Stay Hydrated",
    content: "Drinking plenty of water (at least 8 glasses a day) can help reduce bloating, ease cramps, and improve energy levels during your period.",
    category: "Nutrition",
  },
  {
    id: "2",
    title: "Gentle Exercise",
    content: "Light activities like walking, yoga, or stretching can help alleviate period pain and boost your mood. Listen to your body and don't overdo it.",
    category: "Exercise",
  },
  {
    id: "3",
    title: "Prioritize Sleep",
    content: "Aim for 7-9 hours of quality sleep per night. Hormonal changes can affect sleep, so create a relaxing bedtime routine.",
    category: "Lifestyle",
  },
  {
    id: "4",
    title: "Mindful Moments",
    content: "Practice mindfulness or meditation for a few minutes each day. It can help manage stress and emotional fluctuations.",
    category: "Mental Health",
  },
  {
    id: "5",
    title: "Warmth for Comfort",
    content: "A heating pad or warm bath can be very soothing for cramps and back pain. The warmth helps relax uterine muscles.",
    category: "Comfort",
  },
  {
    id: "6",
    title: "Nutrient-Rich Foods",
    content: "Focus on foods rich in iron, magnesium, and omega-3s, like leafy greens, nuts, seeds, and fatty fish. These can help combat fatigue and inflammation.",
    category: "Nutrition",
  },
];

export default function WellnessPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Lightbulb className="h-8 w-8 text-primary" />
          Wellness Hub
        </h1>
        <p className="text-muted-foreground mt-1">
          Discover tips and advice to support your well-being throughout your cycle.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {mockWellnessTips.map((tip) => (
          <WellnessTipCard key={tip.id} tip={tip} />
        ))}
      </div>
    </div>
  );
}
