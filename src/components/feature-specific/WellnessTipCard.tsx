import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { WellnessTip } from "@/lib/types";
import { CheckCircle2 } from "lucide-react"; // Example icon

interface WellnessTipCardProps {
  tip: WellnessTip;
}

export function WellnessTipCard({ tip }: WellnessTipCardProps) {
  let IconComponent;
  switch (tip.category.toLowerCase()) {
    case "nutrition": IconComponent = <CheckCircle2 className="h-5 w-5 text-green-500" />; break;
    case "exercise": IconComponent = <CheckCircle2 className="h-5 w-5 text-blue-500" />; break;
    case "mental health": IconComponent = <CheckCircle2 className="h-5 w-5 text-purple-500" />; break;
    default: IconComponent = <CheckCircle2 className="h-5 w-5 text-gray-500" />;
  }

  return (
    <Card className="flex flex-col h-full hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{tip.title}</CardTitle>
          {IconComponent}
        </div>
        <CardDescription>{tip.category}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground leading-relaxed">{tip.content}</p>
      </CardContent>
      <CardFooter>
        <Badge variant="outline">{tip.category}</Badge>
      </CardFooter>
    </Card>
  );
}
