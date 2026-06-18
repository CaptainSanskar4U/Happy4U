import { Birthday } from '../types';

// Helper to parse YYYY-MM-DD string into a local Date object at 00:00:00
export const parseLocalYMD = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

export const calculateDaysUntil = (birthDateString: string, leapYearMode: 'Feb28' | 'March1' = 'Feb28'): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const birth = parseLocalYMD(birthDateString);
  const currentYear = today.getFullYear();
  
  // Create date for this year's birthday using local components
  let nextBirthday = new Date(currentYear, birth.getMonth(), birth.getDate());
  
  // Handle leap year case (Feb 29)
  if (birth.getMonth() === 1 && birth.getDate() === 29) {
     const isLeap = (year: number) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
     if (!isLeap(currentYear)) {
         if (leapYearMode === 'Feb28') {
             nextBirthday.setDate(28);
         } else {
             nextBirthday.setDate(1);
             nextBirthday.setMonth(2); // March 1st
         }
     }
  }

  // If birthday passed today (strict comparison), move to next year
  if (nextBirthday < today) {
    const nextYear = currentYear + 1;
    nextBirthday = new Date(nextYear, birth.getMonth(), birth.getDate());
    if (birth.getMonth() === 1 && birth.getDate() === 29) {
       const isLeap = (year: number) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
       if (!isLeap(nextYear)) {
           if (leapYearMode === 'Feb28') {
               nextBirthday.setDate(28);
           } else {
               nextBirthday.setDate(1);
               nextBirthday.setMonth(2); // March 1st
           }
       }
    }
  }
  
  const diffTime = nextBirthday.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

export const calculateAge = (birthDateString: string): number => {
  const today = new Date();
  const birth = parseLocalYMD(birthDateString);
  
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

export const calculateNextAge = (birthDateString: string): number => {
    return calculateAge(birthDateString) + 1;
}

export const sortBirthdays = (birthdays: Birthday[], leapYearMode: 'Feb28' | 'March1' = 'Feb28'): Birthday[] => {
  return [...birthdays].sort((a, b) => {
    const daysA = calculateDaysUntil(a.birthDate, leapYearMode);
    const daysB = calculateDaysUntil(b.birthDate, leapYearMode);
    return daysA - daysB;
  });
};

export const isToday = (birthDateString: string, leapYearMode: 'Feb28' | 'March1' = 'Feb28'): boolean => {
    return calculateDaysUntil(birthDateString, leapYearMode) === 0;
}

export const formatDateFriendly = (dateString: string): string => {
    const date = parseLocalYMD(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}