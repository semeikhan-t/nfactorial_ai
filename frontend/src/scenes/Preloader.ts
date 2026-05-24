import Phaser from 'phaser';
import { TILE_SIZE, TILES, COLORS } from '../core/Constants';

export class Preloader extends Phaser.Scene {
  constructor() {
    super({ key: 'Preloader' });
  }

  preload() {
    this.generateTileset();
    this.generateParticle();
    this.showLoadingText();
  }

  create() {
    this.scene.start('CybercafeScene');
  }

  private showLoadingText() {
    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2, 'INITIALIZING...', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '14px',
      color: '#00d4ff',
      letterSpacing: 4,
    }).setOrigin(0.5);
  }

  private generateTileset() {
    const ts = TILE_SIZE;
    const numTiles = 4;
    // createCanvas returns a CanvasTexture registered under the key
    const ct = this.textures.createCanvas('tileset', ts * numTiles, ts);
    const ctx = ct.getContext();

    // ---------- Tile 0: Dark floor ----------
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(ts * TILES.FLOOR, 0, ts, ts);
    // Subtle grid lines
    ctx.strokeStyle = '#181836';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(ts * TILES.FLOOR + 0.5, 0.5, ts - 1, ts - 1);
    // Center micro-dot
    ctx.fillStyle = '#161630';
    ctx.fillRect(ts * TILES.FLOOR + 14, 14, 4, 4);

    // ---------- Tile 1: Wall ----------
    ctx.fillStyle = '#0a0a1c';
    ctx.fillRect(ts * TILES.WALL, 0, ts, ts);
    // Top & left highlight bevel
    ctx.fillStyle = '#1a1a38';
    ctx.fillRect(ts * TILES.WALL, 0, ts, 3);
    ctx.fillRect(ts * TILES.WALL, 0, 3, ts);
    // Bottom & right shadow bevel
    ctx.fillStyle = '#05050e';
    ctx.fillRect(ts * TILES.WALL + ts - 3, 0, 3, ts);
    ctx.fillRect(ts * TILES.WALL, ts - 3, ts, 3);
    // Subtle hex pattern
    ctx.strokeStyle = '#141432';
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    const cx = ts * TILES.WALL + 16, cy = 16;
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const nx = cx + 8 * Math.cos(angle);
      const ny = cy + 8 * Math.sin(angle);
      i === 0 ? ctx.moveTo(nx, ny) : ctx.lineTo(nx, ny);
    }
    ctx.closePath();
    ctx.stroke();

    // ---------- Tile 2: Desk surface ----------
    ctx.fillStyle = '#141128';
    ctx.fillRect(ts * TILES.DESK, 0, ts, ts);
    ctx.strokeStyle = '#2a2250';
    ctx.lineWidth = 1;
    ctx.strokeRect(ts * TILES.DESK + 0.5, 0.5, ts - 1, ts - 1);
    // Wood-grain lines
    ctx.strokeStyle = '#1e1a42';
    ctx.lineWidth = 0.5;
    for (let j = 0; j < 5; j++) {
      const y = j * 6 + 3;
      ctx.beginPath();
      ctx.moveTo(ts * TILES.DESK + 2, y);
      ctx.lineTo(ts * TILES.DESK + ts - 2, y);
      ctx.stroke();
    }

    // ---------- Tile 3: Neon accent strip ----------
    ctx.fillStyle = '#08081a';
    ctx.fillRect(ts * TILES.NEON, 0, ts, ts);
    // Neon line (linear gradient)
    const grad = ctx.createLinearGradient(ts * TILES.NEON, 0, ts * TILES.NEON + ts, 0);
    grad.addColorStop(0, '#5b21b6');
    grad.addColorStop(0.5, '#00c8ff');
    grad.addColorStop(1, '#5b21b6');
    ctx.fillStyle = grad;
    ctx.fillRect(ts * TILES.NEON, 13, ts, 6);
    // Soft glow halo
    ctx.fillStyle = 'rgba(0,200,255,0.12)';
    ctx.fillRect(ts * TILES.NEON, 8, ts, 16);

    ct.refresh();
  }

  private generateParticle() {
    // Small glowing circle for particle emitters
    const ct = this.textures.createCanvas('particle', 8, 8);
    const ctx = ct.getContext();
    const grd = ctx.createRadialGradient(4, 4, 0, 4, 4, 4);
    grd.addColorStop(0, 'rgba(255, 80, 80, 1)');
    grd.addColorStop(1, 'rgba(255, 80, 80, 0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 8, 8);
    ct.refresh();
  }
}
