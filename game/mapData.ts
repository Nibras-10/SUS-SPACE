
export const MAP_WIDTH = 2400;
export const MAP_HEIGHT = 1600;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Zone extends Rect {
  color: number;
  texture: 'plate' | 'hazard' | 'tile' | 'grate' | 'carpet' | 'admin' | 'reactor';
}

export interface RoomLabel {
  name: string;
  x: number;
  y: number;
}

export interface Vent {
  id: string;
  x: number;
  y: number;
  next: string; // ID of the linked vent
}

export interface DoorDef extends Rect {
    id: string;
    roomId: string; // ID of the room this door blocks
}

// Coordinate for the button (Cafeteria Table)
export const EMERGENCY_BUTTON = { x: 1200, y: 300, r: 40 };

// Keycard Spawn Location (Admin Room)
export const KEYCARD_SPAWN = { x: 1550, y: 750, r: 20 };

// Sabotage Fix Locations
export const SABOTAGE_FIX_POINTS = {
    lights: { x: 700, y: 1050, r: 50 }, // Electrical
    reactor_top: { x: 125, y: 350, r: 50 }, // Reactor Top
    reactor_bot: { x: 125, y: 1000, r: 50 }, // Reactor Bottom
    oxygen_admin: { x: 1575, y: 800, r: 40 }, // Admin
    oxygen_corridor: { x: 1850, y: 700, r: 40 } // O2 Room
};

// Doors (Block gaps in walls)
export const DOORS: DoorDef[] = [
    // Cafeteria Bottom (Gap at 1150-1250)
    { id: 'door_cafe', roomId: 'Cafeteria', x: 1150, y: 500, w: 100, h: 20 },
    // Storage Top (Gap at 1150-1250)
    { id: 'door_storage_top', roomId: 'Storage', x: 1150, y: 950, w: 100, h: 20 },
    // Storage Right (Gap at 1400-1450 height) -> Actually wall gap logic is vertical there.
    // Let's stick to simple horizontal doors for now for visual clarity
    // MedBay (Gap at 850, y:450-550... wait vertical door)
    { id: 'door_medbay', roomId: 'MedBay', x: 850, y: 400, w: 20, h: 200 },
    // Security (Right side)
    { id: 'door_security', roomId: 'Security', x: 700, y: 600, w: 20, h: 200 },
    // Electrical (Top)
    { id: 'door_electrical', roomId: 'Electrical', x: 550, y: 900, w: 300, h: 20 },
];

// --- VENTS (Spaced Out) ---
export const VENTS: Vent[] = [
    // Left Loop (Reactor - Engines)
    { id: 'v_reactor_upper', x: 80, y: 520, next: 'v_upper_eng' },
    { id: 'v_upper_eng', x: 380, y: 220, next: 'v_lower_eng' }, // Top right of upper eng
    { id: 'v_lower_eng', x: 380, y: 1180, next: 'v_reactor_lower' }, // Bottom right of lower eng
    { id: 'v_reactor_lower', x: 80, y: 880, next: 'v_reactor_upper' },

    // Middle Left Loop (Security - MedBay - Elec)
    { id: 'v_sec', x: 680, y: 720, next: 'v_med' },
    { id: 'v_med', x: 850, y: 550, next: 'v_elec' },
    { id: 'v_elec', x: 550, y: 950, next: 'v_sec' },

    // Right Side (Cafeteria - Admin - Corridor)
    { id: 'v_cafe', x: 1500, y: 250, next: 'v_corridor' },
    { id: 'v_corridor', x: 1650, y: 550, next: 'v_admin' },
    { id: 'v_admin', x: 1500, y: 850, next: 'v_cafe' },
    
    // Far Right Loop (Nav - Shields - Weapons)
    { id: 'v_nav_1', x: 2250, y: 650, next: 'v_shields' },
    { id: 'v_shields', x: 1850, y: 1250, next: 'v_nav_2' },
    { id: 'v_nav_2', x: 2250, y: 850, next: 'v_weapons' },
    { id: 'v_weapons', x: 1950, y: 250, next: 'v_nav_1' },
];

// Security Gates (Laser Barriers)
// Located at the entrances to Storage (Top) and Shields (Hallway)
export const GATES: Rect[] = [
    // Storage Top Entrance (Main)
    { x: 1150, y: 950, w: 100, h: 50 }, 
];

// --- SKELD MAP ZONES (Floor Areas) ---
export const ZONES: Zone[] = [
  // 1. Cafeteria (Top Center)
  { x: 850, y: 100, w: 700, h: 400, color: 0x334155, texture: 'plate' }, 
  
  // 2. MedBay (Left of Cafe)
  { x: 650, y: 400, w: 200, h: 200, color: 0x0ea5e9, texture: 'tile' },

  // 3. Upper Engine (Far Left Top)
  { x: 200, y: 200, w: 250, h: 300, color: 0x64748b, texture: 'plate' },

  // 4. Reactor (Far Left Center)
  { x: 50, y: 500, w: 150, h: 400, color: 0x0f172a, texture: 'reactor' },

  // 5. Security (Left Center)
  { x: 450, y: 600, w: 250, h: 200, color: 0xf59e0b, texture: 'tile' },

  // 6. Lower Engine (Far Left Bottom)
  { x: 200, y: 900, w: 250, h: 300, color: 0x64748b, texture: 'plate' },

  // 7. Electrical (Left Bottom)
  { x: 550, y: 900, w: 300, h: 300, color: 0xf59e0b, texture: 'hazard' },

  // 8. Storage (Bottom Center) - The Hub
  { x: 950, y: 1000, w: 500, h: 400, color: 0xd97706, texture: 'grate' },

  // 9. Admin (Center Right)
  { x: 1450, y: 700, w: 250, h: 200, color: 0x10b981, texture: 'admin' },

  // 10. Communications (Bottom Right)
  { x: 1500, y: 1200, w: 250, h: 200, color: 0x3b82f6, texture: 'tile' },

  // 11. Shields (Far Bottom Right)
  { x: 1800, y: 1050, w: 300, h: 300, color: 0xef4444, texture: 'grate' },

  // 12. Navigation (Far Right Center)
  { x: 2150, y: 600, w: 200, h: 300, color: 0x8b5cf6, texture: 'carpet' },

  // 13. O2 (Right Corridor)
  { x: 1750, y: 600, w: 200, h: 200, color: 0x94a3b8, texture: 'plate' },

  // 14. Weapons (Top Right)
  { x: 1700, y: 150, w: 350, h: 300, color: 0xef4444, texture: 'tile' },

  // --- CORRIDORS ---
  // Reactor Spine
  { x: 100, y: 400, w: 100, h: 600, color: 0x1e293b, texture: 'plate' },
  // Upper/Medbay Hall
  { x: 450, y: 350, w: 200, h: 100, color: 0x1e293b, texture: 'plate' },
  // Lower/Elec Hall
  { x: 450, y: 950, w: 100, h: 150, color: 0x1e293b, texture: 'plate' },
  // Vertical Main Hall (Medbay -> Elec -> Storage)
  { x: 800, y: 600, w: 100, h: 400, color: 0x1e293b, texture: 'plate' },
  // Cafe -> Admin Hall
  { x: 1250, y: 500, w: 100, h: 200, color: 0x1e293b, texture: 'plate' },
  // Storage -> Admin Hall
  { x: 1150, y: 900, w: 100, h: 100, color: 0x1e293b, texture: 'plate' },
  // Admin -> Right Hall
  { x: 1600, y: 500, w: 150, h: 700, color: 0x1e293b, texture: 'plate' },
  // Nav -> Shields Hall
  { x: 2050, y: 700, w: 100, h: 500, color: 0x1e293b, texture: 'plate' },
  // Weapons -> Cafe Hall
  { x: 1550, y: 250, w: 150, h: 100, color: 0x1e293b, texture: 'plate' },
];

export const WALLS: Rect[] = [
    // -- MAP BOUNDARIES --
    { x: 0, y: 0, w: 2400, h: 50 }, // Top
    { x: 0, y: 1550, w: 2400, h: 50 }, // Bottom
    { x: 0, y: 0, w: 50, h: 1600 }, // Left
    { x: 2350, y: 0, w: 50, h: 1600 }, // Right

    // -- CAFETERIA WALLS --
    { x: 850, y: 100, w: 700, h: 50 }, // Top
    { x: 850, y: 500, w: 300, h: 50 }, // Bottom Left
    { x: 1250, y: 500, w: 300, h: 50 }, // Bottom Right (Gap at 1150-1250)
    { x: 1100, y: 250, w: 200, h: 100 }, // Table Obstacle

    // -- STORAGE WALLS --
    // CRITICAL FIX: Left a gap at x:1150, w:100 for the GATE
    { x: 950, y: 950, w: 200, h: 50 }, // Top Left
    { x: 1250, y: 950, w: 200, h: 50 }, // Top Right
    
    { x: 950, y: 950, w: 50, h: 450 }, // Left
    { x: 1400, y: 950, w: 50, h: 450 }, // Right
    { x: 950, y: 1350, w: 500, h: 50 }, // Bottom

    // -- ADMIN --
    { x: 1450, y: 700, w: 250, h: 50 }, // Top
    { x: 1450, y: 900, w: 250, h: 50 }, // Bottom
    { x: 1700, y: 700, w: 50, h: 250 }, // Right

    // -- ELECTRICAL --
    { x: 550, y: 900, w: 300, h: 50 }, // Top
    { x: 850, y: 900, w: 50, h: 300 }, // Right Wall

    // -- SECURITY --
    { x: 450, y: 600, w: 250, h: 50 }, // Top
    { x: 450, y: 800, w: 300, h: 50 }, // Bottom
    { x: 700, y: 600, w: 50, h: 200 }, // Right

    // -- MEDBAY --
    { x: 650, y: 400, w: 200, h: 50 }, // Top
    { x: 650, y: 600, w: 200, h: 50 }, // Bottom

    // -- REACTOR/ENGINES BLOCK (Modified for Access) --
    { x: 150, y: 150, w: 50, h: 200 }, // Top block (Ends at 350, Gap 350-450)
    { x: 150, y: 450, w: 50, h: 500 }, // Middle block (Ends at 950, Gap 950-1100)
    { x: 150, y: 1100, w: 50, h: 250 }, // Bottom block

    // -- WEAPONS --
    { x: 1700, y: 150, w: 50, h: 300 }, // Left
    { x: 1700, y: 450, w: 350, h: 50 }, // Bottom

    // -- SHIELDS --
    { x: 1800, y: 1050, w: 50, h: 300 }, // Left
    { x: 1800, y: 1050, w: 300, h: 50 }, // Top
];

export const ROOMS: RoomLabel[] = [
  { name: 'Cafeteria', x: 1200, y: 300 },
  { name: 'Weapons', x: 1875, y: 300 },
  { name: 'Navigation', x: 2250, y: 750 },
  { name: 'O2', x: 1850, y: 700 },
  { name: 'Shields', x: 1950, y: 1200 },
  { name: 'Comms', x: 1625, y: 1300 },
  { name: 'Admin', x: 1575, y: 800 },
  { name: 'Storage', x: 1200, y: 1200 },
  { name: 'Electrical', x: 700, y: 1050 },
  { name: 'Lower Eng', x: 325, y: 1050 },
  { name: 'Security', x: 575, y: 700 },
  { name: 'MedBay', x: 750, y: 500 },
  { name: 'Upper Eng', x: 325, y: 350 },
  { name: 'Reactor', x: 125, y: 700 },
];
