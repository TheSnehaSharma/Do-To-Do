
import React, { useState } from 'react';
import { Task, Section, Priority } from '../types';
import { CheckCircle, Clock, Edit3, Trash2, Palette, XCircle, GripVertical, ChevronDown, ChevronRight, CornerDownRight, CheckCircle2, Circle, Repeat } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskBoardProps {
  tasks: Task[];
  sections: Section[];
  onTaskMove: (taskId: string, newSectionId: string | undefined) => void;
  onTaskComplete: (taskId: string) => void;
  onTaskDelete: (taskId: string) => void;
  onTaskEdit: (task: Task) => void;
  onSubtaskComplete: (taskId: string, subtaskId: string) => void;
  onAddSection: (name: string, color?: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onMoveSection: (fromIndex: number, toIndex: number) => void;
  onUpdateSectionColor: (sectionId: string, color: string) => void;
  themeColor: string;
  isDark: boolean;
}

const COLORS = ['gray', 'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'indigo', 'purple', 'pink'];

const TaskCard = React.memo(({ task, sectionColor, isExpanded, onEdit, onDelete, onComplete, onSubtaskComplete, toggleExpand, isDark, themeColor, onDragStart }: any) => {
    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
    const isOverdue = task.dueDate && isPast(new Date(task.dueDate));
    const dateDisplay = task.dueDate ? format(new Date(task.dueDate), 'MMM d, h:mm a') : 'No Date';
    
    const bgClass = (!sectionColor || sectionColor === 'gray') 
        ? (isDark ? 'bg-gray-800 border-gray-700' : `bg-white/90 border-${themeColor}-200/60 shadow-sm`)
        : (isDark ? `bg-${sectionColor}-900/20 border-${sectionColor}-900/50` : `bg-${sectionColor}-100 border-${sectionColor}-300 shadow-sm`);

    const getPriorityBadge = (p?: Priority) => {
        if (!p) return null;
        let color = '';
        if (p === 'High') color = 'text-red-700 bg-red-100 border-red-300';
        else if (p === 'Medium') color = 'text-yellow-700 bg-yellow-100 border-yellow-300';
        else color = 'text-blue-700 bg-blue-100 border-blue-300';
        return <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${color}`}>{p}</span>;
    };

    return (
      <motion.div
        layoutId={task.id}
        layout
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
        whileHover={{ scale: 1.02 }}
        draggable
        onDragStart={(e) => onDragStart(e, task.id)}
        className={`${bgClass} p-4 rounded-xl shadow-sm border hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing group relative flex flex-col gap-2`}
      >
        <div className={`text-xs font-medium flex items-center justify-between ${isOverdue ? 'text-red-600 font-bold' : (isDark ? 'text-gray-400' : 'text-gray-500')}`}>
            <div className="flex items-center gap-1.5">
                <Clock size={12} />
                {dateDisplay}
                {task.recurrence && (
                    <span className="flex items-center gap-1 text-[9px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0 rounded-full uppercase ml-1 border border-blue-200">
                        <Repeat size={8} /> {task.recurrence}
                    </span>
                )}
            </div>
            {/* Optimized for mobile: Always visible on mobile, hover only on desktop */}
            <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); onEdit(task); }} className="p-1 hover:bg-black/10 rounded text-gray-500 hover:text-blue-600"><Edit3 size={12} /></button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="p-1 hover:bg-black/10 rounded text-gray-500 hover:text-red-600"><Trash2 size={12} /></button>
            </div>
        </div>

        <div className="flex justify-between items-start gap-2">
           <h4 className={`font-bold text-sm leading-tight ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{task.title}</h4>
           {hasSubtasks && (
                <button 
                    onClick={(e) => { e.stopPropagation(); toggleExpand(task.id); }}
                    className={`transition-colors p-0.5 rounded flex-shrink-0 hover:bg-black/5 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}
                >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
           )}
        </div>
        
        {task.note && <p className={`text-xs line-clamp-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{task.note}</p>}
        
        <AnimatePresence>
            {isExpanded && hasSubtasks && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className={`mt-1 pl-2 border-l-2 space-y-1 overflow-hidden ${isDark ? 'border-gray-600' : 'border-gray-300'}`}>
                    {task.subtasks!.map((sub: any) => (
                        <div key={sub.id} className={`flex flex-col gap-0.5`}>
                             <div className={`flex items-center gap-1.5 text-[10px] italic ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                <CornerDownRight size={10} className="opacity-50" />
                                <button onClick={() => onSubtaskComplete(task.id, sub.id)} className={`transition-colors ${sub.completed ? 'text-green-600' : 'text-gray-400 hover:text-green-600'}`}>
                                    {sub.completed ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                                </button>
                                <span className={sub.completed ? 'line-through' : ''}>{sub.title}</span>
                             </div>
                        </div>
                    ))}
                </motion.div>
            )}
        </AnimatePresence>

        <div className={`flex items-center justify-between mt-2 pt-2 border-t ${isDark ? 'border-gray-600' : 'border-gray-300/50'}`}>
          <div>{getPriorityBadge(task.priority)}</div>
          <button onClick={() => onComplete(task.id)} className={`p-1.5 rounded-full ${isDark ? 'bg-gray-600 hover:bg-green-900 text-gray-300' : `bg-white hover:bg-${themeColor}-100 text-gray-400 hover:text-${themeColor}-600 border border-gray-200 shadow-sm`} transition-colors`}>
            <CheckCircle size={16} />
          </button>
        </div>
      </motion.div>
    );
});

export const TaskBoard: React.FC<TaskBoardProps> = ({ tasks, sections, onTaskMove, onTaskComplete, onTaskDelete, onTaskEdit, onSubtaskComplete, onAddSection, onDeleteSection, onMoveSection, onUpdateSectionColor, themeColor, isDark }) => {
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionColor, setNewSectionColor] = useState('gray');
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  const [activeColorPickerId, setActiveColorPickerId] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    const generalItems = tasks.filter(t => !t.sectionId && !t.completed);
    if (generalItems.length === 0) initial.add('general');
    sections.forEach(s => {
        const items = tasks.filter(t => t.sectionId === s.id && !t.completed);
        if (items.length === 0) initial.add(s.id);
    });
    return initial;
  });
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedTaskIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const handleDragStartTask = (e: React.DragEvent, taskId: string) => {
    e.stopPropagation();
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('type', 'TASK');
  };

  const renderSection = (title: string, sectionId: string | undefined, items: Task[], index: number, isGeneral = false, color = 'gray') => {
      const isCollapsed = collapsedSections.has(sectionId || 'general');
      const containerClass = `w-full flex flex-col ${isCollapsed ? 'h-auto' : 'h-[330px]'} rounded-xl border ${color !== 'gray' ? `border-${color}-300` : (isDark ? 'border-gray-700' : `border-${themeColor}-200/50`)} ${isDark ? 'bg-gray-800' : `bg-white/40 border-${themeColor}-100`} transition-[height] duration-300`;
      
      return (
          <div key={sectionId || 'general'} className={containerClass} draggable={!isGeneral} onDragStart={(e) => { setDraggedSectionIndex(index); e.dataTransfer.setData('type', 'SECTION'); }} onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }} onDrop={(e) => {
                const type = e.dataTransfer.getData('type');
                if (type === 'SECTION' && !isGeneral && draggedSectionIndex !== null && draggedSectionIndex !== index) { onMoveSection(draggedSectionIndex, index); setDraggedSectionIndex(null); }
                else if (type === 'TASK' && draggedTaskId) { onTaskMove(draggedTaskId, sectionId); setDraggedTaskId(null); }
            }}>
            <div className={`p-4 border-b rounded-t-xl group/header relative flex justify-between items-center ${color !== 'gray' ? (isDark ? `bg-${color}-900/30 border-${color}-800` : `bg-${color}-100 border-${color}-200`) : (isDark ? 'border-gray-700 bg-gray-750' : `border-${themeColor}-200/30 bg-white/50`)}`}>
                {!isGeneral && <div className={`absolute top-1 left-1/2 -translate-x-1/2 cursor-move opacity-30 hover:opacity-100 p-1 transition-opacity ${isDark ? 'text-gray-200' : 'text-gray-800'}`}><GripVertical size={16} className="rotate-90" /></div>}
                <div className="flex items-center gap-2">
                    <button onClick={() => setCollapsedSections(prev => { const next = new Set(prev); const id = sectionId || 'general'; if (next.has(id)) next.delete(id); else next.add(id); return next; })} className="p-1 rounded hover:bg-black/10 transition-colors">{isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}</button>
                    <h3 className={`font-bold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{title}</h3>
                    {!isGeneral && (
                        <div className="relative">
                            <button onClick={() => setActiveColorPickerId(activeColorPickerId === sectionId ? null : sectionId)} className={`p-1 rounded opacity-50 hover:opacity-100`}><Palette size={14} /></button>
                            {activeColorPickerId === sectionId && <div className="absolute top-full left-0 mt-2 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border grid grid-cols-5 gap-1 z-20 w-32">{COLORS.map(c => <button key={c} onClick={() => { onUpdateSectionColor(sectionId!, c); setActiveColorPickerId(null); }} className={`w-4 h-4 rounded-full bg-${c}-500 hover:scale-110`} />)}</div>}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-white/90 shadow-sm'}`}>{items.length}</span>
                    {!isGeneral && <button onClick={(e) => { e.stopPropagation(); onDeleteSection(sectionId!); }} className="p-1 text-gray-300 hover:text-red-500"><XCircle size={14} /></button>}
                </div>
            </div>
            {!isCollapsed && (
                <div className="flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar">
                    <AnimatePresence mode="popLayout">
                        {items.map(task => <TaskCard key={task.id} task={task} sectionColor={color} isExpanded={expandedTaskIds.has(task.id)} onEdit={onTaskEdit} onDelete={onTaskDelete} onComplete={onTaskComplete} onSubtaskComplete={onSubtaskComplete} toggleExpand={toggleExpand} isDark={isDark} themeColor={themeColor} onDragStart={handleDragStartTask} />)}
                    </AnimatePresence>
                    {items.length === 0 && <div className="text-center py-4 text-gray-400 text-sm">Empty</div>}
                </div>
            )}
          </div>
      );
  };

  return (
    <div className="h-full flex flex-col gap-4 pt-4">
      <div className="flex-1 overflow-y-auto pb-4">
        <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6 px-4 pb-4 items-start">
           {renderSection('General', undefined, tasks.filter(t => !t.sectionId && !t.completed), -1, true, 'gray')}
           {sections.map((section, index) => renderSection(section.title, section.id, tasks.filter(t => t.sectionId === section.id && !t.completed), index, false, section.color))}
           <div className={`w-full h-[330px] border-2 border-dashed rounded-xl p-4 flex flex-col gap-4 justify-center items-center opacity-70 hover:opacity-100 transition-opacity ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white/50 border-gray-300'}`}>
               <input type="text" placeholder="Section Name" className="w-full bg-transparent outline-none text-center font-medium border-b p-2 text-lg" value={newSectionName} onChange={e => setNewSectionName(e.target.value)} />
               <div className="grid grid-cols-5 gap-3 justify-center">{COLORS.map(c => <button key={c} type="button" onClick={() => setNewSectionColor(c)} className={`w-6 h-6 rounded-full bg-${c}-500 ${newSectionColor === c ? 'ring-2 ring-offset-2 ring-black/30 scale-110' : ''}`} />)}</div>
               <button onClick={() => { if(newSectionName) { onAddSection(newSectionName, newSectionColor); setNewSectionName(''); setNewSectionColor('gray'); } }} disabled={!newSectionName} className={`px-8 py-3 bg-${themeColor}-600 text-white rounded-xl text-sm font-bold shadow-lg`}>Add Section</button>
           </div>
        </div>
      </div>
    </div>
  );
};
