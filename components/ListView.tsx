
import React, { useState } from 'react';
import { Task, Section, Priority, Subtask } from '../types';
import { format, isPast } from 'date-fns';
import { CheckCircle, Calendar, AlertCircle, Trash2, Repeat, ChevronDown, ChevronRight, CornerDownRight, Edit3, Circle, CheckCircle2, Check, Clock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ListViewProps {
  tasks: Task[];
  sections: Section[];
  onTaskComplete: (taskId: string) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskEdit: (task: Task) => void;
  onSubtaskComplete: (taskId: string, subtaskId: string) => void;
  onSubtaskDelete: (taskId: string, subtaskId: string) => void;
  onSubtaskUpdate: (taskId: string, subtaskId: string, updates: Partial<Subtask>) => void;
  themeColor: string;
  isDark: boolean;
}

const TaskRow = React.memo(({ task, isFinished, isExpanded, editingSubtask, editSubtaskTitle, onComplete, onDelete, onEdit, toggleExpand, onSubtaskComplete, onSubtaskDelete, startEditingSubtask, saveEditingSubtask, cancelEditingSubtask, setEditSubtaskTitle, sections, themeColor, isDark }: any) => {
    const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && !isFinished;
    const dateDisplay = task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy • h:mm a') : 'No Date Set';
    
    // Background Logic
    let bgClass = isDark ? 'bg-gray-800 border-gray-700' : `bg-white/80 border-${themeColor}-200/50`;
    if (task.sectionId) {
        const section = sections.find((s:any) => s.id === task.sectionId);
        if (section && section.color && section.color !== 'gray') {
            bgClass = isDark ? `bg-${section.color}-900/20 border-${section.color}-900/50` : `bg-${section.color}-100 border-${section.color}-300 shadow-sm`;
        }
    }

    const hasSubtasks = task.subtasks && task.subtasks.length > 0;

    const getPriorityBadge = (p?: Priority) => {
        if (!p) return null;
        let colorClass = '';
        if (p === 'High') colorClass = 'bg-red-100 text-red-700 border-red-300';
        else if (p === 'Medium') colorClass = 'bg-yellow-100 text-yellow-700 border-yellow-300';
        else colorClass = 'bg-blue-100 text-blue-700 border-blue-300';
        return <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${colorClass}`}>{p}</span>;
    };

    return (
        <motion.div layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10, height: 0, marginBottom: 0, transition: { duration: 0.2 } }} className={`relative flex flex-col p-4 rounded-xl border shadow-sm transition-shadow hover:shadow-md mb-3 ${bgClass} ${isDark ? 'border-gray-700' : ''} ${isFinished ? 'opacity-60 grayscale-[0.5]' : ''}`}>
            <div className="flex items-start gap-3">
                <button onClick={() => onComplete(task.id)} disabled={isFinished} className={`mt-1 p-1.5 rounded-full flex-shrink-0 transition-colors ${isFinished ? 'bg-green-100 text-green-600' : (isDark ? 'bg-gray-700 text-gray-400 hover:bg-green-900 hover:text-green-400' : `bg-white text-gray-400 hover:bg-${themeColor}-100 hover:text-${themeColor}-600 border border-gray-200`)}`}><CheckCircle size={18} /></button>
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className={`text-xs font-medium flex items-center gap-1.5 mb-1 ${isOverdue ? 'text-red-600 font-bold' : (isDark ? 'text-gray-400' : 'text-gray-600')}`}>
                        <Calendar size={12} />{dateDisplay}
                        {task.recurrence && !isFinished && <span className="flex items-center gap-1 text-[9px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0 rounded-full uppercase ml-1 border border-blue-200"><Repeat size={8} /> {task.recurrence}</span>}
                        {isOverdue && <span className="flex items-center gap-1 text-[9px] font-bold text-red-600 bg-red-100 px-1.5 py-0 rounded-full uppercase ml-2 border border-red-200"><AlertCircle size={8} /> Overdue</span>}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-bold text-sm ${isFinished ? 'line-through decoration-2 decoration-gray-400' : (isDark ? 'text-gray-100' : 'text-gray-900')}`}>{task.title}</h3>
                        {hasSubtasks && <button onClick={(e) => { e.stopPropagation(); toggleExpand(task.id); }} className={`transition-colors p-0.5 rounded hover:bg-black/5 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}>{isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button>}
                    </div>
                    {task.note && <p className={`text-xs line-clamp-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{task.note}</p>}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                   <div className="flex items-center gap-1">
                       <button onClick={() => onEdit(task)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit3 size={16} /></button>
                       <button onClick={() => onDelete(task.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                   </div>
                   <div>{getPriorityBadge(task.priority)}</div>
                </div>
            </div>
            
            <AnimatePresence>
                {isExpanded && hasSubtasks && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className={`mt-3 ml-10 pl-4 border-l-2 space-y-2 overflow-hidden ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>
                        {task.subtasks!.map((sub: any) => {
                            const isEditing = editingSubtask?.taskId === task.id && editingSubtask?.subtaskId === sub.id;
                            return (
                                <div key={sub.id} className={`flex items-center gap-2 text-xs group ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    <CornerDownRight size={12} className="opacity-50 flex-shrink-0" />
                                    <button onClick={() => onSubtaskComplete(task.id, sub.id)} className={`transition-colors flex-shrink-0 ${sub.completed ? 'text-green-600' : 'text-gray-300 hover:text-green-600'}`}>{sub.completed ? <CheckCircle2 size={14} /> : <Circle size={14} />}</button>
                                    {isEditing ? (
                                        <div className="flex-1 flex items-center gap-1">
                                            <input type="text" autoFocus value={editSubtaskTitle} onChange={(e) => setEditSubtaskTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveEditingSubtask(); if (e.key === 'Escape') cancelEditingSubtask(); }} className={`flex-1 p-1 rounded border outline-none text-xs ${isDark ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} />
                                            <button onClick={saveEditingSubtask} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check size={12} /></button>
                                            <button onClick={cancelEditingSubtask} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X size={12} /></button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                                                <span className={`truncate italic ${sub.completed ? 'line-through opacity-70' : ''}`}>{sub.title}</span>
                                                {sub.dueDate && <span className={`text-[9px] flex items-center gap-1 ${sub.completed ? 'opacity-50' : 'text-blue-500 font-medium'}`}><Clock size={8} /> {format(new Date(sub.dueDate), 'MMM d, h:mm a')}</span>}
                                            </div>
                                            {!isFinished && (
                                                <div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                                    <button onClick={() => startEditingSubtask(task.id, sub.id, sub.title)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit3 size={12} /></button>
                                                    <button onClick={() => onSubtaskDelete(task.id, sub.id)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={12} /></button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
});

export const ListView: React.FC<ListViewProps> = ({ tasks = [], sections = [], onTaskComplete, onTaskDelete, onTaskEdit, onSubtaskComplete, onSubtaskDelete, onSubtaskUpdate, themeColor, isDark }) => {
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  const [editingSubtask, setEditingSubtask] = useState<{ taskId: string, subtaskId: string } | null>(null);
  const [editSubtaskTitle, setEditSubtaskTitle] = useState('');

  const toggleExpand = (id: string) => { setExpandedTaskIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); };
  const startEditingSubtask = (taskId: string, subtaskId: string, currentTitle: string) => { setEditingSubtask({ taskId, subtaskId }); setEditSubtaskTitle(currentTitle); };
  const saveEditingSubtask = () => { if (editingSubtask && editSubtaskTitle.trim()) { onSubtaskUpdate(editingSubtask.taskId, editingSubtask.subtaskId, { title: editSubtaskTitle.trim() }); setEditingSubtask(null); setEditSubtaskTitle(''); } };
  const cancelEditingSubtask = () => { setEditingSubtask(null); setEditSubtaskTitle(''); };

  const activeTasks = tasks.filter(t => !t.completed);
  const finishedTasks = tasks.filter(t => t.completed);

  return (
    <div className={`h-full flex flex-col ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
       <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Active Tasks ({activeTasks.length})</h2>
            <div className="mb-8">
                {activeTasks.length === 0 && <p className="text-sm text-gray-500 italic text-center py-4">No tasks found.</p>}
                <AnimatePresence mode="popLayout" initial={false}>
                    {activeTasks.map(task => <TaskRow key={task.id} task={task} isFinished={false} isExpanded={expandedTaskIds.has(task.id)} editingSubtask={editingSubtask} editSubtaskTitle={editSubtaskTitle} onComplete={onTaskComplete} onDelete={onTaskDelete} onEdit={onTaskEdit} toggleExpand={toggleExpand} onSubtaskComplete={onSubtaskComplete} onSubtaskDelete={onSubtaskDelete} startEditingSubtask={startEditingSubtask} saveEditingSubtask={saveEditingSubtask} cancelEditingSubtask={cancelEditingSubtask} setEditSubtaskTitle={setEditSubtaskTitle} sections={sections} themeColor={themeColor} isDark={isDark} />)}
                </AnimatePresence>
            </div>
            {finishedTasks.length > 0 && (
                <>
                    <div className="flex items-center gap-2 mb-4"><div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div><h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Finished Tasks ({finishedTasks.length})</h2><div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div></div>
                    <div>
                        <AnimatePresence mode="popLayout" initial={false}>
                            {finishedTasks.map(task => <TaskRow key={task.id} task={task} isFinished={true} isExpanded={expandedTaskIds.has(task.id)} onComplete={onTaskComplete} onDelete={onTaskDelete} onEdit={onTaskEdit} toggleExpand={toggleExpand} onSubtaskComplete={onSubtaskComplete} onSubtaskDelete={onSubtaskDelete} sections={sections} themeColor={themeColor} isDark={isDark} />)}
                        </AnimatePresence>
                    </div>
                </>
            )}
       </div>
    </div>
  );
};
