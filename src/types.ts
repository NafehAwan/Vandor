export interface UserProfile {
  uid?: string;
  name: string;
  email: string;
  avatar: string;
  provider: 'google' | 'email' | 'guest';
}

export interface DayCostBreakdown {
  stay: number;
  food: number;
  activities: number;
  transit: number;
}

export interface ItineraryDay {
  dayNumber: number;
  dayTitle: string;
  totalDayCostUSD: number;
  breakdown: DayCostBreakdown;
  highlights: string[];
}

export interface ItineraryResult {
  id?: string;
  destination: string;
  durationDays: number;
  totalCostUSD: number;
  currency: string;
  categoryBreakdown: DayCostBreakdown;
  days: ItineraryDay[];
  createdDate: string;
}
