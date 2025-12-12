
import React, { useMemo, useState } from 'react';
import { Task, UserState, Section, UserLevel } from '../types';
import { format, isSameDay, eachDayOfInterval, differenceInMinutes, isBefore, isAfter, eachMonthOfInterval, isSameMonth, eachWeekOfInterval, endOfWeek, isWithinInterval } from 'date-fns';
import { Trophy, Zap, TrendingUp, Target, Calendar, CheckCircle2, PieChart as PieChartIcon, Activity, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

// Helper functions for missing date-fns exports if strictly needed
const startOfDay = (d: Date | number) => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
};

const subDays = (date: Date, amount: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() - amount);
    return d;
};

const subMonths = (date: Date | number, amount: number) => {
    const d = new Date(date);
    d.setDate(1);
    d.setMonth(d.getMonth() - amount);
    return d;
};

// Helper for SVG Pie Coordinates
const getCoordinatesForPercent = (percent: number) => {
  const x = Math.cos(2 * Math.PI * percent);
  const y = Math.sin(2 * Math.PI * percent);
  return [x, y];
};

const RANK_MESSAGES: Record<string, string> = {
    [UserLevel.Proactive]: "You are unstoppable! A true master of time.",
    [UserLevel.Prepared]: "Always ready, always steady. Great consistency.",
    [UserLevel.Punctual]: "On time, every time. Keep up the rhythm.",
    [UserLevel.Postponer]: "Slip-ups happen. Let's get back on track.",
    [UserLevel.Procrastinator]: "Time to turn things around. Small steps first.",
};

const ExplodingPieChart = ({ title, data, isDark }: any) => {
    if (!data || data.length === 0) return (
        <div className={`flex flex-col items-center justify-center h-full min-h-[200px] p-6 rounded-2xl border border-dashed ${isDark ? 'border-gray-700 text-gray-500' : 'border-gray-300 text-gray-400'}`}>
            <PieChartIcon size={24} className="mb-2 opacity-50" />
            <span className="text-xs">No data available</span>
        </div>
    );

    const total = data.reduce((sum: number, item: any) => sum + item.value, 0);
    const maxVal = Math.max(...data.map((d: any) => d.value));
    let cumulativePercent = 0;
    const filterId = `shadow-${title.replace(/\s+/g, '-').toLowerCase()}`;

    return (
        <div className="flex flex-col items-center w-full">
             <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 md:mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{title}</h3>
             
             <div className="flex flex-row md:flex-col items-center justify-center w-full">
                 <div className="w-1/2 md:w-auto flex justify-center md:mb-6">
                     <div className="relative w-32 h-32 md:w-40 md:h-40 flex-shrink-0">
                         <svg viewBox="-1.2 -1.2 2.4 2.4" className="w-full h-full overflow-visible transform -rotate-90">
                             <defs>
                                <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
                                    <feDropShadow dx="0.05" dy="0.05" stdDeviation="0.05" floodOpacity="0.5" />
                                </filter>
                             </defs>
                             
                             {data.map((slice: any, i: number) => {
                                const startPercent = cumulativePercent;
                                const slicePercent = slice.value / total;
                                const endPercent = startPercent + slicePercent;
                                cumulativePercent = endPercent;

                                // Don't render if 0
                                if (slicePercent === 0) return null;

                                const [startX, startY] = getCoordinatesForPercent(startPercent);
                                const [endX, endY] = getCoordinatesForPercent(endPercent);

                                const largeArcFlag = slicePercent > 0.5 ? 1 : 0;
                                
                                // If it's a full circle (100%), draw a circle instead of arc path
                                let d = '';
                                if (slicePercent > 0.999) {
                                    d = `M 1 0 A 1 1 0 1 1 -1 0 A 1 1 0 1 1 1 0 Z`;
                                } else {
                                    d = [
                                        `M 0 0`,
                                        `L ${startX} ${startY}`,
                                        `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                                        `Z`
                                    ].join(' ');
                                }

                                const isLargest = slice.value === maxVal && data.length > 1; // Only explode if more than 1 slice or meaningful
                                
                                // Calculate explosion
                                const midPercent = startPercent + slicePercent / 2;
                                const explodeDist = isLargest ? 0.15 : 0;
                                const transX = Math.cos(2 * Math.PI * midPercent) * explodeDist;
                                const transY = Math.sin(2 * Math.PI * midPercent) * explodeDist;

                                return (
                                    <path 
                                        key={i}
                                        d={d}
                                        fill={slice.color}
                                        transform={`translate(${transX}, ${transY})`}
                                        filter={isLargest ? `url(#${filterId})` : ""}
                                        className="transition-all duration-500 ease-out hover:opacity-90 cursor-pointer"
                                    />
                                );
                             })}
                         </svg>
                     </div>
                 </div>

                 <div className="w-1/2 md:w-full space-y-2 md:max-w-[200px] pl-4 md:pl-0">
                     {data.map((d: any) => (
                         <div key={d.label} className="flex items-center justify-between text-xs">
                             <div className="flex items-center gap-2">
                                 <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ background: d.color }}></div>
                                 <span className={`font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{d.label}</span>
                             </div>
                             <span className={`font-mono opacity-60`}>{Math.round(d.percentage)}%</span>
                         </div>
                     ))}
                 </div>
             </div>
        </div>
    );
};

interface DashboardViewProps {
  user: UserState;
  tasks: Task[];
  sections: Section[];
  themeColor: string;
  isDark: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ user, tasks, sections, themeColor, isDark }) => {
  const [graphRange, setGraphRange] = useState<'week' | 'month' | 'year'>('week');

  const stats = useMemo(() => {
    const completedTasks = tasks.filter(t => t.completed && t.completedAt);
    const totalCompleted = completedTasks.length;
    const now = new Date();
    
    // Status Counts
    const overdueCount = tasks.filter(t => !t.completed && t.dueDate && isBefore(new Date(t.dueDate), now)).length;
    const upcomingCount = tasks.filter(t => !t.completed && t.dueDate && isAfter(new Date(t.dueDate), now)).length;
    
    // Calculate Streak
    const sortedDates = [...new Set(completedTasks.map(t => startOfDay(new Date(t.completedAt!)).toISOString()))].sort().reverse();
    let streak = 0;
    const today = startOfDay(new Date());
    const yesterday = subDays(today, 1);
    
    // Check if streak is active (completed today or yesterday)
    let currentDate = today;
    if (!sortedDates.includes(today.toISOString())) {
        if (sortedDates.includes(yesterday.toISOString())) {
            currentDate = yesterday;
        } else {
            // Streak broken
            streak = 0;
        }
    }

    if (sortedDates.includes(currentDate.toISOString())) {
        streak = 1;
        let checkDate = subDays(currentDate, 1);
        while (sortedDates.includes(checkDate.toISOString())) {
            streak++;
            checkDate = subDays(checkDate, 1);
        }
    }

    // Productivity Graph Data
    let activityData: { date: Date, count: number, label: string }[] = [];
    
    if (graphRange === 'week') {
        // Daily for the last week
        const start = subDays(today, 6);
        const interval = eachDayOfInterval({ start, end: today });
        activityData = interval.map(date => ({
            date,
            label: format(date, 'EEE'),
            count: completedTasks.filter(t => isSameDay(new Date(t.completedAt!), date)).length
        }));
    } else if (graphRange === 'month') {
        // Weekly for the last month
        const start = subDays(today, 28);
        const interval = eachWeekOfInterval({ start, end: today });
        activityData = interval.map(date => {
            const end = endOfWeek(date);
            const count = completedTasks.filter(t => {
                const completed = new Date(t.completedAt!);
                return isWithinInterval(completed, { start: date, end });
            }).length;
            return {
                date,
                label: format(date, 'd MMM'),
                count
            };
        });
    } else {
        // Monthly for the last year
        const start = subMonths(today, 11);
        const interval = eachMonthOfInterval({ start, end: today });
        activityData = interval.map(date => ({
            date,
            label: format(date, 'MMM'),
            count: completedTasks.filter(t => isSameMonth(new Date(t.completedAt!), date)).length
        }));
    }

    const maxCount = Math.max(...activityData.map(d => d.count), 1); // Avoid division by zero

    // Today Overview
    const todayCount = completedTasks.filter(t => isSameDay(new Date(t.completedAt!), today)).length;

    // --- Analysis Calculation ---
    
    // 1. Section Distribution (Order: General -> Sections Array)
    const sectionCounts: Record<string, number> = {};
    completedTasks.forEach(t => {
        const key = t.sectionId || 'general';
        sectionCounts[key] = (sectionCounts[key] || 0) + 1;
    });

    const sectionPieData = [
        { key: 'general', value: sectionCounts['general'] || 0, label: 'None', color: '#9ca3af' }, // Default color for None/General
        ...sections.map(s => {
             // Simple color map fallback
             const colorMap: Record<string, string> = {
                'gray': '#9ca3af', 'red': '#ef4444', 'orange': '#f97316', 'yellow': '#eab308', 
                'green': '#22c55e', 'teal': '#14b8a6', 'blue': '#3b82f6', 'indigo': '#6366f1', 
                'purple': '#a855f7', 'pink': '#ec4899'
            };
            return {
                key: s.id,
                value: sectionCounts[s.id] || 0,
                label: s.title,
                color: s.color ? (colorMap[s.color] || '#9ca3af') : '#9ca3af'
            };
        })
    ].filter(item => item.value > 0); // Only show existing

    // 2. Priority Distribution (Order: High -> Medium -> Low -> None)
    const priorityCounts: Record<string, number> = {};
    completedTasks.forEach(t => {
        const p = t.priority || 'None';
        priorityCounts[p] = (priorityCounts[p] || 0) + 1;
    });

    const priorityPieData = [
        { key: 'High', value: priorityCounts['High'] || 0, label: 'High', color: '#ef4444' },
        { key: 'Medium', value: priorityCounts['Medium'] || 0, label: 'Medium', color: '#eab308' },
        { key: 'Low', value: priorityCounts['Low'] || 0, label: 'Low', color: '#3b82f6' },
        { key: 'None', value: priorityCounts['None'] || 0, label: 'None', color: '#9ca3af' }
    ].filter(d => d.value > 0);


    // 3. Time Distribution (Order: Early, On Time, Overdue, None)
    const timeCounts = { early: 0, onTime: 0, late: 0, noDate: 0 };
    completedTasks.forEach(t => {
        if (!t.completedAt) return;
        
        if (!t.dueDate) {
            timeCounts.noDate++;
            return;
        }

        const due = new Date(t.dueDate);
        const completed = new Date(t.completedAt);
        const diffMins = differenceInMinutes(due, completed);

        if (diffMins < 0) {
            timeCounts.late++;
        } else if (diffMins >= 24 * 60) {
            // Completed more than 24 hours before due
            timeCounts.early++;
        } else {
            // Completed within 24 hours before due
            timeCounts.onTime++;
        }
    });

    const timePieData = [
        { key: 'early', value: timeCounts.early, label: 'Early (>24h)', color: '#10b981' }, // Emerald
        { key: 'onTime', value: timeCounts.onTime, label: 'On Time', color: '#3b82f6' },   // Blue
        { key: 'late', value: timeCounts.late, label: 'Overdue', color: '#ef4444' },       // Red
        { key: 'noDate', value: timeCounts.noDate, label: 'None', color: '#9ca3af' }       // Gray
    ].filter(d => d.value > 0);


    // Add percentage to all datasets
    const enrichData = (data: any[]) => {
        const total = data.reduce((sum, item) => sum + item.value, 0);
        return data.map(item => ({ ...item, percentage: total > 0 ? (item.value / total) * 100 : 0 }));
    };

    return { 
        totalCompleted, streak, activityData, maxCount, todayCount, overdueCount, upcomingCount,
        sectionPieData: enrichData(sectionPieData),
        priorityPieData: enrichData(priorityPieData),
        timePieData: enrichData(timePieData)
    };
  }, [tasks, sections, graphRange]);

  const bgCard = isDark 
    ? 'bg-gray-800 border-gray-700' 
    : `bg-white/60 backdrop-blur-md border-${themeColor}-200/50 shadow-sm`;

  const textMain = isDark ? 'text-gray-100' : 'text-gray-900';
  const textSub = isDark ? 'text-gray-400' : 'text-gray-500';

  // --- Level Progress Calculation (Reset every 100 points) ---
  const safePoints = Math.max(0, user.points);
  const currentLevel = Math.floor(safePoints / 100);
  const levelProgress = safePoints % 100;
  const pointsToNextLevel = 100 - levelProgress;

  // --- Next Rank Target Calculation ---
  // Proactive >= 1000 (Lvl 10), Prepared >= 500 (Lvl 5), Punctual 0-499
  const getRankData = (points: number) => {
      if (points >= 1000) return { next: 'Max Rank Reached', pointsNeeded: 0, unlockLevel: 10 };
      if (points >= 500) return { next: 'Proactive', pointsNeeded: 1000 - points, unlockLevel: 10 };
      if (points >= 0) return { next: 'Prepared', pointsNeeded: 500 - points, unlockLevel: 5 };
      if (points > -500) return { next: 'Punctual', pointsNeeded: 0 - points, unlockLevel: 0 };
      return { next: 'Postponer', pointsNeeded: -500 - points, unlockLevel: -5 };
  };
  const rankData = getRankData(user.points);

  // --- Productivity Line Graph Helpers ---
  const lineGraphPath = useMemo(() => {
      const data = stats.activityData;
      if (data.length < 2) return '';
      
      const width = 100;
      // We use a viewBox height of 50. 
      // Reserve top 10 for text, bottom 5 for padding. Usable height range 35.
      // Y = 50 - 5 - (value ratio * 35).
      const max = Math.max(stats.maxCount, 1);
      
      const points = data.map((d, i) => {
          const x = (i / (data.length - 1)) * width;
          const y = 45 - (d.count / max) * 35;
          return `${x},${y}`;
      });

      return `M ${points.join(' L ')}`;
  }, [stats.activityData, stats.maxCount]);

  const lineGraphArea = useMemo(() => {
      if (!lineGraphPath) return '';
      return `${lineGraphPath} L 100,50 L 0,50 Z`;
  }, [lineGraphPath]);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-2 md:p-4 pb-20 md:pb-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          
        {/* 1. Rank Card (2/3 width desktop, Full width mobile) - Order 1 */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 md:p-6 rounded-2xl border shadow-sm relative overflow-hidden ${bgCard} col-span-2 md:col-span-2 order-1 md:order-1`}
        >
            <div className={`absolute top-0 right-0 p-4 opacity-10 text-${themeColor}-500`}>
                <Trophy size={140} />
            </div>
            <div className="relative z-10">
                <h3 className={`text-sm font-bold uppercase tracking-wider ${textSub}`}>Current Rank</h3>
                <div className={`text-4xl font-black mt-2 text-${themeColor}-600`}>{user.level}</div>
                <p className={`text-sm mt-1 ${textSub}`}>
                    {RANK_MESSAGES[user.level] || "Keep going!"}
                </p>
            </div>
        </motion.div>

        {/* 2. Points Card (1/3 width desktop, 1/2 width mobile) - Order Mobile: 3, Desktop: 2 */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`p-4 md:p-6 rounded-2xl border shadow-sm relative overflow-hidden ${bgCard} col-span-1 md:col-span-1 order-3 md:order-2`}
        >
            <div className={`absolute top-0 right-0 p-4 opacity-10 text-${themeColor}-500`}>
                <Zap size={80} />
            </div>
            <h3 className={`text-sm font-bold uppercase tracking-wider ${textSub}`}>Total Points</h3>
            <div className={`text-4xl font-black mt-2 ${user.points >= 0 ? `text-${themeColor}-600` : 'text-red-500'}`}>{user.points}</div>
        </motion.div>

        {/* 3. Milestone Card (Full Width) - Order Mobile: 2, Desktop: 3 */}
        <div className={`p-4 md:p-6 rounded-2xl border shadow-sm ${bgCard} col-span-2 md:col-span-3 order-2 md:order-3`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className={`font-bold text-lg flex items-center gap-2 ${textMain}`}>
                    <Target size={20} className={`text-${themeColor}-500`} /> 
                    Next Milestone
                </h3>
            </div>

            <div className="flex flex-col gap-2">
                 <div className="flex justify-between items-end">
                     <div>
                        <span className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>Next Rank</span>
                        <div className={`text-lg font-bold ${textMain} mt-1`}>
                            {rankData.next} 
                            {rankData.pointsNeeded > 0 && (
                                <span className={`text-sm ${textSub} font-normal ml-1`}>
                                    (Lvl {rankData.unlockLevel})
                                </span>
                            )}
                        </div>
                     </div>
                     <div className="text-right flex flex-col items-end">
                        <div className={`text-3xl font-black ${textMain}`}>
                            Level {currentLevel}
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${textSub} mt-0.5`}>
                           ({pointsToNextLevel} points to Level {currentLevel + 1})
                        </span>
                     </div>
                 </div>
                
                <div className="relative pt-2">
                    {/* Bar container */}
                    <div className={`h-4 w-full rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-100'} overflow-hidden relative`}>
                        <motion.div 
                            key={currentLevel} // Key change triggers spring animation from 0 on level up
                            initial={{ width: 0 }}
                            animate={{ width: `${levelProgress}%` }}
                            transition={{ type: "spring", stiffness: 40, damping: 20 }}
                            className={`h-full rounded-full bg-${themeColor}-500 relative`} 
                        />
                    </div>
                    
                    {/* Labels below bar */}
                    <div className="flex justify-between mt-2">
                        <div className={`text-xs font-bold font-mono ${textSub}`}>
                            Lvl {currentLevel}
                        </div>
                        <div className={`text-xs font-bold font-mono ${textSub}`}>
                            Lvl {currentLevel + 1}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* 4. Streak Card (1/2 width mobile, 1/3 desktop) - Order Mobile: 4, Desktop: 4 */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`p-4 md:p-6 rounded-2xl border shadow-sm relative overflow-hidden ${bgCard} col-span-1 md:col-span-1 order-4 md:order-4`}
        >
            <div className={`absolute top-0 right-0 p-4 opacity-10 text-orange-500`}>
                <TrendingUp size={60} />
            </div>
            <h3 className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>Current Streak</h3>
            <div className="text-3xl font-black mt-2 text-orange-500">{stats.streak} <span className="text-sm font-bold text-gray-400">Days</span></div>
        </motion.div>

        {/* 5. Today Overview (1/2 width mobile, 1/3 desktop) - Order Mobile: 5, Desktop: 5 */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className={`p-4 md:p-6 rounded-2xl border shadow-sm relative overflow-hidden ${bgCard} col-span-1 md:col-span-1 order-5 md:order-5`}
        >
            <div className={`absolute top-0 right-0 p-4 opacity-10 text-green-500`}>
                <CheckCircle2 size={60} />
            </div>
            <h3 className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>Completed Today</h3>
            <div className="text-3xl font-black mt-2 text-green-500">{stats.todayCount} <span className="text-sm font-bold text-gray-400">Tasks</span></div>
        </motion.div>

        {/* 6. Overview/Status Check (1/2 width mobile, 1/3 desktop) - Order Mobile: 6, Desktop: 6 */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`p-4 md:p-6 rounded-2xl border shadow-sm relative overflow-hidden ${bgCard} col-span-1 md:col-span-1 order-6 md:order-6 flex flex-col`}
        >
             <div className={`absolute top-0 right-0 p-4 opacity-10 text-indigo-500`}>
                <Activity size={60} />
             </div>
             <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${textSub}`}>Overview</h3>
             <div className="flex-1 flex items-center justify-between relative h-full z-10">
                <div className="flex flex-col items-center justify-center flex-1">
                     <span className="text-2xl md:text-3xl font-black text-red-500">{stats.overdueCount}</span>
                     <span className={`text-[10px] md:text-xs font-bold ${textSub}`}>Overdue</span>
                </div>
                
                {/* Divider */}
                <div className={`w-px h-10 absolute left-1/2 -translate-x-1/2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}></div>

                <div className="flex flex-col items-center justify-center flex-1">
                     <span className="text-2xl md:text-3xl font-black text-blue-500">{stats.upcomingCount}</span>
                     <span className={`text-[10px] md:text-xs font-bold ${textSub}`}>Upcoming</span>
                </div>
             </div>
        </motion.div>

        {/* 7. Productivity Chart (Full width) - Order Mobile: 7, Desktop: 7 */}
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35 }}
            className={`p-4 md:p-6 rounded-2xl border shadow-sm ${bgCard} col-span-2 md:col-span-3 order-7 md:order-7`}
        >
            <div className="flex items-center justify-between mb-4 gap-4">
                <h3 className={`font-bold text-lg flex items-center gap-2 ${textMain}`}>
                    <Calendar size={20} className={`text-${themeColor}-500`} /> 
                    Productivity
                </h3>
                <div className={`flex p-1 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    {(['week', 'month', 'year'] as const).map((r) => (
                        <button
                            key={r}
                            onClick={() => setGraphRange(r)}
                            className={`px-3 py-1 text-xs font-bold rounded-md capitalize transition-all ${
                                graphRange === r 
                                ? (isDark ? 'bg-gray-600 text-white' : 'bg-white text-gray-900 shadow-sm') 
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-48 w-full relative">
                <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                    {/* Grid Lines */}
                    <line x1="0" y1="45" x2="100" y2="45" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" />
                    <line x1="0" y1="27" x2="100" y2="27" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" />
                    
                    <defs>
                        <linearGradient id="gradientArea" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor={`var(--color-${themeColor}-500)`} stopOpacity="0.3"/>
                            <stop offset="100%" stopColor={`var(--color-${themeColor}-500)`} stopOpacity="0"/>
                        </linearGradient>
                    </defs>

                    {/* Area */}
                    <path 
                        d={lineGraphArea} 
                        fill="url(#gradientArea)" 
                    />
                    
                    {/* Line */}
                    <path 
                        d={lineGraphPath} 
                        fill="none" 
                        stroke={`var(--color-${themeColor}-500)`} 
                        strokeWidth="1.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        style={{ stroke: `var(--color-${themeColor}-600)` } as any}
                    />
                    
                    {/* Points and Labels */}
                    {stats.activityData.map((d, i) => {
                        const x = (i / (stats.activityData.length - 1)) * 100;
                        const y = 45 - (d.count / (stats.maxCount || 1)) * 35; // Match logic in useMemo
                        
                        return (
                            <g key={i}>
                                <circle 
                                    cx={x} 
                                    cy={y} 
                                    r={1.5} 
                                    fill={isDark ? '#1f2937' : '#ffffff'} 
                                    stroke={`var(--color-${themeColor}-500)`}
                                    strokeWidth={1}
                                    style={{ stroke: `var(--color-${themeColor}-600)` } as any}
                                />
                                {/* Count Label Above Point */}
                                {d.count > 0 && (
                                    <text 
                                        x={x} 
                                        y={y - 4} 
                                        textAnchor="middle" 
                                        fontSize="3" 
                                        fill="currentColor"
                                        className={`font-bold opacity-70 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
                                    >
                                        {d.count}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </svg>

                {/* X-Axis Labels */}
                <div className="flex justify-between mt-2 px-1">
                    {stats.activityData.map((d, i) => {
                         // Logic to skip labels to prevent overcrowding in month view
                        let showLabel = true;
                         // In month view (weekly), we might have 5 points, which fit fine. 
                         // But if we had daily month view (30 points), we would skip.
                         // Since we switched to weekly, we likely have 4-5 points, so show all.
                         // For Year view (12 points), show all (or skip odd ones if very cramped on mobile).
                        
                        return (
                            <div key={i} className={`flex flex-col items-center ${!showLabel ? 'invisible w-0' : 'w-auto'}`}>
                                <span className={`text-[10px] font-bold uppercase ${isSameDay(d.date, new Date()) ? `text-${themeColor}-600` : textSub}`}>
                                    {d.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </motion.div>

        {/* 8. Analysis Section (Full width) - Order Mobile: 8, Desktop: 8 */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.4 }}
            className={`col-span-2 md:col-span-3 p-4 md:p-6 rounded-2xl border shadow-sm order-8 md:order-8 ${bgCard}`}
        >
             <div className="flex items-center gap-2 mb-6">
                 <PieChartIcon size={20} className={`text-${themeColor}-500`} />
                 <h3 className={`text-lg font-bold ${textMain}`}>Analysis</h3>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 <ExplodingPieChart title="Section" data={stats.sectionPieData} isDark={isDark} />
                 <ExplodingPieChart title="Priority" data={stats.priorityPieData} isDark={isDark} />
                 <ExplodingPieChart title="Timing" data={stats.timePieData} isDark={isDark} />
             </div>
        </motion.div>

      </div>
    </div>
  );
};
