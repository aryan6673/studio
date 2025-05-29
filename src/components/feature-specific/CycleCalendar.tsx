
// @ts-nocheck
"use client";

import * as React from "react";
import { addDays, format, startOfDay, parseISO, isValid } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import type { PeriodLog } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { predictCycle, type PredictCycleInput, type PredictCycleOutput, type PeriodLogInput } from "@/ai/flows/predict-cycle-flow";
import { AlertTriangle } from "lucide-react";

interface CycleCalendarProps {
  logs: PeriodLog[];
  cycleLength?: number; // Average cycle length in days, from user profile or settings
  averagePeriodDuration?: number; // Average period duration, from user profile or settings
}

interface DayInfo {
  date: Date;
  isLoggedPeriod?: boolean;
  isPredictedPeriod?: boolean;
  isFertile?: boolean;
  isOvulation?: boolean;
  symptoms?: string[];
}

export function CycleCalendar({ logs, cycleLength, averagePeriodDuration }: CycleCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState<Date>(new Date());
  const [dayInfoMap, setDayInfoMap] = React.useState<Map<string, DayInfo>>(new Map());
  const [aiPrediction, setAiPrediction] = React.useState<PredictCycleOutput | null>(null);
  const [isFetchingPrediction, setIsFetchingPrediction] = React.useState(false);
  const [predictionError, setPredictionError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchAiPredictions = async () => {
      if (logs && logs.length === 0 && !cycleLength) {
        setAiPrediction({ error: "Not enough data to make predictions. Please log a period or set your average cycle length." });
        setDayInfoMap(new Map()); 
        return;
      }

      setIsFetchingPrediction(true);
      setPredictionError(null);
      setAiPrediction(null); 

      const formattedLogs: PeriodLogInput[] = logs.map(log => ({
        startDate: format(log.startDate, "yyyy-MM-dd"),
        endDate: log.endDate ? format(log.endDate, "yyyy-MM-dd") : undefined,
      }));

      const input: PredictCycleInput = {
        periodLogs: formattedLogs,
        averageCycleLength: cycleLength,
        averagePeriodDuration: averagePeriodDuration,
        currentDate: format(new Date(), "yyyy-MM-dd"),
      };

      try {
        const result = await predictCycle(input);
        setAiPrediction(result);
        if (result.error) {
            setPredictionError(result.error);
        }
      } catch (error) {
        console.error("Failed to fetch AI cycle predictions:", error);
        setPredictionError("Could not fetch AI predictions. Please try again later.");
        setAiPrediction(null);
      } finally {
        setIsFetchingPrediction(false);
      }
    };

    fetchAiPredictions();
  }, [logs, cycleLength, averagePeriodDuration]);

  React.useEffect(() => {
    const newDayInfoMap = new Map<string, DayInfo>();
    const todayFormatted = format(startOfDay(new Date()), "yyyy-MM-dd");

    // 1. Mark logged past periods
    logs.forEach(log => {
      const start = startOfDay(log.startDate);
      const end = log.endDate ? startOfDay(log.endDate) : addDays(start, (averagePeriodDuration || 5) - 1);

      for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
        const dateStr = format(d, "yyyy-MM-dd");
        newDayInfoMap.set(dateStr, {
          date: d,
          isLoggedPeriod: true,
          symptoms: log.symptoms,
        });
      }
    });

    // 2. Mark AI-predicted future events
    if (aiPrediction && !aiPrediction.error) {
      // Predicted Periods
      aiPrediction.predictedPeriods?.forEach(period => {
        try {
          const periodStart = startOfDay(parseISO(period.startDate));
          const periodEnd = startOfDay(parseISO(period.endDate));
          if (!isValid(periodStart) || !isValid(periodEnd)) {
            console.warn('Invalid period date string from AI:', period); return;
          }
          if (format(periodStart, "yyyy-MM-dd") >= todayFormatted || format(periodEnd, "yyyy-MM-dd") >= todayFormatted) {
            for (let d = new Date(periodStart); d <= periodEnd; d = addDays(d, 1)) {
              const dateStr = format(d, "yyyy-MM-dd");
              if (!newDayInfoMap.has(dateStr)) { 
                newDayInfoMap.set(dateStr, { date: d, isPredictedPeriod: true });
              }
            }
          }
        } catch (e) { console.error("Error parsing predicted period dates:", e, period); }
      });

      // Predicted Fertile Windows
      aiPrediction.predictedFertileWindows?.forEach(window => {
         try {
          const fertileStart = startOfDay(parseISO(window.startDate));
          const fertileEnd = startOfDay(parseISO(window.endDate));
          if (!isValid(fertileStart) || !isValid(fertileEnd)) {
            console.warn('Invalid fertile window date string from AI:', window); return;
          }
           if (format(fertileStart, "yyyy-MM-dd") >= todayFormatted || format(fertileEnd, "yyyy-MM-dd") >= todayFormatted) {
            for (let d = new Date(fertileStart); d <= fertileEnd; d = addDays(d, 1)) {
              const dateStr = format(d, "yyyy-MM-dd");
              const existingInfo = newDayInfoMap.get(dateStr) || { date: d };
              if (!existingInfo.isLoggedPeriod && !existingInfo.isPredictedPeriod) { 
                newDayInfoMap.set(dateStr, { ...existingInfo, isFertile: true });
              }
            }
          }
        } catch (e) { console.error("Error parsing predicted fertile window dates:", e, window); }
      });
      
      // Predicted Ovulation Dates
      aiPrediction.predictedOvulationDates?.forEach(ovDateStr => {
        try {
          if (typeof ovDateStr !== 'string' || ovDateStr.trim() === '') {
            console.warn('Received empty or invalid ovulation date string from AI:', ovDateStr);
            return; 
          }
          const ovulationDate = startOfDay(parseISO(ovDateStr));
          if (!isValid(ovulationDate)) {
            console.warn(`Failed to parse ovulation date string from AI: '${ovDateStr}' resulted in an invalid date.`);
            return; 
          }

          if (format(ovulationDate, "yyyy-MM-dd") >= todayFormatted) {
            const dateStr = format(ovulationDate, "yyyy-MM-dd");
            const existingInfo = newDayInfoMap.get(dateStr) || { date: ovulationDate };
             if (!existingInfo.isLoggedPeriod && !existingInfo.isPredictedPeriod) { 
              newDayInfoMap.set(dateStr, { ...existingInfo, isOvulation: true, isFertile: true }); 
            }
          }
        } catch (e: any) { 
          console.error(`Error processing predicted ovulation date string '${ovDateStr}':`, e?.message, e?.stack); 
        }
      });
    }
    setDayInfoMap(newDayInfoMap);
  }, [logs, aiPrediction, averagePeriodDuration]);
  
  const today = startOfDay(new Date());

  return (
    <div className="rounded-md border shadow-sm bg-card">
       {isFetchingPrediction && (
        <div className="p-4 text-center text-sm text-muted-foreground">Fetching AI predictions...</div>
      )}
      {predictionError && (
        <div className="p-4 text-sm text-destructive-foreground bg-destructive/80 rounded-t-md flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <span>{predictionError}</span>
        </div>
      )}
      {aiPrediction?.reasoning && !predictionError && (
         <div className="p-3 text-xs text-muted-foreground border-b bg-accent/20">
            <strong>AI Note:</strong> {aiPrediction.reasoning}
        </div>
      )}
      <Calendar
        mode="single"
        selected={today} 
        month={currentMonth}
        onMonthChange={setCurrentMonth}
        className="p-0"
        classNames={{
          day_selected: "bg-primary/30 text-primary-foreground rounded-md",
          day_today: "text-accent-foreground rounded-md border border-primary",
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
              ariaLabel = "AI Predicted Period";
            } else if (info?.isOvulation) {
              badgeLabel = "O";
              ariaLabel = "AI Predicted Ovulation";
            } else if (info?.isFertile) {
              badgeLabel = "F";
              ariaLabel = "AI Predicted Fertile Window";
            }
            
            return (
              <div className="relative flex flex-col items-center justify-center h-full w-full">
                <span>{format(date, "d")}</span>
                {badgeLabel && (
                  <Badge 
                    variant="outline"
                    className={cn(
                      "absolute bottom-0.5 text-[9px] px-1 py-0 h-auto leading-tight font-semibold",
                       "bg-background/70 backdrop-blur-sm" 
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
             <span style={{ position: 'absolute', inset: '0px', border: '1px dashed var(--cal-predicted-period-fg-indicator)', borderRadius: 'inherit'}}></span>
          </span>
          <span>AI Predicted Period</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: 'var(--cal-fertile-bg)', border: '1px solid var(--cal-fertile-fg-indicator)' }}></span>
          <span>AI Predicted Fertile</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: 'var(--cal-ovulation-bg)', border: '1px solid var(--cal-ovulation-border-indicator)' }}></span>
          <span>AI Predicted Ovulation</span>
        </div>
      </div>
    </div>
  );
}

