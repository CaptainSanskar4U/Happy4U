// service-worker.js - Upgraded PWA Production Service Worker
const CACHE_NAME = 'happy4u-cache-v3';
const DB_NAME = 'BirthdayDB';
const DB_VERSION = 2;

// Static assets to precache immediately on SW install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install Service Worker
self.addEventListener('install', function(event) {
  console.log('[SW] Installing Upgraded PWA Service Worker...');
  self.skipWaiting(); // Bypass waiting phase for zero-interruption updates
  
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] Precaching App Shell and configurations...');
      return cache.addAll(PRECACHE_ASSETS).catch(err => {
         console.warn('[SW] Caching failed for some items during install. Proceeding with robust fallback.', err);
      });
    })
  );
});

// Activate Service Worker and purify stale cache versions
self.addEventListener('activate', function(event) {
  console.log('[SW] Activated.');
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // 1. Purge legacy caches to prevent stale cache corruption and memory leakage
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Evicting stale cache container:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // 2. Clear old IndexedDB test storage if exists
      new Promise((resolve) => {
         if (self.indexedDB) {
            try {
               self.indexedDB.deleteDatabase('BirthdayDB_test');
            } catch (e) {}
         }
         resolve(null);
      }),
      // 3. Reschedule active alarms
      rescheduleNotifications()
    ])
  );
});

// Offline Support - Stale-While-Revalidate Strategy for robust client loading
self.addEventListener('fetch', function(event) {
  // Only attempt to process HTTP(S) requests from main app origin
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Exempt background sync and external CDN maps/images if needed
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function(cachedResponse) {
      if (cachedResponse) {
        // Serve instantly from cache, compile updates from network in background
        fetch(event.request).then(function(networkResponse) {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => { /* silent handle development or offline network errors */ });
        
        return cachedResponse;
      }

      return fetch(event.request).then(function(networkResponse) {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(function() {
        // Fallback to static app shell when completely offline
        if (event.request.mode === 'navigate') {
          return caches.match('/') || caches.match('/index.html');
        }
      });
    })
  );
});

// Periodic Background Sync
self.addEventListener('periodicsync', function(event) {
  if (event.tag === 'check-birthdays') {
    event.waitUntil(rescheduleNotifications());
  }
});

// Background Sync (fallback)
self.addEventListener('sync', function(event) {
  if (event.tag === 'check-birthdays') {
    event.waitUntil(rescheduleNotifications());
  }
});

// IndexedDB Helper Methods for Background Work
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = (e) => resolve(e.target.result);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('birthdays')) {
        db.createObjectStore('birthdays', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('notifications_history')) {
        db.createObjectStore('notifications_history', { keyPath: 'id' });
      }
    };
  });
}

function getFromDB(storeName, key) {
  return openDB().then(db => {
    return new Promise((resolve) => {
      if (!db.objectStoreNames.contains(storeName)) {
        resolve(null);
        return;
      }
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const getReq = store.get(key);
      getReq.onsuccess = () => resolve(getReq.result ? getReq.result.value : null);
      getReq.onerror = () => resolve(null);
    });
  });
}

function getAllFromDB(storeName) {
  return openDB().then(db => {
    return new Promise((resolve) => {
      if (!db.objectStoreNames.contains(storeName)) {
        resolve([]);
        return;
      }
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const getReq = store.getAll();
      getReq.onsuccess = () => resolve(getReq.result || []);
      getReq.onerror = () => resolve([]);
    });
  });
}

function isNotificationDelivered(birthdayId, year, type) {
  return openDB().then(db => {
    return new Promise((resolve) => {
      if (!db.objectStoreNames.contains('notifications_history')) {
        resolve(false);
        return;
      }
      const transaction = db.transaction(['notifications_history'], 'readonly');
      const store = transaction.objectStore('notifications_history');
      const id = `${birthdayId}-${year}-${type}`;
      const getReq = store.get(id);
      getReq.onsuccess = () => resolve(getReq.result ? true : false);
      getReq.onerror = () => resolve(false);
    });
  });
}

function markNotificationDelivered(birthdayId, year, type) {
  return openDB().then(db => {
    return new Promise((resolve) => {
      if (!db.objectStoreNames.contains('notifications_history')) {
        resolve();
        return;
      }
      const transaction = db.transaction(['notifications_history'], 'readwrite');
      const store = transaction.objectStore('notifications_history');
      const id = `${birthdayId}-${year}-${type}`;
      const putReq = store.put({ id, birthdayId, year, type, timestamp: Date.now() });
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => resolve();
    });
  });
}

// Complex Date Mathematics for PWA Background Timers
function getUpcomingReminderDate(birthDateStr, preferredTimeStr, offsetDays, leapYearMode = 'Feb28') {
  const today = new Date();
  
  const [prefHour, prefMinute] = preferredTimeStr.split(':').map(Number);
  const parts = birthDateStr.split('-').map(Number);
  const birthMonth = parts[1] - 1;
  const birthDay = parts[2];
  
  const currentYear = today.getFullYear();
  
  // Calculate next birthday date (day-of-birthday)
  let bdayDate = new Date(currentYear, birthMonth, birthDay, prefHour, prefMinute, 0, 0);
  
  // Leap year Feb 29 handling
  if (birthMonth === 1 && birthDay === 29) {
    const isLeap = (year) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    if (!isLeap(currentYear)) {
      if (leapYearMode === 'Feb28') {
        bdayDate.setDate(28);
      } else {
        bdayDate.setDate(1);
        bdayDate.setMonth(2); // March 1st
      }
    }
  }
  
  // Check if target for this year is already in the past
  let targetDate = new Date(bdayDate.getTime() - (offsetDays * 24 * 60 * 60 * 1000));
  
  if (targetDate.getTime() <= today.getTime()) {
    // Shift birthday to next year and recalculate
    const nextYear = currentYear + 1;
    let nextBdayDate = new Date(nextYear, birthMonth, birthDay, prefHour, prefMinute, 0, 0);
    if (birthMonth === 1 && birthDay === 29) {
      const isLeap = (year) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
      if (!isLeap(nextYear)) {
        if (leapYearMode === 'Feb28') {
          nextBdayDate.setDate(28);
        } else {
          nextBdayDate.setDate(1);
          nextBdayDate.setMonth(2); // March 1st
        }
      }
    }
    targetDate = new Date(nextBdayDate.getTime() - (offsetDays * 24 * 60 * 60 * 1000));
  }
  
  return targetDate;
}

function calculateDaysUntil(birthDateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const parts = birthDateString.split('-').map(Number);
  const birth = new Date(parts[0], parts[1] - 1, parts[2]);
  const currentYear = today.getFullYear();
  
  let nextBirthday = new Date(currentYear, birth.getMonth(), birth.getDate());
  
  if (birth.getMonth() === 1 && birth.getDate() === 29) {
    const isLeap = (year) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    if (!isLeap(currentYear)) {
      nextBirthday.setDate(28);
    }
  }
  
  if (nextBirthday < today) {
    nextBirthday.setFullYear(currentYear + 1);
  }
  
  const diffTime = nextBirthday.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

async function rescheduleNotifications(skipTimestampTrigger) {
  try {
    if (self.Notification.permission !== 'granted') {
      console.log('Notification permission is not granted in Service Worker.');
      return;
    }

    if (skipTimestampTrigger) {
      console.log('[SW] Skipping TimestampTrigger configuration as Native OS local notifications are active.');
      const currentNotifications = await self.registration.getNotifications({ includeTriggered: true });
      for (const n of currentNotifications) {
        if (n.tag && n.tag.startsWith('birthday-')) {
          n.close();
        }
      }
      return;
    }

    const notificationsEnabledSetting = await getFromDB('settings', 'notificationsEnabled');
    if (notificationsEnabledSetting === false) {
      console.log('Notifications disabled by user in settings. Cancelling all schedules.');
      const currentNotifications = await self.registration.getNotifications({ includeTriggered: true });
      for (const n of currentNotifications) {
        if (n.tag && n.tag.startsWith('birthday-')) {
          n.close();
        }
      }
      return;
    }

    const birthdays = await getAllFromDB('birthdays');
    const notificationTimeSetting = await getFromDB('settings', 'notificationTime');
    const notificationTime = notificationTimeSetting || '09:00';
    
    const sameDayTime = (await getFromDB('settings', 'notif_time_same_day')) || notificationTime;
    const oneDayTime = (await getFromDB('settings', 'notif_time_one_day')) || notificationTime;
    const threeDayTime = (await getFromDB('settings', 'notif_time_three_day')) || notificationTime;
    const sevenDayTime = (await getFromDB('settings', 'notif_time_seven_day')) || notificationTime;
    
    const leapYearModeSetting = await getFromDB('settings', 'leapYearMode');
    const leapYearMode = leapYearModeSetting || 'Feb28';
    
    // Check if notification triggers are supported
    let hasNotificationTriggers = false;
    try {
      if ('showTrigger' in self.Notification.prototype || 'TimestampTrigger' in self) {
        hasNotificationTriggers = true;
      }
    } catch (e) {}

    if (!hasNotificationTriggers) {
      console.log('Notification Triggers not supported in this browser. Falling back to live sync checks.');
      await checkBirthdaysAndNotify();
      return;
    }

    const activeTags = new Set();
    const todayMs = Date.now();
    const events = [];
    
    for (const birthday of birthdays) {
      if (birthday.notificationEnabled === false) continue;
      
      const offsets = birthday.reminders || [0, 1];
      for (const offset of offsets) {
        let timeStr = sameDayTime;
        if (offset === 1) timeStr = oneDayTime;
        else if (offset === 3) timeStr = threeDayTime;
        else if (offset === 7) timeStr = sevenDayTime;
        
        const triggerDate = getUpcomingReminderDate(birthday.birthDate, timeStr, offset, leapYearMode);
        
        if (triggerDate.getTime() > todayMs) {
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
          
          events.push({
            birthday,
            type: offset === 0 ? 'today' : offset === 1 ? 'tomorrow' : `${offset}days`,
            time: triggerDate.getTime(),
            year: triggerDate.getFullYear(),
            tag: `birthday-${birthday.id}-${triggerDate.getFullYear()}-${offset}`,
            title,
            body
          });
        }
      }
    }
    
    // Chronologically sort and schedule the top 20 upcoming alerts to respect browser quotas
    events.sort((a, b) => a.time - b.time);
    const eventsToSchedule = events.slice(0, 20);
    
    for (const ev of eventsToSchedule) {
      activeTags.add(ev.tag);
      
      // Force schedule OS-level reliable notification trigger
      // @ts-ignore
      await self.registration.showNotification(ev.title, {
        body: ev.body,
        icon: 'https://cdn-icons-png.flaticon.com/512/4213/4213652.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/4213/3516/3516709.png',
        vibrate: [200, 100, 200, 100, 200],
        requireInteraction: true,
        tag: ev.tag,
        data: { birthdayId: ev.birthday.id, type: ev.type, year: ev.year, screen: 'home' },
        actions: [
          { action: 'open', title: 'Open Happy4U 🎉' },
          { action: 'dismiss', title: 'Dismiss' }
        ],
        // @ts-ignore
        showTrigger: new self.TimestampTrigger(ev.time)
      });
    }
    
    // Cancel old schedules which are no longer active (prevents ghost alarms for removed/edited birthdays)
    const currentNotifications = await self.registration.getNotifications({ includeTriggered: true });
    for (const n of currentNotifications) {
      if (n.tag && n.tag.startsWith('birthday-')) {
        if (!activeTags.has(n.tag)) {
          n.close();
          console.log(`Successfully cancelled stale notification trigger tag: ${n.tag}`);
        }
      }
    }
    
    console.log(`OS Notification Triggers configured: ${eventsToSchedule.length} active alarms.`);
  } catch (error) {
    console.error('Failed to configure OS triggers:', error);
  }
}

async function checkBirthdaysAndNotify() {
  try {
    if (self.Notification.permission !== 'granted') return;

    const birthdays = await getAllFromDB('birthdays');
    if (!birthdays || birthdays.length === 0) return;
    
    const today = new Date();
    const currentYear = today.getFullYear();
    
    const leapYearModeSetting = await getFromDB('settings', 'leapYearMode');
    const leapYearMode = leapYearModeSetting || 'Feb28';
    
    for (const birthday of birthdays) {
      if (birthday.notificationEnabled === false) continue;
      
      const offsets = birthday.reminders || [0, 1];
      
      for (const offset of offsets) {
        const daysUntil = calculateDaysUntil(birthday.birthDate);
        
        if (daysUntil === offset) {
          const type = offset === 0 ? 'today' : offset === 1 ? 'tomorrow' : `${offset}days`;
          const alreadyNotified = await isNotificationDelivered(birthday.id, currentYear, type);
          if (!alreadyNotified) {
            let title = '';
            let body = '';
            if (offset === 0) {
              title = `🎂 Happy Birthday ${birthday.name}!`;
              body = `It's ${birthday.name}'s big day today! Send your best wishes and celebrate! 🎉`;
            } else if (offset === 1) {
              title = `⏰ Birthday Tomorrow: ${birthday.name}`;
              body = `Don't forget, it is ${birthday.name}'s birthday tomorrow! 🎈`;
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
            
            const tag = `birthday-${birthday.id}-${currentYear}-${type}`;
            await sendNotification(
              title,
              body,
              { birthdayId: birthday.id, type: type, year: currentYear, tag: tag }
            );
            await markNotificationDelivered(birthday.id, currentYear, type);
          }
        }
      }
    }
  } catch (error) {
    console.error('Fallback checks failed:', error);
  }
}

function sendNotification(title, body, data) {
  return self.registration.showNotification(title, {
    body: body,
    icon: 'https://cdn-icons-png.flaticon.com/512/4213/4213652.png', 
    badge: 'https://cdn-icons-png.flaticon.com/512/4213/3516/3516709.png',
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true,
    tag: data.tag || `birthday-${data.birthdayId}`,
    data: data,
    actions: [
      { action: 'open', title: 'Open Happy4U 🎉' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  });
}

// Handle notification interaction and DeepLink matching
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  const data = event.notification.data || {};
  let targetUrl = './';
  
  if (data.birthdayId) {
    targetUrl = `./?view=home&birthdayId=${data.birthdayId}`;
  } else if (data.type === 'welcome') {
    targetUrl = './?view=settings';
  }
  
  event.waitUntil(
    // @ts-ignore
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        for (const client of clientList) {
          const clientUrl = new URL(client.url);
          const selfUrl = new URL(self.location.href);
          if (clientUrl.origin === selfUrl.origin && 'focus' in client) {
            if ('navigate' in client) {
              client.navigate(targetUrl);
            }
            return client.focus();
          }
        }
        // @ts-ignore
        if (clients.openWindow) {
          // @ts-ignore
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// App Messaging Interfaces
self.addEventListener('message', function(event) {
  if (event.data.action === 'checkBirthdays') {
    event.waitUntil(checkBirthdaysAndNotify());
  }
  if (event.data.action === 'rescheduleNotifications') {
    event.waitUntil(rescheduleNotifications(event.data.skipTimestampTrigger));
  }
  if (event.data.action === 'sendWelcomeNotification') {
    event.waitUntil(sendNotification(
      'Notifications Active! 🔔',
      'Happy4U will remind you about upcoming birthdays. Enjoy!',
      { type: 'welcome', tag: 'welcome-msg' }
    ));
  }
});
