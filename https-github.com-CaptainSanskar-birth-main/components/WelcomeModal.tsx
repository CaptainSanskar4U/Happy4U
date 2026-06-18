import React, { useState, useEffect } from 'react';
import { ChevronRight, Sparkles, User } from 'lucide-react';

interface Props {
  isOpen: boolean;
  initialName?: string;
  initialGender?: 'male' | 'female';
  onSave: (name: string, gender: 'male' | 'female') => void;
  onClose?: () => void;
}

export const WelcomeModal: React.FC<Props> = ({ isOpen, initialName = '', initialGender = 'male', onSave, onClose }) => {
  const [name, setName] = useState(initialName);
  const [gender, setGender] = useState<'male' | 'female'>(initialGender);

  useEffect(() => {
      if (isOpen) {
        setName(initialName);
        setGender(initialGender);
      }
  }, [initialName, initialGender, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim(), gender);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center px-6">
      {/* Dark Blur Backdrop */}
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-xl transition-opacity duration-500 animate-fade-in"
        onClick={onClose ? onClose : undefined}
      />

      <div className="w-full max-w-sm relative z-10 animate-scale-in">
        
        <div className="text-center mb-8">
             <div className="w-16 h-16 rounded-full bg-lime/10 border border-lime/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(210,248,1,0.2)]">
                 <Sparkles className="w-8 h-8 text-lime animate-pulse-slow" />
             </div>
             <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
              {initialName ? 'Edit Profile' : 'Welcome'}
            </h2>
            <p className="text-gray-400">
              {initialName ? 'Update your details.' : 'Let\'s get started.'}
            </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Gender Selection */}
          <div className="grid grid-cols-2 gap-3 mb-6">
             <button
                type="button"
                onClick={() => setGender('male')}
                className={`py-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                    gender === 'male' 
                    ? 'bg-lime/10 border-lime text-lime shadow-[0_0_15px_rgba(210,248,1,0.15)] scale-105' 
                    : 'bg-surfaceLight border-dark-border text-muted hover:border-white/30'
                }`}
             >
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                    <User className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold">Male</span>
             </button>
             <button
                type="button"
                onClick={() => setGender('female')}
                className={`py-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                    gender === 'female' 
                    ? 'bg-lime/10 border-lime text-lime shadow-[0_0_15px_rgba(210,248,1,0.15)] scale-105' 
                    : 'bg-surfaceLight border-dark-border text-muted hover:border-white/30'
                }`}
             >
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                    <User className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold">Female</span>
             </button>
          </div>

          {/* Name Input */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-lime to-lime-dim rounded-2xl opacity-20 group-focus-within:opacity-50 blur transition duration-500 pointer-events-none"></div>
            <div className="relative">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your First Name"
                    className="w-full bg-surfaceLight border border-dark-border rounded-2xl py-5 pl-6 pr-16 text-white text-xl font-medium placeholder-muted focus:outline-none focus:border-lime/50 transition-all"
                    autoFocus
                    maxLength={15}
                />
                <button
                    type="submit"
                    disabled={!name.trim()}
                    className="absolute right-3 top-3 bottom-3 aspect-square bg-lime text-black rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-lime-dim transition-all hover:scale-105 active:scale-95 shadow-lg shadow-lime/20"
                >
                    <ChevronRight size={24} strokeWidth={3} />
                </button>
            </div>
          </div>
        </form>
        
        {onClose && (
            <button onClick={onClose} className="w-full mt-6 text-muted text-sm hover:text-white transition-colors">
                Cancel
            </button>
        )}
      </div>
    </div>
  );
};