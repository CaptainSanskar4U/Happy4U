import React, { useState, useEffect } from 'react';
import { Plus, Trash2, StickyNote, X, Save, Edit3 } from 'lucide-react';

interface Note {
    id: string;
    content: string;
    createdAt: number;
    color: string;
}

const COLORS = [
    'bg-lime text-black',
    'bg-purple-400 text-black',
    'bg-pink-400 text-black',
    'bg-cyan-400 text-black',
    'bg-orange-400 text-black',
    'bg-surfaceLight border border-dark-border text-primary' // Default/Dark
];

export const NotesView: React.FC = () => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [newNoteContent, setNewNoteContent] = useState('');
    const [selectedColor, setSelectedColor] = useState(COLORS[0]);

    useEffect(() => {
        const saved = localStorage.getItem('cakewait_notes');
        if (saved) {
            try {
                setNotes(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to load notes", e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('cakewait_notes', JSON.stringify(notes));
    }, [notes]);

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNoteContent.trim()) return;

        const note: Note = {
            id: Date.now().toString(),
            content: newNoteContent,
            createdAt: Date.now(),
            color: selectedColor
        };

        setNotes(prev => [note, ...prev]);
        setNewNoteContent('');
        setIsAdding(false);
    };

    const handleDelete = (id: string) => {
        if (confirm('Delete this note?')) {
            setNotes(prev => prev.filter(n => n.id !== id));
        }
    };

    return (
        <div className="space-y-6 pb-24">
            {/* Header */}
             <div className="bg-dark-card border border-dark-border rounded-[2.5rem] p-6 relative overflow-hidden card-shine animate-scale-in origin-top">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/10 blur-[50px] rounded-full pointer-events-none"></div>
                <div className="flex items-center justify-between relative z-10">
                    <div>
                        <h2 className="text-3xl font-black text-primary italic tracking-tight">Sticky<br/>Notes</h2>
                        <p className="text-muted text-sm mt-2">Gift ideas & reminders</p>
                    </div>
                    <div className="w-16 h-16 rounded-full bg-surfaceLight border border-dark-border flex items-center justify-center shadow-lg animate-float">
                        <StickyNote className="w-8 h-8 text-lime" />
                    </div>
                </div>
            </div>

            {/* Add Button */}
            {!isAdding && (
                <button
                    onClick={() => setIsAdding(true)}
                    className="w-full bg-surfaceLight border border-dark-border hover:border-lime/50 text-primary py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] group animate-scale-in"
                    style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}
                >
                    <div className="w-8 h-8 rounded-full bg-lime text-black flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Plus size={18} />
                    </div>
                    <span className="font-bold">Add New Note</span>
                </button>
            )}

            {/* Add Form */}
            {isAdding && (
                <form onSubmit={handleAdd} className="bg-surfaceLight border border-dark-border rounded-3xl p-4 animate-scale-in shadow-2xl">
                    <div className="flex items-start gap-2 mb-2">
                        <Edit3 size={16} className="text-lime mt-1" />
                        <span className="text-xs font-bold text-lime uppercase tracking-wide">New Note</span>
                    </div>
                    <textarea
                        autoFocus
                        value={newNoteContent}
                        onChange={(e) => setNewNoteContent(e.target.value)}
                        placeholder="Write something..."
                        className="w-full h-32 bg-transparent text-primary placeholder-muted focus:outline-none resize-none text-lg p-2 font-medium"
                    />
                    
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-dark-border">
                        <div className="flex gap-2">
                            {COLORS.slice(0, 5).map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setSelectedColor(c)}
                                    className={`w-6 h-6 rounded-full ${c.split(' ')[0]} ${selectedColor === c ? 'ring-2 ring-white scale-110 shadow-lg' : 'opacity-70 hover:opacity-100'} transition-all`}
                                />
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setIsAdding(false)}
                                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/5 text-muted transition-colors"
                            >
                                <X size={20} />
                            </button>
                            <button
                                type="submit"
                                disabled={!newNoteContent.trim()}
                                className="bg-lime text-black px-6 py-2 rounded-full font-bold text-sm flex items-center gap-2 disabled:opacity-50 hover:bg-lime-dim transition-colors shadow-lg shadow-lime/10"
                            >
                                <Save size={16} />
                                Save
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* Masonry-style Grid */}
            <div className="columns-2 gap-3 space-y-3">
                {notes.length === 0 && !isAdding && (
                    <div className="col-span-2 text-center py-12 border border-dashed border-dark-border rounded-3xl opacity-50 break-inside-avoid animate-fade-in">
                        <p className="text-muted text-sm">No notes yet.</p>
                    </div>
                )}
                
                {notes.map((note, index) => (
                    <div 
                        key={note.id} 
                        className={`break-inside-avoid rounded-3xl p-5 flex flex-col justify-between relative group transition-all hover:scale-[1.02] mb-3 shadow-lg animate-slide-up opacity-0 ${note.color} ${note.color.includes('border') ? '' : 'border-0'}`}
                        style={{ minHeight: '140px', animationDelay: `${index * 50 + 200}ms` }}
                    >
                        <p className="text-sm font-bold whitespace-pre-wrap leading-relaxed opacity-90">
                            {note.content}
                        </p>
                        
                        <div className="flex justify-between items-end mt-4 pt-2">
                            <span className="text-[10px] opacity-60 font-medium font-mono">
                                {new Date(note.createdAt).toLocaleDateString()}
                            </span>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
                                className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};