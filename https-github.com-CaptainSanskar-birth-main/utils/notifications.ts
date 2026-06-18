import { Birthday, InAppNotification } from '../types';
import { LocalNotifications } from '@capacitor/local-notifications';

// ==========================================
// 0. Platform Detection
// ==========================================
export const PlatformDetector = {
  isCapacitor(): boolean {
    if (typeof window === 'undefined') return false;
    const Cap = (window as any).Capacitor;
    return !!(Cap && Cap.Plugins && Cap.Plugins.LocalNotifications);
  },

  isCordova(): boolean {
    if (typeof window === 'undefined') return false;
    const cordova = (window as any).cordova;
    return !!(cordova && cordova.plugins && cordova.plugins.notification && cordova.plugins.notification.local);
  },

  isAndroidBridge(): boolean {
    if (typeof window === 'undefined') return false;
    const AndroidBridge = (window as any).Android;
    return !!(AndroidBridge && typeof AndroidBridge.scheduleNotification === 'function');
  },

  isTWA(): boolean {
    if (typeof window === 'undefined') return false;
    if (this.isCapacitor() || this.isCordova() || this.isAndroidBridge()) return false;
    const ua = navigator.userAgent || '';
    return ua.includes('TWA') || ua.includes('Android') && ua.includes('Chrome');
  },

  hasNativeLocalNotifications(): boolean {
    return this.isCapacitor() || this.isCordova() || this.isAndroidBridge();
  },

  hasTimestampTrigger(): boolean {
    try {
      return 'showTrigger' in Notification.prototype || 'TimestampTrigger' in self;
    } catch {
      return false;
    }
  },

  canScheduleBackgroundNotifications(): boolean {
    return this.hasNativeLocalNotifications() || this.hasTimestampTrigger();
  }
};

// ==========================================
// 0b. Capacitor Notification Permissions
// ==========================================
export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (!PlatformDetector.isCapacitor()) return false;
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display === 'granted') return true;
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  } catch (e) {
    console.error('[Capacitor] Permission request failed:', e);
    return false;
  }
};

// ==========================================
// 1. Settings Store
// ==========================================
export const SettingsStore = {
  getNotificationsEnabled(): boolean {
    const value = localStorage.getItem('happy4u_notifications_muted');
    return value !== 'true'; // Default is enabled
  },
  
  setNotificationsEnabled(enabled: boolean): void {
    localStorage.setItem('happy4u_notifications_muted', enabled ? 'false' : 'true');
    if (typeof window !== 'undefined' && window.indexedDB) {
      import('./storage').then(m => m.syncSettingToIndexedDB('notificationsEnabled', enabled));
    }
  },

  getLeapYearMode(): 'Feb28' | 'March1' {
    return (localStorage.getItem('happy4u_leap_year_mode') as 'Feb28' | 'March1') || 'Feb28';
  },

  setLeapYearMode(mode: 'Feb28' | 'March1'): void {
    localStorage.setItem('happy4u_leap_year_mode', mode);
    if (typeof window !== 'undefined' && window.indexedDB) {
      import('./storage').then(m => m.syncSettingToIndexedDB('leapYearMode', mode));
    }
  },

  isOffsetMuted(offset: number): boolean {
    return localStorage.getItem(`happy4u_offset_muted_${offset}`) === 'true';
  },

  setOffsetMuted(offset: number, muted: boolean): void {
    localStorage.setItem(`happy4u_offset_muted_${offset}`, muted ? 'true' : 'false');
  },

  getNotificationTimeForOffset(offset: number): string {
    switch (offset) {
      case 0:
        return localStorage.getItem('happy4u_notif_time_same_day') || '09:00';
      case 1:
        return localStorage.getItem('happy4u_notif_time_one_day') || '09:00';
      case 3:
        return localStorage.getItem('happy4u_notif_time_three_day') || '09:00';
      case 7:
        return localStorage.getItem('happy4u_notif_time_seven_day') || '09:00';
      default:
        return localStorage.getItem('happy4u_notif_time') || '09:00';
    }
  },

  setNotificationTimeForOffset(offset: number, timeStr: string): void {
    let keyName = 'notificationTime';
    switch (offset) {
      case 0:
        localStorage.setItem('happy4u_notif_time_same_day', timeStr);
        keyName = 'notif_time_same_day';
        break;
      case 1:
        localStorage.setItem('happy4u_notif_time_one_day', timeStr);
        keyName = 'notif_time_one_day';
        break;
      case 3:
        localStorage.setItem('happy4u_notif_time_three_day', timeStr);
        keyName = 'notif_time_three_day';
        break;
      case 7:
        localStorage.setItem('happy4u_notif_time_seven_day', timeStr);
        keyName = 'notif_time_seven_day';
        break;
      default:
        localStorage.setItem('happy4u_notif_time', timeStr);
        break;
    }
    // Also save default for general fallback
    localStorage.setItem('happy4u_notif_time', timeStr);
    
    if (typeof window !== 'undefined' && window.indexedDB) {
      import('./storage').then(m => {
        m.syncSettingToIndexedDB('notificationTime', timeStr);
        m.syncSettingToIndexedDB(keyName, timeStr);
      });
    }
  }
};

// ==========================================
// 2. Birthday Repository
// ==========================================
export const BirthdayRepository = {
  getBirthdays(): Birthday[] {
    const saved = localStorage.getItem('happy4u_birthdays');
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }
};

// ==========================================
// 3. Reminder Calculator
// ==========================================
export interface ReminderTarget {
  id: string; // birthdayId-year-offset
  birthdayId: string;
  name: string;
  emoji: string;
  triggerTime: number;
  offset: number;
  year: number;
  title: string;
  body: string;
}

export const ReminderCalculator = {
  calculateTriggersForBirthday(birthday: Birthday, year: number, leapYearMode: 'Feb28' | 'March1'): ReminderTarget[] {
    if (!birthday.notificationEnabled) return [];
    
    const offsets = (birthday.reminders || [0, 1]).filter(offset => !SettingsStore.isOffsetMuted(offset));
    
    const parts = birthday.birthDate.split('-').map(Number);
    const birthMonth = parts[1] - 1; // 0-indexed
    const birthDay = parts[2];
    
    return offsets.map(offset => {
      // Find reference birthday date in that year
      let refDate = new Date(year, birthMonth, birthDay, 0, 0, 0, 0);
      
      // Leap year check
      if (birthMonth === 1 && birthDay === 29) {
        const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
        if (!isLeap(year)) {
          if (leapYearMode === 'Feb28') {
            refDate = new Date(year, 1, 28, 0, 0, 0, 0); // Feb 28
          } else {
            refDate = new Date(year, 2, 1, 0, 0, 0, 0);  // March 1
          }
        }
      }
      
      // Subtract offset days
      const triggerBaseDate = new Date(refDate.getTime() - (offset * 24 * 60 * 60 * 1000));
      
      // Parse specific time setting for this offset
      const timeStr = SettingsStore.getNotificationTimeForOffset(offset);
      const [hour, minute] = timeStr.split(':').map(Number);
      
      const triggerTimeDate = new Date(
        triggerBaseDate.getFullYear(),
        triggerBaseDate.getMonth(),
        triggerBaseDate.getDate(),
        hour,
        minute,
        0,
        0
      );
      
      const triggerTime = triggerTimeDate.getTime();
      
      let title = '';
      let body = '';
      if (offset === 0) {
        title = `🎂 It's ${birthday.name}'s Birthday!`;
        body = `Don't forget to celebrate with ${birthday.name}! Send them your warmest wishes today! 🎉`;
      } else if (offset === 1) {
        title = `⏰ Birthday Tomorrow: ${birthday.name}`;
        body = `Get ready! It is ${birthday.name}'s birthday tomorrow. Make sure you don't miss it! 🎈`;
      } else if (offset === 3) {
        title = `🎂 ${birthday.name}'s Birthday in 3 Days!`;
        body = `Don't forget, in 3 days it will be ${birthday.name}'s birthday.`;
      } else if (offset === 7) {
        title = `🔔 Birthday in 7 Days: ${birthday.name}`;
        body = `Mark your calendar! ${birthday.name}'s birthday is coming up in 7 days.`;
      } else {
        title = `🔔 Birthday in ${offset} Days: ${birthday.name}`;
        body = `Mark your calendar! ${birthday.name}'s birthday is coming up in ${offset} days.`;
      }
      
      return {
        id: `${birthday.id}-${year}-${offset}`,
        birthdayId: birthday.id,
        name: birthday.name,
        emoji: birthday.emoji || '🎂',
        triggerTime,
        offset,
        year,
        title,
        body
      };
    });
  }
};

// ==========================================
// 4. Notification Scheduler
// ==========================================
export const NotificationScheduler = {
  getScheduledNotifications(): ReminderTarget[] {
    const saved = localStorage.getItem('happy4u_scheduled_notifications');
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  },
  
  saveScheduledNotifications(schedules: ReminderTarget[]): void {
    localStorage.setItem('happy4u_scheduled_notifications', JSON.stringify(schedules));
  }
};

// ==========================================
// 5. Notification Inbox Manager
// ==========================================
export const NotificationInboxManager = {
  getInbox(): InAppNotification[] {
    const saved = localStorage.getItem('happy4u_inbox_notifications');
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  },
  
  saveInbox(inbox: InAppNotification[]): void {
    localStorage.setItem('happy4u_inbox_notifications', JSON.stringify(inbox));
  },
  
  addNotification(target: ReminderTarget): void {
    const inbox = this.getInbox();
    // Prevent duplicates
    if (inbox.some(n => n.id === target.id)) return;
    
    const newNotif: InAppNotification = {
      id: target.id,
      title: target.title,
      body: target.body,
      timestamp: target.triggerTime,
      read: false,
      birthdayId: target.birthdayId,
      type: target.offset === 0 ? 'today' : target.offset === 1 ? 'tomorrow' : `${target.offset}days`
    };
    
    const updated = [newNotif, ...inbox].sort((a, b) => b.timestamp - a.timestamp);
    this.saveInbox(updated);
    
    // Fire real browser notification if supported and granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(target.title, {
          body: target.body,
          icon: 'https://cdn-icons-png.flaticon.com/512/4213/4213652.png',
          badge: 'https://cdn-icons-png.flaticon.com/512/4213/3516/3516709.png'
        });
      } catch (e) {
        console.warn("Could not fire desktop notification:", e);
      }
    }
  }
};

// ==========================================
// 6. Notification Reconciliation Service
// ==========================================
export interface ReconciliationStats {
  birthdaysLoaded: number;
  totalCalculated: number;
  alreadyScheduled: number;
  missingScheduled: number;
  cancelledObsolete: number;
  schedulingWindowDays: number;
  nativeLimit: number;
  nativeRegistered: number;
  duplicateCount: number;
  orphanCount: number;
  collisionCount: number;
  nextScheduledReminder: string | null;
  lastScheduledReminder: string | null;
  timestamp: number;
}

export const NotificationReconciliationService = {
  getLatestStats(): ReconciliationStats | null {
    const saved = localStorage.getItem('happy4u_reconcile_stats');
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  },

  async reconcile(): Promise<void> {
    const enabled = SettingsStore.getNotificationsEnabled();
    if (!enabled) {
      // Clear scheduled reminders
      NotificationScheduler.saveScheduledNotifications([]);
      // Clear native scheduled notifications
      await NotificationNativeScheduler.clearAllNativeNotifications();
      
      const stats: ReconciliationStats = {
        birthdaysLoaded: BirthdayRepository.getBirthdays().length,
        totalCalculated: 0,
        alreadyScheduled: 0,
        missingScheduled: 0,
        cancelledObsolete: 0,
        schedulingWindowDays: NotificationNativeScheduler.getSchedulingWindowDays(),
        nativeLimit: NotificationNativeScheduler.getNativeLimit(),
        nativeRegistered: 0,
        duplicateCount: 0,
        orphanCount: 0,
        collisionCount: 0,
        nextScheduledReminder: null,
        lastScheduledReminder: null,
        timestamp: Date.now()
      };
      localStorage.setItem('happy4u_reconcile_stats', JSON.stringify(stats));
      return;
    }
    
    const birthdays = BirthdayRepository.getBirthdays();
    const leapYearMode = SettingsStore.getLeapYearMode();
    const inbox = NotificationInboxManager.getInbox();
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000); // Process missed within last 30 days
    const currentYear = new Date().getFullYear();
    
    const allCalculated: ReminderTarget[] = [];
    let duplicateCount = 0;
    const seenReminderKeys = new Set<string>();
    
    birthdays.forEach(birthday => {
      if (!birthday.notificationEnabled) return;
      
      // Calculate triggers for this year, next year, and subsequent year to ensure complete future coverage
      const years = [currentYear, currentYear + 1, currentYear + 2];
      years.forEach(year => {
        const triggers = ReminderCalculator.calculateTriggersForBirthday(birthday, year, leapYearMode);
        triggers.forEach(trigger => {
          const uniqueKey = `${trigger.birthdayId}-${trigger.year}-${trigger.offset}`;
          if (seenReminderKeys.has(uniqueKey)) {
            duplicateCount++;
          } else {
            seenReminderKeys.add(uniqueKey);
            allCalculated.push(trigger);
          }
        });
      });
    });
    
    // Process past reminders and collect future ones
    const futureReminders: ReminderTarget[] = [];
    allCalculated.forEach(trigger => {
      if (trigger.triggerTime > now) {
        futureReminders.push(trigger);
      } else if (trigger.triggerTime > thirtyDaysAgo) {
        // Past time but within the last 30 days. Log / write to inbox if not yet delivered.
        const inInbox = inbox.some(n => n.id === trigger.id);
        if (!inInbox) {
          NotificationInboxManager.addNotification(trigger);
        }
      }
    });
    
    // Sort chronologically
    futureReminders.sort((a, b) => a.triggerTime - b.triggerTime);
    
    // Dynamic Rolling Scheduling Window Configuration
    const windowDays = NotificationNativeScheduler.getSchedulingWindowDays();
    const windowMs = windowDays * 24 * 60 * 60 * 1000;
    const windowEnd = now + windowMs;
    const nativeLimit = NotificationNativeScheduler.getNativeLimit();
    
    // Select all upcoming reminders within the configured active window (e.g. 90 days)
    let activeSchedules = futureReminders.filter(t => t.triggerTime <= windowEnd);
    
    // If activeSchedules exceeds native limit, prioritize earliest chronological upcoming
    if (activeSchedules.length > nativeLimit) {
      activeSchedules = activeSchedules.slice(0, nativeLimit);
    } else if (activeSchedules.length < Math.min(futureReminders.length, nativeLimit)) {
      // If there's extra capacity under the dynamic limit, fill it chronologically with the upcoming reminders beyond the active window
      const remainingCapacity = nativeLimit - activeSchedules.length;
      const outsideWindow = futureReminders.filter(t => t.triggerTime > windowEnd);
      activeSchedules = [...activeSchedules, ...outsideWindow.slice(0, remainingCapacity)];
    }
    
    // Save locally
    NotificationScheduler.saveScheduledNotifications(activeSchedules);
    
    // Sync with native OS and compute details (obsolete counts, orphans, etc.)
    const syncResults = await NotificationNativeScheduler.syncWithNativeOS(activeSchedules, birthdays);
    
    // Compile reconciliation performance statistics
    const stats: ReconciliationStats = {
      birthdaysLoaded: birthdays.length,
      totalCalculated: allCalculated.length,
      alreadyScheduled: syncResults.alreadyScheduled,
      missingScheduled: syncResults.missingScheduled,
      cancelledObsolete: syncResults.cancelledObsolete,
      schedulingWindowDays: windowDays,
      nativeLimit: nativeLimit,
      nativeRegistered: activeSchedules.length,
      duplicateCount: duplicateCount,
      orphanCount: syncResults.orphanCount,
      collisionCount: 0, // 0 collision due to state-persistent sequential tracking
      nextScheduledReminder: activeSchedules[0] ? new Date(activeSchedules[0].triggerTime).toLocaleString() : null,
      lastScheduledReminder: activeSchedules[activeSchedules.length - 1] ? new Date(activeSchedules[activeSchedules.length - 1].triggerTime).toLocaleString() : null,
      timestamp: Date.now()
    };
    
    localStorage.setItem('happy4u_reconcile_stats', JSON.stringify(stats));
    
    // Production Debug Logs (Only in developer mode)
    if (typeof window !== 'undefined' && localStorage.getItem('happy4u_dev_mode') === 'true') {
      console.log(
        `[Scheduler Engine]\n` +
        `----------------------------------------\n` +
        `Birthdays loaded: ${stats.birthdaysLoaded}\n` +
        `Calculated reminders: ${stats.totalCalculated}\n` +
        `Already scheduled: ${stats.alreadyScheduled}\n` +
        `Missing schedules: ${stats.missingScheduled}\n` +
        `Cancelled obsolete: ${stats.cancelledObsolete}\n` +
        `Scheduling window: next ${stats.schedulingWindowDays} days\n` +
        `Native reminders registered: ${stats.nativeRegistered}\n` +
        `Duplicate count: ${stats.duplicateCount}\n` +
        `Orphan count: ${stats.orphanCount}\n` +
        `Collision count: ${stats.collisionCount}\n` +
        `Next scheduled: ${stats.nextScheduledReminder || 'None'}\n` +
        `Last scheduled: ${stats.lastScheduledReminder || 'None'}\n` +
        `----------------------------------------`
      );
    }
    
    // Let service worker register notifications if active
    if (typeof navigator !== 'undefined' && navigator.serviceWorker && navigator.serviceWorker.controller) {
      const isNative = typeof window !== 'undefined' && (!!(window as any).Capacitor || !!(window as any).cordova || !!(window as any).Android);
      navigator.serviceWorker.controller.postMessage({ 
        action: 'rescheduleNotifications',
        skipTimestampTrigger: isNative
      });
    }
  }
};

// ==========================================
// 7. Native OS Local Notification Scheduler
// ==========================================
export const NotificationNativeScheduler = {
  getSchedulingWindowDays(): number {
    const savedDays = localStorage.getItem('happy4u_scheduling_window_days');
    if (savedDays) {
      const parsed = parseInt(savedDays, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 90; // Default: 90 days
  },

  setSchedulingWindowDays(days: number): void {
    localStorage.setItem('happy4u_scheduling_window_days', String(days));
  },

  getNativeLimit(): number {
    const savedLimit = localStorage.getItem('happy4u_native_schedule_limit');
    if (savedLimit) {
      const parsed = parseInt(savedLimit, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }

    // Auto-detect based on platform capabilities
    if (PlatformDetector.hasNativeLocalNotifications()) {
      return 500; // Native plugins safely handle hundreds of notifications
    }

    // TWA/PWABuilder: cannot schedule local notifications natively
    // Return a small limit since we can only check on app open
    if (PlatformDetector.isTWA()) {
      return 50;
    }

    return 100; // Default browser limit
  },

  setNativeLimit(limit: number): void {
    localStorage.setItem('happy4u_native_schedule_limit', String(limit));
  },

  getOrCreateStableId(birthdayId: string, year: number, offset: number): number {
    const mapKey = `${birthdayId}-${year}-${offset}`;
    const savedMapStr = localStorage.getItem('happy4u_reminder_id_map');
    let idMap: Record<string, number> = {};
    if (savedMapStr) {
      try {
        idMap = JSON.parse(savedMapStr);
      } catch (e) {
        idMap = {};
      }
    }
    
    if (typeof idMap[mapKey] === 'number') {
      return idMap[mapKey];
    }
    
    // Create sequential, unique, stable positive 32-bit ID base (e.g. 500000)
    const usedIds = new Set(Object.values(idMap));
    let candidateId = 500000;
    while (usedIds.has(candidateId)) {
      candidateId++;
    }
    
    idMap[mapKey] = candidateId;
    localStorage.setItem('happy4u_reminder_id_map', JSON.stringify(idMap));
    return candidateId;
  },

  async clearAllNativeNotifications(): Promise<void> {
    if (typeof window === 'undefined') return;

    // 1. Capacitor Clear
    if (PlatformDetector.isCapacitor()) {
      try {
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) {
          await LocalNotifications.cancel({
            notifications: pending.notifications.map(n => ({ id: n.id }))
          });
        }
        console.log('[Native] Cleared all pending Capacitor notifications.');
      } catch (err) {
        console.error('[Native] Failed to clear Capacitor notifications:', err);
      }
      return;
    }

    // 2. Cordova Clear
    const cordova = (window as any).cordova;
    if (cordova && cordova.plugins && cordova.plugins.notification && cordova.plugins.notification.local) {
      try {
        cordova.plugins.notification.local.cancelAll(() => {
          console.log('[Native] Cleared all pending Cordova notifications.');
        });
      } catch (err) {
        console.error('[Native] Failed to clear Cordova notifications:', err);
      }
    }
  },

  async syncWithNativeOS(schedules: ReminderTarget[], birthdays: Birthday[]): Promise<{
    alreadyScheduled: number;
    missingScheduled: number;
    cancelledObsolete: number;
    orphanCount: number;
  }> {
    const results = {
      alreadyScheduled: 0,
      missingScheduled: schedules.length,
      cancelledObsolete: 0,
      orphanCount: 0
    };

    if (typeof window === 'undefined') return results;
    
    const existingBirthdayIds = new Set(birthdays.map(b => b.id));
    const targetIds = new Set(schedules.map(s => this.getOrCreateStableId(s.birthdayId, s.year, s.offset)));

    // 1. Capacitor Integration (High Fidelity Dynamic Reconciliation)
    if (PlatformDetector.isCapacitor()) {
      try {
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') {
          await LocalNotifications.requestPermissions();
        }

        const pending = await LocalNotifications.getPending();
        const pendingNotifications = pending.notifications || [];
        const pendingIds = new Set(pendingNotifications.map(n => n.id));

        // Evaluate orphans: scheduled native notifications whose birthdayId is no longer active / is deleted
        pendingNotifications.forEach(n => {
          const birthdayId = (n.extra as any)?.birthdayId || (n as any)?.data?.birthdayId;
          if (birthdayId && !existingBirthdayIds.has(birthdayId)) {
            results.orphanCount++;
          }
        });

        // Compute keep/cancel breakdown
        const toCancel = pendingNotifications.filter(n => !targetIds.has(n.id));
        const toSchedule = schedules.filter(s => !pendingIds.has(this.getOrCreateStableId(s.birthdayId, s.year, s.offset)));
        
        results.cancelledObsolete = toCancel.length;
        results.missingScheduled = toSchedule.length;
        results.alreadyScheduled = schedules.length - toSchedule.length;

        // Execute cancellations
        if (toCancel.length > 0) {
          await LocalNotifications.cancel({
            notifications: toCancel.map(n => ({ id: n.id }))
          });
        }

        // Execute schedules
        if (toSchedule.length > 0) {
          const capNotifs = toSchedule.map(s => {
            const numId = this.getOrCreateStableId(s.birthdayId, s.year, s.offset);
            return {
              id: numId,
              title: s.title,
              body: s.body,
              schedule: { at: new Date(s.triggerTime) },
              sound: 'default' as const,
              attachments: [] as any[],
              actionTypeId: '',
              extra: { birthdayId: s.birthdayId, offset: s.offset, id: s.id }
            };
          });
          await LocalNotifications.schedule({ notifications: capNotifs });
        }

        return results;
      } catch (err) {
        console.error('[Native] Exception in Capacitor sync:', err);
      }
    }

    // 2. Cordova Integration (High Fidelity Dynamic Reconciliation)
    const cordova = (window as any).cordova;
    if (cordova && cordova.plugins && cordova.plugins.notification && cordova.plugins.notification.local) {
      try {
        const localNotif = cordova.plugins.notification.local;

        return new Promise((resolve) => {
          localNotif.getAll((pending: any[]) => {
            const pendingNotifications = pending || [];
            const pendingIds = new Set(pendingNotifications.map(n => n.id));

            pendingNotifications.forEach(n => {
              const birthdayId = n.data?.birthdayId;
              if (birthdayId && !existingBirthdayIds.has(birthdayId)) {
                results.orphanCount++;
              }
            });

            const toCancel = pendingNotifications.filter(n => !targetIds.has(n.id));
            const toSchedule = schedules.filter(s => !pendingIds.has(this.getOrCreateStableId(s.birthdayId, s.year, s.offset)));

            results.cancelledObsolete = toCancel.length;
            results.missingScheduled = toSchedule.length;
            results.alreadyScheduled = schedules.length - toSchedule.length;

            if (toCancel.length > 0) {
              localNotif.cancel(toCancel.map(n => n.id), () => {
                if (toSchedule.length > 0) {
                  const cordNotifs = toSchedule.map(s => {
                    const numId = this.getOrCreateStableId(s.birthdayId, s.year, s.offset);
                    return {
                      id: numId,
                      title: s.title,
                      text: s.body,
                      trigger: { at: new Date(s.triggerTime) },
                      data: { birthdayId: s.birthdayId, offset: s.offset, id: s.id }
                    };
                  });
                  localNotif.schedule(cordNotifs);
                }
                resolve(results);
              });
            } else {
              if (toSchedule.length > 0) {
                const cordNotifs = toSchedule.map(s => {
                  const numId = this.getOrCreateStableId(s.birthdayId, s.year, s.offset);
                  return {
                    id: numId,
                    title: s.title,
                    text: s.body,
                    trigger: { at: new Date(s.triggerTime) },
                    data: { birthdayId: s.birthdayId, offset: s.offset, id: s.id }
                  };
                });
                localNotif.schedule(cordNotifs);
              }
              resolve(results);
            }
          });
        });
      } catch (err) {
        console.error('[Native] Exception in Cordova sync:', err);
      }
    }

    // 3. Android WebView Bridge fallback
    const AndroidBridge = (window as any).Android;
    if (AndroidBridge && typeof AndroidBridge.scheduleNotification === 'function') {
      try {
        if (typeof AndroidBridge.clearAllNotifications === 'function') {
          AndroidBridge.clearAllNotifications();
        }
        schedules.forEach(s => {
          AndroidBridge.scheduleNotification(s.id, s.title, s.body, s.triggerTime);
        });
        results.missingScheduled = schedules.length;
        results.alreadyScheduled = 0;
        results.cancelledObsolete = 0;
      } catch (err) {
        console.warn("[Native] Exception in WebView Bridge sync:", err);
      }
    }

    return results;
  }
};
