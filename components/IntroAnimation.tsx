
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clock, CheckCircle2, Sparkles } from 'lucide-react';

interface IntroAnimationProps {
  isVisible: boolean;
  isDark: boolean;
  onComplete: () => void;
}

export const IntroAnimation: React.FC<IntroAnimationProps> = ({ isVisible, isDark, onComplete }) => {
  const [phase, setPhase] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Wait for window load to ensure smooth animation start
  useEffect(() => {
    const handleLoad = () => setIsLoaded(true);
    
    if (document.readyState === 'complete') {
        setIsLoaded(true);
    } else {
        window.addEventListener('load', handleLoad);
    }
    return () => window.removeEventListener('load', handleLoad);
  }, []);

  useEffect(() => {
    if (!isLoaded) return; // Do not start sequence until loaded

    // Sequence Timing
    // 0ms: Phase 0 (DueToDo)
    const t1 = setTimeout(() => setPhase(1), 1200); 
    
    // 1200ms: Phase 1 (DoToDo)
    const t2 = setTimeout(() => setPhase(2), 2600);
    
    // 2600ms: Phase 2 (DoneToDo)
    const t3 = setTimeout(() => setPhase(3), 3800);
    
    // 3800ms: Phase 3 (Final Logo) -> Hold for 2s then complete
    const t4 = setTimeout(() => {
        onComplete();
    }, 5800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [isLoaded]); // Depend on isLoaded to start

  // Background colors corresponding to phases (Light / Dark)
  const bgColors = [
    isDark ? 'bg-red-950' : 'bg-red-50',   // Phase 0
    isDark ? 'bg-blue-950' : 'bg-blue-50',  // Phase 1
    isDark ? 'bg-green-950' : 'bg-green-50', // Phase 2
    isDark ? 'bg-gray-900' : 'bg-white' // Phase 3
  ];

  const textColors = [
    'text-red-600',
    'text-blue-600',
    'text-green-600',
    'text-gray-900 dark:text-white'
  ];

  const texts = ["DueToDo", "DoToDo", "DoneToDo", "Do-To-Do"];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="intro-overlay"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className={`fixed inset-0 z-[150] flex flex-col items-center justify-center transition-colors duration-700 ease-in-out ${bgColors[phase] || (isDark ? 'bg-gray-900' : 'bg-white')}`}
        >
            {/* Show loading spinner if not loaded yet */}
            {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-50">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}

            <div className="relative flex flex-col items-center justify-center scale-110 md:scale-125">
                
                {/* Visuals Container */}
                <div className="h-48 w-full relative flex items-center justify-center mb-8">
                    
                    {/* Phase 0: Overdue Task Card */}
                    <AnimatePresence>
                    {phase === 0 && (
                        <motion.div
                            initial={{ scale: 0.8, rotate: -6, opacity: 0 }}
                            animate={{ scale: 1, rotate: -3, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0, filter: 'blur(4px)' }}
                            transition={{ duration: 0.4 }}
                            className="absolute bg-white p-4 rounded-xl shadow-xl border-l-4 border-red-500 w-32 h-24 flex flex-col justify-center gap-2"
                        >
                            <div className="flex justify-between items-center">
                                <div className="h-2 w-14 bg-gray-200 rounded-full"></div>
                                <Clock size={16} className="text-red-500" />
                            </div>
                            <div className="h-2 w-full bg-gray-100 rounded-full"></div>
                            <div className="h-2 w-3/4 bg-gray-100 rounded-full"></div>
                        </motion.div>
                    )}
                    </AnimatePresence>

                    {/* Phase 1: Cascade Checks */}
                    <AnimatePresence>
                    {phase === 1 && (
                        <motion.div className="absolute w-48 h-48 flex items-center justify-center">
                            {/* Main Card Turning Blue/Checked */}
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1, y: -20, rotate: 0 }}
                                transition={{ duration: 0.3 }}
                                className="absolute bg-white p-4 rounded-xl shadow-md border-l-4 border-blue-500 w-28 z-30"
                            >
                                <div className="flex justify-between items-center">
                                    <div className="h-2 w-12 bg-gray-200 rounded-full"></div>
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1.2 }}
                                        transition={{ delay: 0.2, type: "spring" }}
                                    >
                                        <Check size={18} className="text-blue-500" strokeWidth={3} />
                                    </motion.div>
                                </div>
                            </motion.div>
                            
                            {/* Cascading Cards */}
                            {[1, 2, 3].map((i) => (
                                <motion.div
                                    key={i}
                                    initial={{ y: -20, opacity: 0, scale: 0.8, x: 0 }}
                                    animate={{ 
                                        y: i * 15 - 5, 
                                        x: i * 10 - 10,
                                        opacity: 1 - i * 0.15, 
                                        scale: 1 - i * 0.05 
                                    }}
                                    transition={{ delay: i * 0.15, duration: 0.3 }}
                                    className="absolute bg-white p-3 rounded-xl shadow-sm border-l-2 border-blue-400 w-24 z-20"
                                    style={{ zIndex: 30 - i }}
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="h-1.5 w-10 bg-gray-100 rounded-full"></div>
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ delay: i * 0.15 + 0.1 }}
                                        >
                                            <Check size={12} className="text-blue-400" />
                                        </motion.div>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                    </AnimatePresence>

                    {/* Phase 2: Green Completion & Confetti */}
                    <AnimatePresence>
                    {phase === 2 && (
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 1.5, opacity: 0 }}
                            transition={{ duration: 0.4 }}
                            className="absolute flex items-center justify-center w-full h-full"
                        >
                            <div className="relative flex items-center justify-center">
                                {/* Glow Ring */}
                                <motion.div 
                                    animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                    className="absolute inset-0 bg-green-400 rounded-full"
                                ></motion.div>
                                
                                {/* Icon */}
                                <div className="bg-white p-6 rounded-full shadow-2xl relative z-10">
                                    <CheckCircle2 size={72} className="text-green-500" />
                                </div>

                                {/* Confetti Particles */}
                                {[...Array(12)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 1, x: 0, y: 0, scale: 0 }}
                                        animate={{ 
                                            opacity: 0, 
                                            x: (Math.random() - 0.5) * 250, 
                                            y: (Math.random() - 0.5) * 250, 
                                            scale: Math.random() * 1 + 0.5,
                                            rotate: Math.random() * 360 
                                        }}
                                        transition={{ duration: 0.8, ease: "easeOut" }}
                                        className="absolute w-2.5 h-2.5 rounded-sm z-0"
                                        style={{ 
                                            backgroundColor: ['#ef4444', '#3b82f6', '#eab308', '#22c55e', '#a855f7'][i % 5],
                                        }}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}
                    </AnimatePresence>

                    {/* Phase 3: General Todo Icon (Final) - Circle/Tick left, Lines right */}
                    <AnimatePresence>
                    {phase === 3 && (
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                            transition={{ duration: 0.6, type: "spring", bounce: 0.5 }}
                            className="absolute"
                        >
                            <div className="relative group">
                                {/* Glow */}
                                <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-30 rounded-3xl animate-pulse"></div>
                                
                                {/* Container: Gradient Theme Box */}
                                <div className="relative w-32 h-32 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex flex-col items-center justify-center shadow-2xl shadow-blue-500/20 border border-white/10 transform rotate-6 hover:rotate-3 transition-transform duration-500 overflow-hidden">
                                    
                                    <svg viewBox="0 0 100 100" className="w-20 h-20 relative z-10 drop-shadow-md">
                                        
                                        {/* Circle on Left */}
                                        <motion.circle
                                            initial={{ pathLength: 0, opacity: 0 }}
                                            animate={{ pathLength: 1, opacity: 1 }}
                                            transition={{ duration: 0.5, delay: 0.2 }}
                                            cx="30" cy="50" r="16"
                                            fill="none" stroke="white" strokeWidth="6" strokeLinecap="round"
                                        />

                                        {/* Tick Mark inside Circle */}
                                        <motion.path
                                            initial={{ pathLength: 0, opacity: 0 }}
                                            animate={{ pathLength: 1, opacity: 1 }}
                                            transition={{ duration: 0.3, delay: 0.7 }}
                                            d="M 23 50 L 29 56 L 39 43" 
                                            fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"
                                        />

                                        {/* Task Lines - Right Side (No Overlap) */}
                                        {[35, 50, 65].map((y, i) => (
                                            <motion.line 
                                                key={i}
                                                initial={{ pathLength: 0, opacity: 0 }}
                                                animate={{ pathLength: 1, opacity: 1 }}
                                                transition={{ duration: 0.3, delay: 1.0 + (i * 0.15) }}
                                                x1="58" y1={y} x2="85" y2={y}
                                                stroke="white"
                                                strokeWidth="6"
                                                strokeLinecap="round"
                                            />
                                        ))}
                                    </svg>

                                    {/* Sparkle */}
                                    <motion.div 
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1, rotate: [0, 15, -15, 0] }}
                                        transition={{ delay: 1.5, duration: 0.5 }}
                                        className="absolute top-2 right-2 text-yellow-300 z-20"
                                    >
                                        <Sparkles size={20} fill="currentColor" />
                                    </motion.div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                    </AnimatePresence>
                </div>

                {/* Text Morphing - Responsive Font Size */}
                <div className="h-28 relative w-full flex justify-center items-center overflow-visible">
                    <AnimatePresence mode="wait">
                        <motion.h1
                            key={texts[phase]}
                            initial={{ y: 20, opacity: 0, filter: 'blur(4px)' }}
                            animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                            exit={{ y: -20, opacity: 0, filter: 'blur(4px)' }}
                            transition={{ duration: 0.4 }}
                            className={`font-black tracking-tighter text-center ${textColors[phase]} ${phase === 3 ? 'text-5xl md:text-8xl' : 'text-6xl md:text-7xl'}`}
                            style={{ lineHeight: 1 }}
                        >
                            {phase === 3 ? (
                                // Final Logo Style Construction
                                <div className="flex flex-col items-center">
                                    <span className="flex items-center gap-1 text-gray-900 dark:text-white drop-shadow-sm">
                                        Do<span className="text-blue-600">-</span>To<span className="text-blue-600">-</span>Do
                                    </span>
                                </div>
                            ) : (
                                texts[phase]
                            )}
                        </motion.h1>
                    </AnimatePresence>
                </div>

            </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
