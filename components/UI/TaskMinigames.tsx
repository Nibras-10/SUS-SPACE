
/// <reference lib="dom" />
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Check, Droplet, CreditCard, User, Zap, Activity } from 'lucide-react';
import { Task } from '../../types';

interface Props {
  task: Task;
  onComplete: () => void;
  onClose: () => void;
}

const COLORS = ['#ef4444', '#3b82f6', '#eab308', '#ec4899']; // Red, Blue, Yellow, Pink

// --- 1. Enhanced Wiring Minigame ---
const WiringGame: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [wires, setWires] = useState<{ left: number[], right: number[] }>({ left: [], right: [] });
  const [connections, setConnections] = useState<Record<number, number>>({}); // leftIndex -> rightIndex
  const [draggingWire, setDraggingWire] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const left = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    const right = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    setWires({ left, right });
  }, []);

  const handleMouseDown = (index: number, e: React.MouseEvent) => {
    if (connections[index] !== undefined) return;
    setDraggingWire(index);
    updateMousePos(e);
  };

  const updateMousePos = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingWire !== null) updateMousePos(e);
  };

  const handleMouseUp = () => setDraggingWire(null);

  const handleRightMouseUp = (rightIndex: number) => {
    if (draggingWire === null) return;
    
    if (wires.left[draggingWire] === wires.right[rightIndex]) {
       const newConns = { ...connections, [draggingWire]: rightIndex };
       setConnections(newConns);
       setDraggingWire(null);

       if (Object.keys(newConns).length === 4) {
         setTimeout(onComplete, 500);
       }
    } else {
       setDraggingWire(null);
    }
  };

  return (
    <div 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="relative w-[500px] h-[400px] bg-neutral-900 rounded-lg border-8 border-neutral-800 shadow-2xl overflow-hidden select-none"
    >
       {/* Background Pattern */}
       <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />

       {/* SVG Layer for Wires */}
       <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
         {/* Completed Connections */}
         {Object.entries(connections).map(([lIdx, rIdx]) => {
            const y1 = 60 + (parseInt(lIdx) * 85); 
            const y2 = 60 + (rIdx * 85);
            return (
              <path 
                key={lIdx} 
                d={`M 60 ${y1} C 200 ${y1}, 300 ${y2}, 440 ${y2}`}
                stroke={COLORS[wires.left[parseInt(lIdx)]]} 
                strokeWidth="14" 
                fill="none"
                strokeLinecap="round"
                className="drop-shadow-md"
              />
            );
         })}
         {/* Dragging Line */}
         {draggingWire !== null && (
             <path 
                d={`M 60 ${60 + (draggingWire * 85)} C 200 ${60 + (draggingWire * 85)}, ${mousePos.x - 100} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`}
                stroke={COLORS[wires.left[draggingWire]]} 
                strokeWidth="14" 
                fill="none"
                strokeLinecap="round"
                className="opacity-90"
             />
         )}
       </svg>

       {/* Left Connectors */}
       <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between py-10 pl-2 z-20">
         {wires.left.map((colorIdx, i) => (
           <div key={`l-${i}`} className="flex items-center">
             <div className="w-8 h-12 bg-neutral-800 border-2 border-neutral-600 rounded-l-md flex items-center justify-center">
                 <div className="w-2 h-8 bg-black/50 rounded-full" />
             </div>
             <div 
               onMouseDown={(e) => handleMouseDown(i, e)}
               className="w-10 h-12 rounded-r-md cursor-pointer hover:brightness-110 active:scale-95 transition-transform shadow-lg relative"
               style={{ backgroundColor: COLORS[colorIdx] }}
             >
                 {/* Connection Sparkle/Highlight */}
                 {connections[i] !== undefined && (
                     <div className="absolute right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-yellow-300 rounded-full shadow-[0_0_8px_yellow]" />
                 )}
             </div>
           </div>
         ))}
       </div>

       {/* Right Connectors */}
       <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-between py-10 pr-2 z-20">
         {wires.right.map((colorIdx, i) => (
           <div key={`r-${i}`} className="flex items-center">
             <div 
               onMouseUp={() => handleRightMouseUp(i)}
               className="w-10 h-12 rounded-l-md cursor-pointer hover:brightness-110 transition-transform shadow-lg relative"
               style={{ backgroundColor: COLORS[colorIdx] }}
             >
             </div>
             <div className="w-8 h-12 bg-neutral-800 border-2 border-neutral-600 rounded-r-md flex items-center justify-center">
                 <div className="w-2 h-8 bg-black/50 rounded-full" />
             </div>
           </div>
         ))}
       </div>
    </div>
  );
};

// --- 2. Unlock Manifolds (Numbers) ---
const ManifoldsGame: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [nextNum, setNextNum] = useState(1);
  const [buttons] = useState(() => [1,2,3,4,5,6,7,8,9,10].sort(() => Math.random() - 0.5));
  const [error, setError] = useState(false);

  const handleClick = (num: number) => {
    if (num === nextNum) {
      if (num === 10) {
        onComplete();
      } else {
        setNextNum(n => n + 1);
      }
    } else {
      setError(true);
      setNextNum(1);
      setTimeout(() => setError(false), 300);
    }
  };

  return (
    <div className="bg-slate-300 p-6 rounded-lg border-4 border-slate-500 w-full max-w-sm">
      <div className="grid grid-cols-5 gap-2">
        {buttons.map(num => {
            const isPressed = num < nextNum;
            return (
              <button
                key={num}
                disabled={isPressed}
                onClick={() => handleClick(num)}
                className={`
                  h-16 rounded font-bold text-2xl shadow-lg border-b-4 active:border-b-0 active:translate-y-1 transition-all
                  ${isPressed ? 'bg-green-500 border-green-700 text-green-900 opacity-50' : 
                    error ? 'bg-red-500 border-red-700 text-white animate-shake' : 
                    'bg-slate-100 border-slate-400 text-slate-800 hover:bg-white'}
                `}
              >
                {num}
              </button>
            )
        })}
      </div>
    </div>
  );
};

// --- 3. Download Data ---
const DownloadGame: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (uploading) {
      const interval = setInterval(() => {
        setProgress(p => {
          if (p >= 100) {
            clearInterval(interval);
            setTimeout(onComplete, 200);
            return 100;
          }
          return p + 2; // Speed
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [uploading, onComplete]);

  return (
    <div className="bg-slate-800 p-8 rounded-xl border-2 border-blue-500 w-full max-w-md text-center">
       <h2 className="text-blue-400 font-mono text-xl mb-6 animate-pulse">ESTABLISHING CONNECTION...</h2>
       
       <div className="w-full h-8 bg-slate-900 rounded-full border border-slate-600 overflow-hidden mb-8 relative">
          <div 
            className="h-full bg-blue-500 transition-all duration-75 ease-linear flex items-center justify-end px-2"
            style={{ width: `${progress}%` }}
          >
            <span className="text-[10px] text-white font-bold">{Math.floor(progress)}%</span>
          </div>
       </div>

       {!uploading ? (
         <button 
           onClick={() => setUploading(true)}
           className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded shadow-lg border-b-4 border-blue-800 active:border-0 active:translate-y-1"
         >
           DOWNLOAD
         </button>
       ) : (
         <div className="text-slate-400 font-mono text-sm">Transferring Files...</div>
       )}
    </div>
  );
};

// --- 4. Prime Shields ---
const ShieldsGame: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [hexes, setHexes] = useState<boolean[]>(() => 
        Array(7).fill(true).map(() => Math.random() > 0.5)
    );

    useEffect(() => {
        if (hexes.every(h => h)) {
            const newHexes = [...hexes];
            newHexes[Math.floor(Math.random()*7)] = false;
            setHexes(newHexes);
        }
    }, []);

    const handleClick = (idx: number) => {
        const newHexes = [...hexes];
        newHexes[idx] = true;
        setHexes(newHexes);
        
        if (newHexes.every(h => h)) {
            setTimeout(onComplete, 500);
        }
    };

    return (
        <div className="bg-slate-800 p-8 rounded-xl border-4 border-slate-600 flex flex-col items-center">
            <h2 className="text-red-400 font-bold mb-4">SHIELDS CRITICAL</h2>
            <div className="relative w-64 h-64">
                {[
                    {x: 80, y: 0}, {x: 140, y: 0},
                    {x: 50, y: 55}, {x: 110, y: 55}, {x: 170, y: 55},
                    {x: 80, y: 110}, {x: 140, y: 110}
                ].map((pos, i) => (
                    <div 
                        key={i}
                        onClick={() => handleClick(i)}
                        className={`absolute w-16 h-16 cursor-pointer transition-colors duration-300 clip-hex flex items-center justify-center
                            ${hexes[i] ? 'bg-white' : 'bg-red-600 hover:bg-red-500'}
                        `}
                        style={{ left: pos.x, top: pos.y, clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                    >
                        {hexes[i] && <div className="w-8 h-8 bg-red-100/50 rounded-full blur-md" />}
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- 5. Fuel Engines (FIXED) ---
const FuelGame: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [filled, setFilled] = useState(0);
    const [isHolding, setIsHolding] = useState(false);
    const intervalRef = useRef<any>(null);

    const startFilling = () => setIsHolding(true);
    const stopFilling = () => setIsHolding(false);

    useEffect(() => {
        if (filled >= 100) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setTimeout(onComplete, 500);
        }
    }, [filled, onComplete]);

    useEffect(() => {
        if (isHolding && filled < 100) {
            intervalRef.current = setInterval(() => {
                setFilled(prev => Math.min(prev + 1.5, 100)); // Smooth fill rate
            }, 30);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => {
             if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isHolding, filled]);

    return (
        <div className="bg-slate-300 p-8 rounded-lg border-4 border-slate-500 w-full max-w-sm flex gap-8 items-end">
            <div className="w-16 h-48 bg-slate-900 border-4 border-slate-600 relative rounded">
                <div 
                    className="absolute bottom-0 left-0 right-0 bg-yellow-500 transition-all duration-75"
                    style={{ height: `${filled}%` }}
                />
                <div className="absolute top-1/4 w-full h-0.5 bg-slate-600 opacity-50" />
                <div className="absolute top-2/4 w-full h-0.5 bg-slate-600 opacity-50" />
                <div className="absolute top-3/4 w-full h-0.5 bg-slate-600 opacity-50" />
            </div>
            
            <button
                onMouseDown={startFilling}
                onMouseUp={stopFilling}
                onMouseLeave={stopFilling}
                className={`
                    flex-1 h-32 border-b-8 active:border-b-0 active:translate-y-2 rounded-lg flex flex-col items-center justify-center select-none transition-colors
                    ${isHolding ? 'bg-slate-300 border-slate-400' : 'bg-slate-200 border-slate-400 hover:bg-slate-100'}
                `}
            >
                <Droplet size={40} className="text-slate-600 mb-2" />
                <span className="font-bold text-slate-700">HOLD</span>
            </button>
        </div>
    );
};

// --- 6. Swipe Card (UI Upgrade) ---
const SwipeCardGame: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [status, setStatus] = useState<'WAITING' | 'READING' | 'ACCEPTED' | 'TOO_FAST' | 'TOO_SLOW'>('WAITING');
    const sliderRef = useRef<HTMLDivElement>(null);
    const [dragX, setDragX] = useState(0);
    const [startTime, setStartTime] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    const handleMouseDown = () => {
        if (status === 'ACCEPTED') return;
        setIsDragging(true);
        setStartTime(Date.now());
        setStatus('READING');
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !sliderRef.current) return;
        const rect = sliderRef.current.getBoundingClientRect();
        // Limit drag to the visual track
        const x = Math.max(0, Math.min(rect.width - 100, e.clientX - rect.left - 50));
        setDragX(x);

        if (x >= rect.width - 110) {
            finishSwipe();
        }
    };

    const handleMouseUp = () => {
        if (isDragging) {
            setIsDragging(false);
            setDragX(0);
            if (status === 'READING') setStatus('WAITING');
        }
    };

    const finishSwipe = () => {
        setIsDragging(false);
        const duration = Date.now() - startTime;
        
        if (duration < 300) setStatus('TOO_FAST');
        else if (duration > 1000) setStatus('TOO_SLOW');
        else {
            setStatus('ACCEPTED');
            setTimeout(onComplete, 800);
        }
        
        setDragX(0);
    };

    return (
        <div className="bg-slate-700 p-6 rounded-lg border-4 border-slate-600 w-[500px]">
            {/* Status LEDs */}
            <div className="flex justify-between items-center mb-6 bg-slate-800 p-4 rounded-lg border-2 border-slate-600">
                <div className="font-mono text-slate-400 text-sm">
                    {status === 'WAITING' && 'PLEASE SWIPE CARD'}
                    {status === 'READING' && 'READING DATA...'}
                    {status === 'ACCEPTED' && 'ACCEPTED'}
                    {status === 'TOO_FAST' && 'TOO FAST'}
                    {status === 'TOO_SLOW' && 'TOO SLOW'}
                </div>
                <div className="flex gap-2">
                    <div className={`w-4 h-4 rounded-full ${status === 'ACCEPTED' ? 'bg-green-500 shadow-[0_0_8px_lime]' : 'bg-green-900'}`} />
                    <div className={`w-4 h-4 rounded-full ${['TOO_FAST', 'TOO_SLOW'].includes(status) ? 'bg-red-500 shadow-[0_0_8px_red]' : 'bg-red-900'}`} />
                </div>
            </div>

            {/* Reader Track */}
            <div 
                ref={sliderRef}
                className="bg-black h-32 rounded-lg relative overflow-hidden border-b-4 border-slate-900 shadow-inner"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {/* Track Guides */}
                <div className="absolute top-4 bottom-4 left-0 right-0 border-y-2 border-slate-800" />
                
                {/* ID Card */}
                <div 
                    onMouseDown={handleMouseDown}
                    className="absolute top-3 w-28 h-24 bg-sky-100 rounded-lg shadow-xl cursor-grab active:cursor-grabbing border border-sky-200 flex flex-col p-2"
                    style={{ left: dragX + 10 }}
                >
                    <div className="flex items-start gap-2">
                        <div className="w-8 h-8 bg-slate-300 rounded overflow-hidden">
                             <User size={32} className="text-slate-500 translate-y-1" />
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="h-2 bg-slate-300 rounded w-full" />
                            <div className="h-2 bg-slate-300 rounded w-2/3" />
                        </div>
                    </div>
                    <div className="mt-auto h-4 bg-amber-200 rounded-sm border border-amber-300" /> {/* Chip */}
                </div>
            </div>
        </div>
    );
};

// --- 7. Fix Lights (Switches) ---
export const FixLightsGame: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [switches, setSwitches] = useState<boolean[]>(() => Array(5).fill(false).map(() => Math.random() > 0.5));
    
    // Ensure at least one is off initially
    useEffect(() => {
        if (switches.every(s => s)) {
            const newSw = [...switches];
            newSw[0] = false;
            setSwitches(newSw);
        }
    }, []);

    const toggle = (idx: number) => {
        const newSw = [...switches];
        newSw[idx] = !newSw[idx];
        setSwitches(newSw);
        if (newSw.every(s => s)) setTimeout(onComplete, 300);
    };

    return (
        <div className="bg-slate-300 p-8 rounded border-4 border-slate-500 w-[400px]">
            <div className="flex justify-between gap-4">
                {switches.map((isOn, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isOn ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div 
                            onClick={() => toggle(i)}
                            className="w-10 h-20 bg-slate-800 rounded p-1 cursor-pointer relative shadow-inner"
                        >
                            <div className={`
                                w-full h-1/2 bg-slate-200 rounded shadow-md transition-all duration-200 absolute
                                ${isOn ? 'top-1' : 'bottom-1'}
                            `}/>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- 8. Fix Reactor (Hand Scan) ---
export const FixReactorGame: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    return (
        <div className="bg-slate-800 p-8 rounded border-4 border-slate-600 flex flex-col items-center w-[300px]">
             <h2 className="text-red-500 font-mono mb-4 animate-pulse">REACTOR CRITICAL</h2>
             <div className="w-40 h-40 bg-slate-900 border-2 border-slate-500 rounded-lg flex items-center justify-center relative overflow-hidden group">
                 <div className="absolute inset-0 bg-blue-500/10 animate-pulse pointer-events-none" />
                 <div className="grid grid-cols-4 gap-1 w-full h-full opacity-20 pointer-events-none">
                     {Array(16).fill(0).map((_, i) => <div key={i} className="bg-blue-500 rounded-sm" />)}
                 </div>
                 
                 <button 
                    onMouseDown={() => setTimeout(onComplete, 1500)}
                    className="w-32 h-32 bg-slate-700/50 rounded-full border-4 border-slate-500 flex items-center justify-center active:bg-blue-900/50 transition-colors"
                 >
                     <Activity size={48} className="text-blue-400" />
                 </button>
             </div>
             <p className="text-slate-400 mt-4 text-sm">HOLD TO STABILIZE</p>
        </div>
    );
};

// --- Main Container ---
export const TaskMinigame: React.FC<Props> = ({ task, onComplete, onClose }) => {
  const content = useMemo(() => {
    // For Fix Sabotage, task.type will be 'Fix Lights' or 'Fix Reactor'
    switch(task.type) {
        case 'Fix Wiring': return <WiringGame onComplete={onComplete} />;
        case 'Unlock Manifolds': return <ManifoldsGame onComplete={onComplete} />;
        case 'Download Data': return <DownloadGame onComplete={onComplete} />;
        case 'Prime Shields': return <ShieldsGame onComplete={onComplete} />;
        case 'Fuel Engines': return <FuelGame onComplete={onComplete} />;
        case 'Swipe Card': return <SwipeCardGame onComplete={onComplete} />;
        case 'Fix Lights': return <FixLightsGame onComplete={onComplete} />;
        case 'Fix Reactor': return <FixReactorGame onComplete={onComplete} />;
        default: return <DownloadGame onComplete={onComplete} />;
    }
  }, [task.type, onComplete]);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative flex flex-col items-center">
        <button 
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:text-red-500 transition-colors bg-slate-800 rounded-full p-2 border-2 border-slate-600"
        >
          <X size={32} />
        </button>
        
        <div className="bg-slate-800 text-white px-8 py-2 rounded-t-lg font-bold border-t-4 border-x-4 border-slate-600 translate-y-1 z-10">
            {task.type.toUpperCase()}
        </div>

        <div className="bg-slate-700 p-2 rounded-xl border-4 border-slate-600 shadow-2xl relative z-20">
            {content}
        </div>
      </div>
    </div>
  );
};
