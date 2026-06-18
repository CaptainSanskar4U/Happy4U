export interface DiagnosticsResult {
  notificationApi: 'supported' | 'unsupported';
  notificationPermission: 'default' | 'granted' | 'denied';
  serviceWorker: 'supported' | 'unsupported';
  serviceWorkerStatus: 'registered' | 'unregistered' | 'unsupported';
  pushManager: 'supported' | 'unsupported';
  periodicSync: 'supported' | 'unsupported';
  backgroundSync: 'supported' | 'unsupported';
  indexedDb: 'supported' | 'unsupported';
  indexedDbStatus: 'working' | 'failed' | 'unknown';
  beforeInstallPrompt: 'supported' | 'unavailable' | 'unknown';
  displayMode: 'standalone' | 'browser' | 'unknown';
  onlineStatus: 'online' | 'offline';
  cacheVersion: string;
}

let beforeInstallPromptSupported: 'supported' | 'unavailable' = 'unavailable';

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', () => {
    beforeInstallPromptSupported = 'supported';
  });
}

export const getDiagnostics = async (): Promise<DiagnosticsResult> => {
  const isServer = typeof window === 'undefined';
  
  // 1. Notification API
  const notificationApi = isServer ? 'unsupported' : ('Notification' in window ? 'supported' : 'unsupported');
  const notificationPermission = isServer ? 'default' : ('Notification' in window ? Notification.permission : 'default');

  // 2. Service Worker support & status
  const swSupported = !isServer && 'serviceWorker' in navigator;
  let swStatus: 'registered' | 'unregistered' | 'unsupported' = 'unsupported';
  if (swSupported) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      swStatus = registrations.length > 0 ? 'registered' : 'unregistered';
    } catch {
      swStatus = 'unregistered';
    }
  }

  // 3. Push Manager
  const pushManager = !isServer && 'PushManager' in window ? 'supported' : 'unsupported';

  // 4. Periodic & Background Sync
  const periodicSync = !isServer && 'periodicSync' in ServiceWorkerRegistration.prototype ? 'supported' : 'unsupported';
  const backgroundSync = !isServer && 'sync' in ServiceWorkerRegistration.prototype ? 'supported' : 'unsupported';

  // 5. IndexedDB
  const idbSupported = !isServer && !!window.indexedDB ? 'supported' : 'unsupported';
  let idbStatus: 'working' | 'failed' | 'unknown' = 'unknown';
  if (idbSupported) {
    try {
      idbStatus = await new Promise((resolve) => {
        const req = indexedDB.open('BirthdayDB_test', 1);
        req.onerror = () => resolve('failed');
        req.onsuccess = () => {
          req.result.close();
          indexedDB.deleteDatabase('BirthdayDB_test');
          resolve('working');
        };
      });
    } catch {
      idbStatus = 'failed';
    }
  }

  // 6. BeforeInstallPrompt
  const beforeInstallPrompt = beforeInstallPromptSupported === 'supported' ? 'supported' : 'unavailable';

  // 7. Display Mode
  let displayMode: 'standalone' | 'browser' | 'unknown' = 'unknown';
  if (!isServer) {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    displayMode = isStandalone ? 'standalone' : 'browser';
  }

  // 8. Online status
  const onlineStatus = isServer ? 'online' : (navigator.onLine ? 'online' : 'offline');

  return {
    notificationApi,
    notificationPermission,
    serviceWorker: swSupported ? 'supported' : 'unsupported',
    serviceWorkerStatus: swStatus,
    pushManager,
    periodicSync,
    backgroundSync,
    indexedDb: idbSupported ? 'supported' : 'unsupported',
    indexedDbStatus: idbStatus,
    beforeInstallPrompt,
    displayMode,
    onlineStatus,
    cacheVersion: 'happy4u-v1'
  };
};
