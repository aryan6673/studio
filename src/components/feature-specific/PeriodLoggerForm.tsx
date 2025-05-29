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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { format } from "date-fns";
import { availableSymptoms, type SymptomOption } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import React from "react";

const periodLogSchema = z.object({
  startDate: z.date({
    required_error: "Start date is required.",
  }),
  endDate: z.date().optional(),
  cycleLength: z.coerce.number().int().positive().optional(),
  symptoms: z.array(z.string()).optional(),
});

type PeriodLogFormData = z.infer<typeof periodLogSchema>;

export function PeriodLoggerForm() {
  const { toast } = useToast();
  const [selectedSymptoms, setSelectedSymptoms] = React.useState<SymptomOption[]>([]);


  const form = useForm<PeriodLogFormData>({
    resolver: zodResolver(periodLogSchema),
    defaultValues: {
      symptoms: [],
    },
  });

  function onSubmit(data: PeriodLogFormData) {
    // In a real app, this would be a server action to save the data
    console.log("Period Log Data:", data);
    toast({
      title: "Period Logged",
      description: `Start Date: ${format(data.startDate, "PPP")}. Symptoms: ${data.symptoms?.join(', ') || 'None'}.`,
    });
    form.reset();
    setSelectedSymptoms([]);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Period Start Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="endDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Period End Date (Optional)</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01") || (form.getValues("startDate") && date < form.getValues("startDate"))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="symptoms"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Symptoms (Optional)</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between",
                        !field.value?.length && "text-muted-foreground"
                      )}
                    >
                      {selectedSymptoms.length > 0
                        ? selectedSymptoms.map(s => s.label).join(", ")
                        : "Select symptoms"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search symptoms..." />
                    <CommandList>
                      <CommandEmpty>No symptoms found.</CommandEmpty>
                      <CommandGroup>
                        {availableSymptoms.map((symptom) => (
                          <CommandItem
                            key={symptom.id}
                            onSelect={() => {
                              const currentSymptoms = form.getValues("symptoms") || [];
                              const isSelected = currentSymptoms.includes(symptom.id);
                              let newSelectedSymptoms: SymptomOption[];
                              let newSymptomValues: string[];

                              if (isSelected) {
                                newSymptomValues = currentSymptoms.filter((id) => id !== symptom.id);
                                newSelectedSymptoms = selectedSymptoms.filter(s => s.id !== symptom.id);
                              } else {
                                newSymptomValues = [...currentSymptoms, symptom.id];
                                newSelectedSymptoms = [...selectedSymptoms, symptom];
                              }
                              form.setValue("symptoms", newSymptomValues);
                              setSelectedSymptoms(newSelectedSymptoms);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                (form.getValues("symptoms") || []).includes(symptom.id)
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {symptom.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormDescription>
                Select any symptoms you experienced.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cycleLength"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Typical Cycle Length (Days, Optional)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 28" {...field} onChange={event => field.onChange(+event.target.value)} />
              </FormControl>
              <FormDescription>
                Your average cycle length in days. Helps with predictions.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">Save Log</Button>
      </form>
    </Form>
  );
}
