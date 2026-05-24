import Phaser from 'phaser';
import { TILE_SIZE, TILES, COLORS } from '../core/Constants';

export class Preloader extends Phaser.Scene {
  constructor() {
    super({ key: 'Preloader' });
  }

  preload() {
    this.generateTileset();
    this.generateParticle();
    this.generateGlowCircle();
    this.showLoadingScreen();
  }

  create() {
    this.scene.start('CybercafeScene');
  }

  private showLoadingScreen() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    // Dark BG
    this.add.rectangle(cx, cy, width, height, 0x020208);

    // Animated grid BG
    const grid = this.add.graphics();
    grid.lineStyle(0.5, 0x1a1a3a, 0.4);
    const step = 32;
    for (let x = 0; x <= width; x += step) {
      grid.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y <= height; y += step) {
      grid.lineBetween(0, y, width, y);
    }

    // Logo skull
    this.add.text(cx, cy - 80, '💀', {
      fontSize: '48px',
    }).setOrigin(0.5);

    // Logo text
    this.add.text(cx, cy - 26, 'TOXIC CAFE', {
      fontFamily: 'Orbitron, Arial Black, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#f0f0ff',
      letterSpacing: 8,
    }).setOrigin(0.5);

    // Sub text
    this.add.text(cx, cy + 10, 'ADMIN CONSOLE v2.7', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '10px',
      color: '#5050a0',
      letterSpacing: 4,
    }).setOrigin(0.5);

    // Progress bar background
    const barW = 200;
    const barH = 4;
    const barX = cx - barW / 2;
    const barY = cy + 50;

    this.add.rectangle(cx, barY, barW, barH, 0x111122)
      .setStrokeStyle(1, 0x222244);

    // Animated progress bar fill
    const fill = this.add.rectangle(barX + 2, barY, 0, barH - 2, 0x8b5cf6);
    fill.setOrigin(0, 0.5);

    this.tweens.add({
      targets: fill,
      width: barW - 4,
      duration: 600,
      ease: 'Cubic.easeInOut',
    });

    // "INITIALIZING..." text
    const initText = this.add.text(cx, barY + 20, 'INITIALIZING...', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '10px',
      color: '#7070a0',
      letterSpacing: 3,
    }).setOrigin(0.5);

    // Flicker on text
    this.time.addEvent({
      delay: 120,
      repeat: 4,
      callback: () => {
        initText.setAlpha(initText.alpha > 0.5 ? 0.3 : 1);
      },
    });

    // Neon blue line under logo
    const line = this.add.graphics();
    const grad = line;
    grad.lineStyle(2, 0x00d4ff, 0.6);
    grad.lineBetween(cx - 80, cy + 24, cx + 80, cy + 24);
  }

  private generateTileset() {
    const ts = TILE_SIZE;
    const numTiles = 4;
    const ct = this.textures.createCanvas('tileset', ts * numTiles, ts)!;
    const ctx = ct!.getContext()!;

    // ── Tile 0: Hex-grid floor ──────────────────────────────
    ctx.fillStyle = '#0b0b1a';
    ctx.fillRect(ts * TILES.FLOOR, 0, ts, ts);

    // Hex grid pattern
    ctx.strokeStyle = '#1a1a3a';
    ctx.lineWidth = 0.6;
    const hx = ts * TILES.FLOOR;
    // Draw a small hex cell
    this._drawHex(ctx, hx + 16, 16, 10);
    this._drawHex(ctx, hx + 0, 10, 6);
    this._drawHex(ctx, hx + 28, 22, 6);

    // Subtle center dot
    ctx.fillStyle = '#161636';
    ctx.beginPath();
    ctx.arc(hx + 16, 16, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // ── Tile 1: Wall with panel detail ─────────────────────
    ctx.fillStyle = '#090916';
    ctx.fillRect(ts * TILES.WALL, 0, ts, ts);

    // Panel bevel
    ctx.fillStyle = '#141428';
    ctx.fillRect(ts * TILES.WALL + 1, 1, ts - 2, ts - 2);

    // Darker inset
    ctx.fillStyle = '#0a0a1c';
    ctx.fillRect(ts * TILES.WALL + 4, 4, ts - 8, ts - 8);

    // LED dots on wall
    const ledColors = ['#7c3aed', '#00d4ff', '#7c3aed'];
    ledColors.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(ts * TILES.WALL + 8 + i * 8, ts - 6, 1.5, 0, Math.PI * 2);
      ctx.fill();
      // Soft glow
      ctx.fillStyle = c + '33';
      ctx.beginPath();
      ctx.arc(ts * TILES.WALL + 8 + i * 8, ts - 6, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Hex pattern on wall
    ctx.strokeStyle = '#1c1c38';
    ctx.lineWidth = 0.5;
    this._drawHex(ctx, ts * TILES.WALL + 16, 16, 9);

    // ── Tile 2: Desk surface ────────────────────────────────
    ctx.fillStyle = '#10102a';
    ctx.fillRect(ts * TILES.DESK, 0, ts, ts);

    // Wood-like grain lines
    ctx.strokeStyle = '#191938';
    ctx.lineWidth = 0.8;
    for (let j = 0; j < 6; j++) {
      const y = j * 5 + 2;
      ctx.beginPath();
      ctx.moveTo(ts * TILES.DESK + 1, y);
      ctx.lineTo(ts * TILES.DESK + ts - 1, y);
      ctx.stroke();
    }
    // Outer border
    ctx.strokeStyle = '#2a2260';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(ts * TILES.DESK + 0.5, 0.5, ts - 1, ts - 1);

    // Corner accents
    ctx.fillStyle = '#8b5cf6';
    ctx.fillRect(ts * TILES.DESK, 0, 2, 2);
    ctx.fillRect(ts * TILES.DESK + ts - 2, 0, 2, 2);
    ctx.fillRect(ts * TILES.DESK, ts - 2, 2, 2);
    ctx.fillRect(ts * TILES.DESK + ts - 2, ts - 2, 2, 2);

    // ── Tile 3: Neon accent strip ───────────────────────────
    ctx.fillStyle = '#060614';
    ctx.fillRect(ts * TILES.NEON, 0, ts, ts);

    // Wider glow halo
    const gGlow = ctx.createLinearGradient(ts * TILES.NEON, 0, ts * TILES.NEON + ts, 0);
    gGlow.addColorStop(0, 'rgba(91,33,182,0)');
    gGlow.addColorStop(0.3, 'rgba(91,33,182,0.15)');
    gGlow.addColorStop(0.5, 'rgba(0,200,255,0.2)');
    gGlow.addColorStop(0.7, 'rgba(91,33,182,0.15)');
    gGlow.addColorStop(1, 'rgba(91,33,182,0)');
    ctx.fillStyle = gGlow;
    ctx.fillRect(ts * TILES.NEON, 5, ts, 22);

    // Bright center line
    const gLine = ctx.createLinearGradient(ts * TILES.NEON, 0, ts * TILES.NEON + ts, 0);
    gLine.addColorStop(0, '#5b21b6');
    gLine.addColorStop(0.25, '#00c8ff');
    gLine.addColorStop(0.5, '#00ffee');
    gLine.addColorStop(0.75, '#00c8ff');
    gLine.addColorStop(1, '#5b21b6');
    ctx.fillStyle = gLine;
    ctx.fillRect(ts * TILES.NEON, 14, ts, 4);

    // Small tick marks
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(ts * TILES.NEON + i * 8, 13, 2, 6);
    }

    ct.refresh();
  }

  private _drawHex(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const nx = cx + r * Math.cos(angle);
      const ny = cy + r * Math.sin(angle);
      i === 0 ? ctx.moveTo(nx, ny) : ctx.lineTo(nx, ny);
    }
    ctx.closePath();
    ctx.stroke();
  }

  private generateParticle() {
    const ct = this.textures.createCanvas('particle', 8, 8)!;
    const ctx = ct!.getContext()!;
    const grd = ctx.createRadialGradient(4, 4, 0, 4, 4, 4);
    grd.addColorStop(0, 'rgba(255, 80, 80, 1)');
    grd.addColorStop(1, 'rgba(255, 80, 80, 0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 8, 8);
    ct.refresh();
  }

  private generateGlowCircle() {
    // Soft blue glow dot for ambient particles
    const ct = this.textures.createCanvas('glow-particle', 12, 12)!;
    const ctx = ct!.getContext()!;
    const grd = ctx.createRadialGradient(6, 6, 0, 6, 6, 6);
    grd.addColorStop(0, 'rgba(0, 212, 255, 0.9)');
    grd.addColorStop(0.5, 'rgba(139, 92, 246, 0.4)');
    grd.addColorStop(1, 'rgba(139, 92, 246, 0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 12, 12);
    ct.refresh();
  }
}
