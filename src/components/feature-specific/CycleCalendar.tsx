
"use client";

import React, { useState, useMemo } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { addDays, format, parseISO, isSameDay, isWithinInterval, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import type { PeriodLog } from '@/lib/types'; // Assuming this type exists for logged periods
import type { PredictCycleOutput } from '@/ai/flows/predict-cycle-flow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';

interface CycleCalendarProps {
  loggedPeriods: PeriodLog[];
  aiPredictions: PredictCycleOutput | null;
  currentMonth: Date;
  onMonthChange: (month: Date) => void;
}

interface DayInfo {
  date: Date;
  isLoggedPeriod?: boolean;
  isPredictedPeriod?: boolean;
  isFertileWindow?: boolean;
  isOvulation?: boolean;
}

export function CycleCalendar({
  loggedPeriods,
  aiPredictions,
  currentMonth,
  onMonthChange,
}: CycleCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const today = startOfDay(new Date());

  const dayInfoMap = useMemo(() => {
    const map = new Map<string, Partial<DayInfo>>();

    // Process logged periods
    loggedPeriods.forEach(log => {
      const start = parseISO(log.startDate as unknown as string); // Ensure string for parseISO
      const end = log.endDate ? parseISO(log.endDate as unknown as string) : start;
      for (let d = start; d <= end; d = addDays(d, 1)) {
        const dateStr = format(d, 'yyyy-MM-dd');
        map.set(dateStr, { ...map.get(dateStr), date: d, isLoggedPeriod: true });
      }
    });

    // Process AI predictions
    if (aiPredictions) {
      aiPredictions.predictedPeriods?.forEach(period => {
        try {
          const start = parseISO(period.startDate);
          const end = parseISO(period.endDate);
          for (let d = start; d <= end; d = addDays(d, 1)) {
            const dateStr = format(d, 'yyyy-MM-dd');
            if (!map.has(dateStr) || !map.get(dateStr)?.isLoggedPeriod) { // Logged data takes precedence
              map.set(dateStr, { ...map.get(dateStr), date: d, isPredictedPeriod: true });
            }
          }
        } catch (e) { console.error("Error parsing AI predicted period date:", period, e); }
      });

      aiPredictions.predictedFertileWindows?.forEach(window => {
        try {
          const start = parseISO(window.startDate);
          const end = parseISO(window.endDate);
          for (let d = start; d <= end; d = addDays(d, 1)) {
            const dateStr = format(d, 'yyyy-MM-dd');
            map.set(dateStr, { ...map.get(dateStr), date: d, isFertileWindow: true });
          }
        } catch (e) { console.error("Error parsing AI fertile window date:", window, e); }
      });

      aiPredictions.predictedOvulationDates?.forEach(ovDateStr => {
        try {
          const d = parseISO(ovDateStr);
          const dateStr = format(d, 'yyyy-MM-dd');
          map.set(dateStr, { ...map.get(dateStr), date: d, isOvulation: true });
        } catch (e) { console.error("Error parsing AI ovulation date:", ovDateStr, e); }
      });
    }
    return map;
  }, [loggedPeriods, aiPredictions]);

  const modifiers = {
    loggedPeriod: (date: Date) => dayInfoMap.get(format(date, 'yyyy-MM-dd'))?.isLoggedPeriod || false,
    predictedPeriod: (date: Date) => dayInfoMap.get(format(date, 'yyyy-MM-dd'))?.isPredictedPeriod || false,
    fertileWindow: (date: Date) => dayInfoMap.get(format(date, 'yyyy-MM-dd'))?.isFertileWindow || false,
    ovulation: (date: Date) => dayInfoMap.get(format(date, 'yyyy-MM-dd'))?.isOvulation || false,
    today: today,
  };

  const modifiersClassNames = {
    loggedPeriod: 'cal-logged-period',
    predictedPeriod: 'cal-predicted-period',
    fertileWindow: 'cal-fertile',
    ovulation: 'cal-ovulation',
    today: 'rdp-day_today',
  };

  const selectedDayInfo = selectedDate ? dayInfoMap.get(format(selectedDate, 'yyyy-MM-dd')) : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
      <div className="md:col-span-2">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          month={currentMonth}
          onMonthChange={onMonthChange}
          className="rounded-md border shadow-md p-4 bg-card"
          classNames={{
            day_selected: 'bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary/90',
          }}
          modifiers={modifiers}
          modifiersClassNames={modifiersClassNames}
          showOutsideDays
          fixedWeeks
        />
        <div className="mt-4 p-3 border rounded-md bg-muted/50">
          <h4 className="font-semibold mb-2 text-sm">Legend:</h4>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[var(--cal-logged-period-bg)] border border-[var(--cal-logged-period-fg-indicator)]"></span> Logged Period
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[var(--cal-predicted-period-bg)] border border-dashed border-[var(--cal-predicted-period-fg-indicator)]"></span> Predicted Period
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[var(--cal-fertile-bg)] border border-[var(--cal-fertile-fg-indicator)]"></span> Fertile Window
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[var(--cal-ovulation-bg)] border border-[var(--cal-ovulation-border-indicator)]"></span> Ovulation (Est.)
            </div>
          </div>
        </div>
      </div>
      
      <div className="md:col-span-1 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedDate ? format(selectedDate, 'PPP') : 'Select a Date'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2 min-h-[100px]">
            {selectedDayInfo?.isLoggedPeriod && <Badge variant="destructive">Logged Period</Badge>}
            {selectedDayInfo?.isPredictedPeriod && <Badge variant="secondary">Predicted Period</Badge>}
            {selectedDayInfo?.isFertileWindow && <Badge className="bg-[var(--cal-fertile-bg)] text-[var(--cal-fertile-fg-indicator)] border-[var(--cal-fertile-fg-indicator)] hover:bg-[var(--cal-fertile-bg)]/80">Fertile Window</Badge>}
            {selectedDayInfo?.isOvulation && <Badge className="bg-[var(--cal-ovulation-bg)] text-[var(--cal-ovulation-fg-indicator)] border-[var(--cal-ovulation-border-indicator)] hover:bg-[var(--cal-ovulation-bg)]/80">Ovulation (Est.)</Badge>}
            {!selectedDayInfo && selectedDate && <p className="text-muted-foreground">No specific events for this day.</p>}
            {!selectedDate && <p className="text-muted-foreground">Click on a date in the calendar to see details.</p>}
          </CardContent>
        </Card>

        {aiPredictions?.aiNote && (
          <Card className={cn(aiPredictions.aiNote.toLowerCase().includes("error") || aiPredictions.aiNote.toLowerCase().includes("insufficient") ? "border-destructive/50" : "border-primary/50")}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                {aiPredictions.aiNote.toLowerCase().includes("error") || aiPredictions.aiNote.toLowerCase().includes("insufficient") ? <AlertCircle className="h-5 w-5 text-destructive" /> : <CheckCircle2 className="h-5 w-5 text-primary" />}
                 AI Prediction Note
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{aiPredictions.aiNote}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default CycleCalendar;
