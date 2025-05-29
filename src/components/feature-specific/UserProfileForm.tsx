
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import React from "react";

// Example timezones - in a real app, use a comprehensive list or library
const timezones = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Europe/London", "Europe/Berlin", "Asia/Tokyo", "Australia/Sydney",
  // Add more common timezones
  "Africa/Cairo", "Africa/Johannesburg", "America/Argentina/Buenos_Aires", "America/Bogota",
  "America/Caracas", "America/Lima", "America/Mexico_City", "America/Sao_Paulo",
  "Asia/Bangkok", "Asia/Dubai", "Asia/Hong_Kong", "Asia/Jakarta", "Asia/Jerusalem",
  "Asia/Kolkata", "Asia/Manila", "Asia/Seoul", "Asia/Shanghai", "Asia/Singapore",
  "Atlantic/Canary", "Australia/Brisbane", "Australia/Melbourne", "Australia/Perth",
  "Europe/Amsterdam", "Europe/Athens", "Europe/Bucharest", "Europe/Copenhagen",
  "Europe/Dublin", "Europe/Helsinki", "Europe/Istanbul", "Europe/Kiev", "Europe/Lisbon",
  "Europe/Madrid", "Europe/Moscow", "Europe/Oslo", "Europe/Paris", "Europe/Prague",
  "Europe/Rome", "Europe/Stockholm", "Europe/Vienna", "Europe/Warsaw", "Europe/Zurich",
  "Pacific/Auckland", "Pacific/Honolulu",
].sort();


const userProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(50, "Name must be at most 50 characters."),
  email: z.string().email("Invalid email address."),
  allergies: z.string().optional().transform(val => val ? val.split(',').map(s => s.trim()).filter(Boolean) : []),
  foodPreferences: z.string().optional().transform(val => val ? val.split(',').map(s => s.trim()).filter(Boolean) : []),
  timezone: z.string().min(1, "Timezone is required."),
  averageCycleLength: z.coerce.number().int().positive().optional().nullable(),
  averagePeriodDuration: z.coerce.number().int().positive().optional().nullable(),
});

export type UserProfileFormData = z.infer<typeof userProfileSchema>;

interface UserProfileFormProps {
  defaultValues?: Partial<UserProfileFormData & { allergies: string[], foodPreferences: string[] }>;
  onSaveSuccess?: (data: UserProfileFormData) => void;
}

export function UserProfileForm({ defaultValues, onSaveSuccess }: UserProfileFormProps) {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [isSaving, setIsSaving] = React.useState(false);
  
  const form = useForm<UserProfileFormData>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      email: defaultValues?.email || "",
      // For form display, convert arrays back to comma-separated strings
      allergies: (defaultValues?.allergies as unknown as string[])?.join(', ') || "",
      foodPreferences: (defaultValues?.foodPreferences as unknown as string[])?.join(', ') || "",
      timezone: defaultValues?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      averageCycleLength: defaultValues?.averageCycleLength || null,
      averagePeriodDuration: defaultValues?.averagePeriodDuration || null,
    },
  });
  
  React.useEffect(() => {
    form.reset({
      name: defaultValues?.name || "",
      email: defaultValues?.email || "",
      allergies: (defaultValues?.allergies as unknown as string[])?.join(', ') || "",
      foodPreferences: (defaultValues?.foodPreferences as unknown as string[])?.join(', ') || "",
      timezone: defaultValues?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      averageCycleLength: defaultValues?.averageCycleLength || null,
      averagePeriodDuration: defaultValues?.averagePeriodDuration || null,
    });
  }, [defaultValues, form]);


  async function onSubmit(data: UserProfileFormData) {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to save your profile.",
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);
    try {
      const profileDataToSave = {
        name: data.name,
        // Email is managed by Auth, but we might store it for convenience if needed, though usually not directly editable here.
        // email: data.email, 
        allergies: data.allergies, // Already transformed to array by Zod
        foodPreferences: data.foodPreferences, // Already transformed to array by Zod
        timezone: data.timezone,
        averageCycleLength: data.averageCycleLength || null,
        averagePeriodDuration: data.averagePeriodDuration || null,
        updatedAt: new Date(),
      };

      await setDoc(doc(db, "users", currentUser.uid), profileDataToSave, { merge: true });
      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved successfully.",
      });
      if (onSaveSuccess) {
        onSaveSuccess(data);
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Save Failed",
        description: "Could not save your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="Your full name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input type="email" placeholder="your.email@example.com" {...field} readOnly />
              </FormControl>
              <FormDescription>Your email address is managed by your login provider and cannot be changed here.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="allergies"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Allergies</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., peanuts, shellfish, gluten" {...field} 
                  // Zod transform handles the array conversion, so field.value is string here
                  value={Array.isArray(field.value) ? (field.value as string[]).join(', ') : field.value}
                  onChange={e => field.onChange(e.target.value)}
                />
              </FormControl>
              <FormDescription>List any allergies you have, separated by commas.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="foodPreferences"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Food Preferences</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., vegetarian, likes dark chocolate, dislikes mint" {...field} 
                  value={Array.isArray(field.value) ? (field.value as string[]).join(', ') : field.value}
                  onChange={e => field.onChange(e.target.value)}
                />
              </FormControl>
              <FormDescription>List your food preferences, separated by commas.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="timezone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Timezone</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your timezone" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                This helps in scheduling reminders and notifications accurately.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="averageCycleLength"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Average Cycle Length (days)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 28" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? null : Number(e.target.value))} />
              </FormControl>
              <FormDescription>Your typical menstrual cycle length. This helps improve predictions.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="averagePeriodDuration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Average Period Duration (days)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 5" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? null : Number(e.target.value))} />
              </FormControl>
              <FormDescription>How long your period typically lasts. This also helps improve predictions.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />


        <Button type="submit" className="w-full" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Profile"}
        </Button>
      </form>
    </Form>
  );
}
