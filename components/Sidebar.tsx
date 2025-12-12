
import React, { useMemo } from 'react';
import { LayoutDashboard, CheckSquare, Calendar, Clock, X } from 'lucide-react';
import { UserState } from '../types';
import { getAvatar } from '../utils';
import { motion } from 'framer-motion';

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onClose: () => void;
  activePage: string;
  onNavigate: (page: string) => void;
  onProfileClick: () => void;
  user: UserState;
  themeColor: string;
  isDark: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, isCollapsed, onClose, activePage, onNavigate, onProfileClick, user, themeColor, isDark
}) => {
  const mainMenuItems = [
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'scheduling', label: 'Scheduling', icon: Calendar },
    { id: 'routines', label: 'Routines', icon: Clock },
  ];

  const bottomMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ];

  // Logic: 
  // Mobile (small screen): Fixed position. controlled by isOpen. Always full width (or w-56) when open. Ignore isCollapsed.
  // Desktop (md+): Relative position. Controlled by isCollapsed.
  const sidebarClass = `fixed inset-y-0 left-0 z-[70] transform transition-all duration-300 ease-in-out 
    ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
    md:relative md:translate-x-0 flex flex-col border-r pt-16 md:pt-0
    ${isCollapsed ? 'w-56 md:w-20' : 'w-56 md:w-64'} 
    ${isDark ? 'bg-gray-900 border-gray-800' : `bg-white/90 backdrop-blur-xl border-${themeColor}-200/50`}
  `;

  const currentAvatar = useMemo(() => getAvatar(user.avatar), [user.avatar]);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm md:hidden"
          onClick={onClose}
        ></div>
      )}

      <aside className={sidebarClass}>
        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar flex flex-col mt-2">
            <div className="flex-1 space-y-2">
                {mainMenuItems.map(item => {
                    const isActive = activePage === item.id;
                    const Icon = item.icon;
                    return (
                        <motion.button
                            key={item.id}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => { onNavigate(item.id); onClose(); }}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${
                                isActive
                                ? `bg-${themeColor}-100 text-${themeColor}-700 shadow-sm dark:bg-${themeColor}-900/20 dark:text-${themeColor}-400`
                                : `text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200`
                            } ${isCollapsed ? 'justify-start md:justify-center' : ''}`}
                            title={isCollapsed ? item.label : undefined}
                        >
                            <Icon size={20} className="shrink-0" />
                            {/* Text is hidden only on desktop when collapsed. Always visible on mobile if sidebar is open. */}
                            <span className={`${isCollapsed ? 'md:hidden' : ''}`}>{item.label}</span>
                        </motion.button>
                    );
                })}
            </div>

            {/* Bottom Items (Dashboard) */}
            <div className={`pt-2 border-t ${isDark ? 'border-gray-800' : `border-${themeColor}-200/30`}`}>
                {bottomMenuItems.map(item => {
                    const isActive = activePage === item.id;
                    const Icon = item.icon;
                    return (
                        <motion.button
                            key={item.id}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => { onNavigate(item.id); onClose(); }}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${
                                isActive
                                ? `bg-${themeColor}-100 text-${themeColor}-700 shadow-sm dark:bg-${themeColor}-900/20 dark:text-${themeColor}-400`
                                : `text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200`
                            } ${isCollapsed ? 'justify-start md:justify-center' : ''}`}
                            title={isCollapsed ? item.label : undefined}
                        >
                            <Icon size={20} className="shrink-0" />
                            <span className={`${isCollapsed ? 'md:hidden' : ''}`}>{item.label}</span>
                        </motion.button>
                    );
                })}
            </div>
        </nav>

        {/* User Footer (Mini Profile) - Now Clickable */}
        <motion.button 
            whileTap={{ scale: 0.98 }}
            onClick={onProfileClick}
            className={`p-4 border-t relative group w-full text-left transition-colors cursor-pointer hover:bg-black/5 dark:hover:bg-white/5
                ${isDark ? 'border-gray-800 bg-gray-800/50' : `border-${themeColor}-200/50 bg-white/50`}
            `}
        >
            <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-start md:justify-center' : ''}`}>
                <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden ${currentAvatar.bg}`}>
                    <img src={currentAvatar.src} alt={currentAvatar.label} className="w-full h-full object-cover" />
                </div>
                {/* Content hidden only on desktop if collapsed */}
                <div className={`flex-1 min-w-0 ${isCollapsed ? 'md:hidden' : ''}`}>
                    <p className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {user.name || 'User'}
                    </p>
                    <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Rank: {user.level}
                    </p>
                </div>
            </div>
        </motion.button>
      </aside>
    </>
  );
};
