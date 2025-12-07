
/// <reference lib="dom" />
import React, { useState, useEffect, useRef } from 'react';
import { net } from '../../services/Network';
import { Role, ServerState, GameState, Player, Task, SabotageSystem } from '../../types';
import { Skull, CheckCircle, Map as MapIcon, AlertTriangle, X, Megaphone, User, Key, Wind, Ghost, Zap, DoorClosed } from 'lucide-react';
import { WALLS, MAP_WIDTH, MAP_HEIGHT, ROOMS, ZONES, EMERGENCY_BUTTON, SABOTAGE_FIX_POINTS, DOORS } from '../../game/mapData';
import { TaskMinigame } from './TaskMinigames';
import { soundManager } from '../../services/SoundManager';

export const HUD: React.FC = () => {
  const [role, setRole] = useState<Role | null>(null);
  const [gameState, setGameState] = useState<GameState>(GameState.LOBBY);
  const [nearbyTarget, setNearbyTarget] = useState<string | null>(null);
  const [nearbyTask, setNearbyTask] = useState<string | null>(null);
  const [canReport, setCanReport] = useState(false);
  const [isDead, setIsDead] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskProgress, setTaskProgress] = useState(0);
  const [gameResult, setGameResult] = useState<Role | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [showSabotageMap, setShowSabotageMap] = useState(false);
  
  // Active Task for Minigame
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Cooldowns & Emergency
  const [killTimer, setKillTimer] = useState(0);
  const [emergencyTimer, setEmergencyTimer] = useState(0);
  const [canCallEmergency, setCanCallEmergency] = useState(false);
  
  // Sabotage State
  const [sabotage, setSabotage] = useState<SabotageSystem>({ system: null, timer: 0, doors: {}, cooldown: 0 });
  const [canFixSabotage, setCanFixSabotage] = useState<'lights' | 'reactor' | null>(null);

  // Meeting State
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [votes, setVotes] = useState<Record<string, string | null>>({});
  const [myVote, setMyVote] = useState<string | null>(null);
  const [ejected, setEjected] = useState<string | null>(null);

  // Inventory & Notification
  const [showKeyToast, setShowKeyToast] = useState(false);
  const toastShownRef = useRef(false);
  
  // Track previous game state to trigger sounds on change
  const prevGameState = useRef<GameState>(GameState.LOBBY);

  // Ambience Control (Disabled based on request)
  useEffect(() => {
    // soundManager.startAmbience(); removed
    return () => {
        // soundManager.stopAmbience(); removed
    }
  }, [gameState]);

  useEffect(() => {
    const handleUpdate = (state: ServerState) => {
      const me = state.players['local-player'];
      if (!me) return;

      setIsDead(me.isDead);
      setRole(me.role);
      setGameState(state.gameState);
      setTasks(state.tasks);
      setTaskProgress(state.taskProgress || 0);
      setPlayers(state.players);
      setVotes(state.votes || {});
      setKillTimer(Math.ceil(me.killTimer));
      setEmergencyTimer(Math.ceil(state.emergencyTimer));
      setSabotage(state.sabotage);
      
      // Meeting Sound
      if (state.gameState === GameState.MEETING && prevGameState.current !== GameState.MEETING) {
          soundManager.playEmergency();
      }
      prevGameState.current = state.gameState;

      // Trigger toast only once when key is acquired
      if (me.hasKey && !toastShownRef.current) {
           toastShownRef.current = true;
           setShowKeyToast(true);
           setTimeout(() => setShowKeyToast(false), 2000);
           soundManager.playTaskComplete(); // Key pickup sound
      }

      if (state.gameState === GameState.PLAYING) {
        // Kill Check
        if (me.role === Role.IMPOSTOR && !me.isDead) {
            let foundTarget = null;
            for (const pid in state.players) {
            if (pid === 'local-player') continue;
            const p = state.players[pid];
            if (p.isDead || p.role === Role.IMPOSTOR) continue;
            const dist = Math.sqrt((me.x - p.x) ** 2 + (me.y - p.y) ** 2);
            if (dist < 80) foundTarget = pid;
            }
            setNearbyTarget(foundTarget);
        }

        // Task Check
        if (!me.isDead && me.role === Role.CREWMATE) {
            let foundTask = null;
            for (const t of state.tasks) {
            if (t.completed) continue;
            const dist = Math.sqrt((me.x - t.x) ** 2 + (me.y - t.y) ** 2);
            if (dist < 60) foundTask = t.id;
            }
            setNearbyTask(foundTask);
        }

        // Sabotage Fix Check
        if (!me.isDead && state.sabotage.system) {
            let fixType = null;
            if (state.sabotage.system === 'lights') {
                const dist = Math.sqrt((me.x - SABOTAGE_FIX_POINTS.lights.x)**2 + (me.y - SABOTAGE_FIX_POINTS.lights.y)**2);
                if (dist < 80) fixType = 'lights';
            } else if (state.sabotage.system === 'reactor') {
                const dist1 = Math.sqrt((me.x - SABOTAGE_FIX_POINTS.reactor_top.x)**2 + (me.y - SABOTAGE_FIX_POINTS.reactor_top.y)**2);
                const dist2 = Math.sqrt((me.x - SABOTAGE_FIX_POINTS.reactor_bot.x)**2 + (me.y - SABOTAGE_FIX_POINTS.reactor_bot.y)**2);
                if (dist1 < 80 || dist2 < 80) fixType = 'reactor';
            }
            setCanFixSabotage(fixType as any);
        } else {
            setCanFixSabotage(null);
        }

        // Emergency Button Check
        const distBtn = Math.sqrt((me.x - EMERGENCY_BUTTON.x)**2 + (me.y - EMERGENCY_BUTTON.y)**2);
        // Range increased to 130 to match server logic for table accessibility
        setCanCallEmergency(distBtn < 130);

        // Report Body Check
        let bodyFound = false;
        if (state.bodies && state.bodies.length > 0) {
            state.bodies.forEach(b => {
                 const dist = Math.sqrt((me.x - b.x) ** 2 + (me.y - b.y) ** 2);
                 if (dist < 80) bodyFound = true;
            });
        }
        setCanReport(bodyFound);
      } else {
          setNearbyTarget(null);
          setNearbyTask(null);
          setCanReport(false);
          setCanCallEmergency(false);
          // Close UI on state change
          setActiveTask(null);
          setShowMap(false);
          setShowSabotageMap(false);
      }
    };

    const handleGameOver = (winner: Role) => {
      setGameResult(winner);
      setShowMap(false);
      setShowSabotageMap(false);
      setActiveTask(null);
    };

    const handleMeetingEnd = (ejectedId: string | null) => {
        setEjected(ejectedId);
        setTimeout(() => setEjected(null), 3000);
        setMyVote(null);
    };

    net.on('state:update', handleUpdate);
    net.on('game:over', handleGameOver);
    net.on('meeting:end', handleMeetingEnd);

    return () => {
      net.off('state:update', handleUpdate);
      net.off('game:over', handleGameOver);
      net.off('meeting:end', handleMeetingEnd);
    };
  }, []);

  const handleKill = () => {
    if (nearbyTarget && killTimer <= 0) {
      net.emit('action:kill', nearbyTarget);
      setNearbyTarget(null);
    }
  };

  const handleTaskOpen = () => {
    if (nearbyTask) {
        const task = tasks.find(t => t.id === nearbyTask);
        if (task) {
            setActiveTask(task);
        }
    }
  };

  const handleFixOpen = () => {
      if (canFixSabotage) {
          // Fake task object for the minigame component
          setActiveTask({
              id: 'sabotage-fix',
              type: canFixSabotage === 'reactor' ? 'Fix Reactor' : 'Fix Lights',
              completed: false,
              x: 0, y: 0
          });
      }
  };

  const handleTaskComplete = () => {
      if (activeTask) {
          if (activeTask.id === 'sabotage-fix') {
              // Fix logic
              if (canFixSabotage) net.emit('action:fix', canFixSabotage);
          } else {
              net.emit('action:task', activeTask.id);
          }
          soundManager.playTaskComplete();
          setActiveTask(null);
          setNearbyTask(null);
          setCanFixSabotage(null);
      }
  };

  const handleEmergency = () => {
      if (canCallEmergency && emergencyTimer <= 0) {
          net.emit('action:emergency');
      }
  }

  const handleReport = () => {
      net.emit('action:report');
  };

  const handleVote = (candidateId: string | null) => {
      if (myVote) return;
      net.emit('action:vote', candidateId);
      setMyVote(candidateId || 'skip');
  };
  
  const handleVent = () => {
      net.emit('action:vent');
  };

  const handleSabotage = (type: 'system' | 'door', target: string) => {
      net.emit('action:sabotage', type, target);
      // Don't close map immediately to allow multiple door sabotages or confirmation
      // setShowSabotageMap(false); 
  };

  if (gameResult) {
      return (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
              <div className="text-center p-8 bg-slate-800 rounded-xl border-4 border-slate-600">
                  <h1 className={`text-6xl font-black mb-4 ${gameResult === Role.IMPOSTOR ? 'text-red-500' : 'text-blue-500'}`}>
                      {gameResult === Role.IMPOSTOR ? 'IMPOSTORS WIN' : 'CREWMATES WIN'}
                  </h1>
                  <button 
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded font-bold"
                  >
                      Play Again
                  </button>
              </div>
          </div>
      )
  }

  // Task Minigame Overlay
  if (activeTask) {
      return (
          <TaskMinigame 
            task={activeTask} 
            onComplete={handleTaskComplete} 
            onClose={() => setActiveTask(null)} 
          />
      );
  }

  // Meeting UI
  if (gameState === GameState.MEETING) {
      return (
          <div className="absolute inset-0 z-50 bg-slate-900/95 flex items-center justify-center p-4">
              <div className="w-full max-w-4xl">
                  <h1 className="text-4xl font-black text-red-500 text-center mb-8 uppercase tracking-widest animate-pulse">Emergency Meeting</h1>
                  
                  {ejected !== null && (
                      <div className="absolute inset-0 bg-black flex items-center justify-center z-50">
                          <h2 className="text-4xl text-white font-bold">
                              {ejected ? `${players[ejected]?.name} was ejected.` : "No one was ejected (Tie)."}
                          </h2>
                      </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                      {Object.values(players).map(p => {
                          const hasVoted = Object.keys(votes).includes(p.id);
                          const isMe = p.id === 'local-player';
                          
                          return (
                              <div key={p.id} className={`
                                flex items-center justify-between p-4 rounded-lg border-2 
                                ${p.isDead ? 'opacity-50 bg-slate-800 border-slate-700' : 'bg-slate-700 border-slate-600'}
                              `}>
                                  <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full border-2 border-black" style={{backgroundColor: '#' + p.color.toString(16).padStart(6,'0')}} />
                                      <div>
                                        <div className="font-bold text-white">{p.name} {isMe && '(You)'}</div>
                                        <div className="text-xs text-slate-400">{p.isDead ? 'DEAD' : 'ALIVE'}</div>
                                      </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                      {hasVoted && !p.isDead && (
                                          <div className="bg-green-500 text-xs text-black font-bold px-2 py-1 rounded">VOTED</div>
                                      )}
                                      {!isDead && !myVote && !p.isDead && (
                                          <button 
                                            onClick={() => handleVote(p.id)}
                                            className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded font-bold text-sm"
                                          >
                                              VOTE
                                          </button>
                                      )}
                                  </div>
                              </div>
                          )
                      })}
                  </div>
                  
                  <div className="mt-8 flex justify-center">
                      <button 
                        disabled={!!myVote || isDead}
                        onClick={() => handleVote(null)}
                        className="bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-bold text-xl"
                      >
                          SKIP VOTE
                      </button>
                  </div>
              </div>
          </div>
      )
  }

  // Helper for Sabotage Status Text
  const getSabotageText = () => {
      if (sabotage.system === 'reactor') return `REACTOR FAILURE IN ${Math.ceil(sabotage.timer)}s`;
      if (sabotage.system === 'lights') return 'LIGHTS SABOTAGED';
      return null;
  };
  const warningText = getSabotageText();

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10">
      
      {/* GLOBAL TASK PROGRESS BAR */}
      <div className="absolute top-4 left-4 right-4 h-6 pointer-events-auto z-50 flex justify-center">
          <div className="w-full max-w-2xl bg-slate-800 border-2 border-slate-600 rounded-full overflow-hidden relative shadow-lg">
               <div 
                  className="h-full bg-green-500 transition-all duration-500 ease-out"
                  style={{ width: `${taskProgress * 100}%` }}
               />
               <div className="absolute inset-0 flex items-center justify-center">
                   <span className="text-xs font-bold text-white drop-shadow-md">TOTAL TASKS COMPLETED</span>
               </div>
          </div>
      </div>
      
      {/* SABOTAGE WARNINGS */}
      {warningText && (
          <div className="absolute top-16 left-0 right-0 flex justify-center animate-pulse">
              <div className="bg-red-600/90 text-white px-6 py-2 rounded border-2 border-red-400 flex items-center gap-2">
                  <AlertTriangle className="animate-bounce" />
                  <span className="font-bold uppercase">
                      {warningText}
                  </span>
              </div>
          </div>
      )}

      {/* Sabotage Map Overlay */}
      {showSabotageMap && role === Role.IMPOSTOR && (
          <div className="absolute inset-0 z-40 bg-red-900/50 flex items-center justify-center p-8 pointer-events-auto">
              <div className="relative bg-slate-800 border-4 border-red-600 rounded-lg p-2 w-full h-full max-w-5xl max-h-[80vh] overflow-hidden flex flex-col">
                  <div className="flex justify-between items-center mb-2 px-2 bg-red-900/50 p-2 rounded">
                      <h2 className="text-2xl font-bold text-white uppercase tracking-widest">SABOTAGE MAP</h2>
                      <div className="text-red-200 font-mono text-sm">GLOBAL COOLDOWN: {Math.ceil(sabotage.cooldown)}s</div>
                      <button onClick={() => setShowSabotageMap(false)} className="text-white hover:text-red-500"><X size={32}/></button>
                  </div>
                  
                  <div className="flex-1 relative bg-slate-900 border border-slate-700 w-full h-full">
                    {/* Simplified Map */}
                    <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className="w-full h-full bg-[#1e293b]">
                        {ZONES.map((z, i) => (
                             <rect key={`z-${i}`} x={z.x} y={z.y} width={z.w} height={z.h} fill="#475569" opacity="0.5" />
                        ))}
                        {WALLS.map((w, i) => (
                            <rect key={`w-${i}`} x={w.x} y={w.y} width={w.w} height={w.h} fill="#1e293b" />
                        ))}
                        
                        {/* Door Buttons (Dynamic from DOORS map data) */}
                        {DOORS.map((door) => {
                            const isClosed = (sabotage.doors[door.roomId] || 0) > 0;
                            const timeLeft = Math.ceil(sabotage.doors[door.roomId] || 0);
                            const cx = door.x + door.w / 2;
                            const cy = door.y + door.h / 2;
                            
                            return (
                                <g 
                                    key={door.id} 
                                    onClick={() => !isClosed && handleSabotage('door', door.roomId)} 
                                    className={`${isClosed ? 'cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}`}
                                >
                                    <circle cx={cx} cy={cy} r="25" fill={isClosed ? "#7f1d1d" : "#334155"} stroke={isClosed ? "red" : "white"} strokeWidth="2" />
                                    {/* Using foreignObject to render Lucide icon inside SVG */}
                                    <foreignObject x={cx - 15} y={cy - 15} width="30" height="30" className="pointer-events-none">
                                        <div className="w-full h-full flex items-center justify-center">
                                            <DoorClosed size={24} color={isClosed ? "red" : "white"} />
                                        </div>
                                    </foreignObject>
                                    {isClosed && (
                                         <text x={cx} y={cy + 5} textAnchor="middle" fill="white" fontWeight="bold" fontSize="14" stroke="black" strokeWidth="2">{timeLeft}</text>
                                    )}
                                </g>
                            )
                        })}

                        {/* System Buttons (Reactor & Lights) */}
                        <g 
                            onClick={() => !sabotage.system && sabotage.cooldown <= 0 && handleSabotage('system', 'reactor')} 
                            className={`
                                ${sabotage.system === 'reactor' ? 'animate-pulse' : ''}
                                ${sabotage.cooldown > 0 && !sabotage.system ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-110 transition-transform'}
                            `}
                        >
                            <circle cx="125" cy="700" r="50" fill={sabotage.system === 'reactor' ? "#ef4444" : "#334155"} stroke="white" strokeWidth="3" />
                            <foreignObject x="95" y="670" width="60" height="60" className="pointer-events-none">
                                <div className="w-full h-full flex items-center justify-center">
                                    <Zap size={32} color={sabotage.system === 'reactor' ? "yellow" : "white"} />
                                </div>
                            </foreignObject>
                            {sabotage.system === 'reactor' && (
                                <text x="125" y="770" textAnchor="middle" fill="red" fontWeight="bold" fontSize="20" stroke="black" strokeWidth="2">{Math.ceil(sabotage.timer)}s</text>
                            )}
                        </g>

                        <g 
                            onClick={() => !sabotage.system && sabotage.cooldown <= 0 && handleSabotage('system', 'lights')} 
                            className={`
                                ${sabotage.system === 'lights' ? 'animate-pulse' : ''}
                                ${sabotage.cooldown > 0 && !sabotage.system ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-110 transition-transform'}
                            `}
                        >
                            <circle cx="700" cy="1050" r="50" fill={sabotage.system === 'lights' ? "#fbbf24" : "#334155"} stroke="white" strokeWidth="3" />
                            <foreignObject x="670" y="1020" width="60" height="60" className="pointer-events-none">
                                <div className="w-full h-full flex items-center justify-center">
                                    <Zap size={32} color={sabotage.system === 'lights' ? "black" : "white"} />
                                </div>
                            </foreignObject>
                        </g>

                    </svg>
                  </div>
              </div>
          </div>
      )}

      {/* Normal Map Overlay */}
      {showMap && !showSabotageMap && (
          <div className="absolute inset-0 z-40 bg-black/80 flex items-center justify-center p-8 pointer-events-auto">
              <div className="relative bg-slate-800 border-4 border-slate-600 rounded-lg p-2 w-full h-full max-w-5xl max-h-[80vh] overflow-hidden flex flex-col">
                  <div className="flex justify-between items-center mb-2 px-2">
                      <h2 className="text-2xl font-bold text-white uppercase tracking-widest">Tactical Map</h2>
                      <button onClick={() => setShowMap(false)} className="text-white hover:text-red-500"><X size={32}/></button>
                  </div>
                  
                  <div className="flex-1 relative bg-slate-900 border border-slate-700 w-full h-full">
                    {/* SVG Map Renderer */}
                    <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className="w-full h-full bg-[#1e293b]">
                        {ZONES.map((z, i) => (
                             <rect key={`z-${i}`} x={z.x} y={z.y} width={z.w} height={z.h} fill={`#${z.color.toString(16).padStart(6,'0')}`} opacity="0.5" />
                        ))}
                        {WALLS.map((w, i) => (
                            <rect key={`w-${i}`} x={w.x} y={w.y} width={w.w} height={w.h} fill="#475569" stroke="#000" strokeWidth="5" />
                        ))}
                        {ROOMS.map((r, i) => (
                            <text key={`r-${i}`} x={r.x} y={r.y} fill="#94a3b8" fontSize="40" textAnchor="middle" fontWeight="bold">{r.name}</text>
                        ))}
                        {/* Emergency Button Marker */}
                        <circle cx={EMERGENCY_BUTTON.x} cy={EMERGENCY_BUTTON.y} r="20" fill="red" stroke="white" strokeWidth="2" />

                        {tasks.filter(t => !t.completed).map(t => (
                            <circle key={`t-${t.id}`} cx={t.x} cy={t.y} r="30" fill="#facc15" stroke="white" strokeWidth="5">
                                <animate attributeName="r" values="30;40;30" dur="1s" repeatCount="indefinite" />
                            </circle>
                        ))}
                        
                        {Object.values(players).map(p => {
                            if (p.isDead) return null;
                            return (
                                <g key={p.id}>
                                    <circle 
                                        cx={p.x} 
                                        cy={p.y} 
                                        r="30" 
                                        fill={`#${p.color.toString(16).padStart(6,'0')}`} 
                                        stroke="white" 
                                        strokeWidth="4" 
                                    />
                                    {(p.velocity.x !== 0 || p.velocity.y !== 0) && (
                                        <line 
                                            x1={p.x} 
                                            y1={p.y} 
                                            x2={p.x + p.velocity.x * 50} 
                                            y2={p.y + p.velocity.y * 50} 
                                            stroke="white" 
                                            strokeWidth="4" 
                                            strokeLinecap="round"
                                        />
                                    )}
                                    <text x={p.x} y={p.y - 40} fill="white" fontSize="30" textAnchor="middle" fontWeight="bold" stroke="black" strokeWidth="1">
                                        {p.name}
                                    </text>
                                </g>
                            )
                        })}
                    </svg>
                  </div>
              </div>
          </div>
      )}

      {/* Top Bar (Left Side Info) */}
      <div className="flex justify-between items-start pointer-events-auto mt-8">
        <div className="flex gap-4">
            <div className="bg-slate-900/80 text-white p-4 rounded-lg border border-slate-700 min-w-[200px]">
                <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                    {role === Role.IMPOSTOR ? (
                        <span className="text-red-500 flex items-center gap-1"><Skull size={20}/> Impostor</span>
                    ) : (
                        <span className="text-blue-400 flex items-center gap-1"><CheckCircle size={20}/> Crewmate</span>
                    )}
                </h2>
                <div className="space-y-1">
                    <p className="text-xs text-slate-400 uppercase font-semibold">Your Tasks</p>
                    {tasks.map(t => (
                        <div key={t.id} className={`flex items-center gap-2 text-sm ${t.completed ? 'text-green-500' : 'text-white'}`}>
                            <div className={`w-2 h-2 rounded-full ${t.completed ? 'bg-green-500' : 'bg-yellow-500'}`} />
                            {t.type}
                        </div>
                    ))}
                </div>
            </div>
            
            {showKeyToast && (
                 <div id="key-toast" className="bg-yellow-600/80 text-white p-2 rounded-lg border border-yellow-500 flex items-center gap-2 animate-bounce h-fit">
                     <Key size={24} />
                     <span className="font-bold text-sm">KEYCARD ACQUIRED</span>
                 </div>
            )}
        </div>

        {isDead && (
            <div className="bg-slate-800/80 text-slate-300 px-3 py-1 rounded-full font-bold flex items-center gap-2 border border-slate-600">
                <Ghost size={16} />
                YOU ARE A GHOST
            </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end items-end gap-4 pb-8 pr-8 pointer-events-auto">
        
        <button
            onClick={() => setShowMap(!showMap)}
            className="w-20 h-20 rounded-full bg-slate-700 border-4 border-slate-600 text-white flex flex-col items-center justify-center hover:bg-slate-600 hover:scale-105 active:scale-95 transition-all shadow-lg"
        >
            <MapIcon size={28} className="mb-1" />
            <span className="text-xs font-bold">MAP</span>
        </button>

        {role === Role.IMPOSTOR && (
            <button
                disabled={isDead}
                onClick={() => setShowSabotageMap(!showSabotageMap)}
                className="w-20 h-20 rounded-full bg-red-800 border-4 border-red-600 text-white flex flex-col items-center justify-center hover:bg-red-700 hover:scale-105 active:scale-95 transition-all shadow-lg"
            >
                <Zap size={28} className="mb-1" />
                <span className="text-xs font-bold">SABOTAGE</span>
            </button>
        )}
        
        {role === Role.IMPOSTOR && (
            <button
                disabled={isDead}
                onClick={handleVent}
                className="w-20 h-20 rounded-full bg-slate-700 border-4 border-slate-600 text-white flex flex-col items-center justify-center hover:bg-slate-600 hover:scale-105 active:scale-95 transition-all shadow-lg"
            >
                <Wind size={28} className="mb-1" />
                <span className="text-xs font-bold">VENT</span>
            </button>
        )}

        <button
            disabled={!canReport || isDead}
            onClick={handleReport}
            className={`
                w-20 h-20 rounded-full flex flex-col items-center justify-center border-4 font-black text-sm tracking-wider transition-all
                ${canReport && !isDead
                    ? 'bg-red-600 border-red-400 text-white animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.6)] hover:scale-105 active:scale-95' 
                    : 'bg-slate-700 border-slate-600 text-slate-500 opacity-50 cursor-not-allowed'}
            `}
        >
            <Megaphone size={28} className="mb-1" />
            <span className="text-xs font-bold">REPORT</span>
        </button>

        {role === Role.IMPOSTOR && (
            <button
                disabled={(!nearbyTarget && killTimer > 0) || isDead}
                onClick={handleKill}
                className={`
                    w-24 h-24 rounded-full flex flex-col items-center justify-center border-4 font-black text-sm tracking-wider transition-all relative overflow-hidden
                    ${nearbyTarget && killTimer <= 0 && !isDead
                        ? 'bg-red-600 border-red-400 text-white shadow-[0_0_20px_rgba(220,38,38,0.6)] hover:scale-105 active:scale-95' 
                        : 'bg-slate-700 border-slate-600 text-slate-500 opacity-50 cursor-not-allowed'}
                `}
            >
                {/* Cooldown Overlay */}
                {killTimer > 0 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 text-white font-mono text-2xl font-bold">
                        {killTimer}s
                    </div>
                )}
                <Skull size={32} className="mb-1" />
                KILL
            </button>
        )}

        {/* Unified USE / EMERGENCY / FIX Button */}
        {role && (
            <button
                disabled={(!nearbyTask && !canCallEmergency && !canFixSabotage) || isDead || (canCallEmergency && emergencyTimer > 0)}
                onClick={canCallEmergency ? handleEmergency : (canFixSabotage ? handleFixOpen : handleTaskOpen)}
                className={`
                    w-24 h-24 rounded-full flex flex-col items-center justify-center border-4 font-black text-sm tracking-wider transition-all relative overflow-hidden
                    ${canCallEmergency && !isDead && emergencyTimer <= 0
                        ? 'bg-red-600 border-red-400 text-white animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.6)]'
                        : canFixSabotage && !isDead
                             ? 'bg-red-500 border-red-400 text-white animate-bounce shadow-[0_0_20px_rgba(220,38,38,0.6)]'
                             : nearbyTask && !isDead
                                ? 'bg-yellow-500 border-yellow-300 text-black shadow-[0_0_20px_rgba(234,179,8,0.6)] hover:scale-105 active:scale-95' 
                                : 'bg-slate-700 border-slate-600 text-slate-500 opacity-50 cursor-not-allowed'}
                `}
            >
                 {canCallEmergency && emergencyTimer > 0 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 text-white font-mono text-2xl font-bold">
                        {emergencyTimer}s
                    </div>
                )}
                <AlertTriangle size={32} className="mb-1" />
                {canCallEmergency ? 'EMERGENCY' : (canFixSabotage ? 'FIX' : 'USE')}
            </button>
        )}
      </div>
    </div>
  );
};
