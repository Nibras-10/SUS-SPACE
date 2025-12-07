/// <reference lib="dom" />
import React, { useState, useEffect, useRef } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/UI/HUD';
import { net } from './services/Network';
import { Users, Play, Hash, Globe, ChevronRight } from 'lucide-react';

// --- 3D Starfield Component ---
const Starfield: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;

        const stars: { x: number; y: number; z: number; o: number }[] = [];
        const numStars = 800;
        const centerX = width / 2;
        const centerY = height / 2;
        const warpSpeed = 2; // Z-axis speed

        // Init stars
        for (let i = 0; i < numStars; i++) {
            stars.push({
                x: (Math.random() - 0.5) * width * 2,
                y: (Math.random() - 0.5) * height * 2,
                z: Math.random() * width,
                o: Math.random() // offset for twinkling
            });
        }

        const animate = () => {
            ctx.fillStyle = '#020617'; // Slate 950
            ctx.fillRect(0, 0, width, height);

            stars.forEach((star) => {
                // Move star closer
                star.z -= warpSpeed;

                // Reset if too close or out of bounds
                if (star.z <= 0) {
                    star.z = width;
                    star.x = (Math.random() - 0.5) * width * 2;
                    star.y = (Math.random() - 0.5) * height * 2;
                }

                // Project 3D to 2D
                const k = 128.0 / star.z;
                const px = star.x * k + centerX;
                const py = star.y * k + centerY;

                if (px >= 0 && px <= width && py >= 0 && py <= height) {
                    const size = (1 - star.z / width) * 3;
                    const shade = Math.floor((1 - star.z / width) * 255);
                    
                    ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
                    ctx.beginPath();
                    ctx.arc(px, py, size, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Trail effect for speed
                    if (size > 1.5) {
                        ctx.strokeStyle = `rgba(${shade}, ${shade}, ${shade}, 0.2)`;
                        ctx.lineWidth = size;
                        ctx.beginPath();
                        ctx.moveTo(px, py);
                        ctx.lineTo(px + (px - centerX) * 0.05, py + (py - centerY) * 0.05);
                        ctx.stroke();
                    }
                }
            });

            requestAnimationFrame(animate);
        };

        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };

        const animationId = requestAnimationFrame(animate);
        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 z-0" />;
};

const App: React.FC = () => {
  const [inGame, setInGame] = useState(false);
  const [name, setName] = useState('');
  const [room, setRoom] = useState('Room-1');
  const [loading, setLoading] = useState(false);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !room.trim()) return;
    
    setLoading(true);
    // Simulate connection delay for effect
    setTimeout(() => {
        net.emit('joinRoom', room, name);
        setInGame(true);
    }, 800);
  };

  if (inGame) {
    return (
      <div className="relative w-full h-full bg-slate-900 overflow-hidden">
        <GameCanvas />
        <HUD />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden font-sans">
      {/* Background Animation */}
      <Starfield />
      
      {/* Overlay Gradient for contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-black/60 z-0 pointer-events-none" />

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-lg mx-4 perspective-1000">
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(59,130,246,0.3)] p-8 md:p-12 transform transition-all hover:scale-[1.01] duration-500 group">
            
            {/* Header */}
            <div className="text-center mb-10 relative">
                <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl" />
                <h1 className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-blue-400 tracking-tighter drop-shadow-lg mb-2">
                    SUS<span className="text-blue-500">SPACE</span>
                </h1>
                <div className="flex items-center justify-center gap-2 text-blue-200/60 font-mono text-sm tracking-widest uppercase">
                    <Globe size={14} /> Social Deduction Protocol
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleJoin} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-blue-300/80 uppercase tracking-wider ml-1">Identity</label>
                    <div className="relative group/input">
                        <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-blue-400 transition-colors" size={20} />
                        <input 
                            type="text" 
                            value={name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                            placeholder="Enter Username"
                            className="w-full bg-slate-950/50 text-white rounded-xl py-4 pl-12 pr-4 border border-white/10 focus:border-blue-500/50 focus:bg-slate-900/80 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-600 font-medium"
                            maxLength={12}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-blue-300/80 uppercase tracking-wider ml-1">Frequency Channel</label>
                    <div className="relative group/input">
                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-blue-400 transition-colors" size={20} />
                        <input 
                            type="text" 
                            value={room}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRoom(e.target.value)}
                            placeholder="Room ID"
                            className="w-full bg-slate-950/50 text-white rounded-xl py-4 pl-12 pr-4 border border-white/10 focus:border-blue-500/50 focus:bg-slate-900/80 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-600 font-medium font-mono"
                            maxLength={10}
                        />
                    </div>
                </div>

                <button 
                    type="submit"
                    disabled={!name.trim() || !room.trim() || loading}
                    className={`
                        w-full mt-4 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden group/btn
                        ${!name.trim() || !room.trim() ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] hover:scale-[1.02] active:scale-[0.98]'}
                    `}
                >
                    {loading ? (
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>INITIALIZING...</span>
                        </div>
                    ) : (
                        <>
                            <span className="relative z-10">INITIATE LAUNCH</span>
                            <ChevronRight size={20} className="relative z-10 group-hover/btn:translate-x-1 transition-transform" />
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-blue-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                        </>
                    )}
                </button>
            </form>

            <div className="mt-8 flex justify-center gap-4 text-xs text-slate-500/60 font-mono">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/> SERVER ONLINE</span>
                <span>•</span>
                <span>V 1.0.4</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default App;