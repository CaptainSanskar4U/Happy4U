import React, { useState, useMemo } from 'react';
import { Birthday } from '../types';
import { parseLocalYMD } from '../utils/dateUtils';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface Props {
  birthdays: Birthday[];
}

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const CalendarView: React.FC<Props> = ({ birthdays }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  // Get birthdays for the current month using safe local parsing
  const birthdaysInMonth = useMemo(() => {
    return birthdays.filter(b => {
      const bDate = parseLocalYMD(b.birthDate);
      return bDate.getMonth() === month;
    }).sort((a, b) => {
        const da = parseLocalYMD(a.birthDate).getDate();
        const db = parseLocalYMD(b.birthDate).getDate();
        return da - db;
    });
  }, [birthdays, month]);

  // Map birthdays to specific days for dots
  const birthdayMap = useMemo(() => {
    const map: Record<number, boolean> = {};
    birthdaysInMonth.forEach(b => {
      const d = parseLocalYMD(b.birthDate).getDate();
      map[d] = true;
    });
    return map;
  }, [birthdaysInMonth]);

  const selectedBirthdays = selectedDay 
    ? birthdaysInMonth.filter(b => parseLocalYMD(b.birthDate).getDate() === selectedDay)
    : birthdaysInMonth;

  // Check if current view is actually the real current month/year for highlighting "today"
  const isCurrentRealMonth = new Date().getMonth() === month && new Date().getFullYear() === year;
  const todayDate = new Date().getDate();

  return (
    <div className="space-y-6">
      {/* Calendar Card */}
      <div className="bg-dark-card border border-dark-border rounded-[2.5rem] p-4 sm:p-6 shadow-2xl relative overflow-hidden transition-colors duration-300 transform-gpu card-shine animate-scale-in origin-top">
          {/* Glow */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-lime/5 blur-[50px] rounded-full pointer-events-none"></div>

          {/* Header */}
          <div className="flex justify-between items-center mb-6 relative z-10">
            <button onClick={prevMonth} className="p-2 rounded-full hover:bg-surfaceLight text-muted hover:text-primary transition-colors active:scale-90">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h2 className="text-lg sm:text-xl font-bold text-primary tracking-wide">
              {MONTHS[month]} <span className="text-muted text-base sm:text-lg font-normal ml-1">{year}</span>
            </h2>
            <button onClick={nextMonth} className="p-2 rounded-full hover:bg-surfaceLight text-muted hover:text-primary transition-colors active:scale-90">
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Days Header */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map((d, index) => (
              <div key={`${d}-${index}`} className="text-center text-[10px] font-bold text-muted py-2 tracking-widest uppercase">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-y-2 relative z-10 place-items-center">
            {/* Empty slots for previous month */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const hasBirthday = birthdayMap[day];
              const isSelected = selectedDay === day;
              const isToday = isCurrentRealMonth && todayDate === day;

              return (
                <div key={day} className="flex flex-col items-center justify-center w-full h-10">
                  <button
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={`
                      w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-all relative transform-gpu animate-scale-in
                      ${isSelected 
                        ? 'bg-lime text-black font-bold shadow-[0_0_20px_rgba(210,248,1,0.4)] scale-105 z-10' 
                        : isToday 
                          ? 'bg-surfaceLight text-primary border border-dark-border shadow-inner' 
                          : 'text-muted hover:bg-surfaceLight hover:text-primary'}
                    `}
                    style={{ animationDelay: `${i * 10}ms`, animationFillMode: 'backwards' }}
                  >
                    {day}
                    {hasBirthday && !isSelected && (
                      <span className="absolute bottom-1 w-1 h-1 bg-lime rounded-full shadow-[0_0_5px_rgba(210,248,1,0.8)]"></span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
      </div>

      {/* Events List */}
      <div className="px-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                {selectedDay ? (
                    <>
                        <span className="w-1.5 h-1.5 rounded-full bg-lime"></span>
                        {MONTHS[month]} {selectedDay}
                    </>
                ) : (
                    <>
                         <span className="w-1.5 h-1.5 rounded-full bg-gray-600"></span>
                         All in {MONTHS[month]}
                    </>
                )}
            </h3>
            {selectedDay && (
                <button onClick={() => setSelectedDay(null)} className="text-xs text-lime font-medium bg-lime/10 px-3 py-1 rounded-full hover:bg-lime/20 transition-colors">
                    Show Month
                </button>
            )}
          </div>

          <div className="space-y-3">
              {selectedBirthdays.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-dark-border rounded-3xl bg-surfaceLight/30 flex flex-col items-center animate-fade-in">
                      <div className="w-12 h-12 rounded-full bg-surface border border-dark-border flex items-center justify-center mb-3">
                         <CalendarIcon className="w-5 h-5 text-muted" />
                      </div>
                      <p className="text-muted text-sm">No birthdays found</p>
                  </div>
              ) : (
                  selectedBirthdays.map((birthday, index) => {
                      const bDate = parseLocalYMD(birthday.birthDate);
                      return (
                        <div 
                            key={birthday.id} 
                            className="bg-surfaceLight border border-dark-border rounded-2xl p-4 flex items-center gap-4 animate-slide-up opacity-0 hover:border-lime/30 transition-colors group transform-gpu"
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <div className="w-12 h-12 rounded-full bg-dark-card flex items-center justify-center text-xl border border-dark-border shadow-inner group-hover:scale-105 transition-transform shrink-0">
                                {birthday.emoji || '🎉'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-primary text-base truncate">{birthday.name}</h4>
                                <p className="text-xs text-muted mt-0.5 flex items-center gap-2 truncate">
                                    <span>{bDate.getDate()} {MONTHS[month]}</span>
                                    <span className="w-1 h-1 bg-gray-700 rounded-full shrink-0"></span>
                                    <span className="truncate">{birthday.relationship || 'Friend'}</span>
                                </p>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-surface border border-dark-border flex items-center justify-center text-muted group-hover:bg-lime group-hover:text-black transition-colors shrink-0">
                                <ChevronRight className="w-4 h-4" />
                            </div>
                        </div>
                      );
                  })
              )}
          </div>
          
          {/* Spacer for Dock */}
          <div className="h-24"></div>
      </div>
    </div>
  );
};