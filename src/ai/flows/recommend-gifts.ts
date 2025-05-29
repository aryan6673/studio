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
    .describe('A list of symptoms the user is experiencing.'),
  preferences:
    z.string().describe('The user\s preferences, including allergies and aversions'),
  productWebpageData: z
    .string()
    .describe('The data from a product webpage, containing product details.'),
});
export type RecommendGiftsInput = z.infer<typeof RecommendGiftsInputSchema>;

const RecommendGiftsOutputSchema = z.object({
  giftRecommendation: z.string().describe('A personalized gift recommendation.'),
  reasoning: z.string().describe('The reasoning behind the recommendation.'),
});
export type RecommendGiftsOutput = z.infer<typeof RecommendGiftsOutputSchema>;

export async function recommendGifts(input: RecommendGiftsInput): Promise<RecommendGiftsOutput> {
  return recommendGiftsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recommendGiftsPrompt',
  input: {schema: RecommendGiftsInputSchema},
  output: {schema: RecommendGiftsOutputSchema},
  prompt: `You are a personal gift recommendation assistant. Given the user's symptoms, preferences, and product webpage data, you will suggest a gift that would improve their comfort during their period. Extract the most relevant information from the product webpage to form your recommendation.

Symptoms: {{{symptoms}}}
Preferences: {{{preferences}}}
Product Webpage Data: {{{productWebpageData}}}

Recommendation:`,
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
