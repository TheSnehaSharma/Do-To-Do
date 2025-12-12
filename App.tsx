
import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense, lazy } from 'react';
import { Task, Section, UserState, UserLevel, Subtask, Recurrence, PRIORITY_MULTIPLIERS, Routine, Routine as RoutineType, LevelUpEvent } from './types';
import { calculateCompletionPoints, calculateOverduePenalty, getUserLevel, getThemeColor, AVATARS, getAvatar, getNumericLevel, playSound, calculateStreak } from './utils';
import { TaskBoard } from './components/TaskBoard';
import { CalendarView } from './components/CalendarView';
import { ListView } from './components/ListView';
import { DashboardView } from './components/DashboardView';
import { RoutinesView } from './components/RoutinesView';
import { Sidebar } from './components/Sidebar';
import { IntroAnimation } from './components/IntroAnimation';
import { Plus, LayoutGrid, Calendar as CalendarIcon, UserCircle, Sun, Moon, List as ListIcon, Menu, CheckSquare, Undo, Search, Filter, X, ArrowUpDown, ChevronRight, Check, Flame, Flag, AlertCircle } from 'lucide-react';
import { format, differenceInDays, areIntervalsOverlapping, isSameDay, addHours, addDays, addWeeks, addMonths, addYears, isAfter, isBefore, differenceInMinutes, addMinutes, isPast, isToday, isFuture } from 'date-fns';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

// Lazy Load Modals to reduce initial bundle burden
const TaskModal = lazy(() => import('./components/TaskModal').then(m => ({ default: m.TaskModal })));
const AccountModal = lazy(() => import('./components/AccountModal').then(m => ({ default: m.AccountModal })));
const ProfileCardModal = lazy(() => import('./components/ProfileCardModal').then(m => ({ default: m.ProfileCardModal })));
const AlarmOverlay = lazy(() => import('./components/AlarmOverlay').then(m => ({ default: m.AlarmOverlay })));
const LevelUpOverlay = lazy(() => import('./components/LevelUpOverlay').then(m => ({ default: m.LevelUpOverlay })));

// Helpers to replace missing/problematic date-fns exports
const parseISO = (str: string) => new Date(str);
const startOfDay = (d: Date | string | number) => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
};
const startOfMonth = (d: Date | string | number) => {
  const date = new Date(d);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
};

// Initial Data
const INITIAL_SECTIONS: Section[] = [
  { id: 'sec-1', title: 'Work', color: 'blue' },
  { id: 'sec-2', title: 'Personal', color: 'green' },
  { id: 'sec-3', title: 'Groceries', color: 'orange' },
];

const INITIAL_USER: UserState = {
  points: 0,
  level: UserLevel.Punctual,
  lastLogin: new Date().toISOString(),
  isDarkMode: false,
  isLoggedIn: false,
  isVacationMode: false,
  soundEnabled: true,
  notificationsEnabled: true,
  alarmSound: 'chime',
  dailyGoal: 5,
  lastDailyGoalClaim: '',
  maxLevelReached: 0
};

const INITIAL_ROUTINES: Routine[] = [
    { id: 'default-routine', title: 'Daily Routine', scheduleType: 'manual', activeDays: [], isActive: true }
];

const App: React.FC = () => {
  // Data State
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem('karma_tasks');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to parse tasks", e);
      return [];
    }
  });
  
  const [sections, setSections] = useState<Section[]>(() => {
    try {
      const saved = localStorage.getItem('karma_sections');
      const parsed = saved ? JSON.parse(saved) : INITIAL_SECTIONS;
      return Array.isArray(parsed) ? parsed : INITIAL_SECTIONS;
    } catch (e) {
      console.error("Failed to parse sections", e);
      return INITIAL_SECTIONS;
    }
  });

  const [routines, setRoutines] = useState<Routine[]>(() => {
    try {
        const saved = localStorage.getItem('karma_routines');
        return saved ? JSON.parse(saved) : INITIAL_ROUTINES;
    } catch (e) {
        return INITIAL_ROUTINES;
    }
  });

  const [user, setUser] = useState<UserState>(() => {
    try {
      const saved = localStorage.getItem('karma_user');
      const parsed = saved ? JSON.parse(saved) : INITIAL_USER;
      // Migration: Ensure maxLevelReached exists
      if (parsed.maxLevelReached === undefined) {
          parsed.maxLevelReached = getNumericLevel(parsed.points);
      }
      return parsed;
    } catch (e) {
      console.error("Failed to parse user", e);
      return INITIAL_USER;
    }
  });

  // UI State
  const [activePage, setActivePage] = useState('tasks');
  const [taskViewMode, setTaskViewMode] = useState<'board' | 'list'>('board');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isProfileCardOpen, setIsProfileCardOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  
  // Alarm State
  const [activeAlarm, setActiveAlarm] = useState<Task | null>(null);

  // Filter & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [tempSearchInput, setTempSearchInput] = useState('');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'section'>('date');
  const [filterPriorities, setFilterPriorities] = useState<string[]>([]);
  const [filterSections, setFilterSections] = useState<string[]>([]);
  const [filterDates, setFilterDates] = useState<string[]>([]);

  // Temp Filter State (for Menu)
  const [activeFilterCategory, setActiveFilterCategory] = useState<'sort' | 'priority' | 'section' | 'date'>('sort');
  const [tempSortBy, setTempSortBy] = useState<'date' | 'priority' | 'section'>('date');
  const [tempFilterPriorities, setTempFilterPriorities] = useState<string[]>([]);
  const [tempFilterSections, setTempFilterSections] = useState<string[]>([]);
  const [tempFilterDates, setTempFilterDates] = useState<string[]>([]);

  // Undo / Pending / Toast State
  const [pendingCompletionIds, setPendingCompletionIds] = useState<Set<string>>(new Set());
  const undoTimersRef = useRef<{ [key: string]: number }>({});
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string, action?: () => void } | null>(null);

  // Animation States
  const [showIntro, setShowIntro] = useState(true);
  const [levelUpQueue, setLevelUpQueue] = useState<LevelUpEvent[]>([]);
  const [currentLevelUp, setCurrentLevelUp] = useState<LevelUpEvent | null>(null);
  
  // Refs
  const prevRankRef = useRef(user.level);
  const prevNumericLevelRef = useRef(getNumericLevel(user.points));

  // Determine if any modal is open for blurring
  const isAnyModalOpen = isModalOpen || isAccountOpen || isProfileCardOpen || !!activeAlarm;

  // Persistence
  useEffect(() => { localStorage.setItem('karma_tasks', JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem('karma_sections', JSON.stringify(sections)); }, [sections]);
  useEffect(() => { localStorage.setItem('karma_user', JSON.stringify(user)); }, [user]);
  useEffect(() => { localStorage.setItem('karma_routines', JSON.stringify(routines)); }, [routines]);

  // Intro Animation Timer logic is now handled by the component's onComplete prop

  // Filter Menu Open Initialization
  useEffect(() => {
      if (isFilterExpanded) {
          setTempSortBy(sortBy);
          setTempFilterPriorities(filterPriorities);
          setTempFilterSections(filterSections);
          setTempFilterDates(filterDates);
          setActiveFilterCategory('sort');
      }
  }, [isFilterExpanded, sortBy, filterPriorities, filterSections, filterDates]);

  // Toast Timer
  useEffect(() => {
      if (toast) {
          const timer = setTimeout(() => setToast(null), 5000);
          return () => clearTimeout(timer);
      }
  }, [toast]);

  // Level & Rank Up Detection Logic
  useEffect(() => {
    const currentNumeric = getNumericLevel(user.points);
    const currentRank = user.level;
    const newEvents: LevelUpEvent[] = [];

    if (currentRank !== prevRankRef.current) {
        // Only trigger rank up event if we are moving UP tiers (simple check via points)
        // or just rely on change detection. Since level can drop, we might want to only show celebration on promotion.
        // For simplicity, we show whenever the Enum changes and points > previous (promotion)
        if (user.points > (prevNumericLevelRef.current * 100)) { 
             newEvents.push({ type: 'rank', oldVal: prevRankRef.current, newVal: currentRank });
        }
        prevRankRef.current = currentRank;
    }

    if (currentNumeric > prevNumericLevelRef.current) {
        newEvents.push({ type: 'level', oldVal: prevNumericLevelRef.current, newVal: currentNumeric });
        prevNumericLevelRef.current = currentNumeric;
    } else if (currentNumeric < prevNumericLevelRef.current) {
        prevNumericLevelRef.current = currentNumeric;
    }

    if (newEvents.length > 0) {
        setLevelUpQueue(prev => [...prev, ...newEvents]);
    }
  }, [user.points, user.level]);

  useEffect(() => {
    if (!currentLevelUp && levelUpQueue.length > 0) {
        const next = levelUpQueue[0];
        setCurrentLevelUp(next);
        setLevelUpQueue(prev => prev.slice(1));
    }
  }, [currentLevelUp, levelUpQueue]);

  useEffect(() => {
    if (routines.length > 0) {
        const defaultId = routines[0].id;
        let hasChanges = false;
        const migratedTasks = tasks.map(t => {
            if (t.isRoutine && !t.routineId) {
                hasChanges = true;
                return { ...t, routineId: defaultId };
            }
            return t;
        });
        if (hasChanges) {
            setTasks(migratedTasks);
        }
    }
  }, [routines]);

  // Theme
  const themeColor = useMemo(() => getThemeColor(user.level), [user.level]);
  const isDark = user.isDarkMode;

  useEffect(() => {
    if (user.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [user.isDarkMode]);

  // --- OPTIMIZED ALARM LOGIC ---
  const lastCheckedMinuteRef = useRef<string>('');
  const alarmDataRef = useRef({ tasks, routines, user, activeAlarm }); // Access latest state without re-effecting

  // Update ref when dependencies change
  useEffect(() => {
      alarmDataRef.current = { tasks, routines, user, activeAlarm };
  }, [tasks, routines, user, activeAlarm]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }

    const checkAlarms = () => {
      const { tasks, routines, user, activeAlarm } = alarmDataRef.current;
      
      const now = new Date();
      const dayIndex = now.getDay();
      const currentH = now.getHours();
      const currentM = now.getMinutes();
      const timeKey = `${dayIndex}-${currentH}:${currentM}`;

      if (lastCheckedMinuteRef.current === timeKey) return;
      
      const activeRoutineIds = routines
        .filter(r => r.isActive && r.activeDays.includes(dayIndex))
        .map(r => r.id);

      const alarms = tasks.filter(t => {
        if (!t.alarmSet || !t.scheduledStart || t.completed) return false;
        const taskDate = parseISO(t.scheduledStart);
        if (taskDate.getHours() !== currentH || taskDate.getMinutes() !== currentM) return false;

        if (t.isRoutine) {
             return t.routineId && activeRoutineIds.includes(t.routineId);
        } else {
             return isSameDay(taskDate, now);
        }
      });

      if (alarms.length > 0) {
        lastCheckedMinuteRef.current = timeKey;
        if (!activeAlarm) {
            setActiveAlarm(alarms[0]);
        }
        alarms.forEach(task => {
           if (user.notificationsEnabled !== false) {
             const label = task.isRoutine ? "Routine Reminder" : "Task Reminder";
             if ('Notification' in window && Notification.permission === 'granted') {
               new Notification(`⏰ ${label}: ${task.title}`, {
                 body: `It's time for: ${task.title}`,
               });
             }
           }
        });
      }
    };

    const intervalId = setInterval(checkAlarms, 5000); 
    return () => clearInterval(intervalId);
  }, []); 
  // --- END ALARM LOGIC ---

  // Daily Penalty Check & Auto-Reschedule logic
  useEffect(() => {
    const checkPenalties = () => {
      const now = startOfDay(new Date());
      const lastCheck = startOfDay(parseISO(user.lastLogin));
      
      if (isAfter(now, lastCheck)) {
        if (user.isVacationMode) {
             setUser(prev => ({ ...prev, lastLogin: new Date().toISOString() }));
             return;
        }

        let totalPenalty = 0;
        let penaltyMessages: string[] = [];
        let updatedTasks = [...tasks];
        let hasTaskUpdates = false;

        updatedTasks = updatedTasks.map(task => {
          if (task.isRoutine) return task; 
          if (task.completed || !task.dueDate) return task;

          const due = startOfDay(parseISO(task.dueDate));
          if (isBefore(due, now)) {
             if (task.recurrence) {
                let currentDue = due;
                let currentStart = task.scheduledStart ? parseISO(task.scheduledStart) : null;
                let currentEnd = task.scheduledEnd ? parseISO(task.scheduledEnd) : null;
                let missCount = 0;

                while (isBefore(currentDue, now)) {
                    missCount++;
                    switch (task.recurrence) {
                        case 'daily': currentDue = addDays(currentDue, 1); if (currentStart) currentStart = addDays(currentStart, 1); if (currentEnd) currentEnd = addDays(currentEnd, 1); break;
                        case 'weekly': currentDue = addWeeks(currentDue, 1); if (currentStart) currentStart = addWeeks(currentStart, 1); if (currentEnd) currentEnd = addWeeks(currentEnd, 1); break;
                        case 'monthly': currentDue = addMonths(currentDue, 1); if (currentStart) currentStart = addMonths(currentStart, 1); if (currentEnd) currentEnd = addMonths(currentEnd, 1); break;
                        case 'yearly': currentDue = addYears(currentDue, 1); if (currentStart) currentStart = addYears(currentStart, 1); if (currentEnd) currentEnd = addYears(currentEnd, 1); break;
                    }
                }

                if (missCount > 0) {
                    const multiplier = PRIORITY_MULTIPLIERS[task.priority || 'Low'];
                    const penalty = 5 * multiplier * missCount;
                    totalPenalty += penalty;
                    penaltyMessages.push(`Missed ${missCount} ${task.recurrence} cycle(s) of "${task.title}" (-${penalty} pts)`);
                    hasTaskUpdates = true;

                    let visibleFromDate: Date;
                    if (task.recurrence === 'monthly' || task.recurrence === 'yearly') {
                        visibleFromDate = startOfMonth(currentDue);
                    } else {
                        visibleFromDate = startOfDay(currentDue);
                    }

                    return {
                        ...task,
                        dueDate: currentDue.toISOString(),
                        scheduledStart: currentStart?.toISOString(),
                        scheduledEnd: currentEnd?.toISOString(),
                        visibleFrom: visibleFromDate.toISOString()
                    };
                }

             } else {
                const diffDays = differenceInDays(now, lastCheck); 
                const dailyPenalty = diffDays; 
                totalPenalty += dailyPenalty;
             }
          }
          return task;
        });

        if (totalPenalty > 0 || hasTaskUpdates) {
          let newPoints = user.points - totalPenalty;
          
          // Reset check logic
          if (newPoints < -5000) {
              newPoints = 0;
              setToast({ type: 'error', message: "Points dropped below -5000. Reset to 0." });
          }

          setUser(prev => ({
            ...prev,
            points: newPoints,
            level: getUserLevel(newPoints),
            lastLogin: new Date().toISOString()
          }));
          
          if (hasTaskUpdates) {
              setTasks(updatedTasks);
          } else {
             setUser(prev => ({ ...prev, lastLogin: new Date().toISOString() }));
          }

          if (totalPenalty > 0 && newPoints !== 0) { // Only show penalty toast if not reset
             const msg = penaltyMessages.length > 0 ? penaltyMessages.join('\n') : `You lost ${totalPenalty} points for overdue tasks.`;
             setToast({ type: 'error', message: msg });
          }
        } else {
           setUser(prev => ({ ...prev, lastLogin: new Date().toISOString() }));
        }
      }
    };
    checkPenalties();
  }, [tasks, user.lastLogin, user.points, user.isVacationMode]); 

  // Handlers - Wrapped in useCallback for performance
  const showError = useCallback((msg: string) => {
      setToast({ type: 'error', message: msg });
  }, []);

  const handleSaveTask = useCallback((taskData: Partial<Task>) => {
    try {
        if (!taskData.title?.trim()) {
            throw new Error("Task title is required");
        }
        if (editingTask) {
          setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...taskData } as Task : t));
        } else {
          const newTask: Task = {
            id: crypto.randomUUID(),
            title: taskData.title!,
            note: taskData.note,
            priority: taskData.priority,
            dueDate: taskData.dueDate,
            scheduledStart: taskData.scheduledStart,
            scheduledEnd: taskData.scheduledEnd,
            alarmSet: taskData.alarmSet,
            completed: false,
            sectionId: taskData.sectionId,
            recurrence: taskData.recurrence,
            subtasks: taskData.subtasks || [],
            isRoutine: taskData.isRoutine || false,
            routineId: taskData.routineId
          };
          setTasks(prev => [...prev, newTask]);
        }
        setEditingTask(undefined);
    } catch (err: any) {
        showError(err.message || "Failed to save task");
    }
  }, [editingTask, showError]);

  const handleDeleteTask = useCallback((id: string) => {
    try {
        setTasks(prev => prev.filter(t => t.id !== id));
    } catch (e) { showError("Failed to delete task"); }
  }, [showError]);

  const handleUpdateTask = useCallback((updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  }, []);

  const commitCompleteTask = useCallback((id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    let pointsEarned = calculateCompletionPoints(task.dueDate, task.priority);
    const now = new Date();
    
    // Calculate streak before completion
    const oldStreak = calculateStreak(tasks);
    
    // Daily Goal Bonus Check
    const completedTodayCount = tasks.filter(t => t.completed && t.completedAt && isSameDay(parseISO(t.completedAt), now)).length + 1;
    let bonusPoints = 0;
    const dailyGoal = user.dailyGoal || 5;
    const hasClaimedToday = user.lastDailyGoalClaim && isSameDay(parseISO(user.lastDailyGoalClaim), now);

    if (completedTodayCount >= dailyGoal && !hasClaimedToday) {
        bonusPoints = 10;
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        setToast({ type: 'success', message: "🎉 Daily Goal Reached! (+10 pts)" });
    }
    
    // Prepare temporary tasks list for new streak calc
    const tempTasks = tasks.map(t => t.id === id ? { ...t, completed: true, completedAt: now.toISOString() } : t);
    const newStreak = calculateStreak(tempTasks);
    
    let streakBonus = 0;
    if (newStreak > oldStreak) {
        streakBonus = 5;
        setToast({ type: 'success', message: `🔥 Streak Increased to ${newStreak}! (+5 pts)` });
    }
    
    const newPoints = user.points + pointsEarned + bonusPoints + streakBonus;
    const newNumericLevel = getNumericLevel(newPoints);
    
    setUser(prev => ({
      ...prev,
      points: newPoints,
      level: getUserLevel(newPoints),
      lastDailyGoalClaim: bonusPoints > 0 ? new Date().toISOString() : prev.lastDailyGoalClaim,
      maxLevelReached: Math.max(prev.maxLevelReached || 0, newNumericLevel)
    }));

    // Handle Recurrence
    let nextTask: Task | undefined;
    if (task.recurrence && task.dueDate) {
        const currentDue = parseISO(task.dueDate);
        let nextDueDate: Date;
        switch (task.recurrence) {
            case 'daily': nextDueDate = addDays(currentDue, 1); break;
            case 'weekly': nextDueDate = addWeeks(currentDue, 1); break;
            case 'monthly': nextDueDate = addMonths(currentDue, 1); break;
            case 'yearly': nextDueDate = addYears(currentDue, 1); break;
            default: nextDueDate = addDays(currentDue, 1);
        }

        let visibleFromDate: Date;
        if (task.recurrence === 'monthly' || task.recurrence === 'yearly') {
            visibleFromDate = startOfMonth(nextDueDate);
        } else {
            visibleFromDate = startOfDay(nextDueDate);
        }
        
        let nextStart: string | undefined = undefined;
        let nextEnd: string | undefined = undefined;
        let nextAlarmSet = false;

        if (task.scheduledStart && task.isRecurringSchedule) {
            const prevStart = parseISO(task.scheduledStart);
            const durationMins = task.scheduledEnd ? differenceInMinutes(parseISO(task.scheduledEnd), prevStart) : 60;
            let newStartDate: Date;
             switch (task.recurrence) {
                case 'daily': newStartDate = addDays(prevStart, 1); break;
                case 'weekly': newStartDate = addWeeks(prevStart, 1); break;
                case 'monthly': newStartDate = addMonths(prevStart, 1); break;
                case 'yearly': newStartDate = addYears(prevStart, 1); break;
                default: newStartDate = addDays(prevStart, 1);
            }
            nextStart = newStartDate.toISOString();
            nextEnd = addMinutes(newStartDate, durationMins).toISOString();
            nextAlarmSet = true;
        }

        nextTask = {
            ...task,
            id: crypto.randomUUID(),
            dueDate: nextDueDate.toISOString(),
            scheduledStart: nextStart, 
            scheduledEnd: nextEnd,
            completed: false,
            completedAt: undefined,
            subtasks: task.subtasks?.map(s => ({...s, completed: false, scheduledStart: undefined, scheduledEnd: undefined})) || [],
            visibleFrom: visibleFromDate.toISOString(),
            alarmSet: nextAlarmSet
        };
    }

    setTasks(prev => {
        const updated = prev.map(t => {
            if (t.id === id) {
                return { ...t, completed: true, completedAt: new Date().toISOString(), subtasks: t.subtasks?.map(sub => ({ ...sub, completed: true })) };
            }
            return t;
        });
        if (nextTask) return [...updated, nextTask];
        return updated;
    });
  }, [tasks, user]);

  const handleUndo = useCallback(() => {
    const taskIds = Object.keys(undoTimersRef.current);
    if (taskIds.length === 0) return;
    const lastTaskId = taskIds[taskIds.length - 1]; 
    clearTimeout(undoTimersRef.current[lastTaskId]);
    delete undoTimersRef.current[lastTaskId];
    setPendingCompletionIds(prev => {
        const next = new Set(prev);
        next.delete(lastTaskId);
        return next;
    });
    if (Object.keys(undoTimersRef.current).length === 0) setToast(null);
  }, []);

  const handleQueueComplete = useCallback((taskId: string) => {
    setPendingCompletionIds(prev => { const next = new Set(prev); next.add(taskId); return next; });
    setToast({ type: 'success', message: 'Task completed', action: handleUndo });

    const timerId = setTimeout(() => {
        commitCompleteTask(taskId);
        setPendingCompletionIds(prev => { const next = new Set(prev); next.delete(taskId); return next; });
        delete undoTimersRef.current[taskId];
        if (Object.keys(undoTimersRef.current).length === 0) setToast(null);
    }, 5000) as unknown as number;

    undoTimersRef.current[taskId] = timerId;
  }, [commitCompleteTask, handleUndo]);

  // ... (Rest of existing handlers same as before)
  const handleSubtaskComplete = useCallback((taskId: string, subtaskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return { ...t, subtasks: t.subtasks?.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s) };
      }
      return t;
    }));
  }, []);

  const handleSubtaskDelete = useCallback((taskId: string, subtaskId: string) => {
    setTasks(prev => prev.map(t => {
        if (t.id === taskId) {
            return { ...t, subtasks: t.subtasks?.filter(s => s.id !== subtaskId) };
        }
        return t;
    }));
  }, []);

  const handleSubtaskUpdate = useCallback((taskId: string, subtaskId: string, updates: Partial<Subtask>) => {
     setTasks(prev => prev.map(t => {
        if (t.id === taskId) {
            return { ...t, subtasks: t.subtasks?.map(s => s.id === subtaskId ? { ...s, ...updates } : s) };
        }
        return t;
    }));
  }, []);

  const handleMoveTask = useCallback((taskId: string, newSectionId: string | undefined) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, sectionId: newSectionId } : t));
  }, []);

  const handleAddSection = useCallback((title: string, color: string = 'gray') => {
    try {
        if(!title.trim()) throw new Error("Title required");
        const newSection = { id: crypto.randomUUID(), title, color };
        setSections(prev => [...prev, newSection]);
    } catch(e: any) { showError(e.message); }
  }, [showError]);

  const handleDeleteSection = useCallback((sectionId: string) => {
    setSections(prev => prev.filter(s => s.id !== sectionId));
    setTasks(prev => prev.map(t => t.sectionId === sectionId ? { ...t, sectionId: undefined } : t));
  }, []);

  const handleMoveSection = useCallback((fromIndex: number, toIndex: number) => {
    setSections(prev => {
        const newSections = [...prev];
        const [moved] = newSections.splice(fromIndex, 1);
        newSections.splice(toIndex, 0, moved);
        return newSections;
    });
  }, []);

  const handleUpdateSectionColor = useCallback((sectionId: string, color: string) => {
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, color } : s));
  }, []);

  const handleScheduleTask = useCallback((taskId: string, start: string, end: string, subtaskId?: string): boolean => {
     const newInterval = { start: parseISO(start), end: parseISO(end) };
     const check = (s: string | undefined, e: string | undefined) => {
         if (!s || !e) return false;
         return areIntervalsOverlapping(newInterval, { start: parseISO(s), end: parseISO(e) });
     };

     for (const t of tasks) {
         if (t.completed) continue;
         if (t.id !== taskId || (t.id === taskId && subtaskId)) {
             if (check(t.scheduledStart, t.scheduledEnd)) return false;
         }
         if (t.subtasks) {
             for (const sub of t.subtasks) {
                 if (sub.completed) continue;
                 if (t.id === taskId && sub.id === subtaskId) continue; 
                 if (check(sub.scheduledStart, sub.scheduledEnd)) return false;
             }
         }
     }

     setTasks(prev => prev.map(t => {
         if (t.id === taskId) {
             if (subtaskId) {
                 return { ...t, subtasks: t.subtasks?.map(s => s.id === subtaskId ? { ...s, scheduledStart: start, scheduledEnd: end } : s) };
             } else {
                 return { ...t, scheduledStart: start, scheduledEnd: end };
             }
         }
         return t;
     }));
     return true;
  }, [tasks]);

  const handleToggleAlarm = useCallback((taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, alarmSet: !t.alarmSet, isRecurringSchedule: !t.alarmSet ? false : t.isRecurringSchedule } : t));
  }, []);

  const handleToggleRecurringSchedule = useCallback((taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, isRecurringSchedule: !t.isRecurringSchedule } : t));
  }, []);

  const handleAutoSchedule = useCallback(() => {
    const now = new Date();
    let scheduledCount = 0;
    setTasks(prev => prev.map(t => {
      if (!t.isRoutine && !t.scheduledStart && !t.completed) {
        const start = t.dueDate ? new Date(t.dueDate) : new Date(now.setHours(17, 0, 0, 0));
        const end = addHours(start, 1);
        scheduledCount++;
        return { ...t, dueDate: t.dueDate || start.toISOString(), scheduledStart: start.toISOString(), scheduledEnd: end.toISOString() };
      }
      return t;
    }));
    if (scheduledCount > 0) setToast({ type: 'success', message: `Auto-scheduled ${scheduledCount} tasks.` });
    else showError("All active tasks are already scheduled.");
  }, [showError]);

  const toggleTheme = useCallback(() => {
    setUser(prev => ({ ...prev, isDarkMode: !prev.isDarkMode }));
  }, []);

  const handleUpdateUser = useCallback((updates: Partial<UserState>) => {
    setUser(prev => {
        if (updates.isLoggedIn && !prev.isLoggedIn) {
            return { ...prev, ...updates, level: getUserLevel(updates.points !== undefined ? updates.points : prev.points) };
        }
        return { ...prev, ...updates };
    });
  }, []);

  // ... (Rest of UI rendering same as previous)

  const toggleFilter = (list: string[], item: string, setList: (l: string[]) => void) => {
    if (list.includes(item)) setList(list.filter(i => i !== item));
    else setList([...list, item]);
  };

  const handleApplyFilters = () => {
      setSortBy(tempSortBy);
      setFilterPriorities(tempFilterPriorities);
      setFilterSections(tempFilterSections);
      setFilterDates(tempFilterDates);
      setIsFilterExpanded(false);
  };

  const openTaskModal = (task?: Task) => {
      setEditingTask(task);
      setIsModalOpen(true);
      setIsSidebarCollapsed(true);
  };

  const toggleFilterMenu = () => {
      const newState = !isFilterExpanded;
      setIsFilterExpanded(newState);
      if (newState) setIsSidebarCollapsed(true);
  };

  const filteredTasks = useMemo(() => {
    const now = new Date();
    let result = tasks.filter(t => {
        if (pendingCompletionIds.has(t.id)) return false;
        if (t.isRoutine) return false;
        if (t.visibleFrom) return isAfter(now, parseISO(t.visibleFrom)) || isSameDay(now, parseISO(t.visibleFrom));
        return true;
    });

    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        result = result.filter(t => t.title.toLowerCase().includes(q) || (t.note && t.note.toLowerCase().includes(q)));
    }

    if (filterPriorities.length > 0) result = result.filter(t => filterPriorities.includes(t.priority || 'None'));
    if (filterSections.length > 0) result = result.filter(t => filterSections.includes(t.sectionId || 'general'));
    if (filterDates.length > 0) {
        result = result.filter(t => {
            if (!t.dueDate) return filterDates.includes('no-date');
            const d = new Date(t.dueDate);
            if (isPast(d) && !isToday(d)) return filterDates.includes('overdue');
            if (isToday(d)) return filterDates.includes('today');
            if (isFuture(d)) return filterDates.includes('upcoming');
            return false;
        });
    }

    result.sort((a, b) => {
        if (sortBy === 'priority') {
            const pMap: Record<string, number> = { High: 3, Medium: 2, Low: 1, None: 0 };
            const pA = pMap[a.priority || 'None'] || 0;
            const pB = pMap[b.priority || 'None'] || 0;
            if (pA !== pB) return pB - pA;
        } else if (sortBy === 'section') {
            const getSectionIdx = (id?: string) => sections.findIndex(s => s.id === id);
            const idxA = a.sectionId ? getSectionIdx(a.sectionId) : -1;
            const idxB = b.sectionId ? getSectionIdx(b.sectionId) : -1;
            if (idxA !== idxB) return idxA - idxB;
        }
        if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
    });
    return result;
  }, [tasks, pendingCompletionIds, searchQuery, filterPriorities, filterSections, filterDates, sortBy, sections]);

  const routineTasks = useMemo(() => tasks.filter(t => t.isRoutine), [tasks]);

  const handleAddRoutine = useCallback((routine: Routine) => { setRoutines(prev => [...prev, routine]); }, []);
  const handleUpdateRoutine = useCallback((updatedRoutine: Routine) => {
    setRoutines(prev => {
        let newRoutines = prev.map(r => r.id === updatedRoutine.id ? updatedRoutine : r);
        if (updatedRoutine.isActive) {
             newRoutines = newRoutines.map(r => {
                if (r.id === updatedRoutine.id) return r;
                if (r.isActive) {
                    const conflicts = r.activeDays.filter(d => updatedRoutine.activeDays.includes(d));
                    if (conflicts.length > 0) {
                        const newActiveDays = r.activeDays.filter(d => !conflicts.includes(d));
                        const newSuppressedDays = [...(r.suppressedDays || []), ...conflicts];
                        return { ...r, activeDays: newActiveDays, suppressedDays: [...new Set(newSuppressedDays)].sort(), scheduleType: newActiveDays.length > 0 ? 'weekly' : 'manual' };
                    }
                }
                return r;
             });
        }
        const claimedDays = new Set<number>();
        newRoutines.forEach(r => { if (r.isActive) r.activeDays.forEach(d => claimedDays.add(d)); });
        return newRoutines.map(r => {
             if (!r.suppressedDays || r.suppressedDays.length === 0 || !r.isActive) return r;
             const daysToRestore = r.suppressedDays.filter(d => !claimedDays.has(d));
             if (daysToRestore.length > 0) {
                 daysToRestore.forEach(d => claimedDays.add(d));
                 return { ...r, activeDays: [...r.activeDays, ...daysToRestore].sort(), suppressedDays: r.suppressedDays.filter(d => !daysToRestore.includes(d)), scheduleType: 'weekly' };
             }
             return r;
        });
    });
  }, []);
  const handleDeleteRoutine = useCallback((id: string) => {
      setRoutines(prev => prev.filter(r => r.id !== id));
      setTasks(prev => prev.filter(t => t.routineId !== id));
  }, []);

  const bgClass = user.isDarkMode ? 'bg-gray-900' : `bg-${themeColor}-50`;
  const textClass = user.isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const numericLevel = getNumericLevel(user.points);
  const levelProgress = Math.max(0, Math.min(100, user.points % 100));

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${bgClass} font-sans ${textClass} transition-colors duration-500`}>
      <IntroAnimation isVisible={showIntro} isDark={user.isDarkMode} onComplete={() => setShowIntro(false)} />
      
      <Suspense fallback={null}>
        <LevelUpOverlay 
            data={currentLevelUp} 
            onClose={() => setCurrentLevelUp(null)} 
            themeColor={themeColor} 
            user={user} 
            tasks={tasks} 
        />
        {activeAlarm && (
            <AlarmOverlay 
                task={activeAlarm}
                onDismiss={() => setActiveAlarm(null)}
                onComplete={() => { handleQueueComplete(activeAlarm.id); setActiveAlarm(null); }}
                themeColor={themeColor}
                isDark={user.isDarkMode}
                alarmSound={user.alarmSound || 'chime'}
                soundEnabled={user.soundEnabled !== false}
            />
        )}
      </Suspense>
      
      {/* Header */}
      <header className={`flex items-center justify-between h-16 px-4 border-b z-[80] flex-shrink-0 transition-all duration-300 ${user.isDarkMode ? 'bg-gray-900 border-gray-800' : `bg-white/80 backdrop-blur-md border-${themeColor}-200/50`}`}>
         <div className="flex items-center gap-3">
             <button onClick={() => window.innerWidth >= 768 ? setIsSidebarCollapsed(!isSidebarCollapsed) : setIsSidebarOpen(!isSidebarOpen)} className={`p-2 rounded-lg transition-colors ${user.isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-black/5'}`}>
                <Menu size={24} />
             </button>
             <div className="flex items-center gap-2">
                {/* Composed Todo List Icon (Header) - Theme Colored Box, White Elements */}
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br from-${themeColor}-500 to-${themeColor}-700 flex items-center justify-center shadow-lg relative overflow-hidden group`}>
                     <svg viewBox="0 0 100 100" className="w-6 h-6">
                        {/* Circle on Left */}
                        <circle cx="30" cy="50" r="16" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" />
                        {/* Tick Inside Circle */}
                        <path d="M 23 50 L 29 56 L 39 43" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                        {/* Lines on Right */}
                        <line x1="58" y1="35" x2="85" y2="35" stroke="white" strokeWidth="8" strokeLinecap="round" />
                        <line x1="58" y1="50" x2="85" y2="50" stroke="white" strokeWidth="8" strokeLinecap="round" />
                        <line x1="58" y1="65" x2="85" y2="65" stroke="white" strokeWidth="8" strokeLinecap="round" />
                     </svg>
                </div>
                <h1 className="text-xl font-black tracking-tight block">Do-<span className={`text-${themeColor}-600`}>To</span>-Do</h1>
            </div>
         </div>
         <div className="flex-1"></div> 
         <div className="flex items-center gap-3">
             <button onClick={toggleTheme} className={`p-2 rounded-full transition-colors flex ${user.isDarkMode ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' : 'bg-black/5 text-gray-600 hover:bg-black/10'}`}>
                {user.isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
             </button>
             <div className="relative">
                 <button onClick={() => setIsProfileCardOpen(true)} className="relative flex flex-col items-center justify-center transition-transform hover:scale-105 active:scale-95 group">
                    <div className={`relative w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shadow-sm border-2 border-gray-600 bg-gray-200`}>
                        <div className={`absolute bottom-0 left-0 right-0 transition-all duration-700 ease-out bg-${themeColor}-600`} style={{ height: `${levelProgress}%` }} />
                        <span className={`relative z-10 font-black text-xs text-gray-600`}>{numericLevel}</span>
                    </div>
                 </button>
             </div>
         </div>
      </header>
      
      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar isOpen={isSidebarOpen} isCollapsed={isSidebarCollapsed} onClose={() => setIsSidebarOpen(false)} activePage={activePage} onNavigate={setActivePage} onProfileClick={() => { setIsAccountOpen(true); setIsSidebarOpen(false); }} user={user} themeColor={themeColor} isDark={user.isDarkMode} />

        <main className="flex-1 overflow-hidden bg-inherit relative flex flex-col">
            <AnimatePresence mode="wait">
                <motion.div key={activePage} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }} className="h-full flex flex-col overflow-hidden">
                    {activePage === 'dashboard' && <div className="h-full p-2 md:p-6 overflow-hidden"><DashboardView user={user} tasks={tasks} sections={sections} themeColor={themeColor} isDark={user.isDarkMode} /></div>}
                    {activePage === 'tasks' && (
                        <div className="h-full flex flex-col px-2 md:px-4 pt-2 overflow-hidden"> 
                             {/* ... (Search and Filter Bar - Same as before) */}
                            <div className="flex items-end justify-between gap-4 px-2 relative z-20 shrink-0">
                                <div className="flex-1 mb-1 min-w-0">
                                     <div className="relative flex items-center gap-2 max-w-full w-auto inline-flex">
                                         <div className={`relative group w-full md:w-64 transition-all`}>
                                            <div className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border shadow-sm transition-colors ${isDark ? 'bg-gray-800 border-gray-700 text-gray-200' : `bg-white/80 border-${themeColor}-200 text-gray-700`} focus-within:ring-2 focus-within:ring-${themeColor}-500/20`}>
                                                <input type="text" placeholder="Search..." value={tempSearchInput} onChange={(e) => setTempSearchInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setSearchQuery(tempSearchInput)} className={`bg-transparent outline-none text-sm w-full font-medium pl-1 placeholder-gray-400`} />
                                                {tempSearchInput && <button onClick={() => { setTempSearchInput(''); setSearchQuery(''); }} className="p-1 hover:text-red-500 rounded-full"><X size={14} /></button>}
                                                <button onClick={() => setSearchQuery(tempSearchInput)} className={`p-1.5 rounded-md text-${themeColor}-600 hover:bg-${themeColor}-50 transition-colors`}><Search size={16} /></button>
                                            </div>
                                         </div>
                                         <button onClick={toggleFilterMenu} className={`px-3 py-1.5 rounded-lg border shadow-sm transition-colors flex items-center gap-2 flex-shrink-0 ${isFilterExpanded ? `bg-${themeColor}-100 border-${themeColor}-300 text-${themeColor}-700` : (isDark ? 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700' : `bg-white/80 border-${themeColor}-200 text-gray-500 hover:bg-${themeColor}-50`)}`}><Filter size={16} /></button>
                                         {isFilterExpanded && (
                                            <div className={`absolute top-full left-0 mt-2 rounded-xl border shadow-2xl z-50 flex flex-col w-full overflow-hidden animate-in slide-in-from-top-2 duration-200 ${isDark ? 'bg-gray-900 border-gray-700' : `bg-white/90 backdrop-blur-xl border-${themeColor}-200`}`}>
                                                <div className="flex flex-1 h-[300px]">
                                                    <div className={`w-5/12 border-r p-2 space-y-1 ${isDark ? 'bg-gray-800/50 border-gray-700' : `bg-gray-50/80 border-${themeColor}-100`}`}>
                                                        {[{ id: 'sort', label: 'Sort By', icon: ArrowUpDown }, { id: 'priority', label: 'Priority', icon: Flag }, { id: 'section', label: 'Section', icon: ListIcon }, { id: 'date', label: 'Date', icon: CalendarIcon }].map(cat => (
                                                            <button key={cat.id} onClick={() => setActiveFilterCategory(cat.id as any)} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-colors ${activeFilterCategory === cat.id ? `bg-white dark:bg-gray-700 text-${themeColor}-600 shadow-sm` : `text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5`}`}>
                                                                <div className="flex items-center gap-2"><cat.icon size={14} /> {cat.label}</div>{activeFilterCategory === cat.id && <ChevronRight size={14} />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <div className="w-7/12 p-4 overflow-y-auto custom-scrollbar">
                                                        {activeFilterCategory === 'sort' && <div className="space-y-1">{['date', 'priority', 'section'].map(opt => <button key={opt} onClick={() => setTempSortBy(opt as any)} className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${tempSortBy === opt ? `bg-${themeColor}-100 text-${themeColor}-700 dark:bg-${themeColor}-900/30 dark:text-${themeColor}-400` : (isDark ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-50')}`}><span className="capitalize">{opt}</span>{tempSortBy === opt && <Check size={14} />}</button>)}</div>}
                                                        {activeFilterCategory === 'priority' && <div className="space-y-1">{['High', 'Medium', 'Low', 'None'].map(p => <button key={p} onClick={() => toggleFilter(tempFilterPriorities, p, setTempFilterPriorities)} className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${tempFilterPriorities.includes(p) ? `bg-${themeColor}-100 text-${themeColor}-700 dark:bg-${themeColor}-900/30 dark:text-${themeColor}-400` : (isDark ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-50')}`}><span>{p}</span>{tempFilterPriorities.includes(p) && <Check size={14} />}</button>)}</div>}
                                                        {activeFilterCategory === 'section' && <div className="space-y-1">{[{ id: 'general', title: 'General' }, ...sections].map(s => <button key={s.id} onClick={() => toggleFilter(tempFilterSections, s.id, setTempFilterSections)} className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${tempFilterSections.includes(s.id) ? `bg-${themeColor}-100 text-${themeColor}-700 dark:bg-${themeColor}-900/30 dark:text-${themeColor}-400` : (isDark ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-50')}`}><span>{s.title}</span>{tempFilterSections.includes(s.id) && <Check size={14} />}</button>)}</div>}
                                                        {activeFilterCategory === 'date' && <div className="space-y-1">{[{ id: 'overdue', label: 'Overdue' }, { id: 'today', label: 'Today' }, { id: 'upcoming', label: 'Upcoming' }, { id: 'no-date', label: 'No Date' }].map(d => <button key={d.id} onClick={() => toggleFilter(tempFilterDates, d.id, setTempFilterDates)} className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${tempFilterDates.includes(d.id) ? `bg-${themeColor}-100 text-${themeColor}-700 dark:bg-${themeColor}-900/30 dark:text-${themeColor}-400` : (isDark ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-50')}`}><span>{d.label}</span>{tempFilterDates.includes(d.id) && <Check size={14} />}</button>)}</div>}
                                                    </div>
                                                </div>
                                                <div className={`p-3 border-t flex justify-between items-center ${isDark ? 'border-gray-700 bg-gray-800' : `border-${themeColor}-100 bg-white`}`}>
                                                    <button onClick={() => { setTempSortBy('date'); setTempFilterPriorities([]); setTempFilterSections([]); setTempFilterDates([]); }} className="text-xs font-bold text-red-500 hover:underline px-2">Reset</button>
                                                    <button onClick={handleApplyFilters} className={`px-6 py-2 rounded-lg font-bold text-sm text-white shadow-md transition-transform active:scale-95 bg-${themeColor}-600 hover:bg-${themeColor}-700`}>Done</button>
                                                </div>
                                            </div>
                                        )}
                                     </div>
                                </div>
                                <div className="flex items-end justify-end gap-1">
                                    {(['board', 'list'] as const).map(mode => (
                                        <button key={mode} onClick={() => setTaskViewMode(mode)} className={`px-3 md:px-6 py-1.5 md:py-2 rounded-t-xl rounded-b-none font-bold text-sm transition-all relative top-[1px] z-10 border-t border-x ${taskViewMode === mode ? `${isDark ? 'bg-gray-800 border-gray-700' : `bg-white/80 backdrop-blur-md border-${themeColor}-200`} text-${themeColor}-600 border-b-transparent shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]` : `bg-transparent border-transparent opacity-60 hover:opacity-100 hover:bg-white/10 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}`}>
                                            <div className="flex flex-col md:flex-row items-center md:gap-2">{mode === 'board' ? <LayoutGrid size={16} /> : <ListIcon size={16} />}<span className="capitalize text-[9px] md:text-sm leading-none md:leading-normal mt-0.5 md:mt-0">{mode}</span></div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className={`flex-1 overflow-hidden rounded-t-xl border shadow-sm flex flex-col relative z-10 ${isDark ? 'bg-gray-800 border-gray-700' : `bg-white/60 backdrop-blur-sm border-${themeColor}-200/60`} border-b-0`}>
                                {taskViewMode === 'board' ? (
                                    <TaskBoard tasks={filteredTasks} sections={sections} onTaskMove={handleMoveTask} onTaskComplete={handleQueueComplete} onTaskDelete={handleDeleteTask} onTaskEdit={openTaskModal} onAddSection={handleAddSection} onDeleteSection={handleDeleteSection} onMoveSection={handleMoveSection} onUpdateSectionColor={handleUpdateSectionColor} onSubtaskComplete={handleSubtaskComplete} themeColor={themeColor} isDark={user.isDarkMode} />
                                ) : (
                                    <ListView tasks={filteredTasks} sections={sections} onTaskComplete={handleQueueComplete} onTaskDelete={handleDeleteTask} onTaskEdit={openTaskModal} onSubtaskComplete={handleSubtaskComplete} onSubtaskDelete={handleSubtaskDelete} onSubtaskUpdate={handleSubtaskUpdate} themeColor={themeColor} isDark={user.isDarkMode} />
                                )}
                            </div>
                        </div>
                    )}
                    {activePage === 'scheduling' && <div className="h-full flex flex-col p-2 md:p-6 overflow-hidden"><CalendarView tasks={filteredTasks} sections={sections} onAutoSchedule={handleAutoSchedule} onScheduleTask={handleScheduleTask} onToggleAlarm={handleToggleAlarm} onToggleRecurringSchedule={handleToggleRecurringSchedule} themeColor={themeColor} isDark={user.isDarkMode} /></div>}
                    {activePage === 'routines' && <div className="h-full flex flex-col p-2 md:p-6 overflow-hidden"><RoutinesView routines={routines} allTasks={routineTasks} onAddRoutine={handleAddRoutine} onUpdateRoutine={handleUpdateRoutine} onDeleteRoutine={handleDeleteRoutine} onAddRoutineTask={handleSaveTask} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} onInteract={() => { setIsSidebarOpen(false); setIsSidebarCollapsed(true); }} themeColor={themeColor} isDark={user.isDarkMode} /></div>}
                </motion.div>
            </AnimatePresence>
            
            <Suspense fallback={null}>
                {isModalOpen && <TaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveTask} initialTask={editingTask} sections={sections} themeColor={themeColor} isDark={user.isDarkMode} />}
                {isAccountOpen && <AccountModal isOpen={isAccountOpen} onClose={() => setIsAccountOpen(false)} user={user} onUpdateUser={handleUpdateUser} themeColor={themeColor} />}
                {isProfileCardOpen && <ProfileCardModal isOpen={isProfileCardOpen} onClose={() => setIsProfileCardOpen(false)} user={user} tasks={tasks} themeColor={themeColor} isDark={user.isDarkMode} />}
            </Suspense>
        </main>
        {/* Toast and FAB ... */}
        <AnimatePresence>
            {toast && (
                <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}>
                    {toast.type === 'error' && <AlertCircle size={18} />}
                    <span className="font-bold text-sm">{toast.message}</span>
                    {toast.action && (
                        <>
                            <div className="w-px h-4 bg-gray-500/50"></div>
                            <button onClick={toast.action} className={`text-sm font-bold flex items-center gap-1 ${toast.type === 'error' ? 'text-white underline' : `text-${themeColor}-400 hover:text-${themeColor}-300`}`}>
                                <Undo size={16} /> Undo
                            </button>
                        </>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
      </div>

      {activePage === 'tasks' && !isAnyModalOpen && (
        <button onClick={() => { setEditingTask(undefined); setIsModalOpen(true); setIsSidebarOpen(false); setIsSidebarCollapsed(true); }} className={`fixed bottom-8 right-8 w-14 h-14 bg-${themeColor}-600 hover:bg-${themeColor}-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95 z-[80]`}>
            <Plus size={28} />
        </button>
      )}
    </div>
  );
};

export default App;
