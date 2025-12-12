
import React, { useState, useRef, useEffect } from 'react';
import { Task, Subtask, Section, Priority, Recurrence } from '../types';
import { X, Check, AlertCircle, Bell, BellOff, ChevronDown, ChevronRight, CornerDownRight, Calendar, Repeat, RefreshCw } from 'lucide-react';
import { format, isSameDay, differenceInMinutes, addMinutes, isPast } from 'date-fns';
import { ScrollTimePicker } from './ScrollTimePicker';
import { motion, AnimatePresence } from 'framer-motion';

interface TimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  tasks: Task[];
  sections: Section[];
  onScheduleTask: (taskId: string, start: string, end: string, subtaskId?: string) => boolean;
  onToggleAlarm: (taskId: string) => void;
  onToggleRecurringSchedule: (taskId: string) => void;
  themeColor: string;
  isDark: boolean;
}

const parseISO = (str: string) => new Date(str);

export const TimelineModal: React.FC<TimelineModalProps> = ({ 
  isOpen, onClose, date, tasks = [], sections = [], onScheduleTask, onToggleAlarm, onToggleRecurringSchedule, themeColor, isDark 
}) => {
  const [selectedItemId, setSelectedItemId] = useState<{taskId: string, subtaskId?: string} | null>(null);
  const [draftStartMin, setDraftStartMin] = useState(540); 
  const [draftDuration, setDraftDuration] = useState(60); 
  const [error, setError] = useState<string | null>(null);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  
  // Picker State
  const [pickerMode, setPickerMode] = useState<'start' | 'end' | null>(null);
  const timePickerContainerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Close picker on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (timePickerContainerRef.current && !timePickerContainerRef.current.contains(event.target as Node)) {
            setPickerMode(null);
        }
    };
    if (pickerMode) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [pickerMode]);

  if (!isOpen) return null;

  const toggleExpand = (taskId: string) => {
      const newSet = new Set(expandedTaskIds);
      if (newSet.has(taskId)) newSet.delete(taskId);
      else newSet.add(taskId);
      setExpandedTaskIds(newSet);
  };

  const activeTasks = tasks.filter(t => !t.completed);
  
  // Categorize tasks for sidebar
  const unscheduled = activeTasks.filter(t => !t.scheduledStart);
  const scheduledToday = activeTasks.filter(t => t.scheduledStart && isSameDay(new Date(t.scheduledStart), date));
  const scheduledOther = activeTasks.filter(t => t.scheduledStart && !isSameDay(new Date(t.scheduledStart), date));
  
  // Completed Tasks for the selected date
  const completedToday = tasks.filter(t => 
    t.completed && 
    t.completedAt && 
    isSameDay(parseISO(t.completedAt), date)
  );

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const d = new Date();
    d.setHours(h, m);
    return format(d, 'h:mm a');
  };

  const minutesToPicker = (minutes: number) => {
      let h = Math.floor(minutes / 60);
      const m = minutes % 60;
      const ap = h >= 12 ? 'PM' : 'AM';
      if (h > 12) h -= 12;
      if (h === 0) h = 12;
      return {
          h: h.toString().padStart(2, '0'),
          m: m.toString().padStart(2, '0'),
          ap
      };
  };

  const pickerToMinutes = (h: string, m: string, ap: string) => {
      let hours = parseInt(h);
      const minutes = parseInt(m);
      if (ap === 'PM' && hours < 12) hours += 12;
      if (ap === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
  };

  const startVals = minutesToPicker(draftStartMin);
  const endVals = minutesToPicker(draftStartMin + draftDuration);

  const updateStart = (h: string, m: string, ap: string) => {
      const newStart = pickerToMinutes(h, m, ap);
      setDraftStartMin(Math.max(0, Math.min(1440 - 15, newStart)));
  };

  const updateEnd = (h: string, m: string, ap: string) => {
      let newEnd = pickerToMinutes(h, m, ap);
      if (newEnd <= draftStartMin) newEnd = draftStartMin + 15;
      if (newEnd > 1440) newEnd = 1440;
      setDraftDuration(newEnd - draftStartMin);
  };

  const getPriorityBadge = (p?: Priority) => {
    if (!p) return null;
    let colorClass = '';
    if (p === 'High') colorClass = 'bg-red-100 text-red-700 border-red-300';
    else if (p === 'Medium') colorClass = 'bg-yellow-100 text-yellow-700 border-yellow-300';
    else colorClass = 'bg-blue-100 text-blue-700 border-blue-300';

    return (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${colorClass}`}>
        {p}
      </span>
    );
  };

  const getTaskBackground = (sectionId?: string) => {
    if (!sectionId || !sections) return isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
    const section = sections.find(s => s.id === sectionId);
    if (!section || !section.color || section.color === 'gray') return isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
    
    return isDark 
        ? `bg-${section.color}-900/20 border-${section.color}-900/50` 
        : `bg-${section.color}-100 border-${section.color}-300 shadow-sm`;
  };

  const handleItemSelect = (task: Task, subtask?: Subtask) => {
    const itemId = subtask ? subtask.id : task.id;
    const scheduledStart = subtask ? subtask.scheduledStart : task.scheduledStart;
    const scheduledEnd = subtask ? subtask.scheduledEnd : task.scheduledEnd;

    setSelectedItemId({ taskId: task.id, subtaskId: subtask?.id });
    setError(null);
    setPickerMode(null);

    if (scheduledStart && isSameDay(new Date(scheduledStart), date)) {
        const start = new Date(scheduledStart);
        const end = scheduledEnd ? new Date(scheduledEnd) : addMinutes(start, 60);
        const startM = start.getHours() * 60 + start.getMinutes();
        const endM = end.getHours() * 60 + end.getMinutes();
        setDraftStartMin(startM);
        setDraftDuration(endM - startM);
    } else {
        const now = new Date();
        let defaultStart = 540; // 9 AM
        let defaultDuration = 60;

        if (isSameDay(date, now)) {
             const currentMin = now.getHours() * 60 + now.getMinutes();
             defaultStart = Math.ceil(currentMin / 15) * 15;
        }
        
        // If rescheduling a task from another day, preserve its duration if possible
        if (scheduledStart && scheduledEnd) {
            const s = new Date(scheduledStart);
            const e = new Date(scheduledEnd);
            defaultDuration = differenceInMinutes(e, s);
        }

        setDraftStartMin(defaultStart);
        setDraftDuration(defaultDuration);
    }
  };

  const handleDragStartSidebar = (e: React.DragEvent, task: Task, subtask?: Subtask) => {
    e.dataTransfer.setData('taskId', task.id);
    if (subtask) e.dataTransfer.setData('subtaskId', subtask.id);
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleDropOnTimeline = (e: React.DragEvent) => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData('taskId');
      const subtaskId = e.dataTransfer.getData('subtaskId'); // Might be empty
      if (!taskId) return;

      const rect = timelineRef.current?.getBoundingClientRect();
      const scrollTop = timelineRef.current?.scrollTop || 0;
      if (rect) {
          const y = e.clientY - rect.top + scrollTop;
          // Round to nearest 15
          let min = Math.floor(y / 15) * 15;
          if (min < 0) min = 0;
          if (min > 1380) min = 1380; // max start time

          // Validation: Don't allow drop in past if today
          if (isSameDay(date, new Date())) {
            const now = new Date();
            const currentMin = now.getHours() * 60 + now.getMinutes();
            if (min < currentMin) {
                setError("Cannot schedule in the past!");
                return;
            }
          }

          // Preserve duration if dragging existing scheduled task
          let duration = 60;
          const task = tasks.find(t => t.id === taskId);
          
          if (task) {
              // Check if we are dragging a subtask
              if (subtaskId && task.subtasks) {
                  const sub = task.subtasks.find(s => s.id === subtaskId);
                  if (sub && sub.scheduledStart && sub.scheduledEnd) {
                      const s = new Date(sub.scheduledStart);
                      const en = new Date(sub.scheduledEnd);
                      duration = differenceInMinutes(en, s);
                  }
              } else if (task.scheduledStart && task.scheduledEnd) {
                  // Dragging main task
                  const s = new Date(task.scheduledStart);
                  const en = new Date(task.scheduledEnd);
                  duration = differenceInMinutes(en, s);
              }
          }

          setSelectedItemId({ taskId, subtaskId: subtaskId || undefined });
          setDraftStartMin(min);
          setDraftDuration(duration);
          setError(null);
          setPickerMode(null);
      }
  };

  const handleSave = () => {
    if (selectedItemId) {
      if (isSameDay(date, new Date())) {
        const now = new Date();
        const currentMin = now.getHours() * 60 + now.getMinutes();
        if (draftStartMin < currentMin) {
            setError("Cannot schedule in the past!");
            return;
        }
      }

      const s = new Date(date);
      s.setHours(Math.floor(draftStartMin / 60));
      s.setMinutes(draftStartMin % 60);
      
      const e = new Date(date);
      e.setHours(Math.floor((draftStartMin + draftDuration) / 60));
      e.setMinutes((draftStartMin + draftDuration) % 60);
      
      const success = onScheduleTask(selectedItemId.taskId, s.toISOString(), e.toISOString(), selectedItemId.subtaskId);
      if (success) {
          setSelectedItemId(null);
          setError(null);
      } else {
          setError("Time slot overlaps with another task!");
      }
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end') => {
      const val = parseInt(e.target.value);
      if (type === 'start') {
          if (val < (draftStartMin + draftDuration) - 15) {
              const newDuration = (draftStartMin + draftDuration) - val;
              setDraftStartMin(val);
              setDraftDuration(newDuration);
          }
      } else {
          if (val > draftStartMin + 15) {
              setDraftDuration(val - draftStartMin);
          }
      }
  };

  // Safe check for current draft items
  const currentDraftTask = tasks.find(t => t.id === selectedItemId?.taskId);
  const currentDraftSubtask = currentDraftTask?.subtasks?.find(s => s.id === selectedItemId?.subtaskId);

  const renderSidebarTask = (task: Task, isOtherDay = false) => {
    const isExpanded = expandedTaskIds.has(task.id);
    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
    const isSelected = selectedItemId?.taskId === task.id && !selectedItemId?.subtaskId;
    
    // Styling
    const bgClass = getTaskBackground(task.sectionId);
    const isOverdue = task.dueDate && isPast(new Date(task.dueDate));
    const dateDisplay = task.dueDate ? format(new Date(task.dueDate), 'MMM d, h:mm a') : 'No Date Set';

    return (
        <motion.div 
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={task.id} 
            className="mb-3"
        >
            <div 
                draggable={true}
                onDragStart={(e) => handleDragStartSidebar(e, task)}
                onClick={() => handleItemSelect(task)}
                className={`p-4 rounded-xl border shadow-sm transition-all cursor-grab active:cursor-grabbing group relative flex flex-col gap-2 
                ${isSelected 
                    ? `ring-2 ring-${themeColor}-600 ring-offset-1 bg-${themeColor}-100 border-${themeColor}-400` 
                    : `${bgClass} ${isOtherDay ? 'opacity-60 grayscale' : ''} hover:shadow-md`
                }`}
            >
                {/* Date/Meta Info at Top */}
                <div className={`text-xs font-medium flex items-center gap-1.5 ${isOverdue ? 'text-red-600' : (isDark ? 'text-gray-400' : 'text-gray-500')}`}>
                    <Calendar size={12} />
                    {dateDisplay}
                    {task.recurrence && (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0 rounded-full uppercase ml-1 border border-blue-200">
                            <Repeat size={8} /> {task.recurrence}
                        </span>
                    )}
                </div>

                {/* Title & Chevron */}
                <div className="flex items-center justify-between">
                    <div className={`font-bold text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                        {task.title}
                    </div>
                    {hasSubtasks && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); toggleExpand(task.id); }}
                            className={`p-0.5 rounded transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}
                        >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                    )}
                </div>

                {/* Priority at Bottom */}
                <div className="flex items-center justify-between mt-1">
                     <div>
                        {getPriorityBadge(task.priority)}
                     </div>
                     {task.scheduledStart && <div className="text-[10px] font-bold text-green-600 flex items-center gap-1"><Check size={10} /> Scheduled</div>}
                </div>
            </div>

            {/* Subtasks */}
            {isExpanded && hasSubtasks && (
                <div className={`ml-4 pl-3 border-l-2 mt-2 space-y-2 animate-in slide-in-from-top-1 ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>
                    {task.subtasks!.map(sub => {
                         const isSubSelected = selectedItemId?.subtaskId === sub.id;
                         return (
                            <div 
                                key={sub.id}
                                draggable
                                onDragStart={(e) => handleDragStartSidebar(e, task, sub)}
                                onClick={() => handleItemSelect(task, sub)}
                                className={`p-3 rounded-xl border shadow-sm cursor-grab text-xs flex items-center gap-2 transition-colors ${
                                    isSubSelected
                                    ? `border-${themeColor}-400 bg-${themeColor}-100 ring-1 ring-${themeColor}-200` 
                                    : `${isDark ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'bg-white border-gray-200 hover:bg-gray-50'}`
                                }`}
                            >
                                <CornerDownRight size={12} className="text-gray-400" />
                                <span className="truncate flex-1">{sub.title}</span>
                                {sub.scheduledStart && <span className="text-[10px] text-green-600 font-bold">Scheduled</span>}
                            </div>
                         );
                    })}
                </div>
            )}
        </motion.div>
    );
  };

  return (
    // Changed fixed to absolute and contained in main
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
       <div className={`${isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex overflow-hidden animate-in fade-in zoom-in duration-200`}>
         
         {/* Left: Task Picker Sidebar */}
         <div className={`w-1/4 border-r flex flex-col ${isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
           <div className="p-4 border-b border-inherit bg-inherit z-10">
             <h3 className="font-bold text-lg">Schedule Tasks</h3>
             <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{format(date, 'MMMM d, yyyy')}</p>
             <p className="text-[10px] mt-1 text-gray-400">Drag main task or subtasks to timeline</p>
           </div>
           
           <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
             {/* Available / Today */}
             <div>
                <AnimatePresence>
                    {[...unscheduled, ...scheduledToday].map(task => renderSidebarTask(task, false))}
                </AnimatePresence>
             </div>
             
             {/* Scheduled Other */}
             {scheduledOther.length > 0 && (
                 <div className="pt-2 border-t border-dashed border-gray-300 dark:border-gray-700 mt-2">
                     <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Scheduled (Other Days)</h4>
                     {scheduledOther.map(task => renderSidebarTask(task, true))}
                 </div>
             )}
           </div>

           {/* Completed Today - Fixed Bottom Section */}
           {completedToday.length > 0 && (
             <div className={`p-3 border-t bg-inherit max-h-[30%] overflow-y-auto ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                 <h4 className="text-xs font-bold text-green-600 uppercase tracking-wider mb-2 sticky top-0 bg-inherit pb-1">Completed ({completedToday.length})</h4>
                 {completedToday.map(task => (
                    <div 
                        key={task.id}
                        className={`p-2 mb-2 rounded-lg border bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-900 text-sm opacity-80`}
                    >
                        <div className="font-bold line-through text-gray-500 dark:text-gray-400 truncate">{task.title}</div>
                        <div className="text-xs mt-0.5 text-green-600 dark:text-green-400 flex items-center gap-1">
                            <Check size={10} />
                            {task.completedAt ? format(parseISO(task.completedAt), 'h:mm a') : 'Done'}
                        </div>
                    </div>
                 ))}
             </div>
           )}
         </div>

         {/* Right: Vertical Timeline */}
         <div className="flex-1 flex flex-col relative bg-inherit">
           
           {/* Editing Header or Default Title */}
           {selectedItemId ? (
               <div className={`flex flex-col p-4 border-b z-20 shadow-sm ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} transition-all`}>
                 <div className="flex justify-between items-start mb-4">
                     <div>
                        <h3 className="font-bold text-lg leading-tight">
                            {currentDraftSubtask 
                                ? <span className="flex items-center gap-1">{currentDraftTask?.title} <ChevronRight size={14}/> {currentDraftSubtask.title}</span> 
                                : currentDraftTask?.title
                            }
                        </h3>
                        <div className={`text-xs font-bold flex items-center gap-1 mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            <Calendar size={12} />
                            {format(date, 'MMMM d, yyyy')}
                        </div>
                     </div>
                     <button onClick={() => { setSelectedItemId(null); setPickerMode(null); }} className="p-1.5 hover:bg-black/10 rounded-full"><X size={20} /></button>
                 </div>

                 {/* Time Pickers Row */}
                 <div className="flex flex-wrap items-center gap-3">
                     <div className="flex items-center gap-2 relative" ref={timePickerContainerRef}>
                        <button
                            onClick={() => setPickerMode(pickerMode === 'start' ? null : 'start')}
                            className={`px-3 py-2 rounded-lg border font-mono font-bold text-sm flex items-center gap-2 transition-colors ${
                                pickerMode === 'start' 
                                ? `ring-2 ring-${themeColor}-500 border-${themeColor}-500` 
                                : (isDark ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-gray-50 border-gray-300 hover:bg-gray-100')
                            }`}
                        >
                            {startVals.h}:{startVals.m} {startVals.ap}
                        </button>
                        <span className="text-gray-400 font-bold">-</span>
                        <button
                            onClick={() => setPickerMode(pickerMode === 'end' ? null : 'end')}
                            className={`px-3 py-2 rounded-lg border font-mono font-bold text-sm flex items-center gap-2 transition-colors ${
                                pickerMode === 'end' 
                                ? `ring-2 ring-${themeColor}-500 border-${themeColor}-500` 
                                : (isDark ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-gray-50 border-gray-300 hover:bg-gray-100')
                            }`}
                        >
                            {endVals.h}:{endVals.m} {endVals.ap}
                        </button>

                        {/* Popover */}
                        {pickerMode && (
                            <div className={`absolute top-full mt-2 left-0 z-50 shadow-xl rounded-xl border animate-in zoom-in-95 duration-200 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                 <div className="p-2">
                                    <ScrollTimePicker 
                                        hour={pickerMode === 'start' ? startVals.h : endVals.h}
                                        setHour={(v) => pickerMode === 'start' ? updateStart(v, startVals.m, startVals.ap) : updateEnd(v, endVals.m, endVals.ap)}
                                        minute={pickerMode === 'start' ? startVals.m : endVals.m}
                                        setMinute={(v) => pickerMode === 'start' ? updateStart(startVals.h, v, startVals.ap) : updateEnd(endVals.h, v, endVals.ap)}
                                        ampm={pickerMode === 'start' ? startVals.ap : endVals.ap}
                                        setAmpm={(v) => pickerMode === 'start' ? updateStart(startVals.h, startVals.m, v) : updateEnd(endVals.h, endVals.m, v)}
                                        themeColor={themeColor}
                                        isDark={isDark}
                                    />
                                 </div>
                            </div>
                        )}
                     </div>

                     <div className="flex-1"></div>

                     <button 
                        onClick={handleSave} 
                        className={`px-6 py-2 bg-${themeColor}-600 hover:bg-${themeColor}-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-md transition-transform active:scale-95`}
                    >
                        <Check size={18} /> Confirm
                    </button>
                 </div>
               </div>
           ) : (
               <div className={`flex justify-between items-center p-4 border-b z-20 shadow-sm ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                 <div>
                    <h3 className="font-bold">Timeline</h3>
                    <span className="text-xs text-gray-400">Select a task/subtask to schedule</span>
                 </div>
                 <button onClick={onClose} className="p-1.5 hover:bg-black/10 rounded-full"><X size={20} /></button>
               </div>
           )}

           {error && (
             <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-red-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-bold flex items-center gap-2 animate-bounce">
                <AlertCircle size={16} /> {error}
             </div>
           )}

           <div 
                className="flex-1 overflow-y-auto relative custom-scrollbar touch-pan-y" 
                ref={timelineRef}
                style={{ touchAction: 'pan-y' }}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
                onDrop={handleDropOnTimeline}
           >
              {/* Hour Grid */}
              <div className="relative h-[1440px] w-full">
                  {Array.from({ length: 24 }).map((_, i) => (
                      <div key={i} className={`absolute w-full border-t flex items-center ${isDark ? 'border-gray-700' : 'border-gray-200'}`} style={{ top: i * 60 }}>
                          <span className={`absolute -top-3 left-2 text-xs font-mono opacity-50 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                              {formatTime(i * 60)}
                          </span>
                      </div>
                  ))}

                  {/* Render Scheduled Items (Tasks and Subtasks) */}
                  <AnimatePresence>
                  {activeTasks.map(task => {
                      const itemsToRender = [];
                      
                      // Add Main Task if scheduled today
                      if (task.scheduledStart && isSameDay(parseISO(task.scheduledStart), date)) {
                          itemsToRender.push({
                              id: task.id,
                              title: task.title,
                              start: task.scheduledStart,
                              end: task.scheduledEnd,
                              isSubtask: false,
                              alarmSet: task.alarmSet,
                              recurrence: task.recurrence,
                              isRecurringSchedule: task.isRecurringSchedule
                          });
                      }

                      // Add Subtasks if scheduled today
                      if (task.subtasks) {
                          task.subtasks.forEach(sub => {
                              if (sub.scheduledStart && isSameDay(parseISO(sub.scheduledStart), date) && !sub.completed) {
                                  itemsToRender.push({
                                      id: sub.id,
                                      title: `${task.title}:${sub.title}`,
                                      start: sub.scheduledStart,
                                      end: sub.scheduledEnd,
                                      isSubtask: true,
                                      alarmSet: false, 
                                      recurrence: undefined,
                                      isRecurringSchedule: false
                                  });
                              }
                          });
                      }

                      return itemsToRender.map(item => {
                          // Skip rendering if this is the item being dragged/adjusted
                          if (selectedItemId?.taskId === task.id && (item.isSubtask ? selectedItemId.subtaskId === item.id : !selectedItemId.subtaskId)) return null;

                          const start = new Date(item.start!);
                          const end = item.end ? new Date(item.end) : addMinutes(start, 60);
                          const top = start.getHours() * 60 + start.getMinutes();
                          const height = Math.max(15, differenceInMinutes(end, start));

                          return (
                            <motion.div 
                                layoutId={item.id}
                                key={item.id}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                onClick={() => handleItemSelect(task, item.isSubtask ? task.subtasks!.find(s => s.id === item.id) : undefined)}
                                className={`absolute left-16 right-4 rounded-md p-2 border-l-4 overflow-hidden text-xs cursor-pointer hover:brightness-95 flex justify-between group shadow-sm
                                    ${isDark ? 'bg-gray-700 border-gray-500' : 'bg-white border-gray-400 ring-1 ring-gray-200'}
                                    ${item.isSubtask ? 'opacity-90 border-l-dashed' : ''}
                                `}
                                style={{ top, height }}
                            >
                                <div>
                                    <div className="font-bold truncate">{item.title}</div>
                                    <div>{format(start, 'h:mm')} - {format(end, 'h:mm a')}</div>
                                </div>
                                {!item.isSubtask && (
                                    <div className="flex flex-col items-end gap-1">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onToggleAlarm(task.id); }}
                                            className={`self-start p-1 rounded-full ${item.alarmSet ? `bg-${themeColor}-100 text-${themeColor}-600` : 'text-gray-400 hover:bg-gray-200'}`}
                                            title="Toggle Alarm"
                                        >
                                            {item.alarmSet ? <Bell size={16} fill="currentColor" /> : <BellOff size={16} />}
                                        </button>
                                        
                                        {/* Recurring Schedule Toggle - Only visible if Alarm is Set AND Recurrence exists */}
                                        {item.alarmSet && item.recurrence && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onToggleRecurringSchedule(task.id); }}
                                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors flex items-center gap-1 ${
                                                    item.isRecurringSchedule 
                                                    ? `bg-blue-100 text-blue-700 border-blue-200` 
                                                    : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                                                }`}
                                                title={`Schedule ${item.recurrence} at this time`}
                                            >
                                                <RefreshCw size={8} /> Schedule {item.recurrence.charAt(0).toUpperCase() + item.recurrence.slice(1)}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                          );
                      });
                  })}
                  </AnimatePresence>

                  {/* Draft Item (Task or Subtask) */}
                  {selectedItemId && (
                      <div 
                        className={`absolute left-16 right-4 rounded-md border-l-4 shadow-xl z-10 flex flex-col justify-between group cursor-move transition-colors
                           bg-${themeColor}-100 border-${themeColor}-600 text-${themeColor}-900
                        `}
                        style={{ top: draftStartMin, height: draftDuration }}
                      >
                         <div className="p-2 text-xs font-bold relative h-full pointer-events-none">
                            <div className="truncate">
                                {currentDraftSubtask 
                                    ? `${currentDraftTask?.title}:${currentDraftSubtask.title}` 
                                    : currentDraftTask?.title
                                }
                            </div>
                            <div className="opacity-75">{formatTime(draftStartMin)} - {formatTime(draftStartMin + draftDuration)}</div>
                         </div>
                         
                         {/* Handles */}
                         <div className="absolute top-0 w-full h-4 -mt-2 cursor-n-resize group/top z-20 flex justify-center items-center">
                            <div className={`w-8 h-1.5 rounded-full bg-${themeColor}-500 opacity-50 group-hover/top:opacity-100 shadow-sm transition-opacity`}></div>
                            <input 
                                type="range" min="0" max="1440" value={draftStartMin}
                                onChange={(e) => handleSliderChange(e, 'start')}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-n-resize"
                            />
                         </div>
                         
                         <div className="absolute bottom-0 w-full h-4 -mb-2 cursor-s-resize group/bottom z-20 flex justify-center items-center">
                            <div className={`w-8 h-1.5 rounded-full bg-${themeColor}-500 opacity-50 group-hover/bottom:opacity-100 shadow-sm transition-opacity`}></div>
                            <input 
                                type="range" min="0" max="1440" value={draftStartMin + draftDuration}
                                onChange={(e) => handleSliderChange(e, 'end')}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-s-resize"
                            />
                         </div>
                      </div>
                  )}
              </div>
           </div>
         </div>
       </div>
    </div>
  );
};