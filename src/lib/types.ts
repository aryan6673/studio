
export interface PeriodLog {
  id: string;
  startDate: Date;
  endDate?: Date;
  cycleLength?: number; // in days
  symptoms: string[]; // e.g., ["cramps", "headache"]
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  allergies: string[];
  foodPreferences: string[];
  timezone: string; // e.g., "America/New_York"
}

export interface Wallet {
  balance: number; // in credits or currency
}

export interface GiftProduct {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  webpageData?: string; // For AI to process
  price: number; // in credits or currency
}

export interface WellnessTip {
  id: string;
  title: string;
  content: string;
  category: string; // e.g., "Nutrition", "Exercise", "Mental Health"
}

export type SymptomOption = {
  id: string;
  label: string;
};

export const availableSymptoms: SymptomOption[] = [
  { id: 'cramps', label: 'Cramps' },
  { id: 'bloating', label: 'Bloating' },
  { id: 'headache', label: 'Headache' },
  { id: 'fatigue', label: 'Fatigue' },
  { id: 'mood_swings', label: 'Mood Swings' },
  { id: 'nausea', label: 'Nausea' },
  { id: 'backache', label: 'Backache' },
  { id: 'tender_breasts', label: 'Tender Breasts' },
  { id: 'acne', label: 'Acne' },
  { id: 'cravings', label: 'Cravings' },
];
