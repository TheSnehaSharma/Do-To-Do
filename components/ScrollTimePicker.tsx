
import React, { useRef, useEffect, useState } from 'react';

interface ScrollColumnProps {
  items: string[];
  value: string;
  onChange: (val: string) => void;
  label?: string;
  themeColor?: string;
}

const ITEM_HEIGHT = 28; // Reduced height for compactness
const VISIBLE_HEIGHT = 112; // 4 items visible (28 * 4)

const ScrollColumn: React.FC<ScrollColumnProps> = ({ items, value, onChange, label, themeColor = 'blue' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync scroll position with value prop
  useEffect(() => {
    if (ref.current && !isScrolling.current) {
        const index = items.indexOf(value);
        if (index !== -1) {
            ref.current.scrollTop = index * ITEM_HEIGHT;
        }
    }
  }, [value, items]);

  const handleScroll = () => {
      if (!ref.current) return;
      isScrolling.current = true;
      
      const scrollTop = ref.current.scrollTop;
      const index = Math.round(scrollTop / ITEM_HEIGHT);
      
      // Debounce the selection update to avoid rapid state changes during fast scroll
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      
      timeoutRef.current = setTimeout(() => {
          if (items[index] && items[index] !== value) {
              onChange(items[index]);
          }
          isScrolling.current = false;
      }, 100);
  };

  // Allow clicking an item to snap to it
  const handleClick = (item: string) => {
      onChange(item);
  };

  return (
      <div className="flex flex-col items-center">
          {label && <div className="mb-1 text-[10px] font-bold uppercase tracking-wider opacity-50">{label}</div>}
          <div className="relative w-12 overflow-hidden font-mono text-sm" style={{ height: VISIBLE_HEIGHT }}>
              {/* Selection Highlight Band */}
              <div 
                className={`absolute top-1/2 left-0 right-0 -translate-y-1/2 h-8 border-y pointer-events-none z-10 box-border border-${themeColor}-500/50 bg-${themeColor}-500/10`}
              ></div>
              
              {/* Gradient Masks */}
              <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white dark:from-gray-800 to-transparent z-10 pointer-events-none"></div>
              <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white dark:from-gray-800 to-transparent z-10 pointer-events-none"></div>

              <div 
                ref={ref}
                onScroll={handleScroll}
                className="h-full overflow-y-auto snap-y snap-mandatory no-scrollbar relative z-0"
                style={{ paddingBlock: `${(VISIBLE_HEIGHT - ITEM_HEIGHT) / 2}px` }}
              >
                  {items.map(item => (
                      <div 
                        key={item} 
                        onClick={() => handleClick(item)}
                        className={`flex items-center justify-center snap-center font-bold cursor-pointer transition-opacity ${item === value ? `opacity-100 text-${themeColor}-600 scale-110` : 'opacity-40 hover:opacity-70'}`}
                        style={{ height: ITEM_HEIGHT }}
                      >
                          {item}
                      </div>
                  ))}
              </div>
          </div>
      </div>
  );
};

interface ScrollTimePickerProps {
    hour: string;
    setHour: (h: string) => void;
    minute: string;
    setMinute: (m: string) => void;
    ampm: string;
    setAmpm: (ap: string) => void;
    themeColor: string;
    isDark?: boolean;
}

export const ScrollTimePicker: React.FC<ScrollTimePickerProps> = ({ 
    hour, setHour, minute, setMinute, ampm, setAmpm, themeColor, isDark 
}) => {
    const hours = Array.from({length: 12}, (_, i) => (i + 1).toString().padStart(2, '0'));
    const minutes = Array.from({length: 12}, (_, i) => (i * 5).toString().padStart(2, '0')); // 5 min intervals
    const periods = ['AM', 'PM'];

    return (
        <div className={`flex gap-1 justify-center p-2 rounded-xl border shadow-lg ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <ScrollColumn items={hours} value={hour} onChange={setHour} label="Hr" themeColor={themeColor} />
            <div className="h-[112px] flex items-center font-bold text-lg pb-4">:</div>
            <ScrollColumn items={minutes} value={minute} onChange={setMinute} label="Min" themeColor={themeColor} />
            <ScrollColumn items={periods} value={ampm} onChange={setAmpm} label="Am/Pm" themeColor={themeColor} />
        </div>
    );
};
