"use client";

import * as React from "react";
import { addDays, differenceInDays, format, startOfDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import type { PeriodLog } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

interface CycleCalendarProps {
  logs: PeriodLog[];
  cycleLength?: number; // Average cycle length in days
}

interface DayInfo {
  date: Date;
  isPeriod?: boolean;
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

      // Mark period days
      for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
        const dateStr = format(d, "yyyy-MM-dd");
        newDayInfoMap.set(dateStr, {
          ...newDayInfoMap.get(dateStr),
          date: d,
          isPeriod: true,
          symptoms: log.symptoms,
        });
      }

      // Predict next period, fertile window, and ovulation
      // This is a simplified prediction based on the last logged period and average cycle length
      if (cycleLength > 0) {
        const nextPeriodStart = addDays(start, cycleLength);
        
        // Ovulation typically 14 days before next period
        const ovulationDate = addDays(nextPeriodStart, -14);
        const fertileWindowStart = addDays(ovulationDate, -5);
        const fertileWindowEnd = addDays(ovulationDate, 1);

        // Mark fertile window
        for (let d = new Date(fertileWindowStart); d <= fertileWindowEnd; d = addDays(d, 1)) {
          const dateStr = format(d, "yyyy-MM-dd");
          newDayInfoMap.set(dateStr, {
            ...newDayInfoMap.get(dateStr),
            date: d,
            isFertile: true,
          });
        }
        
        // Mark ovulation day
        const ovulationDateStr = format(ovulationDate, "yyyy-MM-dd");
        newDayInfoMap.set(ovulationDateStr, {
          ...newDayInfoMap.get(ovulationDateStr),
          date: ovulationDate,
          isOvulation: true,
          isFertile: true, // Ovulation is part of fertile window
        });

        // Mark predicted next period (first few days)
        for (let i = 0; i < 5; i++) {
          const d = addDays(nextPeriodStart, i);
          const dateStr = format(d, "yyyy-MM-dd");
           if (!newDayInfoMap.has(dateStr) || !newDayInfoMap.get(dateStr)?.isPeriod) { // Don't override actual logged periods
            newDayInfoMap.set(dateStr, { ...newDayInfoMap.get(dateStr), date:d, isPeriod: true }); // Mark as period, but could be styled differently as "predicted"
           }
        }
      }
    });
    setDayInfoMap(newDayInfoMap);
  }, [logs, cycleLength, currentMonth]);
  
  const today = startOfDay(new Date());

  return (
    <div className="rounded-md border shadow-sm">
      <Calendar
        mode="single"
        selected={today} // Highlight today by default
        month={currentMonth}
        onMonthChange={setCurrentMonth}
        className="p-0"
        classNames={{
          day_selected: "bg-primary/30 text-primary-foreground rounded-md",
          day_today: "text-accent-foreground rounded-md border border-primary",
        }}
        components={{
          DayContent: ({ date, activeModifiers }) => {
            const dateStr = format(date, "yyyy-MM-dd");
            const info = dayInfoMap.get(dateStr);
            let variant: "default" | "secondary" | "destructive" | "outline" | null = null;
            let label = "";

            if (info?.isPeriod) {
              variant = "destructive"; // Using destructive for period, could be primary
              label = "Period";
            } else if (info?.isOvulation) {
              variant = "secondary"; // Using secondary for ovulation, could be accent
              label = "Ovulation";
            } else if (info?.isFertile) {
              variant = "outline"; // Using outline for fertile, could be another accent
              label = "Fertile";
            }
            
            return (
              <div className="relative flex flex-col items-center justify-center h-full w-full">
                <span>{format(date, "d")}</span>
                {label && (
                  <Badge 
                    variant={variant || "default"} 
                    className={cn(
                      "absolute bottom-0.5 text-[8px] px-1 py-0 h-auto leading-tight",
                       info?.isPeriod && "bg-pink-500 text-white border-pink-500",
                       info?.isOvulation && "bg-purple-500 text-white border-purple-500",
                       info?.isFertile && !info.isOvulation && "bg-green-500 text-white border-green-500"
                    )}
                  >
                    {label.substring(0,1)}
                  </Badge>
                )}
              </div>
            );
          },
        }}
        modifiers={{
          period: Array.from(dayInfoMap.values()).filter(d => d.isPeriod).map(d => d.date),
          fertile: Array.from(dayInfoMap.values()).filter(d => d.isFertile && !d.isPeriod).map(d => d.date),
          ovulation: Array.from(dayInfoMap.values()).filter(d => d.isOvulation && !d.isPeriod).map(d => d.date),
        }}
        modifiersClassNames={{
          period: 'bg-destructive/20 text-destructive-foreground rounded-md',
          fertile: 'bg-accent/30 text-accent-foreground rounded-md',
          ovulation: 'bg-secondary/40 text-secondary-foreground font-bold rounded-md border-2 border-secondary',
        }}
      />
      <div className="p-4 border-t flex flex-wrap gap-2 sm:gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-pink-500"></span>
          <span>Period</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-green-500"></span>
          <span>Fertile Window</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-purple-500"></span>
          <span>Ovulation (Predicted)</span>
        </div>
      </div>
    </div>
  );
}
