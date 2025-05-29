
'use server';
/**
 * @fileOverview A Menstrual Cycle Prediction AI agent.
 *
 * - predictCycle - A function that handles the cycle prediction process.
 * - PredictCycleInput - The input type for the predictCycle function.
 * - PredictCycleOutput - The return type for the predictCycle function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { format } from 'date-fns';

const PeriodLogSchema = z.object({
  startDate: z.string().describe("The start date of the period in YYYY-MM-DD format."),
  endDate: z.string().optional().describe("The end date of the period in YYYY-MM-DD format. Optional if period is ongoing or duration is unknown."),
});
export type PeriodLogInput = z.infer<typeof PeriodLogSchema>;

const PredictCycleInputSchema = z.object({
  periodLogs: z.array(PeriodLogSchema).describe("An array of past period logs. Should be sorted by startDate, most recent last, if possible. Can be empty."),
  averageCycleLength: z.number().int().positive().optional().describe("The user's average cycle length in days (e.g., 28)."),
  averagePeriodDuration: z.number().int().positive().optional().describe("The user's average period duration in days (e.g., 5)."),
  currentDate: z.string().describe("The current date in YYYY-MM-DD format, to help the AI orient its predictions for the future.")
});
export type PredictCycleInput = z.infer<typeof PredictCycleInputSchema>;

const PredictedEventSchema = z.object({
  startDate: z.string().describe("The predicted start date in YYYY-MM-DD format."),
  endDate: z.string().describe("The predicted end date in YYYY-MM-DD format."),
});

const PredictCycleOutputSchema = z.object({
  predictedPeriods: z.array(PredictedEventSchema).optional().describe("The predicted next N menstrual periods (at least 5 if possible, or fewer if data is insufficient). Each with a start and end date."),
  predictedFertileWindows: z.array(PredictedEventSchema).optional().describe("The predicted next N fertile windows (at least 5 if possible, or fewer if data is insufficient). Each with a start and end date."),
  predictedOvulationDates: z.array(z.string().describe("The predicted next ovulation date in YYYY-MM-DD format.")).optional().describe("The predicted next N ovulation dates (at least 5 if possible, or fewer if data is insufficient). Dates must be in YYYY-MM-DD format."),
  reasoning: z.string().optional().describe("A brief explanation of how the predictions were made, or any uncertainties. If fewer than 5 predictions are made, explain why."),
  error: z.string().optional().describe("Any error message if prediction failed, e.g., insufficient data.")
});
export type PredictCycleOutput = z.infer<typeof PredictCycleOutputSchema>;

export async function predictCycle(input: PredictCycleInput): Promise<PredictCycleOutput> {
  // Ensure logs are sorted, most recent first, then take up to 12.
  // The AI prompt will expect most recent last for easier chronological processing if we iterate.
  const processedLogs = input.periodLogs
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    .slice(0, 12)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  return predictCycleFlow({...input, periodLogs: processedLogs});
}

const systemPrompt = `You are an expert menstrual cycle prediction assistant.
Your goal is to predict future upcoming periods, fertile windows, and ovulation dates based on the provided historical period logs, user's average cycle length, and average period duration.
Predictions should always be for future dates relative to the 'currentDate' provided.

Guidelines:
- Predict at least the next 5 occurrences of periods, fertile windows, and ovulation dates after the 'currentDate', if data allows. If fewer than 5 can be reliably predicted (e.g., highly irregular data, very sparse logs), provide as many as possible and explain this in the 'reasoning' field.
- Analyze the provided period logs for patterns in cycle length and period duration.
- If averageCycleLength is provided, give it high priority. If not, try to calculate an average from the logs. If logs are insufficient, use a default of 28 days.
- If averagePeriodDuration is provided, use it for the predicted periods' length. Otherwise, infer from logs or assume 5 days.
- Ovulation typically occurs about 14 days BEFORE the start of the next menstrual period.
- The fertile window typically starts 5 days before ovulation and includes the ovulation day (total 6 days).
- All output dates MUST be in 'YYYY-MM-DD' format.
- If data is insufficient for any reliable prediction (e.g., no logs and no average cycle length), set an appropriate message in the 'error' field and omit date predictions.
- If predictions can be made but with low confidence (e.g., irregular cycles, very sparse data), mention this in the 'reasoning' field.
- Ensure all predicted start dates are after or on the 'currentDate'. If a predicted event would have started in the past based on calculations, adjust it to the next cycle or clearly state why a prediction cannot be made for the immediate future.
`;

const userPromptContent = `
Current Date: {{currentDate}}

User's Average Cycle Length: {{#if averageCycleLength}}{{averageCycleLength}} days{{else}}Not provided{{/if}}
User's Average Period Duration: {{#if averagePeriodDuration}}{{averagePeriodDuration}} days{{else}}Not provided{{/if}}

Period Logs (up to 12 most recent, sorted chronologically):
{{#if periodLogs.length}}
  {{#each periodLogs}}
  - Log: Start Date: {{startDate}}{{#if endDate}}, End Date: {{endDate}}{{else}}, End Date: Not specified{{/if}}
  {{/each}}
{{else}}
  No period logs provided.
{{/if}}

Based on this information, provide the predictions. Remember to predict at least 5 future occurrences for periods, fertile windows, and ovulation dates if possible.
`;

const predictCyclePrompt = ai.definePrompt({
    name: 'predictCyclePrompt',
    input: { schema: PredictCycleInputSchema },
    output: { schema: PredictCycleOutputSchema },
    system: systemPrompt,
    prompt: userPromptContent,
});

const predictCycleFlow = ai.defineFlow(
  {
    name: 'predictCycleFlow',
    inputSchema: PredictCycleInputSchema,
    outputSchema: PredictCycleOutputSchema,
  },
  async (input): Promise<PredictCycleOutput> => {
    try {
        const result = await predictCyclePrompt(input);
        
        if (!result || !result.output) {
            console.warn("AI model did not return a valid prediction structure. Full result:", result);
            return { error: "AI model did not return a valid prediction structure. The response might be empty or malformed." };
        }
        const output = result.output;

        // Basic validation for the first predicted period date
        if (output.predictedPeriods && output.predictedPeriods.length > 0 && output.predictedPeriods[0].startDate) {
            try {
                const firstPredictedPeriodStartDate = new Date(output.predictedPeriods[0].startDate + "T00:00:00"); // Ensure parsing as local date
                const currentDateObj = new Date(input.currentDate + "T00:00:00");
                
                if (firstPredictedPeriodStartDate < currentDateObj) {
                    if (output.predictedPeriods[0].endDate && new Date(output.predictedPeriods[0].endDate + "T00:00:00") < currentDateObj) {
                        // This check might be too aggressive if we predict multiple.
                        // Consider if this check is still relevant for the *first* of multiple predictions.
                        // For now, let's keep it to flag if the very first prediction is entirely in the past.
                        return { 
                            error: "AI's first predicted period has already passed. Consider logging more recent data or adjusting settings.", 
                            reasoning: output.reasoning || "Prediction adjusted due to past date." 
                        };
                    }
                }
            } catch (dateError) {
                console.error("Error parsing date from AI prediction (AI returned non-YYYY-MM-DD string likely):", dateError, output.predictedPeriods[0]);
                return { error: "AI returned an invalid date string format for the next period.", reasoning: output.reasoning };
            }
        }
        return output;
    } catch (e: any) {
        console.error("Error in predictCycleFlow:", e);
        let errorMessage = "An unexpected error occurred while generating predictions.";
        if (e instanceof Error && e.message) {
            errorMessage += ` Details: ${e.message}`;
        } else if (typeof e === 'string') {
            errorMessage += ` Details: ${e}`;
        }
        
        if (e && e.cause && typeof e.cause === 'object' && e.cause.message) { 
          errorMessage += ` Cause: ${e.cause.message}`;
        } else if (e && e.cause && typeof e.cause === 'string') {
          errorMessage += ` Cause: ${e.cause}`;
        } else if (e && e.details) { 
          errorMessage += ` Genkit details: ${e.details}`;
        }
        
        if (e && typeof e.isFinishError === 'boolean' && e.finishReason) {
          errorMessage += ` Finish Reason: ${e.finishReason}`;
          if (e.safetyRatings) {
            errorMessage += ` Safety Ratings: ${JSON.stringify(e.safetyRatings)}`;
          }
        }
        return { error: errorMessage };
    }
  }
);

