export interface Birthday {
  id: string;
  name: string;
  birthDate: string; // YYYY-MM-DD
  relationship?: 'Friend' | 'Family' | 'Partner' | 'Work' | 'Other';
  image?: string;
  emoji?: string;
  notes?: string;
  notificationEnabled: boolean;
  createdAt: number;
  reminders?: number[]; // custom reminder offsets (e.g. [0, 1, 3, 7])
}

export interface AppSettings {
  notificationTime: { hour: number; minute: number };
  theme: 'dark' | 'light';
  leapYearMode?: 'Feb28' | 'March1';
}

export interface CelebrationHistory {
  birthdayId: string;
  year: number;
  celebratedAt: string;
}

export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
  birthdayId: string;
  type: string; // today, tomorrow, etc.
}