import React, { useEffect, useState } from 'react';

interface Particle {
    id: number;
    x: number;
    y: number;
    color: string;
    rotation: number;
    delay: number;
    scale: number;
}

export const Confetti: React.FC = () => {
    const [particles, setParticles] = useState<Particle[]>([]);
    
    useEffect(() => {
        const colors = ['#a3e635', '#f472b6', '#60a5fa', '#fbbf24', '#ffffff'];
        const count = 50;
        const newParticles: Particle[] = [];
        
        for (let i = 0; i < count; i++) {
            newParticles.push({
                id: i,
                x: Math.random() * 100,
                y: -10 - Math.random() * 20, // Start above screen
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * 360,
                delay: Math.random() * 2,
                scale: 0.5 + Math.random() * 0.8
            });
        }
        setParticles(newParticles);
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {particles.map((p) => (
                <div
                    key={p.id}
                    className="absolute w-3 h-3 rounded-sm"
                    style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        backgroundColor: p.color,
                        transform: `rotate(${p.rotation}deg) scale(${p.scale})`,
                        animation: `fall 3s linear ${p.delay}s forwards`
                    }}
                />
            ))}
            <style>{`
                @keyframes fall {
                    0% { top: -10%; transform: rotate(0deg); opacity: 1; }
                    100% { top: 110%; transform: rotate(720deg); opacity: 0; }
                }
            `}</style>
        </div>
    );
};