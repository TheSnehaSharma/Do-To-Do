
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { UserState, Task } from '../types';
import { Share2, Trophy, Flame, CheckCircle2 } from 'lucide-react';
import { getAvatar, getNumericLevel } from '../utils';

// Helper functions to replace missing date-fns exports
const startOfDay = (d: Date | number | string) => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
};

const subDays = (date: Date, amount: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() - amount);
    return d;
};

// Color mapping for consistent capture
const COLOR_MAP: Record<string, string> = {
    blue: '#3b82f6',
    green: '#22c55e',
    orange: '#f97316',
    purple: '#a855f7',
    red: '#ef4444',
    lime: '#84cc16',
    yellow: '#eab308',
    teal: '#14b8a6',
    indigo: '#6366f1',
    pink: '#ec4899',
    gray: '#6b7280',
};

const getHex = (colorName: string) => COLOR_MAP[colorName] || COLOR_MAP['blue'];

const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

interface ProfileCardProps {
    user: UserState;
    stats: { streak: number, totalCompleted: number };
    themeColor: string;
    avatarBase64?: string;
    scale?: number;
    cardRef?: React.RefObject<HTMLDivElement>;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ 
    user, stats, themeColor, avatarBase64, scale = 1, cardRef 
}) => {
    const currentAvatar = useMemo(() => getAvatar(user.avatar), [user.avatar]);
    const currentLevel = getNumericLevel(user.points);
    const baseHex = getHex(themeColor);

    return (
        <div 
            ref={cardRef} 
            data-card-ref="profile-card"
            className="relative flex flex-col items-center p-6 text-center text-white overflow-hidden shadow-2xl origin-top-left"
            style={{
                width: '340px',
                height: '425px',
                transform: `scale(${scale})`,
                
                // Gradient: Radial from top-center
                background: `
                    radial-gradient(circle at 50% 20%, ${hexToRgba(baseHex, 0.85)} 0%, ${hexToRgba(baseHex, 0.5)} 70%),
                    linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.8))
                `,
                backgroundColor: '#1a1a1a', 
                border: '1px solid rgba(255, 255, 255, 0.25)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
                borderRadius: '0px' // Sharp corners for the main card
            }}
        >
            {/* Noise Texture Overlay */}
            <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")` }}></div>

            {/* Card Content Container */}
            <div className="relative z-10 flex flex-col items-center w-full h-full justify-between">
                
                {/* Top Row: Logo & Level */}
                <div className="w-full flex justify-between items-center h-8 shrink-0">
                    <div className="flex items-center gap-2 px-3 py-1 bg-black/30 rounded-full border border-white/20 shrink-0">
                        <CheckCircle2 size={14} className="text-white" />
                        <span className="font-bold text-[10px] uppercase tracking-widest leading-none pt-0.5">Do-To-Do</span>
                    </div>
                    <div className="px-3 py-1 bg-white text-black font-black text-xs border border-white/50 shadow-lg leading-none pt-1.5 shrink-0" style={{ borderRadius: '4px' }}>
                        LVL {currentLevel}
                    </div>
                </div>

                {/* Middle Section: Avatar and Name */}
                <div className="flex flex-col items-center justify-center flex-1 w-full gap-2">
                    {/* Avatar Circle - Rounded */}
                    <div className="relative group shrink-0" style={{ height: '150px', width: '150px' }}>
                        <div className="absolute inset-0 bg-white/20 rounded-full blur-xl transform group-hover:scale-110 transition-transform duration-700"></div>
                        <div 
                            className="w-full h-full rounded-full border-[3px] border-white/50 shadow-2xl overflow-hidden relative z-10 bg-black/20"
                            style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}
                        >
                            <img 
                                data-avatar-img
                                src={avatarBase64 || currentAvatar.src} 
                                alt="Avatar" 
                                className="w-full h-full object-cover"
                                crossOrigin="anonymous" 
                            />
                        </div>
                    </div>

                    {/* Name & Rank */}
                    <div className="flex flex-col items-center w-full mt-2">
                        <h2 className="text-3xl font-black text-center break-words leading-tight drop-shadow-md tracking-tight w-full line-clamp-2 px-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                            {user.name || 'Guest User'}
                        </h2>
                        <p className="text-sm font-bold opacity-90 uppercase tracking-[0.25em] border-b border-white/30 pb-2 px-4 shrink-0 mt-2" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                            {user.level}
                        </p>
                    </div>
                </div>

                {/* Bottom Stats Boxes - Rounded */}
                <div className="grid grid-cols-2 gap-3 w-full shrink-0 h-auto">
                    <div 
                        className="bg-black/30 border border-white/10 p-3 rounded-lg flex flex-col items-center justify-center backdrop-blur-sm shadow-inner"
                    >
                        <Flame size={20} className="mb-1 text-orange-400 drop-shadow-sm" />
                        <span className="text-2xl font-black leading-none mb-1">{stats.streak}</span>
                        <span className="text-[9px] uppercase font-bold opacity-80 tracking-wider">Day Streak</span>
                    </div>
                    <div 
                        className="bg-black/30 border border-white/10 p-3 rounded-lg flex flex-col items-center justify-center backdrop-blur-sm shadow-inner"
                    >
                        <Trophy size={20} className="mb-1 text-yellow-400 drop-shadow-sm" />
                        <span className="text-2xl font-black leading-none mb-1">{stats.totalCompleted}</span>
                        <span className="text-[9px] uppercase font-bold opacity-80 tracking-wider">Tasks Done</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface ProfileCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserState;
  tasks: Task[];
  themeColor: string;
  isDark: boolean;
}

export const ProfileCardModal: React.FC<ProfileCardModalProps> = ({ 
    isOpen, onClose, user, tasks, themeColor, isDark 
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [avatarBase64, setAvatarBase64] = useState<string>('');
  const [scale, setScale] = useState(1);

  const currentAvatar = useMemo(() => getAvatar(user.avatar), [user.avatar]);

  // Pre-load avatar as base64 to ensure it shows up in canvas capture
  useEffect(() => {
    if (isOpen && currentAvatar.src) {
        const loadAvatar = async () => {
            try {
                // Explicit CORS mode
                const response = await fetch(currentAvatar.src, { mode: 'cors' });
                const blob = await response.blob();
                const reader = new FileReader();
                reader.onloadend = () => {
                    setAvatarBase64(reader.result as string);
                };
                reader.readAsDataURL(blob);
            } catch (e) {
                console.error("Failed to load avatar for capture", e);
            }
        };
        loadAvatar();
    }
  }, [isOpen, currentAvatar]);

  // Calculate Responsive Scale
  useEffect(() => {
      const handleResize = () => {
          const BASE_WIDTH = 340;
          const BASE_HEIGHT = 425; // Aspect Ratio 4:5
          // Increased padding to force more vertical whitespace on small screens
          const UI_PADDING_Y = 150; 
          const UI_PADDING_X = 32;  // Horizontal margins

          const availableW = window.innerWidth - UI_PADDING_X;
          const availableH = window.innerHeight - UI_PADDING_Y;

          const scaleX = availableW / BASE_WIDTH;
          const scaleY = availableH / BASE_HEIGHT;

          // Scale down if needed, max scale 1 (don't scale up on huge screens)
          const newScale = Math.min(1, scaleX, scaleY);
          setScale(newScale < 1 ? newScale * 0.95 : 1);
      };

      if (isOpen) {
          window.addEventListener('resize', handleResize);
          handleResize(); // Initial calc
      }
      return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  const stats = useMemo(() => {
    const completedTasks = tasks.filter(t => t.completed && t.completedAt);
    const totalCompleted = completedTasks.length;
    
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
    
    return { streak, totalCompleted };
  }, [tasks]);

  if (!isOpen) return null;

  const currentLevel = getNumericLevel(user.points);

  const handleShare = async () => {
    if (!cardRef.current) return;
    setIsSharing(true);

    // Delay to ensure fonts and images are fully rendered
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
        const { toBlob } = await import('html-to-image');

        const blob = await toBlob(cardRef.current, {
            quality: 1.0,
            pixelRatio: 2.5, // slightly reduced for better compatibility on mobile safari
            skipAutoScale: true, // Prevents scaling glitches
            skipFonts: true, // Prevents "Failed to read cssRules" on external stylesheets (Google Fonts, CDNs)
            style: {
                transform: 'none', // Reset responsive scaling for the capture
                boxShadow: 'none', 
                margin: '0',
                fontFamily: 'sans-serif', // Fallback font since we skip embedding
            },
            backgroundColor: '#1a1a1a', 
            cacheBust: true,
        });
        
        if (blob) {
            const file = new File([blob], 'my-doto-profile.png', { type: 'image/png' });
            
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        title: 'Do-To-Do Profile',
                        text: `Check out my progress on Do-To-Do! Level ${currentLevel} - ${user.points} Points`,
                        files: [file]
                    });
                } catch (e) {
                    console.log("Share cancelled or failed", e);
                }
            } else {
                // Fallback download
                const link = document.createElement('a');
                link.download = 'my-doto-profile.png';
                link.href = URL.createObjectURL(blob);
                link.click();
            }
        }
    } catch (err) {
        console.error("Capture failed", err);
        alert("Failed to create share image. Please try again.");
    } finally {
        setIsSharing(false);
    }
  };

  return (
    // Backdrop handles closing
    <div className="absolute inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div 
            className="flex flex-col items-center gap-4 w-full h-full justify-center"
            onClick={(e) => {
                // Close only if the click is on this container (background), not children
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            
            {/* Main Content Row */}
            <div className="flex items-start">
                
                {/* Scale Wrapper to maintain layout flow while scaling the inner card */}
                <div 
                    style={{ 
                        width: 340 * scale, 
                        height: 425 * scale,
                        position: 'relative',
                        flexShrink: 0
                    }}
                >
                    <ProfileCard 
                        user={user} 
                        stats={stats} 
                        themeColor={themeColor} 
                        avatarBase64={avatarBase64} 
                        scale={scale} 
                        cardRef={cardRef} 
                    />
                </div>
            </div>

            {/* Share Button */}
            <button 
                onClick={handleShare}
                disabled={isSharing}
                style={{ width: 340 * scale }}
                className={`py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-transform active:scale-95 shadow-xl shrink-0 ${isDark ? 'bg-white text-black hover:bg-gray-100' : 'bg-gray-900 text-white hover:bg-gray-800'}`}
            >
                {isSharing ? (
                    <span className="animate-pulse">Generating...</span>
                ) : (
                    <>
                        <Share2 size={22} /> Share Card
                    </>
                )}
            </button>
        </div>
    </div>
  );
};
