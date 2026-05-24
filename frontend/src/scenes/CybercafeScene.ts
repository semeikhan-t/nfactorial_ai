import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, TILE_SIZE, MAP_COLS, MAP_ROWS,
  PC_POSITIONS, TILES, COLORS, POLL_INTERVAL,
} from '../core/Constants';
import { EventBus, EV } from '../core/EventBus';
import { PCStation } from '../objects/PCStation';
import { fetchState } from '../api';
import type { GameState, PC } from '../types';

// Map data: 0=floor, 1=wall, 2=desk, 3=neon strip
const MAP_DATA = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,2,2,0,0,0,0,2,2,0,0,0,0,2,2,0,0,0,1],
  [1,0,2,2,0,0,0,0,2,2,0,0,0,0,2,2,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,2,2,0,0,0,0,2,2,0,0,0,0,0,0,1],
  [1,0,0,0,0,2,2,0,0,0,0,2,2,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

export class CybercafeScene extends Phaser.Scene {
  private pcStations: PCStation[] = [];
  private activePcId = 1;
  private pollingTimer?: ReturnType<typeof setInterval>;
  private lastState?: GameState;
  private neonTween?: Phaser.Tweens.Tween;

  constructor() {
    super({ key: 'CybercafeScene' });
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.BG_DEEP);

    this.createTilemap();
    this.createDecorativeElements();
    this.createPCStations();
    this.createOverlays();
    this.createAmbientParticles();
    this.setupInput();
    this.startPolling();

    this.fetchAndUpdate();
  }

  // ─── Tilemap ────────────────────────────────────────────────────
  private createTilemap() {
    const map = this.make.tilemap({
      data: MAP_DATA,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });

    const tileset = map.addTilesetImage('tileset', 'tileset', TILE_SIZE, TILE_SIZE, 0, 0, 0);
    if (!tileset) {
      console.error('Failed to add tileset image');
      return;
    }

    map.createLayer(0, tileset, 0, 0);
  }

  // ─── Decorative elements ─────────────────────────────────────────
  private createDecorativeElements() {
    // ── Watermark logo on wall (top-right area) ──────────────
    const logoText = this.add.text(GAME_WIDTH - 16, 12, 'TOXIC\nCAFE', {
      fontFamily: 'Orbitron, Arial Black, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#1a1a4a',
      align: 'right',
      letterSpacing: 3,
    }).setOrigin(1, 0).setDepth(1);

    // ── Reception desk (bottom-right area) ──────────────────
    const reception = this.add.graphics();
    reception.setDepth(5);

    // Counter top
    reception.fillStyle(0x12112a, 1);
    reception.fillRect(GAME_WIDTH - 115, GAME_HEIGHT - 70, 80, 35);
    reception.lineStyle(1.5, 0x2a2260, 1);
    reception.strokeRect(GAME_WIDTH - 115, GAME_HEIGHT - 70, 80, 35);

    // Counter neon edge
    reception.lineStyle(2, 0x8b5cf6, 0.6);
    reception.lineBetween(GAME_WIDTH - 115, GAME_HEIGHT - 70, GAME_WIDTH - 35, GAME_HEIGHT - 70);

    // Reception computer
    reception.fillStyle(0x0c0b20, 1);
    reception.fillRect(GAME_WIDTH - 95, GAME_HEIGHT - 90, 30, 22);
    reception.lineStyle(1, 0x222248, 1);
    reception.strokeRect(GAME_WIDTH - 95, GAME_HEIGHT - 90, 30, 22);
    // Screen glow
    reception.fillStyle(0x002244, 1);
    reception.fillRect(GAME_WIDTH - 92, GAME_HEIGHT - 88, 24, 16);

    // Admin emoji at reception
    this.add.text(GAME_WIDTH - 80, GAME_HEIGHT - 50, '👨‍💼', {
      fontSize: '16px',
    }).setOrigin(0.5).setDepth(6);

    // Reception label
    this.add.text(GAME_WIDTH - 75, GAME_HEIGHT - 28, 'РЕСЕПШН', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '7px',
      color: '#30306a',
      letterSpacing: 2,
    }).setOrigin(0.5).setDepth(6);

    // ── Posters on walls ────────────────────────────────────
    this.createPoster(40, 25, '⚡', 'NO\nLAG', 0x00d4ff);
    this.createPoster(100, 25, '🔥', 'GG\nEZ', 0xff3344);
    this.createPoster(GAME_WIDTH - 45, GAME_HEIGHT / 2 + 20, '🎮', 'PLAY\nHARD', 0x8b5cf6);

    // ── Server rack (bottom-left area) ──────────────────────
    const rack = this.add.graphics();
    rack.setDepth(5);
    rack.fillStyle(0x0a0920, 1);
    rack.fillRect(8, GAME_HEIGHT - 80, 22, 50);
    rack.lineStyle(1, 0x1a1840, 1);
    rack.strokeRect(8, GAME_HEIGHT - 80, 22, 50);
    // Server LED indicators
    const rackColors = [0x00ff88, 0x00ff88, 0xffcc00, 0x00ff88, 0xff3344, 0x00ff88];
    rackColors.forEach((c, i) => {
      rack.fillStyle(c, 0.9);
      rack.fillRect(14, GAME_HEIGHT - 76 + i * 7, 4, 3);
    });

    // Server label
    this.add.text(19, GAME_HEIGHT - 26, 'SRV', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '6px',
      color: '#2a2a60',
    }).setOrigin(0.5).setDepth(6);

    // ── Floor number labels ──────────────────────────────────
    [1,2,3,4,5].forEach((n, i) => {
      const pos = PC_POSITIONS[i];
      if (!pos) return;
      this.add.text(pos.x, pos.y + 64, `#${n}`, {
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '9px',
        color: '#202050',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(1);
    });
  }

  private createPoster(x: number, y: number, emoji: string, label: string, color: number) {
    const g = this.add.graphics().setDepth(2);
    const colorHex = `#${color.toString(16).padStart(6, '0')}`;

    g.fillStyle(0x0a0920, 1);
    g.fillRect(x - 14, y, 28, 22);
    g.lineStyle(1, color, 0.6);
    g.strokeRect(x - 14, y, 28, 22);

    this.add.text(x, y + 6, emoji, { fontSize: '10px' }).setOrigin(0.5).setDepth(3);
    this.add.text(x, y + 16, label, {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '5px',
      color: colorHex,
      align: 'center',
      letterSpacing: 1,
    }).setOrigin(0.5).setDepth(3);
  }

  // ─── PC Stations ────────────────────────────────────────────────
  private createPCStations() {
    PC_POSITIONS.forEach((pos, i) => {
      const station = new PCStation(this, pos.x, pos.y, i + 1);
      this.pcStations.push(station);
    });

    this.selectPC(1);
  }

  // ─── Visual overlays ────────────────────────────────────────────
  private createOverlays() {
    // Neon strip row glow
    const neonGrad = this.add.graphics();
    neonGrad.setDepth(2);

    // Pulsing glow above neon row
    const glowY = TILE_SIZE * 6 - 14;
    const glowH = 28;
    neonGrad.fillStyle(0x00c8ff, 0.05);
    neonGrad.fillRect(TILE_SIZE, glowY, (MAP_COLS - 2) * TILE_SIZE, glowH);

    // Animated neon strip line
    const neonLine = this.add.graphics();
    neonLine.setDepth(3);
    this.neonTween = this.tweens.add({
      targets: neonLine,
      alpha: { from: 0.5, to: 1.0 },
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        neonLine.clear();
        const alpha = neonLine.alpha;
        neonLine.lineStyle(2, 0x00c8ff, 0.4 * alpha);
        neonLine.lineBetween(TILE_SIZE, TILE_SIZE * 6 + 2, (MAP_COLS - 1) * TILE_SIZE, TILE_SIZE * 6 + 2);
        neonLine.lineStyle(2, 0x8b5cf6, 0.3 * alpha);
        neonLine.lineBetween(TILE_SIZE, TILE_SIZE * 6 + 5, (MAP_COLS - 1) * TILE_SIZE, TILE_SIZE * 6 + 5);
      },
    });

    // Scanlines (fixed to camera, very subtle)
    const scanlines = this.add.graphics();
    scanlines.setScrollFactor(0);
    scanlines.setDepth(200);
    scanlines.setAlpha(0.6);
    for (let y = 0; y < GAME_HEIGHT; y += 4) {
      scanlines.fillStyle(0x000000, 0.05);
      scanlines.fillRect(0, y, GAME_WIDTH, 1);
    }



    // Ambient purple glow at neon row
    const ambient = this.add.graphics();
    ambient.setDepth(3);
    ambient.fillStyle(COLORS.NEON_PURPLE, 0.04);
    ambient.fillRect(0, TILE_SIZE * 6 - 16, GAME_WIDTH, 32);

    this.tweens.add({
      targets: ambient,
      alpha: { from: 0.5, to: 1.0 },
      duration: 2500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // ─── Ambient particles ───────────────────────────────────────────
  private createAmbientParticles() {
    // Floating dust/light motes
    try {
      const emitter = this.add.particles(0, 0, 'glow-particle', {
        x: { min: TILE_SIZE, max: GAME_WIDTH - TILE_SIZE },
        y: { min: TILE_SIZE, max: GAME_HEIGHT - TILE_SIZE },
        speed: { min: 3, max: 12 },
        angle: { min: 250, max: 290 },
        scale: { start: 0.3, end: 0 },
        lifespan: { min: 3000, max: 6000 },
        quantity: 1,
        frequency: 800,
        alpha: { start: 0.4, end: 0 },
        tint: [0x8b5cf6, 0x00d4ff, 0x8b5cf6],
      });
      emitter.setDepth(150);
    } catch {
      // particle texture may not be ready on first frame
    }
  }

  // ─── Input ──────────────────────────────────────────────────────
  private setupInput() {
    this.events.on('pc-clicked', (pcId: number) => {
      this.selectPC(pcId);
    });
  }

  private selectPC(pcId: number) {
    this.activePcId = pcId;
    this.pcStations.forEach((s, i) => s.setSelected(i + 1 === pcId));
    EventBus.emit(EV.PC_SELECTED, pcId);
  }

  // ─── Polling ────────────────────────────────────────────────────
  private startPolling() {
    this.pollingTimer = setInterval(() => this.fetchAndUpdate(), POLL_INTERVAL);
  }

  private async fetchAndUpdate() {
    try {
      const state = await fetchState();
      this.applyState(state);
      EventBus.emit(EV.STATE_UPDATED, state);
    } catch {
      // Silently fail — backend may not be started yet
    }
  }

  private applyState(state: GameState) {
    state.pcs.forEach((pc: PC) => {
      const station = this.pcStations[pc.id - 1];
      if (!station) return;

      station.setStatus(pc.status, !!pc.current_incident, pc.client_name);

      const prevPc = this.lastState?.pcs.find(p => p.id === pc.id);
      if (
        pc.current_incident &&
        pc.current_incident !== prevPc?.current_incident
      ) {
        station.showBubble(pc.current_incident, true);
        this.cameras.main.shake(200, 0.004);
      }
    });

    this.lastState = state;

    if (state.game_over) {
      this.handleGameOver(state);
    }
  }

  private handleGameOver(state: GameState) {
    if (this.pollingTimer) clearInterval(this.pollingTimer);

    this.cameras.main.shake(700, 0.022);
    this.cameras.main.flash(400, 255, 0, 0, false);

    this.time.delayedCall(900, () => {
      this.scene.launch('GameOver', { loyalty: state.loyalty, score: state.score });
      this.scene.bringToTop('GameOver');
    });
  }

  // ─── Lifecycle ──────────────────────────────────────────────────
  shutdown() {
    if (this.pollingTimer) clearInterval(this.pollingTimer);
    if (this.neonTween) this.neonTween.stop();
    EventBus.removeAllListeners();
  }
}
