import React, { useState } from 'react';
import { Birthday } from '../types';
import { calculateNextAge } from '../utils/dateUtils';
import { Confetti } from './Confetti';
import { Share2, Check, Gift } from 'lucide-react';

interface Props {
    birthdays: Birthday[];
    onClose: () => void;
    onMarkCelebrated: (id: string) => void;
}

export const BirthdayPopup: React.FC<Props> = ({ birthdays, onClose, onMarkCelebrated }) => {
    const [isOpen, setIsOpen] = useState(false);
    const currentBirthday = birthdays[0];
    const age = calculateNextAge(currentBirthday.birthDate);

    const handleOpen = () => {
        setIsOpen(true);
    };

    const handleWhatsApp = () => {
        const text = `Happy ${age}th Birthday ${currentBirthday.name}! 🎉🎂`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        onMarkCelebrated(currentBirthday.id);
    };

    if (!currentBirthday) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={onClose} />
            
            {isOpen && <Confetti />}

            <div className="relative w-full max-w-xs perspective-1000">
                
                {!isOpen ? (
                    <div 
                        className="bg-surface rounded-[3rem] shadow-2xl p-10 text-center cursor-pointer hover:scale-105 transition-transform border border-lime/30 animate-float relative overflow-hidden group"
                        onClick={handleOpen}
                    >
                        {/* Glow bg */}
                        <div className="absolute inset-0 bg-lime/5 opacity-50"></div>
                        
                        <div className="w-28 h-28 bg-lime/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-lime text-lime shadow-[0_0_30px_rgba(210,248,1,0.3)] relative z-10 group-hover:scale-110 transition-transform">
                            <Gift className="w-12 h-12 animate-pulse-slow" />
                        </div>
                        <h3 className="text-3xl font-bold text-primary mb-2 relative z-10">Surprise!</h3>
                        <p className="text-muted text-sm relative z-10 mb-6">Someone has a birthday today</p>
                        
                        <div className="inline-block px-6 py-2 bg-lime text-black font-bold rounded-full text-sm shadow-lg shadow-lime/20 relative z-10">
                            TAP TO OPEN
                        </div>
                    </div>
                ) : (
                    <div className="bg-surface border border-dark-border rounded-[3rem] overflow-hidden animate-popup relative shadow-2xl">
                         {/* Header Image/Gradient */}
                         <div className="h-48 bg-neon-gradient flex items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                            
                            {/* Big Avatar */}
                            <div className="w-32 h-32 bg-surface rounded-full border-8 border-surface flex items-center justify-center text-6xl shadow-2xl absolute -bottom-16 z-10">
                                {currentBirthday.emoji || '🎉'}
                            </div>
                         </div>

                         <div className="pt-20 pb-10 px-8 text-center">
                            <h2 className="text-4xl font-black text-primary mb-1 uppercase tracking-tight italic">Happy Birthday!</h2>
                            <p className="text-lime font-medium text-lg mb-8">
                                {currentBirthday.name} is turning <span className="font-bold text-2xl bg-lime text-black px-2 rounded mx-1">{age}</span>
                            </p>

                            <div className="space-y-3">
                                <button 
                                    onClick={handleWhatsApp}
                                    className="w-full bg-lime hover:bg-lime-dim text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-lime/20 transition-all active:scale-95"
                                >
                                    <Share2 className="w-5 h-5" />
                                    Send Wishes
                                </button>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={() => onMarkCelebrated(currentBirthday.id)}
                                        className="bg-surfaceLight hover:bg-white/10 text-primary font-medium py-4 rounded-2xl transition-all flex items-center justify-center gap-2 border border-dark-border"
                                    >
                                        <Check className="w-4 h-4" />
                                        Done
                                    </button>
                                    <button 
                                        onClick={onClose}
                                        className="text-muted hover:text-primary font-medium py-4 rounded-2xl transition-all"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                         </div>
                    </div>
                )}
            </div>
        </div>
    );
};