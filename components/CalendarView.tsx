
import React, { useState } from 'react';
import { Task, Section, Recurrence } from '../types';
import { format, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, endOfWeek, addMonths, isBefore, addWeeks, getWeekOfMonth, addDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Check, Calendar as CalendarIcon, Grid } from 'lucide-react';
import { TimelineModal } from './TimelineModal';

interface CalendarViewProps {
  tasks: Task[];
  sections: Section[];
  onAutoSchedule: () => void;
  onScheduleTask: (taskId: string, start: string, end: string, subtaskId?: string) => boolean;
  onToggleAlarm: (taskId: string) => void;
  onToggleRecurringSchedule: (taskId: string) => void;
  themeColor: string;
  isDark: boolean;
}

const parseISO = (str: string) => new Date(str);

const startOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const CalendarView: React.FC<CalendarViewProps> = ({ tasks, sections, onAutoSchedule, onScheduleTask, onToggleAlarm, onToggleRecurringSchedule, themeColor, isDark }) => {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const days = React.useMemo(() => {
    const startOfMonth = (date: Date) => {
       const d = new Date(date);
       d.setDate(1);
       d.setHours(0,0,0,0);
       return d;
    };
    
    if (viewMode === 'day') {
        return [currentDate];
    }

    if (viewMode === 'month') {
        const start = startOfWeek(startOfMonth(currentDate));
        const end = endOfWeek(endOfMonth(currentDate));
        return eachDayOfInterval({ start, end });
    } else {
        const start = startOfWeek(currentDate);
        const end = endOfWeek(currentDate);
        return eachDayOfInterval({ start, end });
    }
  }, [currentDate, viewMode]);

  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed && t.completedAt);
  
  const bgMain = isDark 
    ? 'bg-gray-800 border-gray-700' 
    : `bg-white/70 backdrop-blur-xl border-${themeColor}-200/50`;

  const textMain = isDark ? 'text-gray-100' : 'text-gray-800';

  const handlePrev = () => {
      if (viewMode === 'month') setCurrentDate(addMonths(currentDate, -1));
      else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, -1));
      else setCurrentDate(addDays(currentDate, -1));
  };

  const handleNext = () => {
      if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
      else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
      else setCurrentDate(addDays(currentDate, 1));
  };

  const getTitle = () => {
      if (viewMode === 'month') {
          return format(currentDate, 'MMMM yyyy');
      } else if (viewMode === 'week') {
          const weekNum = getWeekOfMonth(currentDate);
          return `${format(currentDate, 'MMMM')} - Week ${weekNum}`;
      } else {
          return format(currentDate, 'MMMM d, yyyy');
      }
  };

  return (
    <div className="flex flex-col gap-4 h-full overflow-hidden">
      {/* Title & View Toggle */}
      <div className="flex justify-between items-center px-2 shrink-0">
         <h2 className="text-xl md:text-2xl font-bold">Calendar</h2>
         <div className={`flex p-1 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
            {(['month', 'week', 'day'] as const).map(mode => (
                <button 
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1 text-xs font-bold rounded-md capitalize transition-all ${viewMode === mode ? (isDark ? 'bg-gray-600 text-white' : 'bg-white text-gray-900 shadow-sm') : (isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900')}`}
                >
                    {mode}
                </button>
            ))}
         </div>
      </div>

      <div className={`flex flex-col rounded-2xl shadow-sm border relative ${bgMain} overflow-hidden flex-1`}>
        {/* Header - Fixed width title container to stabilize arrows */}
        <div className={`p-4 md:p-6 border-b flex justify-between items-center shrink-0 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
          <div className="flex items-center gap-4">
            {/* Fixed min-width to prevent jumping on month change, accommodates long names like 'September 2024' */}
            <div className="min-w-[150px] md:min-w-[200px] text-left">
                <h2 className={`text-lg md:text-2xl font-bold ${textMain} whitespace-nowrap`}>
                {getTitle()}
                </h2>
            </div>
            <div className={`flex items-center rounded-lg p-1 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <button onClick={handlePrev} className={`p-1 rounded shadow-sm transition-all ${isDark ? 'hover:bg-gray-600 text-white' : 'hover:bg-white text-gray-600'}`}><ChevronLeft size={16} /></button>
              <button onClick={handleNext} className={`p-1 rounded shadow-sm transition-all ${isDark ? 'hover:bg-gray-600 text-white' : 'hover:bg-white text-gray-600'}`}><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>

        {/* Week Days Header - Hidden on mobile/tablet if in week/day view */}
        <div className={`grid grid-cols-7 border-b shrink-0 ${isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-100 bg-gray-50'} ${(viewMode === 'week' || viewMode === 'day') ? 'hidden lg:grid' : ''}`}>
          {viewMode === 'day' ? (
              // For Day View (Desktop Header) just show the day name centered
              <div className="col-span-7 py-2 md:py-3 text-center text-[10px] md:text-sm font-semibold opacity-60 uppercase tracking-wide">
                  {format(currentDate, 'EEEE')}
              </div>
          ) : (
              ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="py-2 md:py-3 text-center text-[10px] md:text-sm font-semibold opacity-60 uppercase tracking-wide">
                  {day}
                </div>
              ))
          )}
        </div>

        {/* Days Grid - Scrollable Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
            <div className={`grid 
                ${viewMode === 'week' ? 'grid-cols-1 auto-rows-min lg:grid-cols-7 lg:auto-rows-fr' : 
                  viewMode === 'day' ? 'grid-cols-1' : 'grid-cols-7 auto-rows-auto'} 
                w-full flex-1`}
            >
            {days.map(day => {
                // Find active tasks explicitly scheduled for this day
                const dayActiveTasks = activeTasks.filter(t => {
                    if (t.scheduledStart && isSameDay(parseISO(t.scheduledStart), day)) return true;
                    return false;
                });

                // Find completed tasks completed this day
                const dayCompletedTasks = completedTasks.filter(t => t.completedAt && isSameDay(parseISO(t.completedAt), day));

                const displayTasks = [...dayActiveTasks, ...dayCompletedTasks];
                
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());

                return (
                <div 
                    key={day.toISOString()} 
                    onClick={() => setSelectedDate(day)}
                    className={`border-b border-r p-1 transition-colors cursor-pointer flex gap-1 overflow-hidden
                    ${isDark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-50 hover:bg-gray-50'}
                    ${viewMode === 'month' && !isCurrentMonth ? (isDark ? 'bg-gray-900/50' : 'bg-gray-50/30') : (isDark ? 'bg-gray-800' : 'bg-transparent')}
                    /* Row layout for mobile week view, Column layout for others */
                    ${viewMode === 'week' ? 'flex-row min-h-[80px] lg:flex-col lg:min-h-0' : 
                      viewMode === 'day' ? 'flex-col min-h-[300px] p-4 gap-4' : 'flex-col min-h-[100px]'}
                    `}
                >
                    {/* Date Indicator */}
                    <div className={`
                        flex shrink-0 
                        ${viewMode === 'week' 
                            ? 'flex-col items-center justify-center w-12 border-r border-dashed mr-1 lg:w-auto lg:border-none lg:mr-0 lg:flex-row lg:justify-start lg:items-center lg:mb-1' 
                            : viewMode === 'day' 
                                ? 'flex-row items-center gap-2 mb-2 border-b pb-2' 
                                : 'items-center justify-center mb-1'
                        }
                        ${isDark ? 'border-gray-700' : 'border-gray-200'}
                    `}>
                        <div className={`text-xs md:text-sm font-medium flex items-center justify-center rounded-full 
                            ${viewMode === 'day' ? 'w-10 h-10 text-lg' : 'w-6 h-6 md:w-7 md:h-7'}
                            ${isToday ? `bg-${themeColor}-600 text-white` : isCurrentMonth || viewMode === 'week' || viewMode === 'day' ? (isDark ? 'text-gray-300' : 'text-gray-700') : 'text-gray-400 opacity-50'}`}>
                        {format(day, 'd')}
                        </div>
                        {/* Day Name for Mobile/Tablet Week View OR Day View */}
                        {(viewMode === 'week' || viewMode === 'day') && (
                            <span className={`lg:hidden text-[10px] font-bold uppercase ${viewMode === 'day' ? 'text-sm' : 'mt-1'} ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {format(day, 'EEE')}
                            </span>
                        )}
                    </div>
                    
                    {/* Task List */}
                    <div className={`flex-1 flex flex-col gap-1 justify-start ${viewMode === 'week' ? 'overflow-visible' : ''}`}>
                    {displayTasks.map(task => {
                        const isScheduled = !!task.scheduledStart;
                        const isCompleted = task.completed;
                        
                        let itemStyle = '';
                        if (isCompleted) {
                            itemStyle = isDark ? `border-gray-600 bg-gray-800 text-gray-500 line-through decoration-1` : `border-gray-200 bg-gray-100 text-gray-400 line-through decoration-1`;
                        } else if (isScheduled) {
                            itemStyle = `border-${themeColor}-500 bg-${themeColor}-500 text-white`;
                        } else {
                            itemStyle = isDark ? `border-gray-600 bg-gray-700 text-gray-300` : `border-gray-300 bg-gray-200 text-gray-600`;
                        }

                        // Larger items for day view
                        const dayViewStyle = viewMode === 'day' ? 'py-3 px-4 text-sm' : 'px-2 py-1 text-[10px]';

                        return (
                            <div 
                            key={task.id}
                            className={`rounded border truncate font-medium ${itemStyle} ${dayViewStyle}`}
                            title={task.title}
                            >
                            {isScheduled && !isCompleted ? format(new Date(task.scheduledStart!), 'h:mm a') : (task.dueDate && !isCompleted ? format(new Date(task.dueDate), 'h:mm a') : '')} {task.title}
                            </div>
                        );
                    })}
                    {displayTasks.length === 0 && viewMode === 'day' && (
                        <div className="flex-1 flex items-center justify-center text-gray-400 italic">No tasks scheduled for this day</div>
                    )}
                    </div>
                </div>
                );
            })}
            </div>
        </div>
        
        {/* Auto Schedule Button - Fixed at bottom */}
        <div className={`p-4 border-t bg-inherit flex justify-center shrink-0 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
            <button 
                onClick={onAutoSchedule}
                className={`w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-colors shadow-lg ${isDark ? `bg-${themeColor}-600 text-white hover:bg-${themeColor}-700` : `bg-${themeColor}-50 text-${themeColor}-700 hover:bg-${themeColor}-100`}`}
            >
                <Check size={18} /> Auto-Schedule All Tasks
            </button>
        </div>
      </div>

      {selectedDate && (
        <TimelineModal 
          isOpen={!!selectedDate}
          onClose={() => setSelectedDate(null)}
          date={selectedDate}
          tasks={tasks}
          sections={sections} // Pass sections to TimelineModal for styling
          onScheduleTask={onScheduleTask}
          onToggleAlarm={onToggleAlarm}
          onToggleRecurringSchedule={onToggleRecurringSchedule}
          themeColor={themeColor}
          isDark={isDark}
        />
      )}
    </div>
  );
};
