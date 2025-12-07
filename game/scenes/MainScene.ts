
import Phaser from 'phaser';
import { net } from '../../services/Network';
import { Player, Role, ServerState, Task, GameState, SabotageSystem } from '../../types';
import { WALLS, MAP_WIDTH, MAP_HEIGHT, ROOMS, ZONES, EMERGENCY_BUTTON, GATES, KEYCARD_SPAWN, VENTS, DOORS } from '../mapData';
import { soundManager } from '../../services/SoundManager';

interface Edge {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

export class MainScene extends Phaser.Scene {
  private players: Map<string, Phaser.GameObjects.Container> = new Map();
  private deadBodies: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
      up: Phaser.Input.Keyboard.Key;
      down: Phaser.Input.Keyboard.Key;
      left: Phaser.Input.Keyboard.Key;
      right: Phaser.Input.Keyboard.Key;
  };
  private keyV!: Phaser.Input.Keyboard.Key;
  
  // Use 'declare' to avoid overwriting base properties
  declare public physics: Phaser.Physics.Arcade.ArcadePhysics;
  declare public add: Phaser.GameObjects.GameObjectFactory;
  declare public cameras: Phaser.Cameras.Scene2D.CameraManager;
  declare public input: Phaser.Input.InputPlugin;
  declare public make: Phaser.GameObjects.GameObjectCreator;
  declare public scene: Phaser.Scenes.ScenePlugin;
  declare public tweens: Phaser.Tweens.TweenManager;
  declare public time: Phaser.Time.Clock;

  private localPlayerId: string = 'local-player';
  private tasks: Phaser.GameObjects.Arc[] = [];
  private killEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private isMeeting: boolean = false;
  
  private lastInput = { x: 0, y: 0 };
  private lastStepTime = 0;

  // Visual elements
  private keycardSprite!: Phaser.GameObjects.Sprite;
  private gates: Phaser.GameObjects.Rectangle[] = [];
  private ghostViewLayer!: Phaser.GameObjects.Rectangle;
  
  // Sabotage Elements
  private doorSprites: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private darknessLayer!: Phaser.GameObjects.Graphics;
  private lightsSabotaged: boolean = false;
  private redAlarmOverlay!: Phaser.GameObjects.Rectangle;

  // Vision / Shadow Casting
  private wallEdges: Edge[] = [];
  private visionMaskShape!: Phaser.GameObjects.Graphics;
  private visionMask!: Phaser.Display.Masks.GeometryMask;

  constructor() {
    super('MainScene');
  }

  preload() {
    try {
      this.generateHighFidelityTextures();
      this.generateObjectTextures();
    } catch (e) {
      console.error("Failed to generate textures:", e);
    }
  }

  private generateHighFidelityTextures() {
    // 1. Sci-Fi Floor Plate (General)
    const plateCanvas = this.make.graphics({ x: 0, y: 0 }, false);
    plateCanvas.fillStyle(0x334155); 
    plateCanvas.fillRect(0, 0, 64, 64);
    for(let i=0; i<50; i++) {
        plateCanvas.fillStyle(0x475569, Math.random() * 0.5);
        plateCanvas.fillRect(Math.random()*64, Math.random()*64, 2, 2);
    }
    plateCanvas.lineStyle(2, 0x1e293b); 
    plateCanvas.strokeRect(0, 0, 64, 64);
    plateCanvas.lineStyle(1, 0x64748b); 
    plateCanvas.beginPath();
    plateCanvas.moveTo(0, 64); plateCanvas.lineTo(0,0); plateCanvas.lineTo(64,0);
    plateCanvas.strokePath();
    plateCanvas.fillStyle(0x94a3b8);
    [4, 60].forEach(x => [4, 60].forEach(y => plateCanvas.fillCircle(x, y, 2)));
    plateCanvas.generateTexture('tex_plate', 64, 64);
    plateCanvas.destroy();

    // 2. Hazard Floor
    const hazCanvas = this.make.graphics({ x: 0, y: 0 }, false);
    hazCanvas.fillStyle(0xfacc15); 
    hazCanvas.fillRect(0, 0, 64, 64);
    hazCanvas.fillStyle(0x1a1a1a); 
    for(let i=-64; i<128; i+=16) {
        hazCanvas.beginPath();
        hazCanvas.moveTo(i, 0);
        hazCanvas.lineTo(i+8, 0);
        hazCanvas.lineTo(i-56, 64);
        hazCanvas.lineTo(i-64, 64);
        hazCanvas.closePath();
        hazCanvas.fill();
    }
    hazCanvas.fillStyle(0x000000, 0.1);
    for(let i=0; i<100; i++) {
        hazCanvas.fillCircle(Math.random()*64, Math.random()*64, 1);
    }
    hazCanvas.lineStyle(2, 0x000000);
    hazCanvas.strokeRect(0,0,64,64);
    hazCanvas.generateTexture('tex_hazard', 64, 64);
    hazCanvas.destroy();

    // 3. MedBay Tile
    const tileCanvas = this.make.graphics({ x: 0, y: 0 }, false);
    tileCanvas.fillStyle(0xe0f2fe); 
    tileCanvas.fillRect(0, 0, 64, 64);
    tileCanvas.fillStyle(0xffffff);
    tileCanvas.fillRect(2, 2, 60, 60);
    tileCanvas.fillStyle(0xffffff, 0.4);
    tileCanvas.fillEllipse(15, 15, 20, 10);
    tileCanvas.lineStyle(1, 0xbae6fd); 
    tileCanvas.strokeRect(0,0,64,64);
    tileCanvas.generateTexture('tex_tile', 64, 64);
    tileCanvas.destroy();

    // 4. Cargo Grate
    const grateCanvas = this.make.graphics({ x: 0, y: 0 }, false);
    grateCanvas.fillStyle(0x0f172a); 
    grateCanvas.fillRect(0, 0, 64, 64);
    grateCanvas.lineStyle(2, 0x475569); 
    for(let i=0; i<=64; i+=8) {
        grateCanvas.lineBetween(i, 0, i, 64);
        grateCanvas.lineBetween(0, i, 64, i);
    }
    grateCanvas.lineStyle(4, 0x334155);
    grateCanvas.strokeRect(0,0,64,64);
    grateCanvas.generateTexture('tex_grate', 64, 64);
    grateCanvas.destroy();

    // 5. Admin Carpet
    const carpCanvas = this.make.graphics({ x: 0, y: 0 }, false);
    carpCanvas.fillStyle(0x1e1b4b); 
    carpCanvas.fillRect(0, 0, 64, 64);
    carpCanvas.fillStyle(0x312e81, 0.3);
    for(let i=0; i<200; i++) {
        carpCanvas.fillRect(Math.random()*64, Math.random()*64, 1, 1);
    }
    carpCanvas.lineStyle(1, 0x4338ca, 0.2);
    carpCanvas.strokeRect(4,4,56,56);
    carpCanvas.generateTexture('tex_carpet', 64, 64);
    carpCanvas.destroy();

    // 6. Reactor Grid
    const reactCanvas = this.make.graphics({ x: 0, y: 0 }, false);
    reactCanvas.fillStyle(0x020617);
    reactCanvas.fillRect(0,0,64,64);
    reactCanvas.lineStyle(2, 0x3b82f6); 
    reactCanvas.beginPath();
    reactCanvas.moveTo(32, 4);
    reactCanvas.lineTo(56, 16);
    reactCanvas.lineTo(56, 48);
    reactCanvas.lineTo(32, 60);
    reactCanvas.lineTo(8, 48);
    reactCanvas.lineTo(8, 16);
    reactCanvas.closePath();
    reactCanvas.strokePath();
    reactCanvas.fillStyle(0x3b82f6, 0.2);
    reactCanvas.fillCircle(32,32, 10);
    reactCanvas.generateTexture('tex_reactor', 64, 64);
    reactCanvas.destroy();
  }

  private generateObjectTextures() {
    // Living Crewmate
    const crewG = this.make.graphics({ x: 0, y: 0 }, false);
    crewG.fillStyle(0xffffff);
    crewG.fillRoundedRect(0, 10, 15, 30, 4);
    crewG.fillRoundedRect(10, 0, 40, 50, 15);
    crewG.generateTexture('crew_body', 60, 50);
    crewG.destroy();
    
    // Dead Body
    const deadG = this.make.graphics({x:0, y:0}, false);
    deadG.fillStyle(0xffffff); 
    deadG.fillRoundedRect(10, 25, 40, 25, 10); 
    deadG.fillRoundedRect(0, 35, 15, 15, 4); 
    deadG.fillStyle(0xdc2626); 
    deadG.fillEllipse(30, 25, 30, 10);
    deadG.fillStyle(0xffffff); 
    deadG.fillRoundedRect(25, 5, 10, 25, 4);
    deadG.fillCircle(25, 5, 6);
    deadG.fillCircle(35, 5, 6);
    deadG.generateTexture('crew_dead', 60, 50);
    deadG.destroy();
    
    // Visor
    const visorG = this.make.graphics({x:0, y:0}, false);
    visorG.fillStyle(0x7dd3fc);
    visorG.fillRoundedRect(0, 0, 24, 14, 6);
    visorG.lineStyle(2, 0x0ea5e9);
    visorG.strokeRoundedRect(0, 0, 24, 14, 6);
    visorG.generateTexture('crew_visor', 24, 14);
    visorG.destroy();

    // Vent
    const ventG = this.make.graphics({x:0, y:0}, false);
    ventG.fillStyle(0x475569);
    ventG.fillRoundedRect(0, 0, 60, 40, 4);
    ventG.lineStyle(2, 0x1e293b);
    ventG.strokeRoundedRect(0, 0, 60, 40, 4);
    ventG.fillStyle(0x0f172a);
    for(let i=10; i<60; i+=10) {
        ventG.fillRect(i, 5, 4, 30);
    }
    ventG.generateTexture('obj_vent', 60, 40);
    ventG.destroy();

    // Console
    const conG = this.make.graphics({x:0, y:0}, false);
    conG.fillStyle(0xcbd5e1);
    conG.fillRect(0, 0, 80, 40);
    conG.fillStyle(0x1e293b);
    conG.fillRect(10, 5, 60, 25);
    conG.fillStyle(0x10b981);
    conG.fillRect(15, 10, 10, 15);
    conG.fillStyle(0xef4444);
    conG.fillCircle(60, 15, 3);
    conG.fillCircle(50, 25, 3);
    conG.generateTexture('obj_console', 80, 40);
    conG.destroy();

    // Emergency Button
    const btnG = this.make.graphics({x:0, y:0}, false);
    btnG.fillStyle(0x94a3b8);
    btnG.fillCircle(20, 20, 20);
    btnG.fillStyle(0xdc2626);
    btnG.fillCircle(20, 20, 15);
    btnG.fillStyle(0xffffff, 0.5);
    btnG.fillCircle(16, 16, 5);
    btnG.generateTexture('obj_button', 40, 40);
    btnG.destroy();

    // Keycard
    const keyG = this.make.graphics({x:0, y:0}, false);
    keyG.fillStyle(0xf59e0b);
    keyG.fillRoundedRect(0, 0, 24, 36, 4);
    keyG.fillStyle(0xffffff);
    keyG.fillRect(4, 24, 16, 8);
    keyG.generateTexture('obj_keycard', 24, 36);
    keyG.destroy();

    // Particles
    const bloodG = this.make.graphics({x:0, y:0}, false);
    bloodG.fillStyle(0xff0000);
    bloodG.fillCircle(4, 4, 4);
    bloodG.generateTexture('blood', 8, 8);
    bloodG.destroy();
  }

  create() {
    try {
        this.physics.world.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
        this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
        
        // Background
        this.add.tileSprite(MAP_WIDTH/2, MAP_HEIGHT/2, MAP_WIDTH, MAP_HEIGHT, 'tex_plate').setAlpha(0.2).setTint(0x000000).setScrollFactor(0.2);

        this.buildVisionEdges();

        // Floor Zones
        ZONES.forEach(zone => {
            let tex = 'tex_plate';
            if (zone.texture === 'hazard') tex = 'tex_hazard';
            if (zone.texture === 'tile') tex = 'tex_tile';
            if (zone.texture === 'grate') tex = 'tex_grate';
            if (zone.texture === 'carpet') tex = 'tex_carpet';
            if (zone.texture === 'admin') tex = 'tex_tile';
            if (zone.texture === 'reactor') tex = 'tex_reactor';

            const tile = this.add.tileSprite(zone.x + zone.w/2, zone.y + zone.h/2, zone.w, zone.h, tex);
            
            if (zone.texture === 'hazard') tile.setAlpha(0.9);
            else if (zone.texture === 'plate') tile.setTint(0xcccccc);
            else if (zone.texture === 'carpet') tile.setAlpha(1.0);
            else tile.setAlpha(1);

            const border = this.add.rectangle(zone.x + zone.w/2, zone.y + zone.h/2, zone.w, zone.h);
            border.setStrokeStyle(4, 0x000000, 0.5);
        });

        this.renderDecorations();
        
        // Vents
        VENTS.forEach(v => {
            this.add.sprite(v.x, v.y, 'obj_vent').setDepth(2).setAlpha(0.9);
        });

        // Walls
        const wallGraphics = this.add.graphics();
        wallGraphics.fillStyle(0x000000, 0.6);
        WALLS.forEach(wall => {
            wallGraphics.fillRect(wall.x + 10, wall.y + 10, wall.w, wall.h);
        });
        WALLS.forEach(wall => {
            wallGraphics.fillStyle(0x475569); 
            wallGraphics.fillRect(wall.x, wall.y, wall.w, wall.h);
            wallGraphics.fillStyle(0x64748b);
            wallGraphics.fillRect(wall.x, wall.y, wall.w, 10);
            wallGraphics.fillStyle(0x334155); 
            wallGraphics.fillRect(wall.x, wall.y + wall.h - 15, wall.w, 15);
            wallGraphics.lineStyle(2, 0x0f172a);
            wallGraphics.strokeRect(wall.x, wall.y, wall.w, wall.h);
        });

        // Room Labels
        ROOMS.forEach(room => {
            this.add.text(room.x, room.y, room.name, {
                fontSize: '32px',
                fontFamily: 'Impact, sans-serif',
                color: '#e2e8f0',
            })
            .setOrigin(0.5)
            .setAlpha(0.4)
            .setBlendMode(Phaser.BlendModes.ADD);
        });

        // Gates
        GATES.forEach(gate => {
            const g = this.add.rectangle(gate.x + gate.w/2, gate.y + gate.h/2, gate.w, gate.h, 0xff0000, 0.4);
            g.setStrokeStyle(2, 0xff0000);
            this.tweens.add({
                targets: g,
                alpha: 0.6,
                duration: 500,
                yoyo: true,
                repeat: -1
            });
            this.gates.push(g);
        });

        // Doors
        DOORS.forEach(door => {
            const d = this.add.rectangle(door.x + door.w/2, door.y + door.h/2, door.w, door.h, 0x576574);
            d.setStrokeStyle(2, 0x2d3436);
            const stripes = this.add.graphics();
            stripes.lineStyle(2, 0x2d3436, 0.5);
            if (door.w > door.h) {
                for(let i=0; i<door.w; i+=10) stripes.lineBetween(door.x + i, door.y, door.x + i, door.y + door.h);
            } else {
                for(let i=0; i<door.h; i+=10) stripes.lineBetween(door.x, door.y + i, door.x + door.w, door.y + i);
            }
            d.setVisible(false);
            d.setDepth(15);
            this.doorSprites.set(door.roomId, d);
        });

        // Emergency Button
        const btn = this.add.sprite(EMERGENCY_BUTTON.x, EMERGENCY_BUTTON.y, 'obj_button');
        btn.setDepth(10);
        this.tweens.add({
            targets: btn,
            scale: 1.1,
            duration: 1000,
            yoyo: true,
            repeat: -1
        });

        // Keycard
        this.keycardSprite = this.add.sprite(KEYCARD_SPAWN.x, KEYCARD_SPAWN.y, 'obj_keycard');
        this.keycardSprite.setDepth(15);
        this.tweens.add({
            targets: this.keycardSprite,
            y: KEYCARD_SPAWN.y - 10,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Layers
        this.ghostViewLayer = this.add.rectangle(MAP_WIDTH/2, MAP_HEIGHT/2, MAP_WIDTH, MAP_HEIGHT, 0x64748b, 0.2);
        this.ghostViewLayer.setDepth(100).setVisible(false).setBlendMode(Phaser.BlendModes.MULTIPLY);

        this.darknessLayer = this.add.graphics();
        this.darknessLayer.setDepth(90);
        this.darknessLayer.setVisible(false);
        
        this.visionMaskShape = this.make.graphics({});
        this.visionMask = this.visionMaskShape.createGeometryMask();
        this.visionMask.setInvertAlpha(true);
        this.darknessLayer.setMask(this.visionMask);

        this.redAlarmOverlay = this.add.rectangle(MAP_WIDTH/2, MAP_HEIGHT/2, MAP_WIDTH, MAP_HEIGHT, 0xff0000, 0.2);
        this.redAlarmOverlay.setDepth(95).setVisible(false).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
            targets: this.redAlarmOverlay,
            alpha: 0.05,
            duration: 500,
            yoyo: true,
            repeat: -1
        });

        this.killEmitter = this.add.particles(0, 0, 'blood', {
            lifespan: 1000,
            speed: { min: 50, max: 200 },
            scale: { start: 1, end: 0 },
            quantity: 20,
            emitting: false
        });

        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.wasd = this.input.keyboard.addKeys({
                up: Phaser.Input.Keyboard.KeyCodes.W,
                down: Phaser.Input.Keyboard.KeyCodes.S,
                left: Phaser.Input.Keyboard.KeyCodes.A,
                right: Phaser.Input.Keyboard.KeyCodes.D
            }) as any;
            this.keyV = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.V);
        }

        net.on('state:update', (state: ServerState) => this.handleStateUpdate(state));
        net.on('player:killed', (id: string) => {
            soundManager.playKill();
            const player = this.players.get(id);
            if (player) this.killEmitter.explode(30, player.x, player.y);
        });
        net.on('player:vented', () => {
            soundManager.playVent();
        });
        net.on('sabotage:update', (sabotage: SabotageSystem) => {
            if (sabotage.system === 'reactor') soundManager.playEmergency();
        });
        net.on('game:over', () => this.scene.pause());

    } catch (error) {
        console.error("Error creating scene:", error);
    }
  }

  private buildVisionEdges() {
      this.wallEdges = [];
      this.wallEdges.push({x1: 0, y1: 0, x2: MAP_WIDTH, y2: 0});
      this.wallEdges.push({x1: MAP_WIDTH, y1: 0, x2: MAP_WIDTH, y2: MAP_HEIGHT});
      this.wallEdges.push({x1: MAP_WIDTH, y1: MAP_HEIGHT, x2: 0, y2: MAP_HEIGHT});
      this.wallEdges.push({x1: 0, y1: MAP_HEIGHT, x2: 0, y2: 0});

      WALLS.forEach(w => {
          this.wallEdges.push({x1: w.x, y1: w.y, x2: w.x + w.w, y2: w.y}); 
          this.wallEdges.push({x1: w.x + w.w, y1: w.y, x2: w.x + w.w, y2: w.y + w.h}); 
          this.wallEdges.push({x1: w.x + w.w, y1: w.y + w.h, x2: w.x, y2: w.y + w.h}); 
          this.wallEdges.push({x1: w.x, y1: w.y + w.h, x2: w.x, y2: w.y}); 
      });
  }

  private renderDecorations() {
      ROOMS.forEach(room => {
          if (['Admin', 'Navigation', 'Security', 'Weapons', 'Shields'].includes(room.name)) {
             this.add.sprite(room.x, room.y + 60, 'obj_console').setDepth(10);
          }
          if (room.name === 'Cafeteria') {
              this.add.circle(room.x - 200, room.y + 100, 40, 0x94a3b8).setDepth(1);
              this.add.circle(room.x + 200, room.y + 100, 40, 0x94a3b8).setDepth(1);
          }
      });
  }

  update() {
    this.handleInput();
  }

  private handleInput() {
    if (!this.wasd || !this.cursors) return;
    if (this.isMeeting) return;

    const velocity = { x: 0, y: 0 };
    if (this.cursors.left.isDown || this.wasd.left.isDown) velocity.x = -1;
    else if (this.cursors.right.isDown || this.wasd.right.isDown) velocity.x = 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown) velocity.y = -1;
    else if (this.cursors.down.isDown || this.wasd.down.isDown) velocity.y = 1;

    if (velocity.x !== 0 || velocity.y !== 0) {
        const length = Math.sqrt(velocity.x**2 + velocity.y**2);
        velocity.x /= length;
        velocity.y /= length;
        
        if (this.time.now - this.lastStepTime > 300) {
            soundManager.playStep();
            this.lastStepTime = this.time.now;
        }
    }

    if (velocity.x !== this.lastInput.x || velocity.y !== this.lastInput.y) {
        net.emit('input:move', velocity);
        this.lastInput = velocity;
    }
    
    if (Phaser.Input.Keyboard.JustDown(this.keyV)) {
        net.emit('action:vent');
    }
  }

  private handleStateUpdate(state: ServerState) {
    this.isMeeting = state.gameState === GameState.MEETING;

    this.keycardSprite.setVisible(!state.keycardTaken);

    this.doorSprites.forEach(d => d.setVisible(false));
    Object.keys(state.sabotage.doors).forEach(roomId => {
        const d = this.doorSprites.get(roomId);
        if (d) d.setVisible(true);
    });

    this.lightsSabotaged = state.sabotage.system === 'lights';
    this.redAlarmOverlay.setVisible(state.sabotage.system === 'reactor');

    const me = state.players[this.localPlayerId];
    if (me) {
        const canPass = me.role === Role.IMPOSTOR || me.hasKey;
        this.gates.forEach(g => {
            if (canPass) {
                g.setFillStyle(0x10b981, 0.2); 
                g.setStrokeStyle(2, 0x10b981);
            } else {
                g.setFillStyle(0xff0000, 0.4);
                g.setStrokeStyle(2, 0xff0000);
            }
        });

        this.ghostViewLayer.setVisible(me.isDead);

        if (this.lightsSabotaged && !me.isDead && me.role !== Role.IMPOSTOR) {
             this.darknessLayer.setVisible(true);
             this.darknessLayer.clear();
             this.darknessLayer.fillStyle(0x000000, 0.98); 
             this.darknessLayer.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
             
             const visionRadius = 180; 
             const polygon = this.calculateVisibilityPolygon(me.x, me.y, visionRadius);
             
             this.visionMaskShape.clear();
             this.visionMaskShape.fillStyle(0xffffff);
             this.visionMaskShape.fillPoints(polygon);
             this.visionMaskShape.fillCircle(me.x, me.y, 30); 
             
        } else {
             this.darknessLayer.setVisible(false);
             this.visionMaskShape.clear(); 
        }
    }

    if (state.bodies.length === 0 && this.deadBodies.size > 0) {
        this.deadBodies.forEach(b => b.destroy());
        this.deadBodies.clear();
    }
    state.bodies.forEach(bodyData => {
        let visible = true;
        if (this.lightsSabotaged && me && !me.isDead && me.role !== Role.IMPOSTOR) {
             if (!this.checkLineOfSight(me.x, me.y, bodyData.x, bodyData.y)) {
                 visible = false;
             }
        }

        if (visible) {
            if (!this.deadBodies.has(bodyData.id)) {
                const bodySprite = this.add.sprite(bodyData.x, bodyData.y, 'crew_dead');
                bodySprite.setTint(bodyData.color);
                bodySprite.setDepth(5);
                this.deadBodies.set(bodyData.id, bodySprite);
            } else {
                this.deadBodies.get(bodyData.id)?.setVisible(true);
            }
        } else {
            this.deadBodies.get(bodyData.id)?.setVisible(false);
        }
    });

    this.players.forEach((sprite, id) => {
        if (!state.players[id]) {
            sprite.destroy();
            this.players.delete(id);
        }
    });

    Object.values(state.players).forEach((pData: Player) => {
        let container = this.players.get(pData.id);
        if (!container) {
            container = this.createPlayerSprite(pData);
            this.players.set(pData.id, container);
        }

        if (pData.id !== this.localPlayerId) {
             const dist = Phaser.Math.Distance.Between(container.x, container.y, pData.x, pData.y);
             if (dist > 300) {
                 container.setPosition(pData.x, pData.y);
             } else {
                 this.tweens.add({ targets: container, x: pData.x, y: pData.y, duration: 50 });
             }
        } else {
             container.setPosition(pData.x, pData.y);
             this.cameras.main.startFollow(container, true, 0.1, 0.1);
        }

        const body = container.getAt(0) as Phaser.GameObjects.Sprite;
        const isMoving = Math.abs(pData.velocity.x) > 0 || Math.abs(pData.velocity.y) > 0;
        
        let visible = true;
        if (pData.isDead) {
            const amIDead = me?.isDead || false;
            if (!pData.isLocal && !amIDead) visible = false;
            else {
                container.setAlpha(0.6); 
                body.setTint(0xecf0f1); 
            }
        } else {
            container.setAlpha(1);
            body.setTint(pData.color);
        }

        if (visible && this.lightsSabotaged && !pData.isLocal && me && !me.isDead && me.role !== Role.IMPOSTOR) {
             if (!this.checkLineOfSight(me.x, me.y, pData.x, pData.y)) {
                 visible = false;
             }
        }

        container.setVisible(visible);

        if (visible) {
            if (isMoving) {
                if (pData.velocity.x < 0) body.setScale(-1, 1); 
                else if (pData.velocity.x > 0) body.setScale(1, 1);
                if (pData.isDead) container.y += Math.sin(this.time.now / 150) * 0.5;
            }
        }
    });
    
    this.renderTasks(state.tasks);
  }

  private calculateVisibilityPolygon(originX: number, originY: number, radius: number): Phaser.Geom.Point[] {
      const points: Phaser.Geom.Point[] = [];
      const angles: number[] = [];

      this.wallEdges.forEach(edge => {
           const dist1 = Phaser.Math.Distance.Between(originX, originY, edge.x1, edge.y1);
           const dist2 = Phaser.Math.Distance.Between(originX, originY, edge.x2, edge.y2);
           
           if (dist1 < radius * 1.5 || dist2 < radius * 1.5) {
               const angle1 = Math.atan2(edge.y1 - originY, edge.x1 - originX);
               const angle2 = Math.atan2(edge.y2 - originY, edge.x2 - originX);
               angles.push(angle1 - 0.0001, angle1, angle1 + 0.0001);
               angles.push(angle2 - 0.0001, angle2, angle2 + 0.0001);
           }
      });

      angles.sort((a, b) => a - b);

      angles.forEach(angle => {
           const dx = Math.cos(angle);
           const dy = Math.sin(angle);
           
           let closestDist = radius;
           let closestX = originX + dx * radius;
           let closestY = originY + dy * radius;

           this.wallEdges.forEach(edge => {
               const intersect = Phaser.Geom.Intersects.LineToLine(
                   new Phaser.Geom.Line(originX, originY, originX + dx * radius, originY + dy * radius),
                   new Phaser.Geom.Line(edge.x1, edge.y1, edge.x2, edge.y2)
               );
               
               if (intersect) {
                   const pt = this.getLineIntersection(originX, originY, originX + dx*radius, originY + dy*radius, edge.x1, edge.y1, edge.x2, edge.y2);
                   if (pt) {
                       const dist = Phaser.Math.Distance.Between(originX, originY, pt.x, pt.y);
                       if (dist < closestDist) {
                           closestDist = dist;
                           closestX = pt.x;
                           closestY = pt.y;
                       }
                   }
               }
           });
           points.push(new Phaser.Geom.Point(closestX, closestY));
      });

      return points;
  }

  private checkLineOfSight(x1: number, y1: number, x2: number, y2: number): boolean {
      const line = new Phaser.Geom.Line(x1, y1, x2, y2);
      for (const wall of WALLS) {
           const rect = new Phaser.Geom.Rectangle(wall.x, wall.y, wall.w, wall.h);
           if (Phaser.Geom.Intersects.LineToRectangle(line, rect)) {
               return false;
           }
      }
      return true;
  }

  private getLineIntersection(p0_x: number, p0_y: number, p1_x: number, p1_y: number, p2_x: number, p2_y: number, p3_x: number, p3_y: number) {
        const s1_x = p1_x - p0_x;
        const s1_y = p1_y - p0_y;
        const s2_x = p3_x - p2_x;
        const s2_y = p3_y - p2_y;
        const s = (-s1_y * (p0_x - p2_x) + s1_x * (p0_y - p2_y)) / (-s2_x * s1_y + s1_x * s2_y);
        const t = (s2_x * (p0_y - p2_y) - s2_y * (p0_x - p2_x)) / (-s2_x * s1_y + s1_x * s2_y);

        if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
            return { x: p0_x + (t * s1_x), y: p0_y + (t * s1_y) };
        }
        return null;
  }

  private createPlayerSprite(pData: Player): Phaser.GameObjects.Container {
      const container = this.add.container(pData.x, pData.y);
      const body = this.add.sprite(0, -25, 'crew_body');
      body.setOrigin(0.5, 0.5);
      const visor = this.add.sprite(10, -28, 'crew_visor');
      visor.setOrigin(0.5, 0.5);
      const text = this.add.text(0, -60, pData.name, {
          fontSize: '14px',
          color: '#ffffff',
          fontFamily: 'Arial',
          backgroundColor: '#00000088',
          padding: { x: 4, y: 2 }
      }).setOrigin(0.5);

      container.add([body, visor, text]);
      container.setDepth(20); 
      return container;
  }

  private renderTasks(tasks: Task[]) {
      this.tasks.forEach(t => t.destroy());
      this.tasks = [];
      tasks.forEach(t => {
          if (t.completed) return;
          const taskObj = this.add.circle(t.x, t.y, 15, 0xfacc15);
          taskObj.setStrokeStyle(2, 0xffffff);
          taskObj.setDepth(5);
          this.tweens.add({ targets: taskObj, scale: 1.2, duration: 800, yoyo: true, repeat: -1 });
          this.tasks.push(taskObj);
      });
  }
}
