
import React, { useEffect, useState } from 'react';
import { Task } from '../types';
import { BellRing, X, CheckCircle2, Clock, Repeat } from 'lucide-react';
import { format } from 'date-fns';
import { playSound } from '../utils';
import { motion } from 'framer-motion';

interface AlarmOverlayProps {
  task: Task;
  onDismiss: () => void;
  onComplete: () => void;
  themeColor: string;
  isDark: boolean;
  alarmSound: string;
  soundEnabled: boolean;
}

export const AlarmOverlay: React.FC<AlarmOverlayProps> = ({ 
    task, onDismiss, onComplete, themeColor, isDark, alarmSound, soundEnabled 
}) => {
    const [now, setNow] = useState(new Date());

    // Update clock every second
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Handle Ringing Sound
    useEffect(() => {
        if (!soundEnabled) return;

        // Play immediately
        playSound(alarmSound, 2);

        // Loop every 3 seconds
        const interval = setInterval(() => {
            playSound(alarmSound, 2);
        }, 3000);

        return () => clearInterval(interval);
    }, [alarmSound, soundEnabled]);

    const isRoutine = task.isRoutine;

    return (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
            {/* Card Content */}
            <div className={`relative w-full max-w-sm p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center overflow-hidden
                ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}
            `}>
                {/* Background Pulse Effect */}
                <div className={`absolute inset-0 bg-${themeColor}-500/10 animate-pulse`}></div>
                
                {/* Icon */}
                <motion.div 
                    animate={{ rotate: [0, -15, 15, -15, 15, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, repeatDelay: 1 }}
                    className={`relative z-10 w-24 h-24 rounded-full bg-${themeColor}-100 dark:bg-${themeColor}-900/30 flex items-center justify-center mb-6 text-${themeColor}-600 dark:text-${themeColor}-400 shadow-lg ring-4 ring-${themeColor}-500/20`}
                >
                    {isRoutine ? <Repeat size={48} /> : <BellRing size={48} />}
                </motion.div>

                {/* Time */}
                <h2 className={`relative z-10 text-5xl font-black mb-2 tracking-tighter ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {format(now, 'h:mm')}
                    <span className="text-xl font-bold ml-1 text-gray-500">{format(now, 'a')}</span>
                </h2>
                
                {/* Title */}
                <p className={`relative z-10 text-xs font-bold uppercase tracking-[0.2em] mb-4 opacity-60 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    {isRoutine ? "Routine Activity" : "Scheduled Task"}
                </p>
                <h3 className={`relative z-10 text-2xl font-black mb-8 leading-tight line-clamp-3 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                    {task.title}
                </h3>

                {/* Actions */}
                <div className={`relative z-10 grid ${!isRoutine ? 'grid-cols-2' : 'grid-cols-1'} gap-4 w-full`}>
                    <button 
                        onClick={onDismiss}
                        className={`py-3.5 px-4 rounded-2xl font-bold border transition-colors flex items-center justify-center gap-2
                            ${isDark ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}
                        `}
                    >
                        <X size={20} /> Dismiss
                    </button>
                    
                    {!isRoutine && (
                        <button 
                            onClick={onComplete}
                            className={`py-3.5 px-4 rounded-2xl font-bold text-white shadow-xl shadow-${themeColor}-500/20 transition-transform active:scale-95 flex items-center justify-center gap-2 bg-${themeColor}-600 hover:bg-${themeColor}-700`}
                        >
                            <CheckCircle2 size={20} /> Complete
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
