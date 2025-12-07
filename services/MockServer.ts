
import { Role, GameState, Player, ServerState, Task, Room, DeadBody, SabotageSystem } from '../types';
import { WALLS, MAP_WIDTH, MAP_HEIGHT, EMERGENCY_BUTTON, GATES, KEYCARD_SPAWN, VENTS, DOORS, SABOTAGE_FIX_POINTS } from '../game/mapData';

// Constants
const PLAYER_SPEED = 200;
const GHOST_SPEED = 300; // Ghosts move faster
const KILL_DISTANCE = 50; // Tuned for better gameplay
const BOT_COUNT = 4;
const PLAYER_RADIUS = 15;
const KILL_COOLDOWN = 30; // Seconds
const EMERGENCY_COOLDOWN = 45; // Seconds
const SABOTAGE_COOLDOWN = 30; // Seconds
const DOOR_DURATION = 10; // Seconds
const REACTOR_TIMEOUT = 45; // Seconds for critical failure

// Mock Server Class
class MockServer {
  // Store multiple rooms
  private rooms: Record<string, Room> = {};
  
  // Map socket/client IDs to their current room
  private clientRooms: Record<string, string> = {}; 

  private listeners: Record<string, Function[]> = {};
  private loopInterval: any;
  private lastUpdate: number = Date.now();

  constructor() {
    this.startServerLoop();
  }

  // --- Socket Simulation ---
  public on(event: string, callback: Function) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  public emit(event: string, ...args: any[]) {
    if (this.clientDispatch) {
      this.clientDispatch(event, ...args);
    }
  }

  private clientDispatch: ((event: string, ...args: any[]) => void) | null = null;

  public setClientDispatcher(fn: (event: string, ...args: any[]) => void) {
    this.clientDispatch = fn;
  }

  // --- Client -> Server Handlers ---
  public handleClientEvent(event: string, ...args: any[]) {
    switch (event) {
      case 'joinRoom':
        this.handleJoinRoom(args[0], args[1]);
        break;
      case 'input:move':
        this.handleMove(args[0]);
        break;
      case 'action:kill':
        this.handleKill(args[0]);
        break;
      case 'action:task':
        this.handleTask(args[0]);
        break;
      case 'action:report':
        this.handleReport();
        break;
      case 'action:vote':
        this.handleVote(args[0]);
        break;
      case 'action:emergency':
        this.handleEmergency();
        break;
      case 'action:vent':
        this.handleVent();
        break;
      case 'action:sabotage':
        this.handleSabotage(args[0], args[1]);
        break;
      case 'action:fix':
        this.handleFix(args[0]);
        break;
    }
  }

  // --- Game Logic ---

  private handleJoinRoom(roomId: string, name: string) {
    const localId = 'local-player';
    
    // 1. Create Room if not exists
    if (!this.rooms[roomId]) {
        this.rooms[roomId] = {
            id: roomId,
            players: {},
            bodies: [],
            tasks: [],
            gameState: GameState.LOBBY,
            winner: null,
            votes: {},
            emergencyTimer: 0,
            keycardTaken: false,
            taskProgress: 0,
            sabotage: {
                system: null,
                timer: 0,
                doors: {},
                cooldown: 10
            }
        };
        // Add bots to new rooms automatically for this demo
        this.addBotsToRoom(roomId);
    }

    const room = this.rooms[roomId];
    this.clientRooms[localId] = roomId;

    // 2. Create Local Player
    const newPlayer: Player = {
      id: localId,
      name,
      x: 1200, 
      y: 450, 
      color: 0x3b82f6, // Blue for self
      role: Role.CREWMATE,
      isDead: false,
      isLocal: true,
      velocity: { x: 0, y: 0 },
      killTimer: 0,
      hasKey: false
    };

    room.players[localId] = newPlayer;

    // 3. Emit Join Events
    this.emit('state:update', room);
    this.emit('player:joined', newPlayer);

    // Auto-start game if in lobby
    if (room.gameState === GameState.LOBBY) {
        setTimeout(() => this.startGame(roomId), 1000);
    } else {
        this.emit('game:start', newPlayer.role, room.tasks);
    }
  }

  private addBotsToRoom(roomId: string) {
      const room = this.rooms[roomId];
      for (let i = 0; i < BOT_COUNT; i++) {
        const botId = `bot-${roomId}-${i}`;
        room.players[botId] = {
            id: botId,
            name: `Bot ${i+1}`,
            x: 1200 + (Math.random() * 200 - 100),
            y: 450 + (Math.random() * 200 - 100), 
            color: Math.floor(Math.random() * 0xffffff),
            role: Role.CREWMATE,
            isDead: false,
            isLocal: false,
            velocity: { x: 0, y: 0 },
            killTimer: 0,
            hasKey: false
        };
        this.clientRooms[botId] = roomId;
      }
  }

  private startGame(roomId: string) {
    const room = this.rooms[roomId];
    if (!room) return;

    room.gameState = GameState.PLAYING;
    room.votes = {};
    room.bodies = []; // Clear bodies
    room.emergencyTimer = 15; // Initial cooldown
    room.keycardTaken = false;
    room.taskProgress = 0;
    room.sabotage = {
        system: null,
        timer: 0,
        doors: {},
        cooldown: 10
    };

    const playerIds = Object.keys(room.players);
    const impostorIndex = Math.floor(Math.random() * playerIds.length);
    
    playerIds.forEach((id, index) => {
      const p = room.players[id];
      p.role = index === impostorIndex ? Role.IMPOSTOR : Role.CREWMATE;
      p.isDead = false;
      p.x = 1200 + (Math.random() * 100 - 50);
      p.y = 450 + (Math.random() * 100 - 50);
      p.killTimer = 10; // Initial kill cooldown
      p.hasKey = false;
    });

    // Generate Tasks spread out based on Skeld Layout
    room.tasks = [
      { id: 't1', type: 'Swipe Card', completed: false, x: 1500, y: 800 }, // Admin
      { id: 't2', type: 'Fix Wiring', completed: false, x: 600, y: 1150 }, // Electrical
      { id: 't3', type: 'Download Data', completed: false, x: 1825, y: 250 }, // Weapons
      { id: 't4', type: 'Prime Shields', completed: false, x: 1950, y: 1250 }, // Shields
      { id: 't5', type: 'Fuel Engines', completed: false, x: 1200, y: 1300 }, // Storage
      { id: 't6', type: 'Unlock Manifolds', completed: false, x: 150, y: 700 }, // Reactor
    ];

    const localRole = room.players['local-player'].role;
    this.emit('game:start', localRole, room.tasks);
  }

  private handleMove(vector: { x: number; y: number }) {
    const playerId = 'local-player';
    const roomId = this.clientRooms[playerId];
    if (!roomId) return;
    const room = this.rooms[roomId];
    
    if (room.gameState === GameState.MEETING) return;

    if (room.players[playerId]) {
      room.players[playerId].velocity = vector;
    }
  }

  private handleKill(targetId: string) {
    const killerId = 'local-player';
    const roomId = this.clientRooms[killerId];
    if (!roomId) return;
    const room = this.rooms[roomId];

    const killer = room.players[killerId];
    const target = room.players[targetId];

    if (!killer || !target) return;
    if (killer.role !== Role.IMPOSTOR || killer.isDead) return;
    if (target.isDead) return;
    if (killer.killTimer > 0) return; // Cooldown Check

    const dist = Math.sqrt((killer.x - target.x) ** 2 + (killer.y - target.y) ** 2);
    if (dist <= KILL_DISTANCE * 1.5) {
       target.isDead = true;
       target.velocity = {x:0, y:0};
       killer.killTimer = KILL_COOLDOWN; // Reset Cooldown
       
       // Drop Body
       room.bodies.push({
           id: target.id,
           x: target.x,
           y: target.y,
           color: target.color
       });

       this.emit('player:killed', targetId);
       this.checkWinCondition(roomId);
    }
  }

  private handleTask(taskId: string) {
    const playerId = 'local-player';
    const roomId = this.clientRooms[playerId];
    if (!roomId) return;
    const room = this.rooms[roomId];
    if (room.gameState !== GameState.PLAYING) return;

    const task = room.tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = true;
        
        // Recalculate Progress
        const total = room.tasks.length;
        const completed = room.tasks.filter(t => t.completed).length;
        room.taskProgress = completed / total;

        this.checkWinCondition(roomId);
    }
  }

  private handleReport() {
    const playerId = 'local-player';
    const roomId = this.clientRooms[playerId];
    if (!roomId) return;
    const room = this.rooms[roomId];

    if (room.gameState === GameState.PLAYING) {
        this.startMeeting(room);
    }
  }

  private handleEmergency() {
      const playerId = 'local-player';
      const roomId = this.clientRooms[playerId];
      if (!roomId) return;
      const room = this.rooms[roomId];
      const player = room.players[playerId];

      if (room.gameState !== GameState.PLAYING) return;
      if (player.isDead) return;
      if (room.emergencyTimer > 0) return;
      if (room.sabotage.system) return; // Cannot call emergency during crisis

      const dist = Math.sqrt((player.x - EMERGENCY_BUTTON.x)**2 + (player.y - EMERGENCY_BUTTON.y)**2);
      // Increased range to allow pressing from around the table
      if (dist < 130) {
          this.startMeeting(room);
      }
  }

  private handleSabotage(type: 'system' | 'door', target: string) {
      const playerId = 'local-player';
      const roomId = this.clientRooms[playerId];
      if (!roomId) return;
      const room = this.rooms[roomId];
      const player = room.players[playerId];

      if (room.gameState !== GameState.PLAYING) return;
      if (player.role !== Role.IMPOSTOR || player.isDead) return;

      if (type === 'system') {
          if (room.sabotage.system || room.sabotage.cooldown > 0) return;
          room.sabotage.system = target as 'reactor' | 'lights';
          room.sabotage.timer = target === 'reactor' ? REACTOR_TIMEOUT : 0;
          room.sabotage.cooldown = SABOTAGE_COOLDOWN;
      } else if (type === 'door') {
          if (room.sabotage.doors[target]) return; // Already closed
          room.sabotage.doors[target] = DOOR_DURATION;
      }
      this.emit('sabotage:update', room.sabotage);
  }

  private handleFix(system: 'reactor' | 'lights') {
      const playerId = 'local-player';
      const roomId = this.clientRooms[playerId];
      if (!roomId) return;
      const room = this.rooms[roomId];
      const player = room.players[playerId];

      if (room.gameState !== GameState.PLAYING || player.isDead) return;
      if (room.sabotage.system !== system) return;

      // Check distance to fix point
      let valid = false;
      if (system === 'lights') {
          const dist = Math.sqrt((player.x - SABOTAGE_FIX_POINTS.lights.x)**2 + (player.y - SABOTAGE_FIX_POINTS.lights.y)**2);
          if (dist < 60) valid = true;
      } else if (system === 'reactor') {
          const dist1 = Math.sqrt((player.x - SABOTAGE_FIX_POINTS.reactor_top.x)**2 + (player.y - SABOTAGE_FIX_POINTS.reactor_top.y)**2);
          const dist2 = Math.sqrt((player.x - SABOTAGE_FIX_POINTS.reactor_bot.x)**2 + (player.y - SABOTAGE_FIX_POINTS.reactor_bot.y)**2);
          if (dist1 < 60 || dist2 < 60) valid = true;
      }

      if (valid) {
          room.sabotage.system = null;
          room.sabotage.timer = 0;
          this.emit('sabotage:update', room.sabotage);
      }
  }

  private handleVent() {
      const playerId = 'local-player';
      const roomId = this.clientRooms[playerId];
      if (!roomId) return;
      const room = this.rooms[roomId];
      const player = room.players[playerId];

      if (room.gameState !== GameState.PLAYING) return;
      if (player.isDead || player.role !== Role.IMPOSTOR) return;

      // Find closest vent
      let closestVent = null;
      let minDist = 100; // Activation range

      for (const vent of VENTS) {
          const dist = Math.sqrt((player.x - vent.x)**2 + (player.y - vent.y)**2);
          if (dist < minDist) {
              minDist = dist;
              closestVent = vent;
          }
      }

      if (closestVent) {
          const nextVent = VENTS.find(v => v.id === closestVent.next);
          if (nextVent) {
              player.x = nextVent.x;
              player.y = nextVent.y;
              player.velocity = { x: 0, y: 0 };
              this.emit('player:vented'); // Notify clients to play sound/anim
          }
      }
  }

  private startMeeting(room: Room) {
      room.gameState = GameState.MEETING;
      room.votes = {};
      room.bodies = []; // Bodies are cleared on meeting start
      
      // Reset Sabotages
      room.sabotage.system = null;
      room.sabotage.timer = 0;
      room.sabotage.doors = {};

      // Teleport everyone to safe spots around the Cafeteria Table
      let counter = 0;
      Object.values(room.players).forEach((p) => {
          p.velocity = {x:0, y:0};
          if (!p.isDead) {
            const isLeft = counter % 2 === 0;
            const offsetX = Math.random() * 100;
            const offsetY = Math.random() * 150;
            
            if (isLeft) {
                p.x = 950 + offsetX; // Left of table
            } else {
                p.x = 1350 + offsetX; // Right of table
            }
            p.y = 250 + offsetY; // Vertical spread
            counter++;
          }
      });

      this.emit('meeting:start');
  }

  private handleVote(candidateId: string | null) {
      const playerId = 'local-player';
      const roomId = this.clientRooms[playerId];
      if (!roomId) return;
      const room = this.rooms[roomId];

      if (room.gameState !== GameState.MEETING) return;
      if (room.players[playerId].isDead) return;
      if (room.votes[playerId]) return;

      room.votes[playerId] = candidateId;
      this.checkVoteEnd(room);
  }

  private checkVoteEnd(room: Room) {
      const alivePlayers = Object.values(room.players).filter(p => !p.isDead);
      const totalVotes = Object.keys(room.votes).length;

      if (totalVotes >= alivePlayers.length) {
          // Tally votes
          const counts: Record<string, number> = {};
          Object.values(room.votes).forEach(v => {
              if (v) counts[v] = (counts[v] || 0) + 1;
          });

          let maxVotes = 0;
          let ejectedId: string | null = null;
          let tie = false;

          for (const [pid, count] of Object.entries(counts)) {
              if (count > maxVotes) {
                  maxVotes = count;
                  ejectedId = pid;
                  tie = false;
              } else if (count === maxVotes) {
                  tie = true;
              }
          }

          if (tie) ejectedId = null;

          if (ejectedId) {
              const ejected = room.players[ejectedId];
              ejected.isDead = true;
          }

          this.emit('meeting:end', ejectedId);
          
          setTimeout(() => {
              room.gameState = GameState.PLAYING;
              room.votes = {};
              room.emergencyTimer = EMERGENCY_COOLDOWN;
              
              Object.values(room.players).forEach(p => {
                  p.killTimer = KILL_COOLDOWN;
              });

              this.checkWinCondition(room.id);
          }, 3000);
      }
  }

  private checkWinCondition(roomId: string) {
    const room = this.rooms[roomId];
    if (!room) return;
    const alivePlayers = Object.values(room.players).filter(p => !p.isDead);
    const impostors = alivePlayers.filter(p => p.role === Role.IMPOSTOR);
    const crewmates = alivePlayers.filter(p => p.role === Role.CREWMATE);

    if (impostors.length >= crewmates.length) {
      this.emit('game:over', Role.IMPOSTOR);
      room.gameState = GameState.ENDED;
    } else if (impostors.length === 0) {
      this.emit('game:over', Role.CREWMATE);
      room.gameState = GameState.ENDED;
    } else if (room.taskProgress >= 1) { // 100% Tasks
      this.emit('game:over', Role.CREWMATE);
      room.gameState = GameState.ENDED;
    }
  }

  // --- Server Loop (Tick) ---
  private startServerLoop() {
    this.loopInterval = setInterval(() => {
      const now = Date.now();
      const dt = (now - this.lastUpdate) / 1000;
      this.lastUpdate = now;

      Object.values(this.rooms).forEach(room => {
          // Decrement Timers
          if (room.gameState === GameState.PLAYING) {
              if (room.emergencyTimer > 0) room.emergencyTimer = Math.max(0, room.emergencyTimer - dt);
              
              // Sabotage Logic
              if (room.sabotage.cooldown > 0) room.sabotage.cooldown = Math.max(0, room.sabotage.cooldown - dt);
              
              if (room.sabotage.system === 'reactor') {
                  room.sabotage.timer -= dt;
                  if (room.sabotage.timer <= 0) {
                      this.emit('game:over', Role.IMPOSTOR);
                      room.gameState = GameState.ENDED;
                  }
              }

              // Update Door Timers
              for (const [doorId, time] of Object.entries(room.sabotage.doors)) {
                  room.sabotage.doors[doorId] = time - dt;
                  if (room.sabotage.doors[doorId] <= 0) {
                      delete room.sabotage.doors[doorId];
                  }
              }
              
              Object.values(room.players).forEach(p => {
                  if (p.killTimer > 0) p.killTimer = Math.max(0, p.killTimer - dt);
                  
                  // Keycard Pickup Logic
                  if (!p.isDead && !room.keycardTaken && !p.hasKey && p.role === Role.CREWMATE) {
                      const dist = Math.sqrt((p.x - KEYCARD_SPAWN.x)**2 + (p.y - KEYCARD_SPAWN.y)**2);
                      if (dist < KEYCARD_SPAWN.r + PLAYER_RADIUS) {
                          p.hasKey = true;
                          room.keycardTaken = true;
                      }
                  }
              });

              this.updatePhysics(room, dt);
              this.updateBots(room, dt);
          } else if (room.gameState === GameState.MEETING) {
              this.updateMeetingBots(room);
          }

          if (this.clientRooms['local-player'] === room.id) {
              this.emit('state:update', {
                players: room.players,
                bodies: room.bodies,
                tasks: room.tasks,
                gameState: room.gameState,
                winner: null,
                id: room.id,
                votes: room.votes,
                emergencyTimer: room.emergencyTimer,
                keycardTaken: room.keycardTaken,
                taskProgress: room.taskProgress,
                sabotage: room.sabotage
              });
          }
      });

    }, 1000 / 30);
  }

  private updatePhysics(room: Room, dt: number) {
    Object.values(room.players).forEach(p => {
        // Dead players (ghosts) can still move
        const speed = p.isDead ? GHOST_SPEED : PLAYER_SPEED;
        
        let nextX = p.x + p.velocity.x * speed * dt;
        let nextY = p.y + p.velocity.y * speed * dt;

        if (this.isValidPosition(nextX, p.y, p, room)) p.x = nextX;
        if (this.isValidPosition(p.x, nextY, p, room)) p.y = nextY;

        p.x = Math.max(20, Math.min(MAP_WIDTH - 20, p.x));
        p.y = Math.max(20, Math.min(MAP_HEIGHT - 20, p.y));
    });
  }

  private isValidPosition(x: number, y: number, player: Player, room: Room): boolean {
      // 0. Ghosts (Dead players) ignore walls (Wall-hack)
      if (player.isDead) return true;

      // 1. Check Walls (Global Blocker)
      for (const wall of WALLS) {
          if (x + PLAYER_RADIUS > wall.x && 
              x - PLAYER_RADIUS < wall.x + wall.w && 
              y + PLAYER_RADIUS > wall.y && 
              y - PLAYER_RADIUS < wall.y + wall.h) {
              return false;
          }
      }

      // 2. Check Security Gates
      for (const gate of GATES) {
          if (x + PLAYER_RADIUS > gate.x && 
              x - PLAYER_RADIUS < gate.x + gate.w && 
              y + PLAYER_RADIUS > gate.y && 
              y - PLAYER_RADIUS < gate.y + gate.h) {
              if (player.role === Role.IMPOSTOR) return true;
              if (player.hasKey) return true;
              return false;
          }
      }

      // 3. Check Sabotaged Doors
      for (const door of DOORS) {
          if (room.sabotage.doors[door.roomId]) {
              if (x + PLAYER_RADIUS > door.x && 
                  x - PLAYER_RADIUS < door.x + door.w && 
                  y + PLAYER_RADIUS > door.y && 
                  y - PLAYER_RADIUS < door.y + door.h) {
                  return false; // Impostors also blocked by physical doors
              }
          }
      }

      return true;
  }

  private updateBots(room: Room, dt: number) {
    Object.values(room.players).forEach(p => {
        if (p.isLocal) return; // Dead bots should still move randomly if we want 'ghost bots'

        if (Math.random() < 0.02) {
             const angle = Math.random() * Math.PI * 2;
             p.velocity = { x: Math.cos(angle), y: Math.sin(angle) };
        }
        if (Math.random() < 0.01) p.velocity = { x: 0, y: 0 };
    });
  }

  private updateMeetingBots(room: Room) {
      Object.values(room.players).forEach(p => {
          if (!p.isLocal && !p.isDead && !room.votes[p.id]) {
              if (Math.random() < 0.01) {
                  const candidates = Object.values(room.players).filter(c => !c.isDead);
                  const choice = candidates[Math.floor(Math.random() * candidates.length)];
                  room.votes[p.id] = choice.id;
                  this.checkVoteEnd(room);
              }
          }
      });
  }
}

export const serverInstance = new MockServer();
