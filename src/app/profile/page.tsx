import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserProfileForm } from "@/components/feature-specific/UserProfileForm";

export default function ProfilePage() {
  // In a real app, fetch existing user profile data here
  const mockUserProfile = {
    name: "Jane Doe",
    email: "jane.doe@example.com",
    allergies: ["nuts", "dairy"],
    foodPreferences: ["vegetarian", "spicy food"],
    timezone: "America/New_York",
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
          <CardDescription>
            Manage your personal information, preferences, and settings. This helps us tailor CycleBloom to you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserProfileForm defaultValues={mockUserProfile} />
        </CardContent>
      </Card>
    </div>
  );
}
