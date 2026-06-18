import { Birthday } from '../types';

export const DB_NAME = 'BirthdayDB';
export const DB_VERSION = 2;

export const registerServiceWorker = () => {
    if ('serviceWorker' in navigator) {
        let swUrl = '/service-worker.js'; // Secure root URL representation conforming to PWA standards

        try {
            if (window.location.protocol !== 'about:' && !window.location.href.startsWith('blob:')) {
                swUrl = new URL('service-worker.js', window.location.href).href;
            }
        } catch (e) {
            console.warn('⚠️ Could not construct absolute SW URL, using relative path.');
        }

        navigator.serviceWorker.register(swUrl)
            .then(registration => {
                console.log('✅ Service Worker registered with scope:', registration.scope);
                
                // Attempt to register periodic sync
                if ('periodicSync' in registration) {
                    try {
                        // @ts-ignore
                        registration.periodicSync.register('check-birthdays', {
                            minInterval: 24 * 60 * 60 * 1000 // 24 hours
                        })
                        .then(() => console.log('Periodic sync registered'))
                        .catch(err => console.log('Periodic sync registration rejected (optional feature)', err));
                    } catch (e) {
                        console.log('Periodic sync failed (optional feature)', e);
                    }
                }
                
                // Fallback sync
                if ('sync' in registration) {
                    try {
                        // @ts-ignore
                        registration.sync.register('check-birthdays')
                        .then(() => console.log('Background sync registered'))
                        .catch(err => console.log('Background sync registration rejected (optional feature)', err));
                    } catch (e) {
                        console.log('Background sync failed (optional feature)', e);
                    }
                }

                // Initial notification scheduling request
                if (registration.active) {
                    registration.active.postMessage({ action: 'rescheduleNotifications' });
                }
            })
            .catch(error => {
                if (error.message.includes('origin') || error.message.includes('scriptURL') || error.message.includes('Failed to construct')) {
                    console.warn('⚠️ Service Worker registration skipped due to Preview Environment restrictions. This is expected in AI Studio/StackBlitz. It will work correctly in Production/WebIntoApp.');
                } else {
                    console.error('❌ Service Worker registration failed:', error);
                }
            });
            
            navigator.serviceWorker.addEventListener('message', event => {
                console.log("SW Message received:", event.data);
            });
    }
};

/**
 * Synchronizes the entire list of birthdays to IndexedDB (and updates localstorage as a secondary fallback cache).
 */
export const syncToIndexedDB = (birthdays: Birthday[]) => {
    if (typeof window === 'undefined') return;

    // Keep secondary fallback in sync
    try {
        localStorage.setItem('happy4u_birthdays', JSON.stringify(birthdays));
    } catch (e) {
        console.error('Failed to update localStorage fallback cache:', e);
    }

    if (!window.indexedDB) {
        console.warn('IndexedDB not supported in this host.');
        return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event: any) => {
        console.error('IndexedDB open error in syncToIndexedDB:', event.target.error);
    };
    
    request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
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

    request.onsuccess = (event: any) => {
        const db = event.target.result;
        const transaction = db.transaction(['birthdays'], 'readwrite');
        const store = transaction.objectStore('birthdays');
        
        const clearRequest = store.clear();
        
        clearRequest.onsuccess = () => {
            birthdays.forEach(birthday => {
                store.add(birthday);
            });
        };
        
        transaction.oncomplete = () => {
            console.log('Successfully synchronized list of birthdays to IndexedDB store.');
            if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    action: 'rescheduleNotifications'
                });
            }
        };
    };
};

/**
 * Saves or updates a single birthday in IndexedDB.
 */
export const saveBirthdayInIndexedDB = (birthday: Birthday): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            // fallback
            try {
                const saved = localStorage.getItem('happy4u_birthdays');
                const list = saved ? JSON.parse(saved) : [];
                const updated = list.filter((b: Birthday) => b.id !== birthday.id);
                updated.push(birthday);
                localStorage.setItem('happy4u_birthdays', JSON.stringify(updated));
                resolve();
            } catch (e) {
                reject(e);
            }
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = (e: any) => reject(e.target.error);
        request.onsuccess = (e: any) => {
            const db = e.target.result;
            const transaction = db.transaction(['birthdays'], 'readwrite');
            const store = transaction.objectStore('birthdays');
            store.put(birthday);
            
            transaction.oncomplete = () => {
                // Keep localStorage in sync
                try {
                    const saved = localStorage.getItem('happy4u_birthdays');
                    const list = saved ? JSON.parse(saved) : [];
                    const updated = list.filter((b: Birthday) => b.id !== birthday.id);
                    updated.push(birthday);
                    localStorage.setItem('happy4u_birthdays', JSON.stringify(updated));
                } catch (err) {
                    console.error('Local storage backup failure', err);
                }

                if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({ action: 'rescheduleNotifications' });
                }
                resolve();
            };
        };
    });
};

/**
 * Deletes a birthday from IndexedDB by ID.
 */
export const deleteBirthdayFromIndexedDB = (id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            // fallback
            try {
                const saved = localStorage.getItem('happy4u_birthdays');
                const list = saved ? JSON.parse(saved) : [];
                const filtered = list.filter((b: Birthday) => b.id !== id);
                localStorage.setItem('happy4u_birthdays', JSON.stringify(filtered));
                resolve();
            } catch (e) {
                reject(e);
            }
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = (e: any) => reject(e.target.error);
        request.onsuccess = (e: any) => {
            const db = e.target.result;
            const transaction = db.transaction(['birthdays'], 'readwrite');
            const store = transaction.objectStore('birthdays');
            store.delete(id);
            
            transaction.oncomplete = () => {
                // Keep localStorage in sync
                try {
                    const saved = localStorage.getItem('happy4u_birthdays');
                    const list = saved ? JSON.parse(saved) : [];
                    const filtered = list.filter((b: Birthday) => b.id !== id);
                    localStorage.setItem('happy4u_birthdays', JSON.stringify(filtered));
                } catch (err) {
                    console.error('Local storage removal failure', err);
                }

                if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({ action: 'rescheduleNotifications' });
                }
                resolve();
            };
        };
    });
};

/**
 * Hydrates birthdays from IndexedDB with transparent automatic migration from legacy localStorage.
 */
export const loadBirthdays = (): Promise<Birthday[]> => {
    return new Promise((resolve) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            try {
                const saved = localStorage.getItem('happy4u_birthdays');
                resolve(saved ? JSON.parse(saved) : []);
            } catch {
                resolve([]);
            }
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => {
            try {
                const saved = localStorage.getItem('happy4u_birthdays');
                resolve(saved ? JSON.parse(saved) : []);
            } catch {
                resolve([]);
            }
        };

        request.onupgradeneeded = (event: any) => {
            const db = event.target.result;
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

        request.onsuccess = (event: any) => {
            const db = event.target.result;
            try {
                const transaction = db.transaction(['birthdays'], 'readonly');
                const store = transaction.objectStore('birthdays');
                const getAll = store.getAll();
                
                getAll.onsuccess = () => {
                    const list = getAll.result || [];
                    if (list.length > 0) {
                        resolve(list);
                    } else {
                        // Attempt migration from legacy localStorage
                        try {
                            const saved = localStorage.getItem('happy4u_birthdays');
                            if (saved) {
                                const parsed = JSON.parse(saved) as Birthday[];
                                if (parsed && parsed.length > 0) {
                                    console.log('📦 Migrating legacy localStorage birthdays to primary IndexedDB store...');
                                    syncToIndexedDB(parsed);
                                    resolve(parsed);
                                    return;
                                }
                            }
                        } catch (e) {
                            console.error('Legacy migration decoding failed:', e);
                        }
                        resolve([]);
                    }
                };
                
                getAll.onerror = () => {
                    try {
                        const saved = localStorage.getItem('happy4u_birthdays');
                        resolve(saved ? JSON.parse(saved) : []);
                    } catch {
                        resolve([]);
                    }
                };
            } catch (e) {
                try {
                    const saved = localStorage.getItem('happy4u_birthdays');
                    resolve(saved ? JSON.parse(saved) : []);
                } catch {
                    resolve([]);
                }
            }
        };
    });
};

export const syncSettingToIndexedDB = (key: string, value: any) => {
    if (typeof window === 'undefined') return;

    // Sync to localStorage as primary preference cache
    try {
        localStorage.setItem(`happy4u_pref_${key}`, typeof value === 'object' ? JSON.stringify(value) : String(value));
    } catch (e) {
        console.error('Failed to sync setting to localStorage cache:', e);
    }

    if (!window.indexedDB) return;

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event: any) => {
        console.error('IndexedDB settings error:', event.target.error);
    };

    request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
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
    
    request.onsuccess = (event: any) => {
        const db = event.target.result;
        try {
            const transaction = db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            store.put({ key, value });
            
            transaction.oncomplete = () => {
                if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({
                        action: 'rescheduleNotifications'
                    });
                }
            };
        } catch (e) {
            console.error('Settings saving transaction error:', e);
        }
    };
};
