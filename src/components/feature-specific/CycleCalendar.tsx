// @ts-nocheck
"use client";

import * as React from "react";
import { addDays, format, startOfDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import type { PeriodLog } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CycleCalendarProps {
  logs: PeriodLog[];
  cycleLength?: number; // Average cycle length in days
}

interface DayInfo {
  date: Date;
  isLoggedPeriod?: boolean;
  isPredictedPeriod?: boolean;
  isFertile?: boolean;
  isOvulation?: boolean;
  symptoms?: string[];
}

export function CycleCalendar({ logs, cycleLength = 28 }: CycleCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState<Date>(new Date());
  const [dayInfoMap, setDayInfoMap] = React.useState<Map<string, DayInfo>>(new Map());

  React.useEffect(() => {
    const newDayInfoMap = new Map<string, DayInfo>();

    logs.forEach(log => {
      const start = startOfDay(log.startDate);
      const end = log.endDate ? startOfDay(log.endDate) : addDays(start, 4); // Assume 5 day period if end date not set

      // Mark logged period days
      for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
        const dateStr = format(d, "yyyy-MM-dd");
        const existingInfo = newDayInfoMap.get(dateStr) || {};
        newDayInfoMap.set(dateStr, {
          ...existingInfo,
          date: d,
          isLoggedPeriod: true,
          symptoms: log.symptoms,
        });
      }

      // Predict next period, fertile window, and ovulation
      if (cycleLength > 0) {
        const lastLoggedCycleStart = start; // Use the start of the current log iteration for prediction base
        
        const nextPeriodStartDate = addDays(lastLoggedCycleStart, cycleLength);
        
        const ovulationDate = addDays(nextPeriodStartDate, -14);
        const fertileWindowStart = addDays(ovulationDate, -5);
        const fertileWindowEnd = addDays(ovulationDate, 1);

        for (let d = new Date(fertileWindowStart); d <= fertileWindowEnd; d = addDays(d, 1)) {
          const dateStr = format(d, "yyyy-MM-dd");
          const existingInfo = newDayInfoMap.get(dateStr) || { date: d };
          if (!existingInfo.isLoggedPeriod) { // Don't mark fertile/ovulation if it's a logged period day
            newDayInfoMap.set(dateStr, {
              ...existingInfo,
              isFertile: true,
            });
          }
        }
        
        const ovulationDateStr = format(ovulationDate, "yyyy-MM-dd");
        const existingOvulationInfo = newDayInfoMap.get(ovulationDateStr) || { date: ovulationDate };
        if (!existingOvulationInfo.isLoggedPeriod) {
            newDayInfoMap.set(ovulationDateStr, {
            ...existingOvulationInfo,
            isOvulation: true,
            isFertile: true, 
          });
        }

        // Mark predicted next period (e.g., 5 days)
        for (let i = 0; i < 5; i++) {
          const d = addDays(nextPeriodStartDate, i);
          const dateStr = format(d, "yyyy-MM-dd");
          const existingInfo = newDayInfoMap.get(dateStr) || { date: d };
          if (!existingInfo.isLoggedPeriod) { // Only mark as predicted if not already a logged period
            newDayInfoMap.set(dateStr, {
              ...existingInfo,
              isPredictedPeriod: true,
            });
          }
        }
      }
    });
    setDayInfoMap(newDayInfoMap);
  }, [logs, cycleLength]); // currentMonth removed from deps as it caused re-calc & potential overrides
  
  const today = startOfDay(new Date());

  return (
    <div className="rounded-md border shadow-sm bg-card">
      <Calendar
        mode="single"
        selected={today}
        month={currentMonth}
        onMonthChange={setCurrentMonth}
        className="p-0"
        classNames={{
          day_selected: "bg-primary/30 text-primary-foreground rounded-md", // Default selected style
          day_today: "text-accent-foreground rounded-md border border-primary", // Default today style
        }}
        modifiers={{
          loggedPeriod: Array.from(dayInfoMap.values()).filter(d => d.isLoggedPeriod).map(d => d.date),
          predictedPeriod: Array.from(dayInfoMap.values()).filter(d => d.isPredictedPeriod && !d.isLoggedPeriod).map(d => d.date),
          fertile: Array.from(dayInfoMap.values()).filter(d => d.isFertile && !d.isLoggedPeriod && !d.isPredictedPeriod).map(d => d.date),
          ovulation: Array.from(dayInfoMap.values()).filter(d => d.isOvulation && !d.isLoggedPeriod && !d.isPredictedPeriod).map(d => d.date),
        }}
        modifiersClassNames={{
          loggedPeriod: 'cal-logged-period',
          predictedPeriod: 'cal-predicted-period',
          fertile: 'cal-fertile',
          ovulation: 'cal-ovulation',
        }}
        components={{
          DayContent: ({ date }) => {
            const dateStr = format(date, "yyyy-MM-dd");
            const info = dayInfoMap.get(dateStr);
            let badgeLabel = "";
            let ariaLabel = "";

            if (info?.isLoggedPeriod) {
              badgeLabel = "P";
              ariaLabel = "Logged Period";
            } else if (info?.isPredictedPeriod) {
              badgeLabel = "P";
              ariaLabel = "Predicted Period";
            } else if (info?.isOvulation) {
              badgeLabel = "O";
              ariaLabel = "Predicted Ovulation";
            } else if (info?.isFertile) {
              badgeLabel = "F";
              ariaLabel = "Fertile Window";
            }
            
            return (
              <div className="relative flex flex-col items-center justify-center h-full w-full">
                <span>{format(date, "d")}</span>
                {badgeLabel && (
                  <Badge 
                    variant="outline"
                    className={cn(
                      "absolute bottom-0.5 text-[9px] px-1 py-0 h-auto leading-tight font-semibold",
                      // Text color of badge can be foreground or a specific color if needed for contrast
                      // e.g., info?.isLoggedPeriod ? "text-destructive-foreground" : "text-foreground"
                      // For simplicity, using default badge "outline" which is text-foreground
                    )}
                    aria-label={ariaLabel}
                  >
                    {badgeLabel}
                  </Badge>
                )}
              </div>
            );
          },
        }}
      />
      <div className="p-4 border-t flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: 'var(--cal-logged-period-bg)', border: '1px solid var(--cal-logged-period-fg-indicator)' }}></span>
          <span>Logged Period</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full relative overflow-hidden" style={{ backgroundColor: 'var(--cal-predicted-period-bg)' }}>
             <span style={{ position: 'absolute', inset: '0px', border: '1px dashed var(--cal-predicted-period-fg-indicator)', borderRadius: 'inherit', Ttransform: 'scale(1.2)' /* Make dash visible */}}></span>
          </span>
          <span>Predicted Period</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: 'var(--cal-fertile-bg)', border: '1px solid var(--cal-fertile-fg-indicator)' }}></span>
          <span>Fertile Window</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: 'var(--cal-ovulation-bg)', border: '1px solid var(--cal-ovulation-border-indicator)' }}></span>
          <span>Ovulation (Est.)</span>
        </div>
      </div>
    </div>
  );
}
