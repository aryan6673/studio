
'use server';
/**
 * @fileOverview AI flow for predicting menstrual cycle events.
 *
 * - predictCycle - A function that calls the AI to predict future cycle events.
 * - PredictCycleInput - The input type for the predictCycle function.
 * - PredictCycleOutput - The return type for the predictCycle function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const LoggedPeriodSchema = z.object({
  startDate: z.string().describe('The start date of a logged period in YYYY-MM-DD format.'),
  endDate: z.string().optional().describe('The end date of a logged period in YYYY-MM-DD format (optional).'),
});

const PredictedEventSchema = z.object({
  startDate: z.string().describe('The predicted start date in YYYY-MM-DD format.'),
  endDate: z.string().describe('The predicted end date in YYYY-MM-DD format.'),
});

const PredictCycleInputSchema = z.object({
  pastPeriods: z
    .array(LoggedPeriodSchema)
    .describe('An array of past logged period start and end dates. Sorted from most recent to oldest.'),
  averageCycleLength: z
    .number()
    .optional()
    .describe('The user\'s average menstrual cycle length in days (e.g., 28). Optional.'),
  averagePeriodDuration: z
    .number()
    .optional()
    .describe('The user\'s average period duration in days (e.g., 5). Optional.'),
  currentDate: z.string().describe('The current date in YYYY-MM-DD format, to help anchor predictions.'),
});
export type PredictCycleInput = z.infer<typeof PredictCycleInputSchema>;

const PredictCycleOutputSchema = z.object({
  predictedPeriods: z
    .array(PredictedEventSchema)
    .describe('An array of at least 5 predicted future period start and end dates.'),
  predictedFertileWindows: z
    .array(PredictedEventSchema)
    .describe('An array of at least 5 predicted future fertile window start and end dates.'),
  predictedOvulationDates: z
    .array(z.string().describe('An array of at least 5 predicted future ovulation dates in YYYY-MM-DD format.'))
    .describe('Each date is a single day.'),
  aiNote: z
    .string()
    .optional()
    .describe('A brief note from the AI, e.g., about confidence, or if data is insufficient for 5 predictions.'),
});
export type PredictCycleOutput = z.infer<typeof PredictCycleOutputSchema>;

export async function predictCycle(input: PredictCycleInput): Promise<PredictCycleOutput> {
  if (!input.pastPeriods || input.pastPeriods.length === 0) {
    return {
      predictedPeriods: [],
      predictedFertileWindows: [],
      predictedOvulationDates: [],
      aiNote: "Insufficient data: At least one past period log is required for prediction."
    };
  }
  return predictCycleFlow(input);
}

const predictCyclePrompt = ai.definePrompt({
  name: 'predictCyclePrompt',
  input: {schema: PredictCycleInputSchema},
  output: {schema: PredictCycleOutputSchema},
  prompt: `You are a menstrual cycle prediction AI.
Your goal is to predict future menstrual cycle events based on past data and user-provided averages.
Predict at least the next 5 occurrences for periods, fertile windows, and ovulation dates.

User's Past Period Data (most recent first):
{{#if pastPeriods.length}}
  {{#each pastPeriods}}
  - Start: {{{startDate}}}{{#if endDate}}, End: {{{endDate}}}{{/if}}
  {{/each}}
{{else}}
  No past period data provided.
{{/if}}

User's Averages (if provided, use these to refine predictions, otherwise estimate from logs):
- Average Cycle Length: {{#if averageCycleLength}}{{{averageCycleLength}}} days{{else}}Not provided{{/if}}
- Average Period Duration: {{#if averagePeriodDuration}}{{{averagePeriodDuration}}} days{{else}}Not provided{{/if}}

Current Date: {{{currentDate}}}

Based on this information:
1.  Predict the start and end dates for at least the next 5 menstrual periods.
2.  Predict the start and end dates for at least the next 5 fertile windows. A typical fertile window is about 6 days long, ending on the day of ovulation.
3.  Predict at least the next 5 ovulation dates. Ovulation usually occurs about 14 days before the start of the next period, but can vary.
4.  Return all dates in "YYYY-MM-DD" format.
5.  If the provided data is clearly insufficient for reliable prediction of 5 events (e.g., only one very old log), provide fewer predictions and explain in 'aiNote'. If no logs, state that in 'aiNote'.
6.  If predictions are made, 'aiNote' can be a brief comment on the prediction basis or confidence.

Ensure the output strictly follows the JSON schema.
`,
});

const predictCycleFlow = ai.defineFlow(
  {
    name: 'predictCycleFlow',
    inputSchema: PredictCycleInputSchema,
    outputSchema: PredictCycleOutputSchema,
  },
  async (input: PredictCycleInput) => {
    console.log("AI Flow: predictCycleFlow called with input:", JSON.stringify(input, null, 2));
    try {
      const {output, usage} = await predictCyclePrompt(input);
      console.log("AI Flow: Raw output from prompt:", JSON.stringify(output, null, 2));
      console.log("AI Flow: Usage:", JSON.stringify(usage, null, 2));

      if (!output) {
        console.error("AI Flow: Prediction output is null or undefined.");
        return {
          predictedPeriods: [],
          predictedFertileWindows: [],
          predictedOvulationDates: [],
          aiNote: 'AI model did not return a valid prediction structure.',
        };
      }
      
      // Basic validation of the output structure
      if (!Array.isArray(output.predictedPeriods) || !Array.isArray(output.predictedFertileWindows) || !Array.isArray(output.predictedOvulationDates)) {
        console.error("AI Flow: Prediction output arrays are missing or not arrays.");
        return {
          predictedPeriods: [],
          predictedFertileWindows: [],
          predictedOvulationDates: [],
          aiNote: 'AI model returned an invalid data structure for predictions.',
        };
      }
      
      // Ensure at least an empty note if AI doesn't provide one
      return {
        ...output,
        aiNote: output.aiNote || "Predictions generated."
      };

    } catch (error: any) {
      console.error('AI Flow: Error during AI prediction:', error);
      let errorMessage = 'An unexpected error occurred while generating predictions.';
      if (error.message) {
        errorMessage += ` Details: ${error.message}`;
      }
      if (error.cause && (error.cause as any).finishReason) {
         errorMessage += ` Finish Reason: ${(error.cause as any).finishReason}`;
      }
      if (error.details) {
        errorMessage += ` Additional Details: ${JSON.stringify(error.details)}`;
      }

      return {
        predictedPeriods: [],
        predictedFertileWindows: [],
        predictedOvulationDates: [],
        aiNote: errorMessage,
      };
    }
  }
);
