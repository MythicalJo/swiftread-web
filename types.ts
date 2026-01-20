
export interface Book {
  id: string;
  title: string;
  author: string;
  content: string[];
  progress: number;
  type: 'pdf' | 'epub' | 'text';
  addedAt: number;
  lastOpenedAt?: number;
  cover?: string; // Base64 thumbnail
  hasBeenFinished?: boolean;
}

export interface ReaderSettings {
  wpm: number;
  wpmStep: number;
  showContext: boolean;
  fontSize: number;
  theme: 'light' | 'dark' | 'sepia';
  orpColor: string;
  orpOpacity: number;
  contextOpacity: number;
  contextFontSize: number;
  sentencePause: number; // ms
  paragraphPause: number; // ms
  autoHideControls: boolean;
  hideDelay: number; // seconds
  rewindAmount: number; // number of words
  wps: number;
  showClock: boolean;
  showBattery: boolean;
  use24HourClock: boolean;
  language: 'en' | 'es';
}

export interface Category {
  id: string;
  name: string;
  bookIds: string[];
}

export interface DailyStats {
  date: string; // YYYY-MM-DD
  wordsRead: number;
  secondsRead: number;
  avgWpm: number;
  completedBooks: string[]; // IDs of books completed on this day
}
