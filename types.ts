
export enum Role {
  CREWMATE = 'CREWMATE',
  IMPOSTOR = 'IMPOSTOR',
}

export enum GameState {
  LOBBY = 'LOBBY',
  PLAYING = 'PLAYING',
  MEETING = 'MEETING',
  ENDED = 'ENDED',
}

export interface Player {
  id: string;
  name: string;
  x: number;
  y: number;
  color: number; // Hex color
  role: Role;
  isDead: boolean;
  isLocal: boolean;
  velocity: { x: number; y: number };
  killTimer: number; // Seconds remaining
  hasKey: boolean; // Keycard inventory
}

export interface DeadBody {
  id: string; // ID of the victim
  x: number;
  y: number;
  color: number;
}

export interface Task {
  id: string;
  type: string;
  completed: boolean;
  x: number;
  y: number;
}

export interface SabotageSystem {
    system: 'reactor' | 'lights' | null;
    timer: number; // Countdown for Reactor (critical) or generic
    doors: Record<string, number>; // roomId -> seconds remaining
    cooldown: number; // Global sabotage cooldown
}

export interface Room {
  id: string;
  players: Record<string, Player>;
  bodies: DeadBody[]; // Persistent bodies on the map
  tasks: Task[];
  gameState: GameState;
  winner: Role | null;
  votes: Record<string, string | null>; // voterId -> candidateId (null for skip)
  emergencyTimer: number; // Global cooldown for button
  keycardTaken: boolean; // Whether the keycard has been picked up
  taskProgress: number; // 0 to 1
  sabotage: SabotageSystem;
}

export interface ServerState extends Room {
  // Alias for backward compatibility if needed
}

// Emulation of Socket.io events
export interface ServerToClientEvents {
  'state:update': (state: ServerState) => void;
  'player:joined': (player: Player) => void;
  'player:left': (id: string) => void;
  'game:start': (role: Role, tasks: Task[]) => void;
  'player:killed': (victimId: string) => void;
  'game:over': (winner: Role) => void;
  'meeting:start': () => void;
  'meeting:end': (ejectedId: string | null) => void;
  'action:emergency': () => void;
  'player:vented': () => void;
  'sabotage:update': (sabotage: SabotageSystem) => void;
}

export interface ClientToServerEvents {
  'joinRoom': (roomId: string, name: string) => void;
  'input:move': (vector: { x: number; y: number }) => void;
  'action:kill': (targetId: string) => void;
  'action:task': (taskId: string) => void;
  'action:report': () => void;
  'action:vote': (candidateId: string | null) => void; // null for skip
  'action:emergency': () => void;
  'action:vent': () => void;
  'action:sabotage': (type: 'system' | 'door', target: string) => void;
  'action:fix': (system: 'reactor' | 'lights') => void;
}
