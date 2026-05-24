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
    this.createPCStations();
    this.createOverlays();
    this.setupInput();
    this.startPolling();

    // Initial fetch
    this.fetchAndUpdate();
  }

  // ─── Tilemap ────────────────────────────────────────────────────
  private createTilemap() {
    const map = this.make.tilemap({
      data: MAP_DATA,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });

    // gid=0 → tile index 0 in data maps to column 0 of the tileset image
    const tileset = map.addTilesetImage('tileset', 'tileset', TILE_SIZE, TILE_SIZE, 0, 0, 0);
    if (!tileset) {
      console.error('Failed to add tileset image');
      return;
    }

    map.createLayer(0, tileset, 0, 0);

    // Animate the neon strip row with a slow tint cycle
    // We do this on the Graphics overlay instead for simplicity
  }

  // ─── PC Stations ────────────────────────────────────────────────
  private createPCStations() {
    PC_POSITIONS.forEach((pos, i) => {
      const station = new PCStation(this, pos.x, pos.y, i + 1);
      this.pcStations.push(station);
    });

    // Select PC1 by default
    this.selectPC(1);
  }

  // ─── Visual overlays ────────────────────────────────────────────
  private createOverlays() {
    // Neon strip animated glow overlay (row 6 = y 192..223)
    const neonOverlay = this.add.graphics();
    neonOverlay.setDepth(2);
    const neonGrad = this.add.graphics();
    neonGrad.setDepth(2);
    neonGrad.fillStyle(0x00c8ff, 0.06);
    neonGrad.fillRect(TILE_SIZE, TILE_SIZE * 5 + TILE_SIZE - 4, (MAP_COLS - 2) * TILE_SIZE, 24);

    // Scanlines (fixed to camera)
    const scanlines = this.add.graphics();
    scanlines.setScrollFactor(0);
    scanlines.setDepth(200);
    for (let y = 0; y < GAME_HEIGHT; y += 3) {
      scanlines.fillStyle(0x000000, 0.07);
      scanlines.fillRect(0, y, GAME_WIDTH, 1);
    }

    // Animate scanlines opacity for CRT flicker
    this.tweens.add({
      targets: scanlines,
      alpha: { from: 0.85, to: 1.0 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Vignette (dark corners, fixed to camera)
    const vignette = this.add.graphics();
    vignette.setScrollFactor(0);
    vignette.setDepth(199);
    const steps = 10;
    for (let i = 0; i < steps; i++) {
      const alpha = 0.03 + i * 0.025;
      const m = i * 18;
      vignette.fillStyle(0x000000, alpha);
      vignette.fillRect(0, 0, m, GAME_HEIGHT);
      vignette.fillRect(GAME_WIDTH - m, 0, m, GAME_HEIGHT);
      vignette.fillRect(0, 0, GAME_WIDTH, m);
      vignette.fillRect(0, GAME_HEIGHT - m, GAME_WIDTH, m);
    }

    // Ambient neon glow at row 6 (pulsing purple/blue)
    const ambient = this.add.graphics();
    ambient.setDepth(3);
    ambient.fillStyle(COLORS.NEON_PURPLE, 0.04);
    ambient.fillRect(0, TILE_SIZE * 6 - 12, GAME_WIDTH, 28);

    this.tweens.add({
      targets: ambient,
      alpha: { from: 0.6, to: 1.0 },
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
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

      // Show bubble when a new incident appears
      const prevPc = this.lastState?.pcs.find(p => p.id === pc.id);
      if (
        pc.current_incident &&
        pc.current_incident !== prevPc?.current_incident
      ) {
        station.showBubble(pc.current_incident, true);
      }
    });

    this.lastState = state;

    if (state.game_over) {
      this.handleGameOver(state);
    }
  }

  private handleGameOver(state: GameState) {
    if (this.pollingTimer) clearInterval(this.pollingTimer);

    this.cameras.main.shake(600, 0.018);

    this.time.delayedCall(800, () => {
      this.scene.launch('GameOver', { loyalty: state.loyalty, score: state.score });
      this.scene.bringToTop('GameOver');
    });
  }

  // ─── Lifecycle ──────────────────────────────────────────────────
  shutdown() {
    if (this.pollingTimer) clearInterval(this.pollingTimer);
    EventBus.removeAllListeners();
  }
}
