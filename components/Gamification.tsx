import React from 'react';
import { UserState, UserLevel } from '../types';
import { Trophy, TrendingUp, TrendingDown, Target, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface GamificationProps {
  user: UserState;
  themeColor: string;
}

export const Gamification: React.FC<GamificationProps> = ({ user, themeColor }) => {
  const isPositive = user.points >= 0;

  return (
    <div className="flex items-center gap-6 bg-white/80 backdrop-blur-md px-6 py-3 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex flex-col items-end">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Current Rank</span>
        <motion.div 
          key={user.level}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`font-bold text-${themeColor}-600 whitespace-nowrap`}
        >
          {user.level}
        </motion.div>
      </div>
      
      <div className="h-10 w-px bg-gray-200"></div>

      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full bg-${themeColor}-100 text-${themeColor}-600`}>
          {user.points > 50 ? <Trophy size={20} /> : user.points < -20 ? <TrendingDown size={20} /> : <Zap size={20} />}
        </div>
        <div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Karma Points</span>
          <div className={`text-2xl font-black ${isPositive ? `text-${themeColor}-600` : 'text-red-500'}`}>
            {user.points}
          </div>
        </div>
      </div>
    </div>
  );
};