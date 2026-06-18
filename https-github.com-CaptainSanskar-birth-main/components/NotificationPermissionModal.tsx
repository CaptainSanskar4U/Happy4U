import React, { useState, useEffect } from 'react';
import { Bell, ShieldCheck } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onEnable: () => void;
    onClose: () => void;
}

const isAPKContext = (): boolean => {
    if (typeof window === 'undefined') return false;
    const Cap = (window as any).Capacitor;
    if (Cap && Cap.Plugins && Cap.Plugins.LocalNotifications) return true;
    const cordova = (window as any).cordova;
    if (cordova && cordova.plugins && cordova.plugins.notification && cordova.plugins.notification.local) return true;
    const AndroidBridge = (window as any).Android;
    if (AndroidBridge && typeof AndroidBridge.scheduleNotification === 'function') return true;
    const ua = navigator.userAgent || '';
    return (ua.includes('TWA') || (ua.includes('Android') && ua.includes('Chrome')));
};

export const NotificationPermissionModal: React.FC<Props> = ({ isOpen, onEnable, onClose }) => {
    const [permission, setPermission] = useState<NotificationPermission>('default');

    useEffect(() => {
        if (isOpen && 'Notification' in window) {
            setPermission(Notification.permission);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const isDenied = permission === 'denied';
    const inAPK = isAPKContext();

    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose} />
            
            <div className="relative w-full max-w-sm bg-surface border border-dark-border rounded-[2rem] p-6 shadow-2xl animate-scale-in">
                
                <div className="w-16 h-16 rounded-full bg-lime/10 border border-lime flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(210,248,1,0.2)]">
                    <Bell className="w-8 h-8 text-lime animate-pulse-slow" />
                </div>

                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-white mb-2">Never Miss a Cake! 🎂</h2>
                    {isDenied ? (
                        <div className="text-left bg-surfaceLight border border-dark-border rounded-2xl p-4 mt-3">
                            <h3 className="text-red-400 font-bold text-sm mb-1 text-center">Notifications are Blocked ⚠️</h3>
                            <p className="text-muted text-xs leading-relaxed mb-3 text-center">
                                {inAPK ? (
                                    'Notifications are blocked. Please uninstall and reinstall the app, then allow notifications when prompted.'
                                ) : (
                                    'To enable reminders, you must unblock notifications in your browser:'
                                )}
                            </p>
                            {!inAPK && (
                                <ol className="text-xs text-muted leading-relaxed list-decimal list-inside space-y-1.5 px-1 font-medium">
                                    <li>Tap the lock or site control icon next to the URL in your address bar.</li>
                                    <li>Set <b>Notifications</b> permission to <b>Allow</b>.</li>
                                    <li>Refresh the page to apply the settings.</li>
                                </ol>
                            )}
                        </div>
                    ) : (
                        <p className="text-muted text-sm leading-relaxed">
                            {inAPK ? (
                                'Allow Happy4U to send you birthday reminders. You can change this later in your device settings.'
                            ) : (
                                'Allow Happy4U to send you reminders for upcoming birthdays. We promise not to spam you.'
                            )}
                        </p>
                    )}
                </div>

                <div className="space-y-3">
                    {!isDenied ? (
                        <button 
                            onClick={onEnable}
                            className="w-full bg-lime hover:bg-lime-dim text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-lime/20 transition-all active:scale-95 cursor-pointer"
                        >
                            <ShieldCheck size={20} />
                            Enable Notifications
                        </button>
                    ) : (
                        <button 
                            onClick={() => window.location.reload()}
                            className="w-full bg-lime hover:bg-lime-dim text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-lime/20 transition-all active:scale-95 cursor-pointer"
                        >
                            I've Allowed Them (Refresh 🔄)
                        </button>
                    )}
                    
                    <button 
                        onClick={onClose}
                        className="w-full bg-transparent text-muted hover:text-white py-3 rounded-2xl font-medium text-sm transition-colors cursor-pointer"
                    >
                        Maybe Later
                    </button>
                </div>
            </div>
        </div>
    );
};