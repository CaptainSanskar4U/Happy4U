import React, { useState, useEffect } from 'react';
import { Birthday } from '../types';
import { X, Calendar, User, Heart, Briefcase, Users, Smile, Trash2, ChevronDown } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (birthday: Birthday) => void;
  initialData?: Birthday | null;
  handleDelete?: (id: string) => void;
}

const RELATIONSHIPS = [
    { label: 'Friend', icon: Users },
    { label: 'Family', icon: Heart },
    { label: 'Partner', icon: Heart },
    { label: 'Work', icon: Briefcase },
];

export const AddBirthdayModal: React.FC<Props> = ({ isOpen, onClose, onSave, initialData, handleDelete }) => {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [relationship, setRelationship] = useState<string>('Friend');
  const [emoji, setEmoji] = useState('🎂');
  const [selectedReminders, setSelectedReminders] = useState<number[]>([0, 1]);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (initialData) {
        setName(initialData.name);
        setDate(initialData.birthDate);
        setRelationship(initialData.relationship || 'Friend');
        setEmoji(initialData.emoji || '🎂');
        setSelectedReminders(initialData.reminders || [0, 1]);
    } else {
        // Reset form
        setName('');
        setDate('');
        setRelationship('Friend');
        setEmoji('🎂');
        setSelectedReminders([0, 1]);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
      setIsClosing(true);
      setTimeout(() => {
          setIsClosing(false);
          onClose();
      }, 300); // Match animation duration
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !date) return;

    const newBirthday: Birthday = {
        id: initialData ? initialData.id : Date.now().toString(),
        name,
        birthDate: date,
        relationship: relationship as any,
        emoji,
        notificationEnabled: true,
        createdAt: initialData ? initialData.createdAt : Date.now(),
        reminders: selectedReminders,
    };
    onSave(newBirthday);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`} 
        onClick={handleClose} 
      />
      
      {/* Modal Content */}
      <div 
        className={`relative w-full max-w-md bg-surface border-t sm:border border-dark-border rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl transform transition-all duration-300 ${isClosing ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100 animate-popup'}`}
      >
        
        {/* Pull bar */}
        <div className="w-12 h-1 bg-muted/30 rounded-full mx-auto mb-8 sm:hidden"></div>

        <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-primary">{initialData ? 'Edit Birthday' : 'New Birthday'}</h2>
            <div className="flex gap-3">
                {initialData && handleDelete && (
                     <button 
                        onClick={() => { handleDelete(initialData.id); handleClose(); }}
                        className="w-10 h-10 rounded-full bg-surfaceLight border border-dark-border flex items-center justify-center text-red-400 hover:bg-red-500/10 transition-colors"
                     >
                         <Trash2 className="w-4 h-4" />
                     </button>
                )}
                <button onClick={handleClose} className="w-10 h-10 rounded-full bg-surfaceLight border border-dark-border flex items-center justify-center text-muted hover:text-primary transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Emoji & Name Row */}
            <div className="flex gap-4">
                <div 
                    className="w-16 h-16 rounded-2xl bg-surfaceLight border border-dark-border flex items-center justify-center text-3xl cursor-pointer hover:border-lime/50 transition-colors shrink-0"
                    onClick={() => setEmoji(emoji === '🎂' ? '🎉' : emoji === '🎉' ? '🎁' : '🎂')}
                >
                    {emoji}
                </div>
                <div className="flex-1 relative group">
                    <label className="absolute -top-2.5 left-3 bg-surface px-2 text-xs text-lime font-medium">Name</label>
                    <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full h-16 bg-transparent border border-dark-border rounded-2xl px-4 text-primary placeholder-muted focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime transition-all text-lg font-medium"
                        placeholder="e.g. Sarah"
                        required
                    />
                </div>
            </div>

            {/* Date Input */}
            <div className="relative group">
                <label className="absolute -top-2.5 left-3 bg-surface px-2 text-xs text-muted group-focus-within:text-lime transition-colors">Date of Birth</label>
                <div className="relative">
                    <input 
                        type="date" 
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full h-16 bg-transparent border border-dark-border rounded-2xl px-4 text-primary placeholder-muted focus:outline-none focus:border-lime focus:ring-1 focus:ring-lime transition-all text-lg font-medium appearance-none"
                        required
                    />
                    <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none w-5 h-5" />
                </div>
            </div>

            {/* Relationship Pills */}
            <div className="space-y-3">
                <label className="text-xs text-muted ml-1">Relationship</label>
                <div className="grid grid-cols-4 gap-2">
                    {RELATIONSHIPS.map((rel) => (
                        <button
                            key={rel.label}
                            type="button"
                            onClick={() => setRelationship(rel.label)}
                            className={`flex flex-col items-center justify-center gap-1 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-wide border transition-all ${
                                relationship === rel.label 
                                ? 'bg-lime text-black border-lime' 
                                : 'bg-surfaceLight text-muted border-transparent hover:bg-surfaceLight/80'
                            }`}
                        >
                           <rel.icon className="w-4 h-4" />
                           {rel.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Multiple Reminders selection */}
            <div className="space-y-3">
                <label className="text-xs text-muted ml-1 flex justify-between">
                    <span>Active Alert Reminders</span>
                    <span className="text-[10px] text-lime font-bold uppercase tracking-wider">Device Local</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { val: 0, label: "On Birthday 🎉" },
                        { val: 1, label: "1 Day Before ⏰" },
                        { val: 3, label: "3 Days Before 📅" },
                        { val: 7, label: "7 Days Before 🔔" }
                    ].map(opt => {
                        const active = selectedReminders.includes(opt.val);
                        return (
                            <button
                                key={opt.val}
                                type="button"
                                onClick={() => {
                                    if (active) {
                                        // Keep at least one reminder active
                                        if (selectedReminders.length > 1) {
                                            setSelectedReminders(selectedReminders.filter(r => r !== opt.val));
                                        }
                                    } else {
                                        setSelectedReminders([...selectedReminders, opt.val]);
                                    }
                                }}
                                className={`flex items-center justify-between px-3 py-3 rounded-2xl border text-xs font-semibold uppercase tracking-wide transition-all ${
                                    active 
                                    ? 'bg-lime/10 text-lime border-lime/30 font-bold' 
                                    : 'bg-surfaceLight text-muted border-transparent hover:bg-surfaceLight/80'
                                }`}
                            >
                                <span className="truncate">{opt.label}</span>
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center border text-[9px] shrink-0 ${active ? 'bg-lime text-black border-lime' : 'border-muted/50'}`}>
                                    {active && "✓"}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Submit Button */}
            <button 
                type="submit"
                className="w-full bg-lime hover:bg-lime-dim text-black font-bold text-lg py-5 rounded-[2rem] shadow-lg shadow-lime/20 transition-all transform active:scale-[0.98] mt-4 flex items-center justify-center gap-2"
            >
                {initialData ? 'Save Changes' : 'Create Reminder'}
                <ChevronDown className="w-5 h-5 -rotate-90" />
            </button>
        </form>
      </div>
    </div>
  );
};