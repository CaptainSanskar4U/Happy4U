
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Birthday, CelebrationHistory } from './types';
import { calculateDaysUntil, sortBirthdays, calculateNextAge, isToday, formatDateFriendly } from './utils/dateUtils';
import { AddBirthdayModal } from './components/AddBirthdayModal';
import { BirthdayPopup } from './components/BirthdayPopup';
import { CalendarView } from './components/CalendarView';
import { WelcomeModal } from './components/WelcomeModal';
import { NotesView } from './components/NotesView';
import { NotificationPermissionModal } from './components/NotificationPermissionModal';
import { syncToIndexedDB, registerServiceWorker, syncSettingToIndexedDB, loadBirthdays, saveBirthdayInIndexedDB, deleteBirthdayFromIndexedDB } from './utils/storage';
import { NotificationInboxModal } from './components/NotificationInboxModal';
import { InAppNotification } from './types';
import { 
  SettingsStore, 
  BirthdayRepository, 
  ReminderCalculator, 
  NotificationScheduler, 
  NotificationInboxManager, 
  NotificationReconciliationService,
  NotificationNativeScheduler,
  PlatformDetector,
  requestNotificationPermissions,
  ReconciliationStats
} from './utils/notifications';
import { getDiagnostics } from './utils/diagnostics';
import { Plus, Calendar as CalendarIcon, Home, Settings, Bell, Gift, Sparkles, Zap, Edit2, Camera, Moon, Sun, StickyNote, Palette, Check, Trash2, Clock, ShieldCheck, Copy, Terminal, ExternalLink, Inbox } from 'lucide-react';

const STORAGE_KEY = 'happy4u_birthdays';
const USER_KEY = 'happy4u_username';
const GENDER_KEY = 'happy4u_gender';
const THEME_KEY = 'happy4u_theme';
const ACCENT_KEY = 'happy4u_accent';
const NOTIF_TIME_KEY = 'happy4u_notif_time';
const CELEBRATIONS_KEY = 'happy4u_celebrations';
const NOTIF_MUTED_KEY = 'happy4u_notifications_muted';
const POPUPS_SHOWN_KEY = 'happy4u_shown_popups';

// Color Themes Configuration
const THEMES = [
    { id: 'lime', name: 'Neon Lime', hex: '#D2F801', dim: '#b5d600', glow: 'rgba(210, 248, 1, 0.5)' },
    { id: 'orange', name: 'Dopamine Orange', hex: '#F3701E', dim: '#D35400', glow: 'rgba(243, 112, 30, 0.5)' },
    { id: 'green', name: 'Zen Green', hex: '#22c55e', dim: '#15803d', glow: 'rgba(34, 197, 94, 0.5)' },
    { id: 'blue', name: 'Cyber Blue', hex: '#3B82F6', dim: '#1D4ED8', glow: 'rgba(59, 130, 246, 0.5)' },
    { id: 'purple', name: 'Royal Purple', hex: '#A855F7', dim: '#7E22CE', glow: 'rgba(168, 85, 247, 0.5)' },
    { id: 'gold', name: 'Luxury Gold', hex: '#EAB308', dim: '#CA8A04', glow: 'rgba(234, 179, 8, 0.5)' },
    { id: 'pink', name: 'Hot Pink', hex: '#EC4899', dim: '#BE185D', glow: 'rgba(236, 72, 153, 0.5)' },
];

// Permanent Avatar Component (No external dependencies)
const ProfileAvatar = ({ name, gender }: { name: string, gender: 'male' | 'female' }) => {
    const initial = name ? name.charAt(0).toUpperCase() : '?';
    
    // Aesthetic gradients based on gender
    const gradient = gender === 'female' 
        ? 'linear-gradient(135deg, #EC4899, #8B5CF6)'  // Pink -> Purple
        : 'linear-gradient(135deg, #06B6D4, #3B82F6)'; // Cyan -> Blue

    return (
        <div 
            className="w-full h-full flex items-center justify-center relative overflow-hidden" 
            style={{ background: gradient }}
        >
             {/* Lively geometric accents */}
             <div className="absolute top-0 right-0 w-6 h-6 bg-white opacity-20 rounded-full -translate-y-1/2 translate-x-1/2"></div>
             <div className="absolute bottom-0 left-0 w-8 h-8 bg-black opacity-10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
             
             <span className="text-white font-bold text-lg drop-shadow-md relative z-10 select-none">
                 {initial}
             </span>
        </div>
    );
};

export default function App() {
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [username, setUsername] = useState<string>(() => localStorage.getItem('happy4u_username') || '');
  const [gender, setGender] = useState<'male' | 'female'>(() => (localStorage.getItem('happy4u_gender') as 'male' | 'female') || 'male');
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => (localStorage.getItem('happy4u_theme') as 'dark' | 'light') || 'dark');
  const [accentTheme, setAccentTheme] = useState<string>(() => {
    const saved = localStorage.getItem('happy4u_accent');
    if (saved) {
      const exists = THEMES.find(t => t.id === saved);
      if (exists) return saved;
    }
    return THEMES[0].id;
  });
  const [notificationTime, setNotificationTime] = useState<string>(() => localStorage.getItem('happy4u_notif_time') || '09:00');
  
  // Custom offset notification times
  const [notifTimeSameDay, setNotifTimeSameDay] = useState<string>(() => localStorage.getItem('happy4u_notif_time_same_day') || '09:00');
  const [notifTimeOneDay, setNotifTimeOneDay] = useState<string>(() => localStorage.getItem('happy4u_notif_time_one_day') || '09:00');
  const [notifTimeThreeDays, setNotifTimeThreeDays] = useState<string>(() => localStorage.getItem('happy4u_notif_time_three_day') || '09:00');
  const [notifTimeSevenDays, setNotifTimeSevenDays] = useState<string>(() => localStorage.getItem('happy4u_notif_time_seven_day') || '09:00');

  const [view, setView] = useState<'home' | 'list' | 'notes' | 'settings'>('home');
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [popupBirthdays, setPopupBirthdays] = useState<Birthday[]>([]);
  const [shownPopups, setShownPopups] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(POPUPS_SHOWN_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const todayStr = new Date().toDateString();
        if (parsed.date === todayStr && Array.isArray(parsed.ids)) {
          return new Set(parsed.ids);
        }
      } catch (e) {
        console.error("Failed to parse shown popups", e);
      }
    }
    return new Set();
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [celebrations, setCelebrations] = useState<CelebrationHistory[]>([]);

  // Configurable Offline system parameters
  const [leapYearMode, setLeapYearMode] = useState<'Feb28' | 'March1'>(() => (localStorage.getItem('happy4u_leap_year_mode') as 'Feb28' | 'March1') || 'Feb28');
  const [inAppNotifs, setInAppNotifs] = useState<InAppNotification[]>(() => {
    const saved = localStorage.getItem('happy4u_inbox_notifications');
    return saved ? JSON.parse(saved) : [];
  });
  const [isInboxOpen, setIsInboxOpen] = useState(false);

  // Rolling scheduler configuration state
  const [schedulingWindowDays, setSchedulingWindowDays] = useState<number>(() => NotificationNativeScheduler.getSchedulingWindowDays());
  const [nativeLimit, setNativeLimit] = useState<number>(() => NotificationNativeScheduler.getNativeLimit());
  const [reconcileStats, setReconcileStats] = useState<ReconciliationStats | null>(() => NotificationReconciliationService.getLatestStats());

  // Global Offset settings (0 = same day, 1 = 1 day before, 3 = 3 days before, 7 = 7 days before)
  const [offsetMuted0, setOffsetMuted0] = useState<boolean>(() => localStorage.getItem('happy4u_offset_muted_0') === 'true');
  const [offsetMuted1, setOffsetMuted1] = useState<boolean>(() => localStorage.getItem('happy4u_offset_muted_1') === 'true');
  const [offsetMuted3, setOffsetMuted3] = useState<boolean>(() => localStorage.getItem('happy4u_offset_muted_3') === 'true');
  const [offsetMuted7, setOffsetMuted7] = useState<boolean>(() => localStorage.getItem('happy4u_offset_muted_7') === 'true');

  // Developer mode tap state
  const [devModeActive, setDevModeActive] = useState<boolean>(() => localStorage.getItem('happy4u_dev_mode') === 'true');
  const [versionTaps, setVersionTaps] = useState<number>(0);
  const [diagnosticsData, setDiagnosticsData] = useState<any>(null);

  useEffect(() => {
    if (devModeActive) {
      getDiagnostics().then(setDiagnosticsData).catch(console.error);
    }
  }, [devModeActive]);

  // Core unified reconciliation and sync trigger helper
  // Debounced to prevent overlapping runs when multiple settings change rapidly
  const reconciliationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconciliationRunningRef = useRef(false);
  const reconciliationPendingRef = useRef(false);

  const runReconciliation = () => {
    if (reconciliationTimerRef.current) {
      clearTimeout(reconciliationTimerRef.current);
    }
    reconciliationTimerRef.current = setTimeout(() => {
      reconciliationTimerRef.current = null;
      if (reconciliationRunningRef.current) {
        reconciliationPendingRef.current = true;
        return;
      }
      reconciliationRunningRef.current = true;
      NotificationReconciliationService.reconcile().then(() => {
        setReconcileStats(NotificationReconciliationService.getLatestStats());
        setInAppNotifs(NotificationInboxManager.getInbox());
        reconciliationRunningRef.current = false;
        if (reconciliationPendingRef.current) {
          reconciliationPendingRef.current = false;
          runReconciliation();
        }
      }).catch(() => {
        reconciliationRunningRef.current = false;
      });
    }, 150);
  };

  useEffect(() => {
    localStorage.setItem('happy4u_offset_muted_0', offsetMuted0 ? 'true' : 'false');
    runReconciliation();
  }, [offsetMuted0]);

  useEffect(() => {
    localStorage.setItem('happy4u_offset_muted_1', offsetMuted1 ? 'true' : 'false');
    runReconciliation();
  }, [offsetMuted1]);

  useEffect(() => {
    localStorage.setItem('happy4u_offset_muted_3', offsetMuted3 ? 'true' : 'false');
    runReconciliation();
  }, [offsetMuted3]);

  useEffect(() => {
    localStorage.setItem('happy4u_offset_muted_7', offsetMuted7 ? 'true' : 'false');
    runReconciliation();
  }, [offsetMuted7]);

  // Sync state mutations locally and trigger reconciliation
  useEffect(() => {
    localStorage.setItem('happy4u_leap_year_mode', leapYearMode);
    syncSettingToIndexedDB('leapYearMode', leapYearMode);
    runReconciliation();
  }, [leapYearMode]);

  useEffect(() => {
    localStorage.setItem('happy4u_notif_time_same_day', notifTimeSameDay);
    localStorage.setItem('happy4u_notif_time', notifTimeSameDay); // Fallback Compatibility
    syncSettingToIndexedDB('notif_time_same_day', notifTimeSameDay);
    syncSettingToIndexedDB('notificationTime', notifTimeSameDay);
    runReconciliation();
  }, [notifTimeSameDay]);

  useEffect(() => {
    localStorage.setItem('happy4u_notif_time_one_day', notifTimeOneDay);
    syncSettingToIndexedDB('notif_time_one_day', notifTimeOneDay);
    runReconciliation();
  }, [notifTimeOneDay]);

  useEffect(() => {
    localStorage.setItem('happy4u_notif_time_three_day', notifTimeThreeDays);
    syncSettingToIndexedDB('notif_time_three_day', notifTimeThreeDays);
    runReconciliation();
  }, [notifTimeThreeDays]);

  useEffect(() => {
    localStorage.setItem('happy4u_notif_time_seven_day', notifTimeSevenDays);
    syncSettingToIndexedDB('notif_time_seven_day', notifTimeSevenDays);
    runReconciliation();
  }, [notifTimeSevenDays]);

  useEffect(() => {
    localStorage.setItem('happy4u_inbox_notifications', JSON.stringify(inAppNotifs));
  }, [inAppNotifs]);

  // Load data
  useEffect(() => {
    // 1. Register Service Worker for background notifications (skip on Capacitor)
    if (!PlatformDetector.isCapacitor()) {
      registerServiceWorker();
    }

    // 2. Load birthdays asynchronously and hydrate
    loadBirthdays().then((dbBirthdays) => {
      setBirthdays(dbBirthdays);
      setIsHydrated(true);

      if (!username) {
          // First-time user onboarding sequence!
          if (PlatformDetector.isCapacitor()) {
              // On Capacitor, always show welcome for first-time users
              setIsWelcomeOpen(true);
          } else if ('Notification' in window && Notification.permission === 'default') {
              setIsNotificationModalOpen(true);
          } else {
              setIsWelcomeOpen(true);
          }
      }
    }).catch(err => {
      console.error("Critical: failed to hydrate birthdays on startup", err);
      setIsHydrated(true);
    });

    // Check initial notification status
    if (PlatformDetector.isCapacitor()) {
        // On Capacitor, default to notifications enabled
        const savedNotifMuted = localStorage.getItem(NOTIF_MUTED_KEY);
        if (savedNotifMuted === 'true') {
            setNotificationsEnabled(false);
        } else {
            setNotificationsEnabled(true);
            localStorage.setItem(NOTIF_MUTED_KEY, 'false');
        }
    } else {
        const savedNotifMuted = localStorage.getItem(NOTIF_MUTED_KEY);
        if ('Notification' in window) {
            if (Notification.permission === 'granted' && savedNotifMuted !== 'true') {
                setNotificationsEnabled(true);
            } else if (Notification.permission === 'default' && savedNotifMuted !== 'true') {
                setTimeout(() => {
                    if (username) setIsNotificationModalOpen(true);
                }, 3000);
            } else {
                setNotificationsEnabled(false);
            }
        } else {
            if (savedNotifMuted === 'false') {
                setNotificationsEnabled(true);
            } else if (savedNotifMuted === 'true') {
                setNotificationsEnabled(false);
            } else {
                setNotificationsEnabled(true);
                localStorage.setItem(NOTIF_MUTED_KEY, 'false');
            }
        }
    }
  }, []);

  // Periodic Focus & Launch Idempotent Reconciliation Pass
  useEffect(() => {
    runReconciliation();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runReconciliation();
        checkForegroundDueNotifications();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, []);

  // Foreground notification polling - fires due notifications while app is open
  // This is the ONLY reliable mechanism for PWABuilder TWA APKs since
  // TimestampTrigger, PeriodicSync, and BackgroundSync are unavailable.
  const checkForegroundDueNotifications = () => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (SettingsStore.getNotificationsEnabled() === false) return;

    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    const scheduled = NotificationScheduler.getScheduledNotifications();

    scheduled.forEach(target => {
      if (target.triggerTime <= now && target.triggerTime > fiveMinutesAgo) {
        const deliveredKey = `happy4u_delivered_${target.id}`;
        if (localStorage.getItem(deliveredKey)) return;

        try {
          new Notification(target.title, {
            body: target.body,
            icon: 'https://cdn-icons-png.flaticon.com/512/4213/4213652.png',
            badge: 'https://cdn-icons-png.flaticon.com/512/4213/3516/3516709.png',
            tag: `birthday-${target.birthdayId}-${target.year}-${target.offset}`,
            requireInteraction: true
          });
          localStorage.setItem(deliveredKey, 'true');
          NotificationInboxManager.addNotification(target);
        } catch (e) {
          console.warn('Foreground notification failed:', e);
        }
      }
    });
  };

  // Run foreground check every 60 seconds while app is open
  useEffect(() => {
    checkForegroundDueNotifications();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkForegroundDueNotifications();
      }
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [birthdays]);

  // Capacitor: Request notification permission on first launch and
  // reschedule all native notifications whenever birthdays change.
  // This is the ONLY mechanism that fires notifications when the
  // app is closed/backgrounded on Android.
  useEffect(() => {
    if (!PlatformDetector.isCapacitor()) return;

    const initCapacitorNotifications = async () => {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        console.warn('[Capacitor] Notification permission not granted.');
        return;
      }
      runReconciliation();
    };

    initCapacitorNotifications();
  }, []);

  // Re-run native scheduling whenever the birthdays list changes (on Capacitor)
  useEffect(() => {
    if (!PlatformDetector.isCapacitor()) return;
    if (!SettingsStore.getNotificationsEnabled()) return;
    runReconciliation();
  }, [birthdays]);

  const handleWelcomeClose = () => {
      setIsWelcomeOpen(false);
      if (!('Notification' in window)) {
          // If in WebView/APK, enable in-app notifications right away by default on onboarding complete
          setNotificationsEnabled(true);
          localStorage.setItem(NOTIF_MUTED_KEY, 'false');
          return;
      }
      const savedNotifMuted = localStorage.getItem(NOTIF_MUTED_KEY);
      if (savedNotifMuted !== 'true' && savedNotifMuted !== 'false') {
          setTimeout(() => setIsNotificationModalOpen(true), 1000);
      }
  };

  useEffect(() => {
      if (themeMode === 'light') {
          document.body.classList.add('light-mode');
      } else {
          document.body.classList.remove('light-mode');
      }
      localStorage.setItem(THEME_KEY, themeMode);
  }, [themeMode]);

  useEffect(() => {
      const selectedTheme = THEMES.find(t => t.id === accentTheme) || THEMES[0];
      const root = document.documentElement;
      root.style.setProperty('--color-lime', selectedTheme.hex);
      root.style.setProperty('--color-lime-dim', selectedTheme.dim);
      root.style.setProperty('--color-lime-glow', selectedTheme.glow);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', selectedTheme.hex);
      localStorage.setItem(ACCENT_KEY, accentTheme);
  }, [accentTheme]);

  useEffect(() => {
      localStorage.setItem(NOTIF_TIME_KEY, notificationTime);
      syncSettingToIndexedDB('notificationTime', notificationTime);
  }, [notificationTime]);

  useEffect(() => {
      syncSettingToIndexedDB('notificationsEnabled', notificationsEnabled);
      runReconciliation();
  }, [notificationsEnabled]);

  useEffect(() => {
    if (birthdays.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const bdayIdParam = params.get('birthdayId');

    if (viewParam && ['home', 'list', 'notes', 'settings'].includes(viewParam)) {
        setView(viewParam as any);
    }

    if (bdayIdParam) {
        const matched = birthdays.find(b => b.id === bdayIdParam);
        if (matched) {
            setPopupBirthdays([matched]);
        }
    }

    // Clean up url to maintain clean state after deep link was consumed
    if (viewParam || bdayIdParam) {
        window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [birthdays]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(birthdays));
    syncToIndexedDB(birthdays);
    runReconciliation();
  }, [birthdays, isHydrated]);

  useEffect(() => {
    localStorage.setItem(CELEBRATIONS_KEY, JSON.stringify(celebrations));
  }, [celebrations]);

  useEffect(() => {
    const todayStr = new Date().toDateString();
    localStorage.setItem(POPUPS_SHOWN_KEY, JSON.stringify({
      date: todayStr,
      ids: Array.from(shownPopups)
    }));
  }, [shownPopups]);

  const handleSaveProfile = (name: string, newGender: 'male' | 'female') => {
      setUsername(name);
      setGender(newGender);
      localStorage.setItem(USER_KEY, name);
      localStorage.setItem(GENDER_KEY, newGender);
      handleWelcomeClose();
  };

  useEffect(() => {
    const todayMatches = birthdays.filter(b => {
        if (!isToday(b.birthDate)) return false;
        return !shownPopups.has(b.id);
    });

    if (todayMatches.length > 0) {
        setTimeout(() => {
            setPopupBirthdays(todayMatches);
            setShownPopups(prev => {
                const next = new Set(prev);
                todayMatches.forEach(b => next.add(b.id));
                return next;
            });
        }, 1000);
    }
  }, [birthdays, shownPopups]);

  const handleBackup = () => {
    try {
      const backupData = {
         birthdays: JSON.parse(localStorage.getItem('happy4u_birthdays') || '[]'),
         notes: JSON.parse(localStorage.getItem('cakewait_notes') || '[]'),
         leapYearMode: localStorage.getItem('happy4u_leap_year_mode') || 'Feb28',
         accentTheme: localStorage.getItem('happy4u_accent_theme') || 'Classic',
         themeMode: localStorage.getItem('happy4u_theme_mode') || 'dark',
          notifTimeSameDay: localStorage.getItem('happy4u_notif_time_same_day') || '09:00',
          notifTimeOneDay: localStorage.getItem('happy4u_notif_time_one_day') || '09:00',
          notifTimeThreeDay: localStorage.getItem('happy4u_notif_time_three_day') || '09:00',
          notifTimeSevenDay: localStorage.getItem('happy4u_notif_time_seven_day') || '09:00',
          offsetMuted0: localStorage.getItem('happy4u_offset_muted_0') === 'true',
          offsetMuted1: localStorage.getItem('happy4u_offset_muted_1') === 'true',
          offsetMuted3: localStorage.getItem('happy4u_offset_muted_3') === 'true',
          offsetMuted7: localStorage.getItem('happy4u_offset_muted_7') === 'true'
      };
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `happy4u_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to generate backup: ' + e);
    }
  };

  const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        
        if (!json || (json.birthdays && !Array.isArray(json.birthdays))) {
           alert('Invalid backup file structure.');
           return;
        }

        if (confirm('Restore data? This will overwrite your current birthdays, notes, and settings.')) {
           if (json.birthdays) {
              localStorage.setItem('happy4u_birthdays', JSON.stringify(json.birthdays));
              setBirthdays(json.birthdays);
           }
           if (json.notes) {
              localStorage.setItem('cakewait_notes', JSON.stringify(json.notes));
           }
           if (json.leapYearMode) {
              setLeapYearMode(json.leapYearMode);
              localStorage.setItem('happy4u_leap_year_mode', json.leapYearMode);
           }
           if (json.accentTheme) {
              setAccentTheme(json.accentTheme);
              localStorage.setItem('happy4u_accent_theme', json.accentTheme);
           }
           if (json.notifTimeSameDay) {
              setNotifTimeSameDay(json.notifTimeSameDay);
           }
           if (json.notifTimeOneDay) {
              setNotifTimeOneDay(json.notifTimeOneDay);
           }
           if (json.notifTimeThreeDay) {
              setNotifTimeThreeDays(json.notifTimeThreeDay);
           }
           if (json.notifTimeSevenDay) {
              setNotifTimeSevenDays(json.notifTimeSevenDay);
           }
           
           localStorage.setItem('happy4u_offset_muted_0', json.offsetMuted0 ? 'true' : 'false');
           localStorage.setItem('happy4u_offset_muted_1', json.offsetMuted1 ? 'true' : 'false');
           localStorage.setItem('happy4u_offset_muted_3', json.offsetMuted3 ? 'true' : 'false');
           localStorage.setItem('happy4u_offset_muted_7', json.offsetMuted7 ? 'true' : 'false');

           alert('Data restored successfully! The application will refresh.');
           window.location.reload();
        }
      } catch (err) {
        alert('Failed to parse backup file: ' + err);
      }
    };
    reader.readAsText(file);
  };

  const sendTestNotification = async () => {
    const testId = `test-${Date.now()}`;
    const testNotif: InAppNotification = {
        id: testId,
        title: 'Happy4U Notification Test 🎈',
        body: 'Warmest birthday wishes from Happy4U! Your automatic synchronization engine is fully active.',
        timestamp: Date.now(),
        read: false,
        birthdayId: 'test',
        type: 'test'
    };
    setInAppNotifs(prev => [testNotif, ...prev]);

    const isNative = typeof window !== 'undefined' && (!!(window as any).Capacitor || !!(window as any).cordova || !!(window as any).Android);
    if (isNative) {
        const Cap = (window as any).Capacitor;
        if (Cap && Cap.Plugins && Cap.Plugins.LocalNotifications) {
            try {
                await Cap.Plugins.LocalNotifications.schedule({
                    notifications: [{
                        id: 999999,
                        title: 'Happy4U Notification Test 🎈',
                        body: 'Warmest birthday wishes from Happy4U! Your automatic synchronization engine is fully active.',
                        extra: { birthdayId: 'test' }
                    }]
                });
                return;
            } catch (e) {
                console.error("Capacitor test failed", e);
            }
        }
    }

    if ('Notification' in window) {
        if (Notification.permission === 'granted') {
            new Notification('Happy4U Notification Test 🎈', {
                body: 'Warmest birthday wishes from Happy4U! Your automatic synchronization engine is fully active.',
                icon: 'https://cdn-icons-png.flaticon.com/512/4213/4213652.png'
            });
        } else {
            alert('Test Notification: Warmest birthday wishes from Happy4U! (Please grant notification permissions details to see browser-level push alerts)');
        }
    } else {
        alert('Test Notification: Warmest birthday wishes from Happy4U!');
    }
  };

  const handleVersionClick = () => {
     setVersionTaps(prev => {
        const next = prev + 1;
        if (next >= 7) {
           const nextMode = !devModeActive;
           setDevModeActive(nextMode);
           localStorage.setItem('happy4u_dev_mode', nextMode ? 'true' : 'false');
           alert(nextMode ? 'Developer Mode Unlocked! Telemetry & internal schedules are now visible.' : 'Developer Mode Disabled.');
           return 0;
        }
        return next;
     });
  };

  const handleAddOrUpdate = (birthday: Birthday) => {
    if (editingId) {
      setBirthdays(prev => prev.map(b => b.id === editingId ? birthday : b));
      setEditingId(null);
    } else {
      setBirthdays(prev => [...prev, birthday]);
    }
    setIsModalOpen(false);
  };

  const handleMarkCelebrated = (id: string) => {
    const currentYear = new Date().getFullYear();
    const celebration: CelebrationHistory = {
        birthdayId: id,
        year: currentYear,
        celebratedAt: new Date().toISOString()
    };
    
    setCelebrations(prev => {
        if (prev.some(c => c.birthdayId === id && c.year === currentYear)) {
            return prev;
        }
        return [celebration, ...prev];
    });

    setPopupBirthdays(prev => prev.filter(b => b.id !== id));
  };

  const handleDelete = (id: string) => {
    if (confirm('Remove this birthday?')) {
      setBirthdays(prev => prev.filter(b => b.id !== id));
      setInAppNotifs(prev => prev.filter(n => n.birthdayId !== id));
    }
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setIsModalOpen(true);
  };

  const handleRequestNotification = async () => {
    // Capacitor path: request native permission directly
    if (PlatformDetector.isCapacitor()) {
        const granted = await requestNotificationPermissions();
        setNotificationsEnabled(granted);
        setIsNotificationModalOpen(false);
        localStorage.setItem(NOTIF_MUTED_KEY, granted ? 'false' : 'true');
        if (granted) {
            runReconciliation();
        }
        if (!localStorage.getItem(USER_KEY)) {
            setIsWelcomeOpen(true);
        }
        return;
    }

    if (!('Notification' in window)) {
        setNotificationsEnabled(true);
        setIsNotificationModalOpen(false);
        localStorage.setItem(NOTIF_MUTED_KEY, 'false');
        
        // Instant local test notification confirming that reminders are working
        const testId = `test-${Date.now()}`;
        const testNotif: InAppNotification = {
            id: testId,
            title: 'Notifications Enabled 🎉',
            body: 'Your birthday reminders are now active.',
            timestamp: Date.now(),
            read: false,
            birthdayId: 'test',
            type: 'test'
        };
        setInAppNotifs(prev => [testNotif, ...prev]);
        alert("Notifications Enabled 🎉\nYour birthday reminders are now active.");
        return;
    }
    
    if (Notification.permission === 'denied') {
        alert('You have blocked notifications. Please enable them in your browser settings.');
        return;
    }

    try {
        const result = await Notification.requestPermission();
        if (result === 'granted') {
            setNotificationsEnabled(true);
            setIsNotificationModalOpen(false);
            localStorage.setItem(NOTIF_MUTED_KEY, 'false');
            
            const testId = `test-${Date.now()}`;
            const testNotif: InAppNotification = {
                id: testId,
                title: 'Notifications Enabled 🎉',
                body: 'Your birthday reminders are now active.',
                timestamp: Date.now(),
                read: false,
                birthdayId: 'test',
                type: 'test'
            };
            setInAppNotifs(prev => [testNotif, ...prev]);

            try {
                new Notification('Notifications Enabled 🎉', {
                    body: 'Your birthday reminders are now active.',
                    icon: 'https://cdn-icons-png.flaticon.com/512/4213/4213652.png',
                    tag: 'welcome-test'
                });
            } catch (notifErr) {
                console.warn('Main thread Notification failed, trying SW:', notifErr);
            }

            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ action: 'sendWelcomeNotification' });
            }

            runReconciliation();
        } else {
            setNotificationsEnabled(false);
            setIsNotificationModalOpen(false);
            localStorage.setItem(NOTIF_MUTED_KEY, 'true');
        }
    } catch (e) {
        console.error("Notification Error:", e);
    } finally {
        if (!localStorage.getItem(USER_KEY)) {
            setIsWelcomeOpen(true);
        }
    }
  };

  const sortedBirthdays = useMemo(() => sortBirthdays(birthdays, leapYearMode), [birthdays, leapYearMode]);
  const nextBirthday = sortedBirthdays[0];

  return (
    <div className="min-h-screen bg-background text-primary pb-32 relative selection:bg-lime selection:text-black overflow-x-hidden transition-colors duration-500">
        
        {/* Animated Background Blobs */}
        <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-lime/20 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob"></div>
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-pink-500/20 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>

        <header className="pt-4 px-6 flex justify-between items-center sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-dark-border gpu-layer">
            <div className="flex items-center gap-3 py-3">
                <div 
                    className="relative group cursor-pointer"
                    onClick={() => setIsWelcomeOpen(true)}
                >
                    <div className="w-10 h-10 rounded-full bg-surfaceLight border border-dark-border flex items-center justify-center overflow-hidden relative shadow-sm">
                        <ProfileAvatar name={username} gender={gender} />
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-surfaceLight border border-dark-border rounded-full p-0.5 text-muted group-hover:text-lime transition-colors">
                        <Camera size={10} />
                    </div>
                </div>

                <div className="flex flex-col justify-center">
                    <h1 className="text-[10px] font-medium text-muted uppercase tracking-wider leading-none mb-1">Welcome Back</h1>
                    <div className="flex items-center gap-2">
                        <p className="text-lg font-bold leading-none text-primary max-w-[150px] truncate">
                            {username || 'Friend'}
                        </p>
                        <button 
                            onClick={() => setIsWelcomeOpen(true)}
                            className="text-muted hover:text-lime transition-colors p-1 -m-1 rounded"
                            aria-label="Edit Name"
                        >
                            <Edit2 size={12} />
                        </button>
                    </div>
                </div>
            </div>
            
            <button 
                onClick={() => setIsInboxOpen(true)}
                className="w-10 h-10 rounded-full border border-dark-border flex items-center justify-center relative transition-all active:scale-90 bg-surfaceLight text-muted hover:text-lime hover:border-lime/30 cursor-pointer"
                aria-label="Notification Center"
            >
                <Bell className="w-5 h-5" />
                {inAppNotifs.filter(n => !n.read).length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-lime text-black font-extrabold text-[10px] flex items-center justify-center animate-pulse shadow-sm shadow-lime/30">
                        {inAppNotifs.filter(n => !n.read).length}
                    </span>
                )}
            </button>
        </header>

        <main className="px-6 mt-6 space-y-8 relative z-10 max-w-lg mx-auto w-full">
            
            <div key={view} className="animate-slide-up">
            
            {view === 'home' && (
                <>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 bg-dark-card border border-dark-border rounded-[2rem] p-6 relative overflow-hidden group shadow-2xl card-shine animate-scale-in origin-top">
                             <div className="absolute -top-20 -right-20 w-40 h-40 bg-lime/20 blur-[60px] rounded-full transition-colors duration-500"></div>
                             
                             {nextBirthday ? (
                                <div className="relative z-10 flex justify-between h-full min-h-[140px]">
                                    <div className="flex flex-col justify-between max-w-[65%]">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-2 py-1 bg-lime text-black text-[10px] font-bold uppercase tracking-wider rounded-md">Up Next</span>
                                            </div>
                                            <h2 className="text-2xl font-bold text-primary leading-tight truncate">{nextBirthday.name}</h2>
                                            <p className="text-muted text-sm mt-1">Turning {calculateNextAge(nextBirthday.birthDate)}</p>
                                        </div>
                                        
                                        <div className="mt-4">
                                            <span className="text-5xl font-bold text-primary tracking-tighter">{calculateDaysUntil(nextBirthday.birthDate)}</span>
                                            <span className="text-sm text-muted ml-1 font-medium">days left</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end justify-between">
                                         <div className="w-14 h-14 rounded-2xl bg-surfaceLight border border-dark-border flex items-center justify-center text-3xl shadow-inner animate-float">
                                            {nextBirthday.emoji || '🎂'}
                                         </div>
                                         <Gift className="text-lime opacity-20 w-16 h-16 absolute bottom-0 right-0 -rotate-12 translate-x-2 translate-y-2 transition-colors duration-500" />
                                    </div>
                                </div>
                             ) : (
                                <div className="flex flex-col items-center justify-center h-40 text-center">
                                    <Sparkles className="text-lime mb-2 opacity-50" />
                                    <p className="font-bold text-muted">No upcoming<br/>birthdays</p>
                                </div>
                             )}
                        </div>

                        <button 
                            onClick={() => { setEditingId(null); setIsModalOpen(true); }}
                            className="col-span-1 bg-lime text-black rounded-[2rem] p-5 flex flex-col justify-between items-start h-32 hover:bg-lime-dim transition-colors active:scale-95 shadow-lg shadow-lime/10 group card-shine animate-scale-in relative overflow-hidden"
                            style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
                        >
                            <div className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                                <Plus className="w-5 h-5" />
                            </div>
                            <div className="mt-auto">
                                <p className="font-bold text-lg leading-none">Add</p>
                                <p className="text-xs font-medium opacity-70 mt-1">Birthday</p>
                            </div>
                        </button>

                        <div 
                            className="col-span-1 bg-surfaceLight border border-dark-border rounded-[2rem] p-5 flex flex-col justify-between items-start h-32 card-shine animate-scale-in"
                            style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
                        >
                            <div className="w-8 h-8 rounded-full bg-surface border border-dark-border flex items-center justify-center">
                                <Zap className="w-4 h-4 text-muted" />
                            </div>
                            <div className="mt-auto">
                                <p className="font-bold text-lg text-primary leading-none">{birthdays.length}</p>
                                <p className="text-xs text-muted mt-1">Friends</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4">
                        <h3 className="text-lg font-bold text-primary px-1">Upcoming</h3>
                        <div className="space-y-2">
                            {sortedBirthdays.length === 0 ? (
                                <div className="p-8 text-center border border-dashed border-dark-border rounded-2xl">
                                    <p className="text-muted text-sm">No birthdays found.</p>
                                </div>
                            ) : (
                                sortedBirthdays.map((birthday, index) => {
                                    const days = calculateDaysUntil(birthday.birthDate);
                                    const isUrgent = days <= 7;
                                    return (
                                        <div 
                                            key={birthday.id}
                                            onClick={() => handleEdit(birthday.id)}
                                            className="group flex items-center justify-between p-4 bg-dark-card border border-dark-border rounded-3xl hover:border-lime/30 transition-all active:scale-[0.98] cursor-pointer relative overflow-hidden animate-slide-up opacity-0"
                                            style={{ animationDelay: `${index * 50 + 300}ms` }}
                                        >
                                            <div className="absolute inset-0 bg-lime/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                                            <div className="flex items-center gap-4 relative z-10 overflow-hidden">
                                                <div className="w-12 h-12 rounded-full bg-surfaceLight border border-dark-border flex items-center justify-center text-xl shrink-0">
                                                    {birthday.emoji || '👤'}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-bold text-primary text-[15px] truncate">{birthday.name}</h4>
                                                    <p className="text-xs text-muted mt-0.5 flex items-center gap-1 truncate">
                                                        {formatDateFriendly(birthday.birthDate)}
                                                        <span className="w-1 h-1 rounded-full bg-muted shrink-0"></span>
                                                        <span className="truncate">{birthday.relationship || 'Friend'}</span>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="relative z-10 pl-2 shrink-0">
                                                {days === 0 ? (
                                                    <div className="px-3 py-1 bg-lime text-black text-xs font-bold rounded-full animate-pulse">
                                                        TODAY
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 text-right">
                                                        <div>
                                                            <span className={`block text-lg font-bold leading-none ${isUrgent ? 'text-lime' : 'text-primary'}`}>
                                                                {days}
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-muted uppercase -rotate-90 origin-center translate-y-0.5">
                                                            Days
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                    <div className="h-20"></div>
                </>
            )}

            {view === 'list' && (
                <CalendarView birthdays={birthdays} />
            )}

            {view === 'notes' && (
                <NotesView />
            )}
            
             {view === 'settings' && (
                <div className="space-y-6 pt-4 pb-20">
                    
                    {/* App Mood Card */}
                    <div className="bg-dark-card border border-dark-border rounded-3xl p-6 animate-scale-in" style={{ animationDelay: '0ms' }}>
                         <div className="flex items-center gap-2 mb-4">
                            <Palette size={18} className="text-lime" />
                            <h3 className="text-primary font-bold">App Mood</h3>
                         </div>
                         <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
                             {THEMES.map(t => (
                                 <button
                                    key={t.id}
                                    onClick={() => setAccentTheme(t.id)}
                                    className={`aspect-square rounded-2xl flex items-center justify-center transition-all relative overflow-hidden group ${accentTheme === t.id ? 'ring-2 ring-white scale-105' : 'opacity-70 hover:opacity-100 hover:scale-105'}`}
                                    style={{ backgroundColor: t.hex }}
                                    aria-label={t.name}
                                 >
                                     {accentTheme === t.id && (
                                         <div className="bg-black/20 rounded-full p-1 backdrop-blur-sm">
                                            <Check size={14} className="text-white" strokeWidth={3} />
                                         </div>
                                     )}
                                 </button>
                             ))}
                         </div>
                    </div>

                    {/* Preferences/Notifications Section */}
                    <div className="bg-dark-card border border-dark-border rounded-3xl p-6 animate-scale-in space-y-6" style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}>
                         <div className="flex items-center gap-2">
                             <Clock size={18} className="text-lime" />
                             <h3 className="text-primary font-bold">Notifications</h3>
                         </div>

                         {!PlatformDetector.hasNativeLocalNotifications() && !('Notification' in window) && (
                             <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-[11px] text-red-200 space-y-1">
                                 <span className="font-bold flex items-center gap-1.5 uppercase tracking-wide text-red-400">
                                     ⚠️ Warning
                                 </span>
                                 <span className="block text-slate-300 font-medium">
                                     Native local notification APIs are unavailable in this environment.
                                 </span>
                             </div>
                         )}
                         
                         {/* Notification Master Toggle */}
                         <div className="flex justify-between items-center py-2 border-b border-dark-border cursor-pointer" onClick={() => {
                             if (!('Notification' in window)) {
                                 const nextVal = !notificationsEnabled;
                                 setNotificationsEnabled(nextVal);
                                 localStorage.setItem(NOTIF_MUTED_KEY, nextVal ? 'false' : 'true');
                                 return;
                             }
                             if (!notificationsEnabled) {
                                 setIsNotificationModalOpen(true);
                             } else {
                                 setNotificationsEnabled(false);
                                 localStorage.setItem(NOTIF_MUTED_KEY, 'true');
                             }
                         }}>
                             <div className="space-y-1">
                                 <span className="text-xs text-primary font-bold block">Enable Notifications</span>
                                 <span className="text-[10px] text-muted block">Alerts on device local storage</span>
                             </div>
                             <div 
                                className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ease-in-out ${notificationsEnabled ? 'bg-lime' : 'bg-surfaceLight border border-dark-border'}`}
                             >
                                 <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${notificationsEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                             </div>
                         </div>

                         {/* Offsets (same day, 1 day, 3 days) Toggles + Times */}
                         <div className="space-y-4">
                             <span className="text-xs text-primary font-bold block">Active Reminder Offsets</span>
                             
                             {/* On Birthday */}
                             <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-surfaceLight border border-dark-border rounded-2xl p-4 gap-3">
                                 <div className="flex items-center gap-2">
                                     <button 
                                        onClick={() => setOffsetMuted0(!offsetMuted0)}
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${!offsetMuted0 ? 'bg-lime/10 text-lime border border-lime/30' : 'bg-dark-card text-muted border border-dark-border'}`}
                                     >
                                         <Check size={16} strokeWidth={!offsetMuted0 ? 3 : 2} />
                                     </button>
                                     <div className="space-y-0.5">
                                         <span className="text-xs text-primary font-bold block">On Birthday Day</span>
                                         <span className="text-[10px] text-muted block">Alert on actual birth date</span>
                                     </div>
                                 </div>
                                 <div className="flex items-center gap-3">
                                     <span className="text-[10px] text-muted font-bold font-mono uppercase">Time:</span>
                                     <input 
                                        type="time" 
                                        disabled={offsetMuted0}
                                        value={notifTimeSameDay}
                                        onChange={(e) => {
                                            setNotifTimeSameDay(e.target.value);
                                            setNotificationTime(e.target.value);
                                        }}
                                        className="bg-dark-card border border-dark-border rounded-xl px-3 py-1.5 text-primary text-sm font-bold focus:outline-none focus:border-lime disabled:opacity-30 transition-colors"
                                     />
                                 </div>
                             </div>

                             {/* 1 Day Before */}
                             <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-surfaceLight border border-dark-border rounded-2xl p-4 gap-3">
                                 <div className="flex items-center gap-2">
                                     <button 
                                        onClick={() => setOffsetMuted1(!offsetMuted1)}
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${!offsetMuted1 ? 'bg-lime/10 text-lime border border-lime/30' : 'bg-dark-card text-muted border border-dark-border'}`}
                                     >
                                         <Check size={16} strokeWidth={!offsetMuted1 ? 3 : 2} />
                                     </button>
                                     <div className="space-y-0.5">
                                         <span className="text-xs text-primary font-bold block">1 Day Before</span>
                                         <span className="text-[10px] text-muted block">Advance gentle reminder</span>
                                     </div>
                                 </div>
                                 <div className="flex items-center gap-3">
                                     <span className="text-[10px] text-muted font-bold font-mono uppercase">Time:</span>
                                     <input 
                                        type="time" 
                                        disabled={offsetMuted1}
                                        value={notifTimeOneDay}
                                        onChange={(e) => setNotifTimeOneDay(e.target.value)}
                                        className="bg-dark-card border border-dark-border rounded-xl px-3 py-1.5 text-primary text-sm font-bold focus:outline-none focus:border-lime disabled:opacity-30 transition-colors"
                                     />
                                 </div>
                             </div>

                             {/* 3 Days Before */}
                             <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-surfaceLight border border-dark-border rounded-2xl p-4 gap-3">
                                 <div className="flex items-center gap-2">
                                     <button 
                                        onClick={() => setOffsetMuted3(!offsetMuted3)}
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${!offsetMuted3 ? 'bg-lime/10 text-lime border border-lime/30' : 'bg-dark-card text-muted border border-dark-border'}`}
                                     >
                                         <Check size={16} strokeWidth={!offsetMuted3 ? 3 : 2} />
                                     </button>
                                     <div className="space-y-0.5">
                                         <span className="text-xs text-primary font-bold block">3 Days Before</span>
                                         <span className="text-[10px] text-muted block">Planning & gift preparation</span>
                                     </div>
                                 </div>
                                 <div className="flex items-center gap-3">
                                     <span className="text-[10px] text-muted font-bold font-mono uppercase">Time:</span>
                                     <input 
                                        type="time" 
                                        disabled={offsetMuted3}
                                        value={notifTimeThreeDays}
                                        onChange={(e) => setNotifTimeThreeDays(e.target.value)}
                                        className="bg-dark-card border border-dark-border rounded-xl px-3 py-1.5 text-primary text-sm font-bold focus:outline-none focus:border-lime disabled:opacity-30 transition-colors"
                                     />
                                  </div>
                              </div>

                              {/* 7 Days Before */}
                              <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-surfaceLight border border-dark-border rounded-2xl p-4 gap-3">
                                  <div className="flex items-center gap-2">
                                      <button 
                                         onClick={() => setOffsetMuted7(!offsetMuted7)}
                                         className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${!offsetMuted7 ? 'bg-lime/10 text-lime border border-lime/30' : 'bg-dark-card text-muted border border-dark-border'}`}
                                      >
                                         <Check size={16} strokeWidth={!offsetMuted7 ? 3 : 2} />
                                      </button>
                                      <div className="space-y-0.5">
                                         <span className="text-xs text-primary font-bold block">7 Days Before</span>
                                         <span className="text-[10px] text-muted block">Early planning reminder</span>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                      <span className="text-[10px] text-muted font-bold font-mono uppercase">Time:</span>
                                      <input 
                                         type="time" 
                                         disabled={offsetMuted7}
                                         value={notifTimeSevenDays}
                                         onChange={(e) => setNotifTimeSevenDays(e.target.value)}
                                         className="bg-dark-card border border-dark-border rounded-xl px-3 py-1.5 text-primary text-sm font-bold focus:outline-none focus:border-lime disabled:opacity-30 transition-colors"
                                      />
                                  </div>
                              </div>
                          </div>

                          {/* Theme Selectors Mode (Light vs. Dark) */}
                         <div className="flex justify-between items-center py-4 border-t border-dark-border cursor-pointer" onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}>
                             <div className="space-y-0.5">
                                 <span className="text-xs text-primary font-bold block">Theme Mode</span>
                                 <span className="text-[10px] text-muted block">Seamless toggle between modes</span>
                             </div>
                             <div className="flex items-center gap-2 bg-surfaceLight border border-dark-border rounded-full p-1 h-9">
                                <div className={`p-1.5 rounded-full transition-all ${themeMode === 'dark' ? 'bg-dark-card shadow text-white' : 'text-muted'}`}>
                                    <Moon size={14} />
                                </div>
                                <div className={`p-1.5 rounded-full transition-all ${themeMode === 'light' ? 'bg-white shadow text-black' : 'text-muted'}`}>
                                    <Sun size={14} />
                                </div>
                             </div>
                         </div>

                         {/* Test Notification button */}
                         <button 
                             onClick={sendTestNotification}
                             className="w-full py-4 rounded-2xl bg-surfaceLight border border-dark-border text-xs text-primary font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-lime hover:text-black hover:border-lime cursor-pointer uppercase tracking-wider"
                         >
                             <Sparkles size={14} />
                             Test Local Notification
                         </button>
                    </div>

                    {/* Leap Year Rule */}
                    <div className="bg-dark-card border border-dark-border rounded-3xl p-6 animate-scale-in" style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <Clock size={18} className="text-lime" />
                            <h3 className="text-primary font-bold">Leap Year Handling</h3>
                        </div>
                        <p className="text-xs text-muted leading-relaxed mb-4">
                            Choose when to trigger reminders for birthdays occurring on Leap Day (<b>29 February</b>) during standard non-leap years.
                        </p>

                        <div className="grid grid-cols-2 gap-2 p-1.5 bg-surfaceLight border border-dark-border rounded-2xl">
                            <button
                                onClick={() => setLeapYearMode('Feb28')}
                                className={`py-3.5 px-4 rounded-xl text-xs font-bold transition-all uppercase tracking-wide cursor-pointer ${
                                    leapYearMode === 'Feb28'
                                    ? 'bg-lime text-black shadow-lg shadow-lime/15 font-extrabold'
                                    : 'text-muted hover:text-primary'
                                }`}
                            >
                                Feb 28 📅
                            </button>
                            <button
                                onClick={() => setLeapYearMode('March1')}
                                className={`py-3.5 px-4 rounded-xl text-xs font-bold transition-all uppercase tracking-wide cursor-pointer ${
                                    leapYearMode === 'March1'
                                    ? 'bg-lime text-black shadow-lg shadow-lime/15 font-extrabold'
                                    : 'text-muted hover:text-primary'
                                }`}
                            >
                                March 1 🎈
                            </button>
                        </div>
                    </div>

                    {/* Data Backup & Restore */}
                    <div className="bg-dark-card border border-dark-border rounded-3xl p-6 animate-scale-in space-y-4" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
                         <div className="flex items-center gap-2 mb-1">
                            <Trash2 size={18} className="text-lime" />
                            <h3 className="text-primary font-bold">Backup & Data Sovereignty</h3>
                         </div>
                         <p className="text-xs text-muted leading-relaxed">
                             All birthday records and Sticky Notes reside safely inside your physical device local sandbox storage. Backup to a local json file to secure your data.
                         </p>

                         <div className="grid grid-cols-2 gap-3 pt-2">
                             <button 
                                 onClick={handleBackup}
                                 className="py-3.5 px-4 rounded-2xl bg-surfaceLight border border-dark-border text-xs text-primary font-bold transition-transform active:scale-[0.98] hover:bg-surfaceLight/80 flex items-center justify-center gap-1.5"
                             >
                                 Backup File
                             </button>
                             <label 
                                 className="py-3.5 px-4 rounded-2xl bg-surfaceLight border border-dark-border text-xs text-primary font-bold transition-transform active:scale-[0.98] hover:bg-surfaceLight/80 flex items-center justify-center gap-1.5 cursor-pointer text-center"
                             >
                                 Restore File
                                 <input 
                                     type="file" 
                                     accept=".json"
                                     onChange={handleRestore}
                                     className="hidden" 
                                 />
                             </label>
                         </div>

                         <button 
                             onClick={() => {
                                 if (confirm('Reset all details? This completely purges your local database.')) {
                                     localStorage.clear();
                                     window.location.reload();
                                 }
                             }}
                             className="w-full mt-3 py-3.5 rounded-2xl bg-surfaceLight text-red-400 font-bold border border-dark-border active:scale-[0.98] transition-transform hover:bg-red-500/5 hover:border-red-500/30 flex items-center justify-center gap-2 text-xs uppercase"
                         >
                             Purge Local Database
                         </button>
                    </div>

                    {/* About Card */}
                    <div className="bg-dark-card border border-dark-border rounded-3xl p-6 animate-scale-in space-y-3" style={{ animationDelay: '220ms', animationFillMode: 'backwards' }}>
                         <h3 className="text-primary font-bold">About Happy4U</h3>
                         <p className="text-xs text-muted leading-relaxed">
                             Happy4U is a fully decentralized, privacy-focused birthday reminders ledger. Reminders are synchronized safely without sending any calendar metadata or personal details outside of your local system context.
                         </p>
                    </div>

                    {/* Privacy Policy Card */}
                    <div className="bg-dark-card border border-dark-border rounded-3xl p-6 animate-scale-in" style={{ animationDelay: '240ms', animationFillMode: 'backwards' }}>
                         <h3 className="text-primary font-bold mb-2">Privacy</h3>
                         <p className="text-[11px] text-muted leading-relaxed">
                             Your privacy is absolute. We do not maintain remote cloud backends, track application events, or analyze notification rosters. Your friendships and associations remain entirely your own business.
                         </p>
                    </div>

                    {/* Hidden Developer Mode UI */}
                    {devModeActive && (
                        <div className="space-y-6 pt-4 border-t border-dashed border-lime/30 animate-fade-in">
                            <div className="flex items-center justify-between">
                                <span className="text-lime font-black uppercase tracking-widest text-[11px] flex items-center gap-1.5">
                                    <Zap size={14} />
                                    Developer Engineering Deck Active
                                </span>
                                <button 
                                    onClick={() => {
                                        setDevModeActive(false);
                                        localStorage.setItem('happy4u_dev_mode', 'false');
                                        alert('Developer Mode Deactivated.');
                                    }}
                                    className="text-[10px] text-red-100 font-bold border border-red-400/30 px-2 py-1 rounded bg-red-400/5 hover:bg-red-400/10 cursor-pointer"
                                >
                                    Hide Deck
                                </button>
                            </div>

                            {/* PWA Diagnostics Engine Card */}
                            {diagnosticsData && (
                                <div className="bg-dark-card border-2 border-lime/30 rounded-3xl p-6 space-y-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <ShieldCheck size={18} className="text-lime" />
                                        <h3 className="text-primary font-bold">PWA Infrastructure Diagnostics</h3>
                                    </div>
                                    <p className="text-xs text-muted leading-relaxed">
                                        Dynamic capability telemetry for standards-compliant Progressive Web Apps.
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-surfaceLight border border-dark-border rounded-2xl p-4 font-mono text-[11px] leading-relaxed">
                                        <div className="flex justify-between border-b border-dark-border/40 pb-1.5 md:border-r md:border-b-0 md:pb-0 md:pr-4">
                                            <span className="text-muted">Storage Backend:</span>
                                            <span className="text-lime font-bold">{diagnosticsData.indexedDb === 'supported' ? 'IndexedDB Store' : 'LocalStorage Fallback'}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-dark-border/40 pb-1.5 md:border-b-0 md:pb-0 md:pl-4">
                                            <span className="text-muted">IndexedDB Status:</span>
                                            <span className="text-lime font-bold">{diagnosticsData.indexedDbStatus === 'working' ? 'Healthy & Online' : 'Failed'}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-dark-border/40 pb-1.5 md:border-r md:border-b-0 md:pb-0 md:pr-4">
                                            <span className="text-muted">Service Worker:</span>
                                            <span className="text-lime font-bold capitalize">{diagnosticsData.serviceWorkerStatus}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-dark-border/40 pb-1.5 md:border-b-0 md:pb-0 md:pl-4">
                                            <span className="text-muted">Client Cache:</span>
                                            <span className="text-lime font-bold">{diagnosticsData.cacheVersion || 'happy4u-cache-v2'}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-dark-border/40 pb-1.5 md:border-r md:border-b-0 md:pb-0 md:pr-4">
                                            <span className="text-muted">Notification API:</span>
                                            <span className="text-lime font-bold uppercase">{diagnosticsData.notificationApi} ({diagnosticsData.notificationPermission})</span>
                                        </div>
                                        <div className="flex justify-between border-b border-dark-border/40 pb-1.5 md:border-b-0 md:pb-0 md:pl-4">
                                            <span className="text-muted">Manifest registration:</span>
                                            <span className="text-lime font-bold">Attached /manifest.json</span>
                                        </div>
                                        <div className="flex justify-between md:col-span-2 pt-1.5 border-t border-dark-border/40 font-bold">
                                            <span className="text-muted">Installability Status:</span>
                                            <span className="text-lime font-bold">
                                                {diagnosticsData.displayMode === 'standalone' 
                                                    ? 'Installed (Standalone PWA)' 
                                                    : (diagnosticsData.beforeInstallPrompt === 'supported' 
                                                        ? 'Installable (Prompt Active)' 
                                                        : 'Browser (Compatible to install)')
                                                }
                                            </span>
                                        </div>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            getDiagnostics().then(setDiagnosticsData).catch(console.error);
                                        }}
                                        className="w-full py-2 bg-surfaceLight hover:bg-surfaceLight/80 border border-dark-border rounded-xl text-center text-primary text-[11px] font-bold cursor-pointer"
                                    >
                                        Inspect Telemetry Now
                                    </button>
                                </div>
                            )}

                            {/* Scheduler Engine Configuration Card */}
                            <div className="bg-dark-card border-2 border-lime/20 rounded-3xl p-6 space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap size={18} className="text-lime" />
                                    <h3 className="text-primary font-bold">Rolling Scheduler Engine Constants</h3>
                                </div>
                                <p className="text-xs text-muted leading-relaxed">
                                    Configure how many days ahead to pre-schedule reminders and the maximum active local alarms. The engine will automatically cycle and roll forward chronologically.
                                </p>

                                <div className="space-y-4 pt-2">
                                    <div className="flex justify-between items-center bg-surfaceLight border border-dark-border rounded-2xl p-4">
                                        <div className="space-y-1">
                                            <span className="text-xs text-primary font-bold block">Scheduling Window</span>
                                            <span className="text-[10px] text-muted block">Days to cover future reminders</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <input 
                                                type="number" 
                                                min="1" 
                                                max="1000"
                                                value={schedulingWindowDays}
                                                onChange={(e) => {
                                                    const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                                                    setSchedulingWindowDays(val);
                                                    NotificationNativeScheduler.setSchedulingWindowDays(val);
                                                    NotificationReconciliationService.reconcile().then(() => {
                                                        setReconcileStats(NotificationReconciliationService.getLatestStats());
                                                    });
                                                }}
                                                className="bg-dark-card border border-dark-border rounded-xl px-3 py-1.5 w-24 text-primary text-sm font-bold focus:outline-none focus:border-lime transition-colors text-center"
                                            />
                                            <span className="text-xs text-muted font-bold">days</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center bg-surfaceLight border border-dark-border rounded-2xl p-4">
                                        <div className="space-y-1">
                                            <span className="text-xs text-primary font-bold block">Native Capacity Limit</span>
                                            <span className="text-[10px] text-muted block">Max physical OS alarm slots</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <input 
                                                type="number" 
                                                min="10" 
                                                max="1000"
                                                value={nativeLimit}
                                                onChange={(e) => {
                                                    const val = Math.max(10, parseInt(e.target.value, 10) || 10);
                                                    setNativeLimit(val);
                                                    NotificationNativeScheduler.setNativeLimit(val);
                                                    NotificationReconciliationService.reconcile().then(() => {
                                                        setReconcileStats(NotificationReconciliationService.getLatestStats());
                                                    });
                                                }}
                                                className="bg-dark-card border border-dark-border rounded-xl px-3 py-1.5 w-24 text-primary text-sm font-bold focus:outline-none focus:border-lime transition-colors text-center"
                                            />
                                            <span className="text-xs text-muted font-bold">slots</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Real-time Verification Console Card */}
                            <div className="bg-dark-card border-2 border-lime/20 rounded-3xl p-6 space-y-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <Terminal size={18} className="text-lime" />
                                    <h3 className="text-primary font-bold">Verification & Telemetry (Internal Diagnostics)</h3>
                                </div>
                                <p className="text-xs text-muted leading-relaxed">
                                    Proof of active local reminders, dynamic bounds, and validation telemetry.
                                </p>

                                {reconcileStats ? (
                                    <div className="space-y-2 bg-surfaceLight border border-dark-border rounded-2xl p-4 font-mono text-[11px] leading-relaxed relative overflow-hidden">
                                        <div className="absolute right-3 top-3 px-1.5 py-0.5 rounded bg-lime/10 border border-lime/20 text-[9px] text-lime font-bold font-sans">
                                            IDEMPOTENT
                                        </div>
                                        <div className="flex justify-between border-b border-dark-border/40 pb-1.5">
                                            <span className="text-muted text-[11px]">Birthdays Loaded:</span>
                                            <span className="text-primary font-bold">{reconcileStats.birthdaysLoaded}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-dark-border/40 pb-1.5 font-mono">
                                            <span className="text-muted text-[11px]">Calculated Reminders:</span>
                                            <span className="text-primary font-bold">{reconcileStats.totalCalculated}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-dark-border/40 pb-1.5 font-mono">
                                            <span className="text-muted text-[11px]">Scheduling Window:</span>
                                            <span className="text-primary font-bold">next {reconcileStats.schedulingWindowDays} days</span>
                                        </div>
                                        <div className="flex justify-between border-b border-dark-border/40 pb-1.5 font-mono">
                                            <span className="text-muted text-[11px]">OS Capacity Limit:</span>
                                            <span className="text-primary font-bold">{reconcileStats.nativeLimit}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-dark-border/40 pb-1.5 font-mono">
                                            <span className="text-muted text-[11px]">Actually Scheduled:</span>
                                            <span className="text-lime font-bold">{reconcileStats.nativeRegistered}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-dark-border/40 pb-1.5 font-mono">
                                            <span className="text-muted text-[11px]">Already Scheduled:</span>
                                            <span className="text-primary">{reconcileStats.alreadyScheduled}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-dark-border/40 pb-1.5 font-mono">
                                            <span className="text-muted text-[11px]">Missing Scheduled:</span>
                                            <span className="text-primary">{reconcileStats.missingScheduled}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-dark-border/40 pb-1.5 font-mono">
                                            <span className="text-muted text-[11px]">Duplicate Count:</span>
                                            <span className="text-primary">{reconcileStats.duplicateCount}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-dark-border/40 pb-1.5 font-mono">
                                            <span className="text-muted text-[11px]">Orphan Count:</span>
                                            <span className="text-primary">{reconcileStats.orphanCount}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-dark-border/40 pb-1.5 font-mono">
                                            <span className="text-muted text-[11px]">Collision Count:</span>
                                            <span className="text-primary">{reconcileStats.collisionCount}</span>
                                        </div>
                                        <div className="flex flex-col border-b border-dark-border/40 pb-1.5 font-mono">
                                            <span className="text-muted block text-[11px]">Next Scheduled Alert:</span>
                                            <span className="text-[10px] text-primary truncate mt-0.5 font-mono">{reconcileStats.nextScheduledReminder || 'None'}</span>
                                        </div>
                                        <div className="flex flex-col pb-0.5 font-mono">
                                            <span className="text-muted block text-[11px]">Last Scheduled Alert:</span>
                                            <span className="text-[10px] text-primary truncate mt-0.5 font-mono">{reconcileStats.lastScheduledReminder || 'None'}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-surfaceLight border border-dark-border rounded-2xl p-4 text-center font-mono text-[11px] text-muted-foreground leading-relaxed">
                                        No telemetry events recorded. Perform/trigger reconciliation.
                                    </div>
                                )}
                                <button 
                                    onClick={() => {
                                        NotificationReconciliationService.reconcile().then(() => {
                                            setReconcileStats(NotificationReconciliationService.getLatestStats());
                                        });
                                    }}
                                    className="w-full py-3 rounded-2xl bg-lime text-black font-extrabold text-xs active:scale-[0.98] transition-all hover:bg-lime/90 flex items-center justify-center gap-1.5 shadow shadow-lime/20 cursor-pointer uppercase tracking-wider"
                                >
                                    <Sparkles size={14} strokeWidth={2.5} />
                                    Recalculate & Reconcile Now
                                </button>
                            </div>
                        </div>
                    )}

                    {/* App Version Footer (Tapped 7 times to reveal developer controls) */}
                    <div 
                        onClick={handleVersionClick}
                        className="text-center text-muted text-xs py-6 opacity-50 hover:opacity-100 transition-opacity select-none cursor-pointer duration-300"
                    >
                        Happy4U v1.3.0
                    </div>
                </div>
            )}
            </div>
        </main>

        <div className="fixed bottom-6 left-6 right-6 z-50 gpu-layer max-w-lg mx-auto">
            <div className="glass-panel rounded-[2.5rem] p-2 flex justify-between items-center px-4 shadow-2xl neon-shadow transition-colors duration-300">
                <button 
                    onClick={() => setView('home')}
                    className={`p-3.5 rounded-full transition-all duration-300 ${view === 'home' ? 'bg-lime text-black translate-y-[-8px] shadow-lg shadow-lime/20' : 'text-muted hover:text-primary'}`}
                    aria-label="Home"
                >
                    <Home size={22} strokeWidth={view === 'home' ? 2.5 : 2} />
                </button>
                <button 
                    onClick={() => setView('list')}
                    className={`p-3.5 rounded-full transition-all duration-300 ${view === 'list' ? 'bg-lime text-black translate-y-[-8px] shadow-lg shadow-lime/20' : 'text-muted hover:text-primary'}`}
                    aria-label="Calendar"
                >
                    <CalendarIcon size={22} strokeWidth={view === 'list' ? 2.5 : 2} />
                </button>
                <button 
                    onClick={() => setView('notes')}
                    className={`p-3.5 rounded-full transition-all duration-300 ${view === 'notes' ? 'bg-lime text-black translate-y-[-8px] shadow-lg shadow-lime/20' : 'text-muted hover:text-primary'}`}
                    aria-label="Notes"
                >
                    <StickyNote size={22} strokeWidth={view === 'notes' ? 2.5 : 2} />
                </button>
                <button 
                    onClick={() => setView('settings')}
                    className={`p-3.5 rounded-full transition-all duration-300 ${view === 'settings' ? 'bg-lime text-black translate-y-[-8px] shadow-lg shadow-lime/20' : 'text-muted hover:text-primary'}`}
                    aria-label="Settings"
                >
                    <Settings size={22} strokeWidth={view === 'settings' ? 2.5 : 2} />
                </button>
            </div>
        </div>

        <AddBirthdayModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            onSave={handleAddOrUpdate}
            initialData={editingId ? birthdays.find(b => b.id === editingId) : null}
            handleDelete={handleDelete}
        />

        <WelcomeModal 
            isOpen={isWelcomeOpen}
            initialName={username}
            initialGender={gender}
            onSave={handleSaveProfile}
            onClose={username ? handleWelcomeClose : undefined} 
        />
        
        <NotificationPermissionModal
            isOpen={isNotificationModalOpen}
            onEnable={handleRequestNotification}
            onClose={() => {
                setIsNotificationModalOpen(false);
                if (!localStorage.getItem(USER_KEY)) {
                    setIsWelcomeOpen(true);
                }
            }}
        />

        <NotificationInboxModal
            isOpen={isInboxOpen}
            onClose={() => setIsInboxOpen(false)}
            notifications={inAppNotifs}
            onMarkRead={(id) => {
                setInAppNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            }}
            onMarkAllRead={() => {
                setInAppNotifs(prev => prev.map(n => ({ ...n, read: true })));
            }}
            onDelete={(id) => {
                setInAppNotifs(prev => prev.filter(n => n.id !== id));
            }}
            onClearAll={() => {
                if (confirm('Clear notification history?')) {
                    setInAppNotifs([]);
                }
            }}
            onOpenBirthday={(birthdayId) => {
                setIsInboxOpen(false);
                setView('home');
                const match = birthdays.find(b => b.id === birthdayId);
                if (match) {
                    setPopupBirthdays([match]);
                }
            }}
            birthdaysList={birthdays}
        />

        {popupBirthdays.length > 0 && (
            <BirthdayPopup 
                birthdays={popupBirthdays} 
                onClose={() => setPopupBirthdays([])}
                onMarkCelebrated={handleMarkCelebrated}
            />
        )}
    </div>
  );
}
