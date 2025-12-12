
import { UserLevel, THEME_COLORS, PRIORITY_MULTIPLIERS, Priority, Task } from './types';
import { differenceInDays } from 'date-fns';

const parseISO = (dateString: string) => new Date(dateString);
const startOfDay = (date: Date | number | string) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const subDays = (date: Date, amount: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() - amount);
    return d;
};

export const getUserLevel = (points: number): UserLevel => {
  if (points >= 1000) return UserLevel.Proactive;
  if (points >= 500) return UserLevel.Prepared;
  if (points >= 0) return UserLevel.Punctual;
  if (points >= -500) return UserLevel.Postponer;
  return UserLevel.Procrastinator;
};

export const getThemeColor = (level: UserLevel) => {
  return THEME_COLORS[level];
};

export const calculateCompletionPoints = (dueDateStr: string | undefined, priority: Priority = 'Low'): number => {
  const multiplier = PRIORITY_MULTIPLIERS[priority] || 1;
  const basePoints = 10 * multiplier;
  
  if (!dueDateStr) return basePoints;

  const now = new Date();
  const due = parseISO(dueDateStr);
  
  // differenceInDays returns negative if left date is before right date. 
  // We want (due - now). 
  // If due is today (0), early (>0), late (<0).
  const daysLeft = differenceInDays(startOfDay(due), startOfDay(now));
  
  // Rule: Multiplier * days left.
  if (daysLeft > 0) return (daysLeft * multiplier) * 2 + basePoints;
  if (daysLeft === 0) return basePoints;
  
  // Overdue: 1.5x points
  return basePoints * 1.5; 
};

export const calculateOverduePenalty = (dueDateStr?: string): number => {
  if (!dueDateStr) return 0;
  const now = startOfDay(new Date());
  const due = startOfDay(parseISO(dueDateStr));
  const daysOverdue = differenceInDays(now, due);
  
  if (daysOverdue > 0) {
    return daysOverdue; 
  }
  return 0;
};

export const getNumericLevel = (points: number) => {
    return Math.floor(Math.max(0, points) / 100);
};

export const calculateStreak = (tasks: Task[]): number => {
    const completedTasks = tasks.filter(t => t.completed && t.completedAt);
    const sortedDates = [...new Set(completedTasks.map(t => startOfDay(new Date(t.completedAt!)).toISOString()))].sort().reverse();
    
    const today = startOfDay(new Date());
    const yesterday = subDays(today, 1);
    
    let streak = 0;
    let currentDate = today;

    // If no task today, check yesterday to see if streak is still active
    if (!sortedDates.includes(today.toISOString())) {
        if (sortedDates.includes(yesterday.toISOString())) {
            currentDate = yesterday;
        } else {
            return 0; // Streak broken
        }
    }

    // Count backwards
    if (sortedDates.includes(currentDate.toISOString())) {
        streak = 1;
        let checkDate = subDays(currentDate, 1);
        while (sortedDates.includes(checkDate.toISOString())) {
            streak++;
            checkDate = subDays(checkDate, 1);
        }
    }
    return streak;
};

export const getShareText = (level: UserLevel, numericLevel: number) => {
  const appLink = "https://dotodo.app";
  switch (level) {
    case UserLevel.Proactive:
      return `I'm mastering my time with DoToDo! 🚀 Level ${numericLevel} and climbing. Can you beat my streak? Join here: ${appLink}`;
    case UserLevel.Prepared:
      return `Consistency feels good. 🛡️ Reached Level ${numericLevel} on DoToDo. Start your journey: ${appLink}`;
    case UserLevel.Punctual:
      return `Building better habits every day. ⏰ Just hit Level ${numericLevel} on DoToDo. Join me: ${appLink}`;
    case UserLevel.Postponer:
      return `Getting back on track! 💪 Level ${numericLevel} on DoToDo. It's time to focus. Join me: ${appLink}`;
    case UserLevel.Procrastinator:
      return `Turning over a new leaf. 🔥 Level ${numericLevel} on DoToDo. Let's do this together: ${appLink}`;
    default:
      return `Check out my progress on DoToDo! Level ${numericLevel}. Join here: ${appLink}`;
  }
};

// Detailed 15 Characters with Diverse Emotions - Sanitized for reliability
// Using strictly valid 'mouth' variants for Lorelei: happy01-18, sad01-03
export const AVATARS = [
    // --- Level 0: Starter Pack (5) ---
    { 
        id: 'basic-1', 
        // Male Asian: Neutral/Calm (Black Hair -> Blue Background)
        src: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Liam&backgroundColor=transparent&skinColor=f5d0b0&hairColor=1a1a1a&beardProbability=0&glassesProbability=0&mouth=happy01', 
        label: 'Liam', 
        unlockLevel: 0, 
        bg: 'bg-gradient-to-br from-blue-600 to-blue-900' 
    },
    { 
        id: 'basic-2', 
        // Female European: Soft Smile (Blonde Hair -> Violet Background)
        src: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Sophie&backgroundColor=transparent&skinColor=ffe6cf&hairColor=f2d3a3&frecklesProbability=100&glassesProbability=0&mouth=happy02', 
        label: 'Sophie', 
        unlockLevel: 0, 
        bg: 'bg-gradient-to-br from-violet-600 to-violet-900' 
    },
    { 
        id: 'basic-3', 
        // Male Indian: Thoughtful (Dark Hair/Skin -> Sky/Cyan Background)
        src: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Arjun&backgroundColor=transparent&skinColor=a67c52&hairColor=2c1b18&beardProbability=100&glassesProbability=100&mouth=sad01', 
        label: 'Arjun', 
        unlockLevel: 0, 
        bg: 'bg-gradient-to-br from-sky-600 to-sky-900' 
    },
    { 
        id: 'basic-4', 
        // Female American: Excited (Brown/Red Hair -> Emerald Background)
        src: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Emma&backgroundColor=transparent&skinColor=e0a366&hairColor=4a312c&frecklesProbability=50&hairAccessoriesProbability=100&mouth=happy08', 
        label: 'Emma', 
        unlockLevel: 0, 
        bg: 'bg-gradient-to-br from-emerald-600 to-emerald-900' 
    },
    { 
        id: 'basic-5', 
        // Male British: Smirk/Cool (Red Hair -> Teal Background)
        src: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Oliver&backgroundColor=transparent&skinColor=ffe6cf&hairColor=c93305&beardProbability=100&glassesProbability=100&mouth=happy13', 
        label: 'Oliver', 
        unlockLevel: 0, 
        bg: 'bg-gradient-to-br from-teal-600 to-teal-900' 
    },

    // --- Unlockables (Levels 1-10) ---
    { 
        id: 'level-1', 
        // Female Asian: Shy/Gentle (Black Hair -> Fuchsia Background)
        src: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Yuki&backgroundColor=transparent&skinColor=f5d0b0&hairColor=1a1a1a&glassesProbability=100&accessoriesProbability=0&mouth=happy04', 
        label: 'Yuki', 
        unlockLevel: 1, 
        bg: 'bg-gradient-to-br from-fuchsia-600 to-fuchsia-900' 
    },
    { 
        id: 'level-2', 
        // Male European: Serious (Brown Hair -> Cyan Background)
        src: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Leo&backgroundColor=transparent&skinColor=ffe6cf&hairColor=8d5b38&beardProbability=100&earringsProbability=100&mouth=sad02', 
        label: 'Leo', 
        unlockLevel: 2, 
        bg: 'bg-gradient-to-br from-cyan-600 to-cyan-900' 
    },
    { 
        id: 'level-3', 
        // Female Indian: Warm/Friendly (Black Hair -> Rose Background)
        src: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Priya&backgroundColor=transparent&skinColor=8c5a2b&hairColor=1a1a1a&hairAccessoriesProbability=100&mouth=happy05', 
        label: 'Priya', 
        unlockLevel: 3, 
        bg: 'bg-gradient-to-br from-rose-600 to-rose-900' 
    },
    { 
        id: 'level-4', 
        // Male American: Stylish (Brown Hair -> Indigo Background)
        src: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Mason&backgroundColor=transparent&skinColor=ffe6cf&hairColor=4a312c&beardProbability=0&glassesProbability=100&mouth=happy13', 
        label: 'Mason', 
        unlockLevel: 4, 
        bg: 'bg-gradient-to-br from-indigo-600 to-indigo-900' 
    },
    { 
        id: 'level-5', 
        // Female British: Playful (Red Hair -> Green Background)
        src: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Zara&backgroundColor=transparent&skinColor=ffe6cf&hairColor=c93305&glassesProbability=100&hairAccessoriesProbability=100&mouth=happy16', 
        label: 'Zara', 
        unlockLevel: 5, 
        bg: 'bg-gradient-to-br from-green-600 to-green-900' 
    },
    { 
        id: 'level-6', 
        // Male Asian: Chill (Black Hair -> Orange Background)
        src: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Kenji&backgroundColor=transparent&skinColor=f5d0b0&hairColor=1a1a1a&beardProbability=100&earringsProbability=100&mouth=happy09', 
        label: 'Kenji', 
        unlockLevel: 6, 
        bg: 'bg-gradient-to-br from-orange-600 to-orange-900' 
    },
    { 
        id: 'level-7', 
        // Female European: Surprised (White Hair -> Red Background for contrast)
        src: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Elsa&backgroundColor=transparent&skinColor=ffe6cf&hairColor=e8e8e8&mouth=happy03', 
        label: 'Elsa', 
        unlockLevel: 7, 
        bg: 'bg-gradient-to-br from-red-600 to-red-900' 
    },
    { 
        id: 'level-8', 
        // Male Indian: Focused (Black Hair -> Amber Background)
        src: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Rohan&backgroundColor=transparent&skinColor=a67c52&hairColor=1a1a1a&beardProbability=100&glassesProbability=100&mouth=sad03', 
        label: 'Rohan', 
        unlockLevel: 8, 
        bg: 'bg-gradient-to-br from-amber-600 to-amber-900' 
    },
    { 
        id: 'level-9', 
        // Female American: Cheerful (Black Hair -> Pink Background)
        src: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Maya&backgroundColor=transparent&skinColor=8c5a2b&hairColor=1a1a1a&frecklesProbability=100&hairAccessoriesProbability=0&mouth=happy10', 
        label: 'Maya', 
        unlockLevel: 9, 
        bg: 'bg-gradient-to-br from-pink-600 to-pink-900' 
    },
    { 
        id: 'level-10', 
        // Female Mixed: Radiant (Brown Hair -> Purple Background)
        src: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Aiko&backgroundColor=transparent&skinColor=e0a366&hairColor=6c4234&glassesProbability=100&hairAccessoriesProbability=100&frecklesProbability=50&mouth=happy14', 
        label: 'Aiko', 
        unlockLevel: 10, 
        bg: 'bg-gradient-to-br from-purple-600 to-purple-900' 
    },
];

export const getAvatar = (id?: string) => {
    return AVATARS.find(a => a.id === id) || AVATARS[0];
};

export const ALARM_SOUNDS = [
    { id: 'chime', label: 'Chime' },
    { id: 'breeze', label: 'Breeze' },
    { id: 'digital', label: 'Digital' },
    { id: 'arcade', label: 'Arcade' },
    { id: 'retro', label: 'Retro' },
];

export const playSound = (soundType: string = 'chime', durationSec: number = 0.5) => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      const now = ctx.currentTime;
      const stopTime = now + durationSec;

      switch (soundType) {
          case 'breeze':
              osc.type = 'triangle';
              osc.frequency.setValueAtTime(300, now);
              osc.frequency.linearRampToValueAtTime(600, now + (durationSec * 0.6));
              gain.gain.setValueAtTime(0, now);
              gain.gain.linearRampToValueAtTime(0.2, now + (durationSec * 0.3));
              gain.gain.linearRampToValueAtTime(0, stopTime);
              break;
          case 'digital':
              osc.type = 'square';
              // Repeater effect
              for(let i = 0; i < durationSec * 3; i+= 0.3){
                  osc.frequency.setValueAtTime(800, now + i);
                  osc.frequency.setValueAtTime(0, now + i + 0.1);
                  osc.frequency.setValueAtTime(800, now + i + 0.2);
              }
              gain.gain.setValueAtTime(0.05, now);
              gain.gain.setValueAtTime(0, stopTime);
              break;
          case 'arcade':
              osc.type = 'sawtooth';
              osc.frequency.setValueAtTime(220, now);
              osc.frequency.exponentialRampToValueAtTime(880, stopTime);
              gain.gain.setValueAtTime(0.05, now);
              gain.gain.exponentialRampToValueAtTime(0.01, stopTime);
              break;
          case 'retro':
              osc.type = 'square';
              osc.frequency.setValueAtTime(440, now);
              if (durationSec > 0.3) {
                  osc.frequency.setValueAtTime(554, now + (durationSec * 0.25)); // C#
                  osc.frequency.setValueAtTime(659, now + (durationSec * 0.5)); // E
              }
              gain.gain.setValueAtTime(0.05, now);
              gain.gain.linearRampToValueAtTime(0, stopTime);
              break;
          case 'chime':
          default:
              osc.type = 'sine';
              osc.frequency.setValueAtTime(523.25, now); // C5
              osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
              gain.gain.setValueAtTime(0.1, now);
              gain.gain.exponentialRampToValueAtTime(0.01, stopTime);
              break;
      }
      
      osc.start();
      osc.stop(stopTime);

    } catch (e) {
        console.error("Audio play failed", e);
    }
};
