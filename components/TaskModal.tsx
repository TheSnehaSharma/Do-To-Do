
import React, { useState, useEffect, useRef } from 'react';
import { Task, Section, Priority, Recurrence, Subtask } from '../types';
import { X, Calendar, Flag, List, Repeat, Plus, Trash2, ChevronRight, Clock, Edit2, Check, RotateCcw } from 'lucide-react';
import { format, isBefore, isSameDay } from 'date-fns';
import { ScrollTimePicker } from './ScrollTimePicker';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
  initialTask?: Task;
  sections: Section[];
  themeColor: string;
  isDark: boolean;
}

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSave, initialTask, sections, themeColor, isDark }) => {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [priority, setPriority] = useState<Priority | undefined>(undefined);
  const [dateStr, setDateStr] = useState('');
  const [hour12, setHour12] = useState('12');
  const [minute, setMinute] = useState('00');
  const [ampm, setAmpm] = useState('PM');
  const [sectionId, setSectionId] = useState<string | undefined>(undefined);
  const [recurrence, setRecurrence] = useState<Recurrence | undefined>(undefined);
  
  // UI State
  const [showTimePicker, setShowTimePicker] = useState(false);
  const timePickerRef = useRef<HTMLDivElement>(null);

  // Subtasks State
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [showSubtaskDate, setShowSubtaskDate] = useState(false);
  const [newSubtaskDate, setNewSubtaskDate] = useState('');
  const [newSubtaskTime, setNewSubtaskTime] = useState('');
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);

  // Subtask Time Picker State
  const [subtaskPickerOpen, setSubtaskPickerOpen] = useState(false);
  const [stHour, setStHour] = useState('12');
  const [stMinute, setStMinute] = useState('00');
  const [stAmpm, setStAmpm] = useState('PM');
  const subtaskPickerRef = useRef<HTMLDivElement>(null);

  // Click outside to close time pickers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (timePickerRef.current && !timePickerRef.current.contains(event.target as Node)) {
            setShowTimePicker(false);
        }
        if (subtaskPickerRef.current && !subtaskPickerRef.current.contains(event.target as Node)) {
            setSubtaskPickerOpen(false);
        }
    };

    if (showTimePicker || subtaskPickerOpen) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTimePicker, subtaskPickerOpen]);

  // Sync subtask time picker to string
  useEffect(() => {
      let h = parseInt(stHour);
      if (stAmpm === 'PM' && h < 12) h += 12;
      if (stAmpm === 'AM' && h === 12) h = 0;
      setNewSubtaskTime(`${h.toString().padStart(2, '0')}:${stMinute}`);
  }, [stHour, stMinute, stAmpm]);

  useEffect(() => {
    if (isOpen) {
      if (initialTask) {
        setTitle(initialTask.title);
        setNote(initialTask.note || '');
        setPriority(initialTask.priority);
        setSectionId(initialTask.sectionId);
        setRecurrence(initialTask.recurrence);
        setSubtasks(initialTask.subtasks || []);
        
        if (initialTask.dueDate) {
          const d = new Date(initialTask.dueDate);
          setDateStr(format(d, 'yyyy-MM-dd'));
          let h = d.getHours();
          const m = d.getMinutes();
          const isPm = h >= 12;
          if (h > 12) h -= 12;
          if (h === 0) h = 12;
          
          setHour12(h.toString().padStart(2, '0'));
          setMinute(m.toString().padStart(2, '0'));
          setAmpm(isPm ? 'PM' : 'AM');
        } else {
          setDateStr('');
          setHour12('12');
          setMinute('00');
          setAmpm('PM');
        }
      } else {
        setTitle('');
        setNote('');
        setPriority(undefined);
        setSectionId(undefined);
        setRecurrence(undefined);
        setSubtasks([]);
        setDateStr('');
        setHour12('12');
        setMinute('00');
        setAmpm('PM');
      }
      setShowTimePicker(false);
      resetSubtaskInput();
    }
  }, [isOpen, initialTask]);

  const resetSubtaskInput = () => {
    setNewSubtaskTitle('');
    setShowSubtaskDate(false);
    setNewSubtaskDate('');
    setNewSubtaskTime('');
    
    // Reset Picker
    setStHour('12');
    setStMinute('00');
    setStAmpm('PM');
    
    setEditingSubtaskId(null);
  };

  if (!isOpen) return null;

  const handleAddOrUpdateSubtask = () => {
    if (!newSubtaskTitle.trim()) return;

    let finalSubtaskDate = undefined;
    if (showSubtaskDate && newSubtaskDate) {
         // Construct date
         const d = new Date(newSubtaskDate + (newSubtaskTime ? `T${newSubtaskTime}` : 'T12:00'));
         finalSubtaskDate = d.toISOString();
    }

    if (editingSubtaskId) {
        setSubtasks(subtasks.map(s => s.id === editingSubtaskId ? {
            ...s,
            title: newSubtaskTitle.trim(),
            dueDate: finalSubtaskDate
        } : s));
    } else {
        const newSub: Subtask = {
            id: crypto.randomUUID(),
            title: newSubtaskTitle.trim(),
            completed: false,
            dueDate: finalSubtaskDate
        };
        setSubtasks([...subtasks, newSub]);
    }
    
    resetSubtaskInput();
  };

  const startEditingSubtask = (sub: Subtask) => {
      setEditingSubtaskId(sub.id);
      setNewSubtaskTitle(sub.title);
      if (sub.dueDate) {
          const d = new Date(sub.dueDate);
          setNewSubtaskDate(format(d, 'yyyy-MM-dd'));
          setNewSubtaskTime(format(d, 'HH:mm'));
          
          let h = d.getHours();
          const m = d.getMinutes();
          const ap = h >= 12 ? 'PM' : 'AM';
          if (h > 12) h -= 12;
          if (h === 0) h = 12;
          setStHour(h.toString().padStart(2, '0'));
          setStMinute(m.toString().padStart(2, '0'));
          setStAmpm(ap);
          
          setShowSubtaskDate(true);
      } else {
          setNewSubtaskDate('');
          setNewSubtaskTime('');
          setStHour('12');
          setStMinute('00');
          setStAmpm('PM');
          setShowSubtaskDate(false);
      }
  };

  const handleDeleteSubtask = (id: string) => {
    setSubtasks(subtasks.filter(s => s.id !== id));
    if (editingSubtaskId === id) {
        resetSubtaskInput();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalDate = undefined;
    
    if (dateStr) {
       if (isBefore(new Date(dateStr), startOfToday())) {
         alert("Finish date cannot be in the past.");
         return;
       }
       
       let h = parseInt(hour12);
       if (ampm === 'PM' && h < 12) h += 12;
       if (ampm === 'AM' && h === 12) h = 0;

       const d = new Date(`${dateStr}T${h.toString().padStart(2, '0')}:${minute}`);
       
       const now = new Date();
       const isToday = new Date(dateStr).getDate() === now.getDate() && 
                       new Date(dateStr).getMonth() === now.getMonth() && 
                       new Date(dateStr).getFullYear() === now.getFullYear();

       if (isToday) {
         const checkTime = new Date();
         checkTime.setHours(h, parseInt(minute), 0, 0);
         if (checkTime < now) {
           alert("Finish time cannot be in the past.");
           return;
         }
       }
       finalDate = d.toISOString();
    } 

    onSave({
      ...initialTask,
      title,
      note,
      priority,
      dueDate: finalDate,
      sectionId,
      recurrence: dateStr ? recurrence : undefined,
      subtasks
    });
    onClose();
  };

  const bgBase = isDark ? 'bg-gray-800' : 'bg-white';
  const textBase = isDark ? 'text-white' : 'text-gray-900';
  const inputBg = isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300';
  const headerBg = isDark ? 'bg-gray-900 border-gray-700' : `bg-${themeColor}-100 border-gray-200`;

  return (
    <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className={`${bgBase} rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90%]`}>
        <div className={`flex justify-between items-center p-4 border-b ${headerBg}`}>
          <h2 className={`text-xl font-bold ${isDark ? 'text-gray-100' : `text-${themeColor}-900`}`}>
            {initialTask ? 'Edit Task' : 'New Task'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full transition-colors">
            <X size={20} className={isDark ? 'text-gray-400' : `text-${themeColor}-800`} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          
          {/* Title */}
          <div className="space-y-2">
            <label className={`text-sm font-bold ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>Task Name</label>
            <input
              required
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-offset-1 outline-none transition-all ${inputBg} ${textBase}`}
              style={{ '--tw-ring-color': `var(--color-${themeColor}-500)` } as any}
            />
          </div>

          {/* Note */}
          <div className="space-y-2">
             <label className={`text-sm font-bold ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>Note (Optional)</label>
             <textarea
               value={note}
               onChange={(e) => setNote(e.target.value)}
               placeholder="Add details..."
               rows={2}
               className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-offset-1 outline-none transition-all resize-none ${inputBg} ${textBase}`}
             />
          </div>

          {/* Priority Blocks */}
          <div className="space-y-2">
            <label className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
              <Flag size={16} /> Priority
            </label>
            <div className="flex gap-2">
              {['High', 'Medium', 'Low'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(priority === p ? undefined : p as Priority)}
                  className={`flex-1 py-3 rounded-lg border font-bold text-sm transition-all ${
                    priority === p 
                      ? `bg-${themeColor}-600 text-white border-${themeColor}-600 shadow-md`
                      : `${isDark ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Section Blocks */}
           <div className="space-y-2">
            <label className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
              <List size={16} /> Section
            </label>
            <div className="grid grid-cols-2 gap-2">
              {sections.map(s => (
                <button
                   key={s.id}
                   type="button"
                   onClick={() => setSectionId(sectionId === s.id ? undefined : s.id)}
                   className={`p-3 rounded-lg border font-bold text-sm text-left truncate transition-all ${
                    sectionId === s.id
                      ? `bg-${themeColor}-600 text-white border-${themeColor}-600 shadow-md`
                      : `${isDark ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`
                   }`}
                >
                  {s.title}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Time */}
          <div className="space-y-2">
            <label className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
              <Calendar size={16} /> Finish By
            </label>
            
            {/* Inline Date and Time Picker Row */}
            <div className="flex gap-2">
              <input
                type="date"
                min={format(new Date(), 'yyyy-MM-dd')}
                value={dateStr}
                onChange={(e) => {
                    setDateStr(e.target.value);
                    if (!e.target.value) setShowTimePicker(false);
                }}
                className={`flex-1 p-3 border rounded-lg outline-none cursor-pointer ${inputBg} ${textBase} min-w-0`}
                style={{ colorScheme: isDark ? 'dark' : 'light' }}
              />
              
              {dateStr && (
                  <div className="flex-1 relative" ref={timePickerRef}>
                      <button
                        type="button"
                        onClick={() => setShowTimePicker(!showTimePicker)}
                        className={`w-full p-3 border rounded-lg font-mono font-bold text-sm flex items-center justify-between transition-all outline-none ${
                            showTimePicker
                            ? `border-${themeColor}-500 ring-2 ring-${themeColor}-500/20 ${inputBg} ${textBase}`
                            : `${isDark ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'}`
                        }`}
                      >
                          <span>{hour12}:{minute} {ampm}</span>
                          <Clock size={18} className={isDark ? 'text-gray-400' : 'text-gray-500'} />
                      </button>

                      {/* Overlay Picker */}
                      {showTimePicker && (
                          <div className="absolute bottom-full left-0 w-full mb-2 z-50 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                               <ScrollTimePicker 
                                  hour={hour12}
                                  setHour={setHour12}
                                  minute={minute}
                                  setMinute={setMinute}
                                  ampm={ampm}
                                  setAmpm={setAmpm}
                                  themeColor={themeColor}
                                  isDark={isDark}
                               />
                          </div>
                      )}
                  </div>
              )}
            </div>
            
            {!dateStr && <p className="text-xs text-gray-400 italic">No deadline specified</p>}
          </div>

          {/* Recurrence - Only if Date Selected */}
          {dateStr && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
                <Repeat size={16} /> Repeat
                </label>
                <div className="flex gap-2 flex-wrap">
                {['daily', 'weekly', 'monthly', 'yearly'].map((r) => (
                    <button
                    key={r}
                    type="button"
                    onClick={() => setRecurrence(recurrence === r ? undefined : r as Recurrence)}
                    className={`px-3 py-2 rounded-lg border font-bold text-xs capitalize transition-all ${
                        recurrence === r 
                        ? `bg-${themeColor}-600 text-white border-${themeColor}-600 shadow-md`
                        : `${isDark ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`
                    }`}
                    >
                    {r}
                    </button>
                ))}
                </div>
            </div>
          )}

          {/* Subtasks */}
          <div className="space-y-2">
            <label className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>
              <ChevronRight size={16} /> Subtasks
            </label>
            
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <input 
                        type="text" 
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOrUpdateSubtask())}
                        placeholder={editingSubtaskId ? "Update subtask..." : "Add a subtask..."}
                        className={`flex-1 p-2 text-sm border rounded-lg outline-none ${inputBg} ${textBase} ${editingSubtaskId ? `ring-1 ring-${themeColor}-500` : ''}`}
                    />
                    
                    <button 
                        type="button"
                        onClick={() => setShowSubtaskDate(!showSubtaskDate)}
                        className={`p-2 rounded-lg border transition-colors ${showSubtaskDate ? `bg-${themeColor}-100 border-${themeColor}-300 text-${themeColor}-700` : (isDark ? 'border-gray-600 hover:bg-gray-700 text-gray-400' : 'border-gray-300 hover:bg-gray-50 text-gray-600')}`}
                        title="Set Date/Time"
                    >
                        <Calendar size={18} />
                    </button>
                    
                    {editingSubtaskId && (
                        <button
                            type="button"
                            onClick={resetSubtaskInput}
                            className={`p-2 rounded-lg border transition-colors ${isDark ? 'border-gray-600 hover:bg-gray-700 text-gray-400' : 'border-gray-300 hover:bg-gray-50 text-gray-600'}`}
                            title="Cancel Edit"
                        >
                            <RotateCcw size={18} />
                        </button>
                    )}

                    <button 
                        type="button"
                        onClick={handleAddOrUpdateSubtask}
                        disabled={!newSubtaskTitle.trim()}
                        className={`p-2 rounded-lg text-white bg-${themeColor}-600 hover:bg-${themeColor}-700 disabled:opacity-50 shadow-md`}
                    >
                        {editingSubtaskId ? <Check size={18} /> : <Plus size={18} />}
                    </button>
                </div>
                
                {showSubtaskDate && (
                    <div className="flex items-center gap-2 animate-in slide-in-from-top-1 pl-1 relative w-full">
                        <input 
                            type="date"
                            value={newSubtaskDate}
                            onChange={(e) => setNewSubtaskDate(e.target.value)}
                            className={`flex-1 p-2 text-xs border rounded-lg outline-none cursor-pointer min-w-0 ${inputBg} ${textBase}`}
                            style={{ colorScheme: isDark ? 'dark' : 'light' }}
                        />
                        <div className="relative flex-1" ref={subtaskPickerRef}>
                            <button
                                type="button"
                                onClick={() => setSubtaskPickerOpen(!subtaskPickerOpen)}
                                className={`w-full p-2 text-xs border rounded-lg outline-none font-mono flex justify-between items-center ${subtaskPickerOpen ? `ring-2 ring-${themeColor}-500 border-${themeColor}-500` : ''} ${inputBg} ${textBase}`}
                            >
                                <span>{stHour}:{stMinute} {stAmpm}</span>
                                <Clock size={12} className="opacity-50" />
                            </button>
                            {subtaskPickerOpen && (
                                <div className="absolute bottom-full right-0 mb-2 z-50 shadow-xl animate-in fade-in zoom-in-95 duration-200 w-max">
                                     <ScrollTimePicker 
                                        hour={stHour}
                                        setHour={setStHour}
                                        minute={stMinute}
                                        setMinute={setStMinute}
                                        ampm={stAmpm}
                                        setAmpm={setStAmpm}
                                        themeColor={themeColor}
                                        isDark={isDark}
                                     />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-2 mt-2">
                {subtasks.map((sub, index) => (
                    <div key={sub.id} className={`flex items-center justify-between p-2 rounded-lg border text-sm ${isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'} ${editingSubtaskId === sub.id ? `ring-1 ring-${themeColor}-400` : ''}`}>
                        <div className="flex items-center gap-2 overflow-hidden flex-1">
                             <span className="truncate">{sub.title}</span>
                             {sub.dueDate && (
                                 <span className={`text-[10px] whitespace-nowrap flex items-center gap-1 px-1.5 py-0.5 rounded-full ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-white border border-gray-200 text-gray-600'}`}>
                                    <Clock size={10} />
                                    {format(new Date(sub.dueDate), 'MMM d, h:mm a')}
                                 </span>
                             )}
                        </div>
                        <div className="flex items-center gap-1">
                            <button 
                                type="button"
                                onClick={() => startEditingSubtask(sub)}
                                className={`text-gray-400 hover:text-${themeColor}-600 p-1 flex-shrink-0`}
                                title="Edit Subtask"
                            >
                                <Edit2 size={14} />
                            </button>
                            <button 
                                type="button"
                                onClick={() => handleDeleteSubtask(sub.id)}
                                className="text-gray-400 hover:text-red-600 p-1 flex-shrink-0"
                                title="Delete Subtask"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}
                {subtasks.length === 0 && <p className="text-xs text-gray-400 italic">No subtasks yet.</p>}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-inherit">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 font-medium rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-6 py-2 rounded-lg font-bold shadow-md transition-all transform active:scale-95 bg-${themeColor}-600 hover:bg-${themeColor}-700 text-white`}
            >
              {initialTask ? 'Update Task' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
