
'use server';
/**
 * @fileOverview Gift recommendation AI agent.
 *
 * - recommendGifts - A function that handles the gift recommendation process.
 * - RecommendGiftsInput - The input type for the recommendGifts function.
 * - RecommendGiftsOutput - The return type for the recommendGifts function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RecommendGiftsInputSchema = z.object({
  symptoms: z
    .array(z.string())
    .describe('A list of symptoms the user is experiencing (e.g., cramps, fatigue, headache).'),
  preferences:
    z.string().describe('The user\'s preferences, including likes, dislikes, allergies, or aversions (e.g., "loves tea, dislikes strong scents, allergic to nuts").'),
});
export type RecommendGiftsInput = z.infer<typeof RecommendGiftsInputSchema>;

const RecommendGiftsOutputSchema = z.object({
  giftRecommendation: z.string().describe('A specific and thoughtful gift idea (e.g., "Aromatherapy Heat Pack for Cramps", "Subscription Box for Herbal Teas").'),
  reasoning: z.string().describe('The reasoning behind why this gift is suitable based on the provided symptoms and preferences.'),
});
export type RecommendGiftsOutput = z.infer<typeof RecommendGiftsOutputSchema>;

export async function recommendGifts(input: RecommendGiftsInput): Promise<RecommendGiftsOutput> {
  return recommendGiftsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recommendGiftsPrompt',
  input: {schema: RecommendGiftsInputSchema},
  output: {schema: RecommendGiftsOutputSchema},
  prompt: `You are a thoughtful and empathetic personal gift recommendation assistant.
Your goal is to suggest a specific gift idea that would genuinely improve a person's comfort or well-being during their menstrual period, based on their reported symptoms and preferences.

User's Symptoms:
{{#if symptoms.length}}
  {{#each symptoms}}
  - {{{this}}}
  {{/each}}
{{else}}
  No specific symptoms provided.
{{/if}}

User's Preferences: {{{preferences}}}

Based on these symptoms and preferences, please suggest a concrete gift idea.
Explain clearly why this gift would be suitable for someone experiencing these symptoms, considering their preferences.
For example, if they have cramps and like warmth, a high-quality heating pad could be a good suggestion. If they are fatigued and enjoy tea, a selection of energizing herbal teas might be appropriate.
Be specific in your recommendation.
`,
});

const recommendGiftsFlow = ai.defineFlow(
  {
    name: 'recommendGiftsFlow',
    inputSchema: RecommendGiftsInputSchema,
    outputSchema: RecommendGiftsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
