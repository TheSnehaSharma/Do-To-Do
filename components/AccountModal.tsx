
import React, { useState, useEffect } from 'react';
import { UserState } from '../types';
import { X, Lock, Edit2, Check, Moon, Sun, Plane, Bell, Music, Target, ChevronLeft } from 'lucide-react';
import { AVATARS, getAvatar, getNumericLevel, ALARM_SOUNDS, playSound } from '../utils';
import { motion } from 'framer-motion';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserState;
  onUpdateUser: (updates: Partial<UserState>) => void;
  themeColor: string;
}

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, user, onUpdateUser, themeColor }) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(user.name || '');
  const [view, setView] = useState<'profile' | 'avatar'>('profile');

  // Use maxLevelReached for unlocks to prevent re-locking on point loss
  const currentLevel = getNumericLevel(user.points);
  const unlockLevel = user.maxLevelReached !== undefined ? user.maxLevelReached : currentLevel;
  
  const isDark = user.isDarkMode;

  // Sync state when modal opens
  useEffect(() => {
      if (isOpen) {
          setTempName(user.name || '');
          setIsEditingName(false);
          setView('profile');
      }
  }, [isOpen, user.name]);

  if (!isOpen) return null;

  const handleSaveName = () => {
      if (tempName.trim()) {
          onUpdateUser({ name: tempName.trim() });
      }
      setIsEditingName(false);
  };

  const handleSelectAvatar = (avatarId: string, requiredLevel: number) => {
      if (unlockLevel >= requiredLevel) {
          onUpdateUser({ avatar: avatarId });
          setView('profile'); // Go back to profile after selection
      }
  };

  const handleSoundChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const soundId = e.target.value;
      onUpdateUser({ alarmSound: soundId });
      playSound(soundId, 5); // Play for 5 seconds as requested
  };

  const bgBase = isDark ? 'bg-gray-800' : 'bg-white';
  const textMain = isDark ? 'text-gray-100' : 'text-gray-900';
  const textSub = isDark ? 'text-gray-400' : 'text-gray-500';

  // --- Avatar Selection View ---
  if (view === 'avatar') {
      return (
        // Changed fixed to absolute and adjusted z-index
        <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className={`${bgBase} rounded-2xl shadow-2xl w-full max-w-lg h-[80%] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200`}>
                <div className={`flex items-center gap-2 p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <button onClick={() => setView('profile')} className={`p-2 rounded-full hover:bg-black/10 ${textMain}`}>
                        <ChevronLeft size={20} />
                    </button>
                    <h2 className={`text-lg font-bold ${textMain}`}>Select Avatar</h2>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                        {AVATARS.map((avatar, index) => {
                            const isUnlocked = unlockLevel >= avatar.unlockLevel;
                            const isSelected = user.avatar === avatar.id || (!user.avatar && avatar.id === 'basic-1');

                            return (
                                <motion.button
                                    key={avatar.id}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.05 }}
                                    whileHover={isUnlocked ? { scale: 1.1, zIndex: 10 } : {}}
                                    whileTap={isUnlocked ? { scale: 0.95 } : {}}
                                    disabled={!isUnlocked}
                                    onClick={() => handleSelectAvatar(avatar.id, avatar.unlockLevel)}
                                    className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center overflow-hidden shadow-sm transition-shadow group
                                        ${isSelected 
                                            ? `ring-4 ring-${themeColor}-500 ring-offset-2 ${avatar.bg}` 
                                            : (isUnlocked ? `${avatar.bg} hover:shadow-lg` : `${isDark ? 'bg-gray-800' : 'bg-gray-100'} cursor-not-allowed`)
                                        }
                                    `}
                                >
                                    {isUnlocked ? (
                                        <>
                                            <div className={`w-full h-full flex items-center justify-center`}>
                                                <img src={avatar.src} alt={avatar.label} className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-110" />
                                            </div>
                                            {isSelected && (
                                                <div className={`absolute top-2 right-2 w-3 h-3 rounded-full bg-${themeColor}-600 ring-2 ring-white shadow-md`}></div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center text-gray-400 opacity-60">
                                            <Lock size={20} />
                                            <span className="text-[10px] font-bold mt-1">Lvl {avatar.unlockLevel}</span>
                                        </div>
                                    )}
                                </motion.button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
      );
  }

  // --- Main Profile View ---
  return (
    // Changed fixed to absolute and adjusted z-index
    <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`${bgBase} rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90%]`}>
        
        {/* Header */}
        <div className={`flex justify-between items-center p-4 border-b ${isDark ? 'border-gray-700 bg-gray-900' : `border-gray-200 bg-${themeColor}-50`}`}>
          <h2 className={`text-xl font-bold ${textMain}`}>
            Your Profile
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-black/10 transition-colors">
            <X size={20} className={textSub} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
            
            {/* User Info Card (Horizontal Layout) */}
            <div className="flex items-center gap-6">
                <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setView('avatar')}
                    className="relative group cursor-pointer"
                >
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-xl border-4 overflow-hidden ${isDark ? 'border-gray-700' : 'border-white'}`}>
                        {(() => {
                            const avatarData = getAvatar(user.avatar);
                            return (
                                <div className={`w-full h-full ${avatarData.bg}`}>
                                    <img src={avatarData.src} alt="avatar" className="w-full h-full object-cover" />
                                </div>
                            );
                        })()}
                    </div>
                    {/* Edit Icon */}
                    <div className={`absolute bottom-0 right-0 p-2 rounded-full bg-${themeColor}-600 text-white shadow-md border-2 border-white dark:border-gray-800`}>
                        <Edit2 size={14} />
                    </div>
                    {/* Level Tag Below Photo */}
                    <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-${themeColor}-600 border border-white dark:border-gray-800 shadow-sm whitespace-nowrap`}>
                        Lvl {currentLevel}
                    </div>
                </motion.button>
                
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        {isEditingName ? (
                            <div className="flex items-center gap-2">
                                <input 
                                    type="text" 
                                    value={tempName}
                                    onChange={(e) => setTempName(e.target.value)}
                                    className={`border rounded p-1 text-lg font-bold outline-none w-full ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                                />
                                <button onClick={handleSaveName} className="p-1.5 bg-green-500 text-white rounded-md hover:bg-green-600">
                                    <Check size={16} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 group">
                                <h3 className={`text-2xl font-black truncate ${textMain}`}>{user.name || 'Guest User'}</h3>
                                <button 
                                    onClick={() => {
                                        setTempName(user.name || '');
                                        setIsEditingName(true);
                                    }}
                                    className={`p-1.5 rounded-full transition-all opacity-0 group-hover:opacity-100 ${isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-100'}`}
                                >
                                    <Edit2 size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                    <p className={`text-sm font-bold flex items-center gap-2 ${textSub}`}>
                        <span className={`px-2 py-0.5 rounded bg-${themeColor}-100 text-${themeColor}-700 text-xs`}>{user.level}</span>
                        <span>•</span>
                        <span>{user.points} pts</span>
                    </p>
                </div>
            </div>

            <div className={`w-full h-px ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}></div>

            {/* Settings Section (No Title) */}
            <div>
                <div className="space-y-3">
                     {/* Theme Toggle */}
                     <div className={`flex items-center justify-between p-3 rounded-xl border ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                         <div className="flex items-center gap-3">
                             <div className={`p-2 rounded-lg ${isDark ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                                 {user.isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
                             </div>
                             <div>
                                 <p className={`font-bold text-sm ${textMain}`}>Dark Mode</p>
                                 <p className={`text-[10px] ${textSub}`}>Easier on the eyes</p>
                             </div>
                         </div>
                         <button 
                            onClick={() => onUpdateUser({ isDarkMode: !user.isDarkMode })}
                            className={`w-12 h-6 rounded-full transition-colors relative ${user.isDarkMode ? `bg-${themeColor}-600` : 'bg-gray-300'}`}
                         >
                             <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${user.isDarkMode ? 'translate-x-6' : ''}`} />
                         </button>
                     </div>

                     {/* Vacation Mode Toggle */}
                     <div className={`flex items-center justify-between p-3 rounded-xl border ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                         <div className="flex items-center gap-3">
                             <div className={`p-2 rounded-lg ${isDark ? 'bg-teal-900/30 text-teal-400' : 'bg-teal-100 text-teal-600'}`}>
                                 <Plane size={20} />
                             </div>
                             <div>
                                 <p className={`font-bold text-sm ${textMain}`}>Vacation Mode</p>
                                 <p className={`text-[10px] ${textSub}`}>Pause penalties</p>
                             </div>
                         </div>
                         <button 
                            onClick={() => onUpdateUser({ isVacationMode: !user.isVacationMode })}
                            className={`w-12 h-6 rounded-full transition-colors relative ${user.isVacationMode ? 'bg-teal-500' : 'bg-gray-300'}`}
                         >
                             <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${user.isVacationMode ? 'translate-x-6' : ''}`} />
                         </button>
                     </div>

                     {/* Alarm Sound Dropdown */}
                     <div className={`flex items-center justify-between p-3 rounded-xl border ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                         <div className="flex items-center gap-3">
                             <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                                 <Music size={20} />
                             </div>
                             <div>
                                 <p className={`font-bold text-sm ${textMain}`}>Alarm Sound</p>
                                 <p className={`text-[10px] ${textSub}`}>Ringtone selection</p>
                             </div>
                         </div>
                         <select 
                            value={user.alarmSound || 'chime'}
                            onChange={handleSoundChange}
                            className={`p-2 rounded-lg text-xs font-bold border outline-none ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                         >
                             {ALARM_SOUNDS.map(sound => (
                                 <option key={sound.id} value={sound.id}>{sound.label}</option>
                             ))}
                         </select>
                     </div>

                     {/* Daily Goal Dropdown */}
                     <div className={`flex items-center justify-between p-3 rounded-xl border ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                         <div className="flex items-center gap-3">
                             <div className={`p-2 rounded-lg ${isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-600'}`}>
                                 <Target size={20} />
                             </div>
                             <div>
                                 <p className={`font-bold text-sm ${textMain}`}>Daily Goal</p>
                                 <p className={`text-[10px] ${textSub}`}>Tasks to finish for +10pts</p>
                             </div>
                         </div>
                         <select
                            value={user.dailyGoal || 5}
                            onChange={(e) => onUpdateUser({ dailyGoal: parseInt(e.target.value) })}
                            className={`p-2 rounded-lg text-xs font-bold border outline-none ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                         >
                             {[5, 10, 15, 20].map(goal => (
                                 <option key={goal} value={goal}>{goal} Tasks</option>
                             ))}
                         </select>
                     </div>

                     {/* Notifications Toggle */}
                     <div className={`flex items-center justify-between p-3 rounded-xl border ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                         <div className="flex items-center gap-3">
                             <div className={`p-2 rounded-lg ${isDark ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
                                 <Bell size={20} />
                             </div>
                             <div>
                                 <p className={`font-bold text-sm ${textMain}`}>Notifications</p>
                                 <p className={`text-[10px] ${textSub}`}>Receive task alerts</p>
                             </div>
                         </div>
                         <button 
                            onClick={() => onUpdateUser({ notificationsEnabled: user.notificationsEnabled === false ? true : false })}
                            className={`w-12 h-6 rounded-full transition-colors relative ${user.notificationsEnabled !== false ? `bg-${themeColor}-600` : 'bg-gray-300'}`}
                         >
                             <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${user.notificationsEnabled !== false ? 'translate-x-6' : ''}`} />
                         </button>
                     </div>
                </div>
            </div>

            {/* Bottom Spacer */}
            <div className="h-4"></div>
        </div>
      </div>
    </div>
  );
};
