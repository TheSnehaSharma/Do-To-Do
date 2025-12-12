
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, ArrowUp, Share2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { LevelUpEvent, UserState, Task, UserLevel, THEME_COLORS } from '../types';
import { ProfileCard } from './ProfileCardModal';
import { getThemeColor, getNumericLevel, calculateStreak, getShareText } from '../utils';
import { toBlob } from 'html-to-image';

interface LevelUpOverlayProps {
  data: LevelUpEvent | null;
  onClose: () => void;
  themeColor: string;
  user: UserState; // Current user state (New Rank)
  tasks: Task[];
}

export const LevelUpOverlay: React.FC<LevelUpOverlayProps> = ({ data, onClose, themeColor, user, tasks }) => {
  const [showNewRank, setShowNewRank] = useState(false);
  const [swingPhase, setSwingPhase] = useState(0); // 0: Idle, 1: Swing, 2: Flip
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [scale, setScale] = useState(1);

  // Responsive Scaling Logic - Matches ProfileCardModal to keep consistent feel
  useEffect(() => {
      const handleResize = () => {
          const BASE_WIDTH = 340;
          const BASE_HEIGHT = 425;
          const UI_PADDING_Y = 150; 
          const UI_PADDING_X = 32;

          const availableW = window.innerWidth - UI_PADDING_X;
          const availableH = window.innerHeight - UI_PADDING_Y;

          const scaleX = availableW / BASE_WIDTH;
          const scaleY = availableH / BASE_HEIGHT;

          const newScale = Math.min(1, scaleX, scaleY);
          setScale(newScale < 1 ? newScale * 0.95 : 1);
      };

      if (data) {
          window.addEventListener('resize', handleResize);
          handleResize(); 
      }
      return () => window.removeEventListener('resize', handleResize);
  }, [data]);

  useEffect(() => {
    if (data) {
      // Fire confetti
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#3b82f6', '#ef4444', '#eab308', '#22c55e']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#3b82f6', '#ef4444', '#eab308', '#22c55e']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();

      // For Rank Up: Sequence the swing
      if (data.type === 'rank') {
          setShowNewRank(false);
          setSwingPhase(1); // Start Swing
          
          // Swing for 2.5 seconds (3 swings), then flip
          const flipTimer = setTimeout(() => {
              setSwingPhase(2);
              setShowNewRank(true);
          }, 2500);
          
          return () => clearTimeout(flipTimer);
      }
    }
  }, [data]);

  // Calc Stats for Card
  const stats = useMemo(() => {
    const completedTasks = tasks.filter(t => t.completed && t.completedAt);
    const totalCompleted = completedTasks.length;
    const streak = calculateStreak(tasks);
    return { streak, totalCompleted };
  }, [tasks]);

  const handleShare = async () => {
    if (!cardContainerRef.current) return;
    setIsSharing(true);

    try {
        // Target the inner ProfileCard which should be the first child
        const node = cardContainerRef.current.querySelector('[data-card-ref="profile-card"]') as HTMLElement;
        if (!node) throw new Error("Card node not found");

        const blob = await toBlob(node, {
            quality: 1.0,
            pixelRatio: 2.5,
            skipAutoScale: true,
            style: { transform: 'scale(1)', transformOrigin: 'top left' }, 
            backgroundColor: '#1a1a1a', 
            cacheBust: true,
        });
        
        if (blob) {
            const cleanName = (user.name || 'User').replace(/[^a-z0-9]/gi, '_');
            const fileName = `DoToDo-${cleanName}-RankUp.png`;
            const file = new File([blob], fileName, { type: 'image/png' });
            
            // Get motivational message
            const shareText = getShareText(user.level, getNumericLevel(user.points));

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: 'Rank Up!',
                    text: shareText,
                    files: [file]
                });
            } else {
                const link = document.createElement('a');
                link.download = `DoToDo-${user.name || 'User'}-RankUp.png`;
                link.href = URL.createObjectURL(blob);
                link.click();
            }
        }
    } catch (e) {
        console.error("Share failed", e);
        alert("Could not generate share image. Please try again.");
    } finally {
        setIsSharing(false);
    }
  };

  if (!data) return null;

  const isRankUpdate = data.type === 'rank';

  // --- Rank Up Animation View ---
  if (isRankUpdate) {
      // Construct "Old" User State
      const oldRank = data.oldVal as UserLevel;
      const oldTheme = THEME_COLORS[oldRank] || 'gray';
      
      const oldUser: UserState = {
          ...user,
          level: oldRank,
      };

      return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
                onClick={onClose}
            >
                {/* Flex container for card and button */}
                <div 
                    className="flex flex-col items-center gap-6 perspective-1000"
                    onClick={(e) => e.stopPropagation()} // Prevent close on click content
                >
                    
                    {/* Scalable Container for 3D Flip */}
                    <div 
                        className="relative" 
                        ref={cardContainerRef}
                        style={{ 
                            width: 340 * scale, 
                            height: 425 * scale, // Full height of the card
                        }}
                    >
                        <AnimatePresence mode="wait">
                            {!showNewRank ? (
                                <motion.div
                                    key="old-card"
                                    initial={{ rotateY: 0 }}
                                    animate={swingPhase === 1 ? { 
                                        rotateY: [0, -25, 25, -20, 20, -10, 10, 0], // 3 distinct swings decaying
                                        transition: { duration: 2.5, ease: "easeInOut" }
                                    } : {}}
                                    exit={{ rotateY: 90, opacity: 0, transition: { duration: 0.4, ease: "easeIn" } }}
                                    className="absolute inset-0 origin-top"
                                    style={{ transformStyle: 'preserve-3d' }}
                                >
                                    <div style={{ width: '100%', height: '100%' }}>
                                        <ProfileCard 
                                            user={oldUser} 
                                            stats={stats} 
                                            themeColor={oldTheme} 
                                            scale={scale} 
                                        />
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="new-card"
                                    initial={{ rotateY: -90, opacity: 0 }}
                                    animate={{ rotateY: 0, opacity: 1, transition: { duration: 0.6, type: "spring", bounce: 0.4 } }}
                                    className="absolute inset-0 origin-top"
                                    style={{ transformStyle: 'preserve-3d' }}
                                >
                                    <div style={{ width: '100%', height: '100%' }}>
                                        <ProfileCard 
                                            user={user} 
                                            stats={stats} 
                                            themeColor={themeColor} 
                                            scale={scale} 
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {showNewRank && (
                        <div className="flex gap-4 w-full justify-center">
                            <motion.button 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                onClick={handleShare}
                                disabled={isSharing}
                                style={{ width: 340 * scale }}
                                className={`py-3 bg-white text-black hover:bg-gray-200 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95`}
                            >
                                {isSharing ? 'Generating...' : <><Share2 size={18} /> Share Card</>}
                            </motion.button>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
      );
  }

  // --- Regular Level Up View (Scaled) ---
  const subText = `Congratulations on reaching Level ${data.newVal}!`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div 
            initial={{ scale: 0.8 * scale, y: 50, opacity: 0 }}
            animate={{ scale: 1 * scale, y: 0, opacity: 1 }}
            exit={{ scale: 0.8 * scale, y: 50, opacity: 0 }}
            className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl text-center relative overflow-hidden"
            style={{ transformOrigin: 'center center' }}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Background Glow */}
            <div className={`absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-${themeColor}-500/20 to-transparent pointer-events-none`}></div>
            
            <div className="relative z-10 flex flex-col items-center">
                <div className={`w-20 h-20 rounded-full bg-gradient-to-tr from-${themeColor}-400 to-${themeColor}-600 flex items-center justify-center shadow-lg mb-6 text-white`}>
                    <Star size={40} />
                </div>

                <h2 className="text-3xl font-black mb-1 dark:text-white uppercase italic tracking-wider">Level Up!</h2>
                <div className="h-1 w-12 bg-gray-200 rounded-full mb-8"></div>

                <div className="h-24 relative w-full flex items-center justify-center mb-8">
                    <AnimatePresence mode="popLayout">
                        {/* Old Level Exiting */}
                        <motion.div
                            key={`old-${data.oldVal}`}
                            initial={{ opacity: 1, y: 0, scale: 1 }}
                            animate={{ opacity: 0, y: -50, scale: 0.8, filter: 'blur(10px)' }}
                            transition={{ duration: 0.8, ease: "backIn", delay: 0.5 }}
                            className="absolute text-2xl font-bold text-gray-400 line-through"
                        >
                            Level {data.oldVal}
                        </motion.div>

                        {/* New Level Entering */}
                        <motion.div
                            key={`new-${data.newVal}`}
                            initial={{ opacity: 0, y: 100, scale: 0.5 }}
                            animate={{ opacity: 1, y: 0, scale: 1.5 }}
                            transition={{ duration: 0.8, type: "spring", bounce: 0.5, delay: 1.2 }}
                            className={`absolute text-2xl font-black text-${themeColor}-600 uppercase tracking-wide`}
                        >
                            Level {data.newVal}
                        </motion.div>
                    </AnimatePresence>
                </div>
                
                <p className="text-gray-500 dark:text-gray-400 mb-8 px-4 text-sm">
                    {subText}
                </p>

                <button 
                    onClick={onClose}
                    className={`px-8 py-3 bg-${themeColor}-600 hover:bg-${themeColor}-700 text-white rounded-xl font-bold shadow-lg shadow-${themeColor}-500/30 transition-transform active:scale-95`}
                >
                    Awesome!
                </button>
            </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
