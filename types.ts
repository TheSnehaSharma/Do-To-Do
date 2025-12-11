
export type Priority = 'High' | 'Medium' | 'Low';

export type Recurrence = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface LevelUpEvent {
  type: 'rank' | 'level';
  oldVal: string | number;
  newVal: string | number;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  scheduledStart?: string;
  scheduledEnd?: string;
  dueDate?: string; // Optional ISO Date string
}

export interface Routine {
  id: string;
  title: string;
  scheduleType: 'manual' | 'weekly';
  activeDays: number[]; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  isActive: boolean; // For manual mode
  suppressedDays?: number[]; // Days that were active but suppressed by another routine
}

export interface Task {
  id: string;
  title: string;
  note?: string;
  priority?: Priority; // Optional now
  dueDate?: string; // Optional ISO Date string
  scheduledStart?: string; // ISO for timeline
  scheduledEnd?: string; // ISO for timeline
  completed: boolean;
  completedAt?: string; // ISO Date string
  sectionId?: string; // Optional for General section
  alarmSet?: boolean;
  recurrence?: Recurrence;
  isRecurringSchedule?: boolean; // If true, the scheduledStart time is copied to next recurrence
  subtasks?: Subtask[];
  visibleFrom?: string; // ISO Date string - hide task until this date
  isRoutine?: boolean; // New flag for routine tasks
  routineId?: string; // Link to specific routine
}

export interface Section {
  id: string;
  title: string;
  color?: string; // New: Section color palette
}

export interface UserState {
  points: number;
  level: UserLevel;
  lastLogin: string; // ISO Date string
  isDarkMode: boolean; // Theme preference
  name?: string;
  email?: string;
  avatar?: string; // Stores the ID of the selected avatar
  isLoggedIn: boolean;
  // Settings
  isVacationMode?: boolean;
  soundEnabled?: boolean;
  notificationsEnabled?: boolean;
  alarmSound?: string; // 'chime', 'breeze', 'digital', 'arcade', 'retro'
  dailyGoal?: number; // 5, 10, 15, 20
  lastDailyGoalClaim?: string; // ISO Date string of last reward claim
  maxLevelReached?: number; // Tracks the highest numeric level achieved for unlocks
}

export enum UserLevel {
  Proactive = 'Proactive',         // > 1000
  Prepared = 'Prepared',           // 500 - 1000
  Punctual = 'Punctual',           // 0 - 500
  Postponer = 'Postponer',         // -500 - 0
  Procrastinator = 'Procrastinator' // < -500
}

export const THEME_COLORS = {
  [UserLevel.Proactive]: 'green',    // > 1000
  [UserLevel.Prepared]: 'lime',      // 500 - 1000
  [UserLevel.Punctual]: 'blue',      // 0 - 500
  [UserLevel.Postponer]: 'orange',     // -500 - 0
  [UserLevel.Procrastinator]: 'red', // < -500
};

export const PRIORITY_MULTIPLIERS = {
  'High': 3,
  'Medium': 2,
  'Low': 1
};
