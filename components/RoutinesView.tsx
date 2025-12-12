
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Task, Routine } from '../types';
import { format, addMinutes } from 'date-fns';
import { Plus, Bell, BellOff, Trash2, Clock, Check, ChevronLeft, Edit2, Play, Pause, Calendar, X, Zap } from 'lucide-react';
import { ScrollTimePicker } from './ScrollTimePicker';
import { motion, AnimatePresence } from 'framer-motion';

interface RoutinesViewProps {
  routines: Routine[];
  allTasks: Task[]; // All tasks marked as isRoutine
  onAddRoutine: (routine: Routine) => void;
  onUpdateRoutine: (routine: Routine) => void;
  onDeleteRoutine: (id: string) => void;
  onAddRoutineTask: (task: Partial<Task>) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onInteract?: () => void;
  themeColor: string;
  isDark: boolean;
}

export const RoutinesView: React.FC<RoutinesViewProps> = ({ 
  routines, allTasks, onAddRoutine, onUpdateRoutine, onDeleteRoutine, onAddRoutineTask, onUpdateTask, onDeleteTask, onInteract, themeColor, isDark 
}) => {
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Editor State
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskAlarm, setNewTaskAlarm] = useState(false);
  
  // Time Picker Modal State
  const [pickerMode, setPickerMode] = useState<'start' | 'end' | null>(null);
  const timePickerRef = useRef<HTMLDivElement>(null);
  
  // Internal Time State (12H for Picker)
  const [startH, setStartH] = useState('09');
  const [startM, setStartM] = useState('00');
  const [startAP, setStartAP] = useState('AM');
  
  const [endH, setEndH] = useState('09');
  const [endM, setEndM] = useState('05');
  const [endAP, setEndAP] = useState('AM');

  // Create New Routine State
  const [editingRoutineTitle, setEditingRoutineTitle] = useState('');

  const timelineRef = useRef<HTMLDivElement>(null);
  const [draggingTask, setDraggingTask] = useState<{ id: string, action: 'move' | 'resize', startY: number, originalStart: number, originalDuration: number } | null>(null);

  const today = new Date();

  // Click outside listener for time picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (timePickerRef.current && !timePickerRef.current.contains(event.target as Node)) {
            setPickerMode(null);
        }
    };

    if (pickerMode) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [pickerMode]);

  // Auto-set End Time to 5 mins after Start Time whenever Start Time changes
  useEffect(() => {
    let sh = parseInt(startH);
    if (startAP === 'PM' && sh < 12) sh += 12;
    if (startAP === 'AM' && sh === 12) sh = 0;
    
    const startDate = new Date();
    startDate.setHours(sh, parseInt(startM), 0, 0);
    
    const endDate = addMinutes(startDate, 5);
    
    let eh = endDate.getHours();
    const em = endDate.getMinutes();
    const eap = eh >= 12 ? 'PM' : 'AM';
    if(eh > 12) eh -= 12;
    if(eh === 0) eh = 12;
    
    setEndH(eh.toString().padStart(2, '0'));
    setEndM(em.toString().padStart(2, '0'));
    setEndAP(eap);
  }, [startH, startM, startAP]);
  
  // Filter tasks for the selected routine
  const activeTasks = useMemo(() => {
      if (!selectedRoutineId) return [];
      return allTasks.filter(t => t.routineId === selectedRoutineId);
  }, [allTasks, selectedRoutineId]);

  // Upcoming Tasks Logic
  const upcomingRoutineTasks = useMemo(() => {
      const now = new Date();
      const currentDayIndex = now.getDay();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      // 1. Get Active Routine IDs for today
      const activeRoutineIds = routines
          .filter(r => r.isActive && r.activeDays.includes(currentDayIndex))
          .map(r => r.id);

      if (activeRoutineIds.length === 0) return [];

      // 2. Filter tasks
      const upcoming = allTasks.filter(t => {
          if (!t.isRoutine || !t.routineId) return false;
          if (!activeRoutineIds.includes(t.routineId)) return false;
          if (!t.scheduledStart) return false;

          const d = new Date(t.scheduledStart);
          const taskMinutes = d.getHours() * 60 + d.getMinutes();

          return taskMinutes > currentMinutes;
      });

      // 3. Sort by time
      upcoming.sort((a, b) => {
          const dA = new Date(a.scheduledStart!);
          const dB = new Date(b.scheduledStart!);
          const minA = dA.getHours() * 60 + dA.getMinutes();
          const minB = dB.getHours() * 60 + dB.getMinutes();
          return minA - minB;
      });

      return upcoming.slice(0, 5);
  }, [routines, allTasks]);

  // Helpers
  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const d = new Date();
    d.setHours(h, m);
    return format(d, 'h:mm a');
  };

  const getMinutesFromISO = (iso: string) => {
    const d = new Date(iso);
    return d.getHours() * 60 + d.getMinutes();
  };

  const getDisplayTime = (h: string, m: string, ap: string) => {
      return `${h}:${m} ${ap}`;
  };

  // Helper to find which days are taken by OTHER ACTIVE routines
  const getOccupiedDays = (currentRoutineId: string) => {
      const occupied = new Set<number>();
      routines.forEach(r => {
          if (r.id !== currentRoutineId && r.isActive) {
              r.activeDays.forEach(d => occupied.add(d));
          }
      });
      return occupied;
  };

  const handleCreateNewRoutine = () => {
      const newId = crypto.randomUUID();
      // Set draft state
      setSelectedRoutineId(newId);
      setEditingRoutineTitle(''); // Start with empty title
      setIsCreating(true);
      setView('edit');
  };

  const handleEditRoutine = (routine: Routine) => {
      setSelectedRoutineId(routine.id);
      setEditingRoutineTitle(routine.title);
      setIsCreating(false);
      setView('edit');
  };

  const handleBack = () => {
      // If we were creating a new routine and didn't save, we must cleanup the draft tasks
      if (isCreating && selectedRoutineId) {
          activeTasks.forEach(t => onDeleteTask(t.id));
      }
      setView('list');
      setSelectedRoutineId(null);
      setIsCreating(false);
      setNewTaskName('');
  };

  const handleDeleteCurrentRoutine = () => {
      if (selectedRoutineId && !isCreating) {
             onDeleteRoutine(selectedRoutineId);
             setView('list');
             setSelectedRoutineId(null);
             setNewTaskName('');
      } else if (isCreating) {
          handleBack();
      }
  };

  const handleSaveRoutine = () => {
     if (!editingRoutineTitle.trim()) {
         alert("Please enter a routine name.");
         return;
     }

     if(selectedRoutineId) {
         if (isCreating) {
             const newRoutine: Routine = {
                 id: selectedRoutineId,
                 title: editingRoutineTitle,
                 scheduleType: 'manual',
                 activeDays: [],
                 isActive: false
             };
             onAddRoutine(newRoutine);
         } else {
             const routine = routines.find(r => r.id === selectedRoutineId);
             if(routine) {
                 onUpdateRoutine({ ...routine, title: editingRoutineTitle });
             }
         }
         setView('list');
         setSelectedRoutineId(null);
         setIsCreating(false);
         setNewTaskName('');
     }
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim() || !selectedRoutineId) return;

    // Convert picker state to 24h
    let sh = parseInt(startH);
    if (startAP === 'PM' && sh < 12) sh += 12;
    if (startAP === 'AM' && sh === 12) sh = 0;
    
    let eh = parseInt(endH);
    if (endAP === 'PM' && eh < 12) eh += 12;
    if (endAP === 'AM' && eh === 12) eh = 0;

    const start = new Date(today);
    start.setHours(sh, parseInt(startM), 0, 0);
    
    let end = new Date(today);
    end.setHours(eh, parseInt(endM), 0, 0);
    
    if (end <= start) {
        alert("End time must be after start time.");
        return;
    }

    onAddRoutineTask({
      title: newTaskName,
      scheduledStart: start.toISOString(),
      scheduledEnd: end.toISOString(),
      alarmSet: newTaskAlarm,
      isRoutine: true,
      recurrence: 'daily',
      routineId: selectedRoutineId
    });

    setNewTaskName('');
    setNewTaskAlarm(false);
  };

  // Drag Handlers
  const handlePointerDown = (e: React.PointerEvent, task: Task, action: 'move' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    if (!task.scheduledStart || !task.scheduledEnd) return;

    const startM = getMinutesFromISO(task.scheduledStart);
    const endM = getMinutesFromISO(task.scheduledEnd);

    setDraggingTask({
        id: task.id,
        action,
        startY: e.clientY,
        originalStart: startM,
        originalDuration: endM - startM
    });
    
    if (timelineRef.current) {
        timelineRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingTask || !timelineRef.current) return;
    
    const deltaY = e.clientY - draggingTask.startY;
    const deltaMinutes = Math.round(deltaY / 60 * 60 / 15) * 15;
    
    if (deltaMinutes === 0) return;

    const originalStart = draggingTask.originalStart;
    const originalDuration = draggingTask.originalDuration;

    let newStart = originalStart;
    let newEnd = originalStart + originalDuration;

    if (draggingTask.action === 'move') {
        newStart = Math.max(0, Math.min(1440 - originalDuration, originalStart + deltaMinutes));
        newEnd = newStart + originalDuration;
    } else {
        const newDuration = Math.max(15, originalDuration + deltaMinutes);
        newEnd = Math.min(1440, newStart + newDuration);
    }
    
    const s = new Date(today);
    s.setHours(Math.floor(newStart / 60), newStart % 60, 0, 0);
    
    const en = new Date(today);
    en.setHours(Math.floor(newEnd / 60), newEnd % 60, 0, 0);

    const task = allTasks.find(t => t.id === draggingTask.id);
    if (task) {
        onUpdateTask({
            ...task,
            scheduledStart: s.toISOString(),
            scheduledEnd: en.toISOString()
        });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingTask) {
        setDraggingTask(null);
        if (timelineRef.current) {
            timelineRef.current.releasePointerCapture(e.pointerId);
        }
    }
  };

  const toggleDay = (routine: Routine, dayIndex: number) => {
      if (routine.isActive) {
          const occupied = getOccupiedDays(routine.id);
          if (occupied.has(dayIndex)) return; 
      }

      const currentDays = routine.activeDays;
      let newDays;
      if (currentDays.includes(dayIndex)) {
          newDays = currentDays.filter(d => d !== dayIndex);
      } else {
          newDays = [...currentDays, dayIndex].sort();
      }
      onUpdateRoutine({ ...routine, activeDays: newDays, scheduleType: newDays.length > 0 ? 'weekly' : 'manual' });
  };

  const bgBase = isDark ? 'bg-gray-800' : 'bg-white/60 backdrop-blur-md';
  const textMain = isDark ? 'text-gray-100' : 'text-gray-900';
  const textSub = isDark ? 'text-gray-400' : 'text-gray-500';
  const borderCol = isDark ? 'border-gray-700' : `border-${themeColor}-200/50`;

  return (
    <div className="h-full flex flex-col gap-4 relative overflow-hidden">
        <AnimatePresence mode="wait">
        {view === 'list' ? (
          <motion.div 
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full flex flex-col gap-4"
          >
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pt-2">
                  <AnimatePresence mode="popLayout">
                    {routines.length === 0 && (
                        <div className={`text-center py-10 ${textSub}`}>No routines created yet.</div>
                    )}
                    {routines.map(routine => {
                        const occupied = routine.isActive ? getOccupiedDays(routine.id) : new Set<number>();
                        
                        const cardStyle = routine.isActive 
                            ? (isDark 
                                ? `bg-${themeColor}-900/40 border-${themeColor}-700 ring-1 ring-${themeColor}-800` 
                                : `bg-${themeColor}-50 border-${themeColor}-200`)
                            : `${isDark ? 'bg-gray-800' : 'bg-gray-100'} border-gray-200 dark:border-gray-700 grayscale-[0.3] opacity-90`;

                        return (
                            <motion.div 
                                layout
                                key={routine.id} 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className={`p-4 rounded-xl border shadow-sm transition-all ${cardStyle}`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className={`text-lg font-bold ${textMain}`}>{routine.title}</h3>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => onUpdateRoutine({ ...routine, isActive: !routine.isActive })}
                                            className={`p-2 rounded-lg border flex items-center gap-2 text-xs font-bold transition-colors ${
                                                routine.isActive 
                                                ? `bg-green-100 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400` 
                                                : `${isDark ? 'bg-gray-700 border-gray-600 text-gray-400' : 'bg-gray-200 border-gray-300 text-gray-500'}`
                                            }`}
                                            title={routine.isActive ? "Click to deactivate" : "Click to activate"}
                                        >
                                            {routine.isActive ? <Play size={14} fill="currentColor" /> : <Pause size={14} />}
                                            {routine.isActive ? 'Active' : 'Inactive'}
                                        </button>
                                        <button 
                                            onClick={() => handleEditRoutine(routine)}
                                            className={`p-2 rounded-lg border ${isDark ? 'border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700' : 'border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteRoutine(routine.id);
                                            }}
                                            className={`p-2 rounded-lg border ${isDark ? 'border-gray-600 text-gray-400 hover:text-red-500 hover:bg-gray-700' : 'border-gray-200 text-gray-500 hover:text-red-600 hover:bg-gray-50'}`}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Schedule Config */}
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1">
                                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => {
                                            const isActiveDay = routine.activeDays.includes(idx);
                                            const isOccupied = occupied.has(idx);
                                            
                                            let buttonClass = '';
                                            if (isOccupied) {
                                                buttonClass = isDark ? 'bg-gray-800 text-gray-600 border border-gray-700 cursor-not-allowed opacity-50' : 'bg-gray-100 text-gray-300 border border-gray-200 cursor-not-allowed';
                                            } else if (isActiveDay) {
                                                buttonClass = `bg-${themeColor}-600 text-white shadow-md scale-105`;
                                            } else {
                                                buttonClass = isDark ? 'bg-gray-700 text-gray-500 hover:bg-gray-600' : 'bg-gray-200 text-gray-400 hover:bg-gray-300';
                                            }

                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => toggleDay(routine, idx)}
                                                    disabled={isOccupied}
                                                    className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center transition-all ${buttonClass}`}
                                                    title={isOccupied ? 'Day used by another active routine' : ''}
                                                >
                                                    {day}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                  </AnimatePresence>

                  {/* Today's Upcoming Routine Activities */}
                  {upcomingRoutineTasks.length > 0 && (
                      <div className="pt-4 border-t border-dashed border-gray-300 dark:border-gray-700">
                          <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2 ${textSub}`}>
                              <Zap size={14} className={`text-${themeColor}-500`} /> 
                              Upcoming Activities (Today)
                          </h4>
                          <div className="space-y-2">
                              {upcomingRoutineTasks.map(task => {
                                  const d = new Date(task.scheduledStart!);
                                  const formattedTime = format(d, 'h:mm a');
                                  return (
                                      <motion.div 
                                          initial={{ opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          key={task.id}
                                          className={`p-3 rounded-lg border text-sm flex items-center justify-between ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}
                                      >
                                          <span className={`font-medium ${textMain}`}>{task.title}</span>
                                          <div className="flex items-center gap-2">
                                              <span className={`text-xs font-bold px-2 py-1 rounded bg-${themeColor}-100 text-${themeColor}-700 dark:bg-${themeColor}-900/30 dark:text-${themeColor}-400`}>
                                                  {formattedTime}
                                              </span>
                                              <button 
                                                  onClick={() => onUpdateTask({ ...task, alarmSet: !task.alarmSet })}
                                                  className={`p-1.5 rounded-md border transition-colors ${
                                                      task.alarmSet 
                                                      ? `bg-${themeColor}-100 border-${themeColor}-200 text-${themeColor}-600 dark:bg-${themeColor}-900/30 dark:border-${themeColor}-800 dark:text-${themeColor}-400` 
                                                      : (isDark ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-200 text-gray-400 hover:bg-gray-100')
                                                  }`}
                                                  title="Toggle Alarm"
                                              >
                                                  {task.alarmSet ? <Bell size={14} /> : <BellOff size={14} />}
                                              </button>
                                          </div>
                                      </motion.div>
                                  );
                              })}
                          </div>
                      </div>
                  )}
              </div>

              {/* Add Routine Extended FAB */}
              <button
                  onClick={() => {
                      handleCreateNewRoutine();
                      onInteract?.();
                  }}
                  className={`fixed bottom-8 right-8 px-4 py-3 md:px-6 md:py-4 bg-${themeColor}-600 hover:bg-${themeColor}-700 text-white rounded-full shadow-lg flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 z-50`}
              >
                  <Plus size={24} className="w-5 h-5 md:w-6 md:h-6" />
                  <span className="font-bold text-sm md:text-lg">New Routine</span>
              </button>
          </motion.div>
      ) : (
        <motion.div 
            key="edit"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="h-full flex flex-col gap-4 select-none"
        >
            {/* Editor Header */}
            <div className={`p-4 rounded-xl shadow-sm border flex justify-between items-center ${bgBase} ${borderCol}`}>
                <div className="flex items-center gap-3 flex-1">
                    <button 
                        onClick={handleBack}
                        className={`p-2 rounded-full hover:bg-black/5 ${textSub}`}
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <input 
                        type="text"
                        value={editingRoutineTitle}
                        onChange={(e) => setEditingRoutineTitle(e.target.value)}
                        className={`text-xl font-bold bg-transparent outline-none w-full ${textMain}`}
                        placeholder="Routine Name"
                    />
                </div>
                <div className="flex gap-2">
                    {!isCreating && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCurrentRoutine();
                            }}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                            <Trash2 size={20} />
                        </button>
                    )}
                    <button 
                        onClick={handleSaveRoutine}
                        className={`px-4 py-2 bg-${themeColor}-600 hover:bg-${themeColor}-700 text-white rounded-lg font-bold shadow-md flex items-center gap-2`}
                    >
                        <Check size={18} /> Save
                    </button>
                </div>
            </div>

            {/* Timeline View (Your Day) */}
            <div className={`flex-1 rounded-xl shadow-sm border overflow-hidden flex flex-col relative ${bgBase} ${borderCol}`}>
                <div className={`p-3 border-b text-xs font-bold text-center uppercase tracking-wider ${isDark ? 'bg-gray-900 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                    Your Day
                </div>
                
                <div 
                    className="flex-1 overflow-y-auto relative custom-scrollbar touch-none"
                    ref={timelineRef}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                >
                    <div className="relative h-[1440px] w-full">
                        {/* Grid Lines */}
                        {Array.from({ length: 24 }).map((_, i) => (
                            <div key={i} className={`absolute w-full border-t flex items-center ${borderCol}`} style={{ top: i * 60 }}>
                                <span className={`absolute -top-3 left-2 text-xs font-mono opacity-50 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                    {formatTime(i * 60)}
                                </span>
                            </div>
                        ))}

                        {/* Tasks */}
                        <AnimatePresence>
                        {activeTasks.map(task => {
                            if (!task.scheduledStart) return null;
                            const start = new Date(task.scheduledStart);
                            const end = task.scheduledEnd ? new Date(task.scheduledEnd) : addMinutes(start, 60);
                            
                            const startM = start.getHours() * 60 + start.getMinutes();
                            const endM = end.getHours() * 60 + end.getMinutes();
                            const duration = endM - startM;
                            
                            return (
                                <motion.div 
                                    layoutId={task.id}
                                    key={task.id}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.5 }}
                                    className={`absolute left-16 right-4 rounded-lg border-l-4 shadow-sm text-xs flex justify-between items-start group overflow-hidden z-10
                                        ${isDark ? 'bg-gray-700 border-gray-500' : `bg-${themeColor}-50 border-${themeColor}-400 ring-1 ring-${themeColor}-100`}
                                        ${draggingTask?.id === task.id ? 'opacity-80 scale-[1.01] shadow-xl z-20 cursor-grabbing' : 'hover:scale-[1.01] hover:z-20'}
                                    `}
                                    style={{ top: startM, height: Math.max(15, duration) }}
                                >
                                    {/* Move Handle (Body) */}
                                    <div 
                                        className="absolute inset-0 cursor-grab active:cursor-grabbing"
                                        onPointerDown={(e) => handlePointerDown(e, task, 'move')}
                                    ></div>

                                    <div className="flex gap-2 h-full relative pointer-events-none p-2 w-full">
                                        <div className={`h-full w-1 rounded-full ${isDark ? 'bg-gray-600' : `bg-${themeColor}-200`}`}></div>
                                        <div className="flex-1 min-w-0">
                                            <div className={`font-bold text-sm truncate ${isDark ? 'text-gray-100' : `text-${themeColor}-900`}`}>{task.title}</div>
                                            <div className={`text-[10px] ${isDark ? 'text-gray-400' : `text-${themeColor}-700`}`}>
                                                {format(start, 'h:mm')} - {format(end, 'h:mm a')}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="relative z-10 p-2 flex flex-row items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => onUpdateTask({ ...task, alarmSet: !task.alarmSet })}
                                            className={`p-1 rounded-full ${task.alarmSet ? `bg-${themeColor}-100 text-${themeColor}-600` : 'text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                        >
                                            {task.alarmSet ? <Bell size={16} /> : <BellOff size={16} />}
                                        </button>
                                        <button 
                                            onClick={() => onDeleteTask(task.id)}
                                            className="p-1 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    {/* Resize Handle (Bottom) */}
                                    <div 
                                        className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize flex justify-center items-end pb-0.5 group/handle hover:bg-black/5 z-20"
                                        onPointerDown={(e) => handlePointerDown(e, task, 'resize')}
                                    >
                                        <div className={`w-8 h-1 rounded-full ${isDark ? 'bg-gray-500' : `bg-${themeColor}-300`}`}></div>
                                    </div>
                                </motion.div>
                            );
                        })}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Quick Add Bar */}
            <div className={`p-4 rounded-xl shadow-sm border ${bgBase} ${borderCol}`}>
                <h3 className={`font-bold mb-3 flex items-center gap-2 ${textMain}`}>
                    <Clock size={18} className={`text-${themeColor}-600`} />
                    Add Activity
                </h3>
                <form onSubmit={handleQuickAdd} className="flex gap-2 items-center flex-wrap md:flex-nowrap relative">
                    <input 
                        type="text" 
                        value={newTaskName}
                        onChange={(e) => setNewTaskName(e.target.value)}
                        placeholder="Routine Name"
                        className={`flex-1 p-2 rounded-lg border outline-none text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                    />
                    
                    <div className="flex items-center gap-1 relative" ref={timePickerRef}>
                        <button
                            type="button"
                            onClick={() => setPickerMode('start')}
                            className={`px-3 py-2 rounded-lg border text-sm font-mono font-bold whitespace-nowrap transition-colors ${
                                isDark ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' : 'bg-gray-50 border-gray-300 text-gray-900 hover:bg-gray-100'
                            }`}
                        >
                            {getDisplayTime(startH, startM, startAP)}
                        </button>
                        <span className="text-gray-400">-</span>
                        <button
                            type="button"
                            onClick={() => setPickerMode('end')}
                            className={`px-3 py-2 rounded-lg border text-sm font-mono font-bold whitespace-nowrap transition-colors ${
                                isDark ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' : 'bg-gray-50 border-gray-300 text-gray-900 hover:bg-gray-100'
                            }`}
                        >
                            {getDisplayTime(endH, endM, endAP)}
                        </button>

                        {/* Inline Time Picker Popover */}
                        {pickerMode && (
                            <div className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 shadow-xl rounded-xl border animate-in zoom-in-95 duration-200 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                <div className="p-2">
                                    <ScrollTimePicker 
                                        hour={pickerMode === 'start' ? startH : endH}
                                        setHour={pickerMode === 'start' ? setStartH : setEndH}
                                        minute={pickerMode === 'start' ? startM : endM}
                                        setMinute={pickerMode === 'start' ? setStartM : setEndM}
                                        ampm={pickerMode === 'start' ? startAP : endAP}
                                        setAmpm={pickerMode === 'start' ? setStartAP : setEndAP}
                                        themeColor={themeColor}
                                        isDark={isDark}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => setNewTaskAlarm(!newTaskAlarm)}
                        className={`p-2 rounded-lg border transition-colors ${newTaskAlarm ? `bg-${themeColor}-100 text-${themeColor}-600 border-${themeColor}-200` : (isDark ? 'bg-gray-700 border-gray-600 text-gray-400' : 'bg-gray-50 border-gray-300 text-gray-500')}`}
                        title="Toggle Alarm"
                    >
                        {newTaskAlarm ? <Bell size={18} /> : <BellOff size={18} />}
                    </button>
                    <button 
                        type="submit"
                        disabled={!newTaskName}
                        className={`px-4 py-2 bg-${themeColor}-600 text-white rounded-lg font-bold text-sm shadow-md hover:bg-${themeColor}-700 transition-colors disabled:opacity-50`}
                    >
                        <Plus size={18} /> Add
                    </button>
                </form>
            </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};
