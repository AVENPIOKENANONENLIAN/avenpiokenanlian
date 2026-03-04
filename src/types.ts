export interface UserProfile {
  age: number;
  weight: number;
  activity_level: 'low' | 'moderate' | 'high';
  daily_target: number;
  reminder_enabled: boolean;
  reminder_interval: number;
}

export interface WaterLog {
  id: number;
  amount: number;
  timestamp: string;
}

export interface DailyStat {
  date: string;
  total: number;
}
