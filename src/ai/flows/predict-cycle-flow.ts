
// This AI flow has been removed as per user request to delete dashboard functionality.
// If this file causes build issues due to lingering imports, it can be deleted.

// Keeping a minimal valid structure to avoid immediate build errors from imports.
// However, this flow no longer serves any purpose.
'use server';

/**
 * @fileOverview This flow is intentionally left empty.
 * It was previously used for cycle prediction on the dashboard.
 */

export async function predictCycle(input: any): Promise<any> {
  console.warn("predictCycle flow is deprecated and should not be called.");
  return { error: "This feature has been removed." };
}

export type PredictCycleInput = {};
export type PredictCycleOutput = { error?: string };
