import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../core/Constants';
import { restartGame } from '../api';

interface GameOverData {
  loyalty: number;
  score: number;
}

export class GameOver extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOver' });
  }

  create(data: GameOverData) {
    const { loyalty = 0, score = 0 } = data || {};
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // ── Dark overlay with red tint ───────────────────────────
    const overlay = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0);
    this.tweens.add({
      targets: overlay,
      alpha: 0.9,
      duration: 700,
      ease: 'Cubic.easeOut',
    });

    // Red scanline overlay (CRT damage effect)
    const redScan = this.add.graphics().setAlpha(0);
    redScan.setDepth(5);
    for (let y = 0; y < GAME_HEIGHT; y += 4) {
      redScan.fillStyle(0xff0000, 0.04);
      redScan.fillRect(0, y, GAME_WIDTH, 2);
    }
    this.tweens.add({
      targets: redScan,
      alpha: 1,
      duration: 500,
      delay: 200,
    });

    // ── Glassmorphism panel ──────────────────────────────────
    const panelW = 380;
    const panelH = 290;

    // Panel glow border (outer)
    const panelGlow = this.add.rectangle(cx, cy, panelW + 4, panelH + 4, 0xff0000, 0)
      .setStrokeStyle(2, 0xff3344)
      .setAlpha(0);

    this.tweens.add({
      targets: panelGlow,
      alpha: 0.8,
      duration: 400,
      delay: 250,
    });

    // Pulsing glow on panel border
    this.tweens.add({
      targets: panelGlow,
      alpha: { from: 0.4, to: 0.9 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 700,
    });

    // Panel background
    const panel = this.add.rectangle(cx, cy, panelW, panelH, 0x080618, 0)
      .setStrokeStyle(1, 0x4a0a18);

    this.tweens.add({
      targets: panel,
      alpha: 0.95,
      duration: 400,
      delay: 250,
      ease: 'Cubic.easeOut',
    });

    // Inner accent line (top)
    const accentLine = this.add.rectangle(cx, cy - panelH / 2 + 2, panelW - 4, 2, 0xff3344, 0);
    this.tweens.add({ targets: accentLine, alpha: 0.8, duration: 300, delay: 400 });

    // ── Corner decorations ───────────────────────────────────
    const corners = [
      [-panelW/2 + 6, -panelH/2 + 6],
      [panelW/2 - 6,  -panelH/2 + 6],
      [-panelW/2 + 6,  panelH/2 - 6],
      [panelW/2 - 6,   panelH/2 - 6],
    ];
    corners.forEach(([dx, dy]) => {
      const c = this.add.graphics().setAlpha(0);
      c.lineStyle(2, 0xff3344, 0.7);
      const sx = cx + dx;
      const sy = cy + dy;
      const sign_x = dx < 0 ? 1 : -1;
      const sign_y = dy < 0 ? 1 : -1;
      c.lineBetween(sx, sy, sx + sign_x * 12, sy);
      c.lineBetween(sx, sy, sx, sy + sign_y * 12);
      this.tweens.add({ targets: c, alpha: 1, duration: 300, delay: 500 });
    });

    // ── GAME OVER title with glitch ──────────────────────────
    const titleY = cy - 100;

    // Glitch ghost layers (behind main)
    const glitchBlue = this.add.text(cx, titleY, 'GAME OVER', {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '38px',
      fontStyle: 'bold',
      color: '#00ffee',
    }).setOrigin(0.5).setAlpha(0).setDepth(10);

    const glitchPink = this.add.text(cx, titleY, 'GAME OVER', {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '38px',
      fontStyle: 'bold',
      color: '#ff2266',
    }).setOrigin(0.5).setAlpha(0).setDepth(10);

    const title = this.add.text(cx, titleY, 'GAME OVER', {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '38px',
      fontStyle: 'bold',
      color: '#ff3344',
    }).setOrigin(0.5).setAlpha(0).setDepth(11);

    // Text shadow effect
    title.setShadow(0, 0, '#ff000088', 20, true, true);

    this.tweens.add({
      targets: title,
      alpha: 1,
      y: titleY - 4,
      duration: 600,
      delay: 300,
      ease: 'Back.easeOut',
    });

    // Glitch animation loop
    this.time.addEvent({
      delay: 2500,
      loop: true,
      callback: () => {
        this.time.addEvent({
          delay: 60,
          repeat: 4,
          callback: () => {
            const glitchOn = title.alpha > 0.5;
            title.setAlpha(glitchOn ? 0.3 : 1);
            glitchBlue.setAlpha(glitchOn ? 0 : 0.7).setX(cx + Phaser.Math.Between(-3, 3));
            glitchPink.setAlpha(glitchOn ? 0 : 0.6).setX(cx + Phaser.Math.Between(-3, 3));
          },
        });
        this.time.delayedCall(350, () => {
          title.setAlpha(1).setX(cx);
          glitchBlue.setAlpha(0);
          glitchPink.setAlpha(0);
        });
      },
    });

    // ── Subtitle ─────────────────────────────────────────────
    const subtitle = this.add.text(cx, cy - 56, 'КЛУБ ЗАКРЫТ. ВЫ УВОЛЕНЫ.', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '12px',
      color: '#ff7080',
      letterSpacing: 2,
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: subtitle,
      alpha: 1,
      duration: 400,
      delay: 600,
    });

    // ── Stats with count-up animation ────────────────────────
    const loyaltyLabel = this.add.text(cx - 70, cy - 22, 'ЛОЯЛЬНОСТЬ', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '10px',
      color: '#806080',
      letterSpacing: 1,
    }).setOrigin(0.5).setAlpha(0);

    const loyaltyVal = this.add.text(cx - 70, cy + 4, '0/100', {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: loyalty > 30 ? '#ffcc00' : '#ff3344',
    }).setOrigin(0.5).setAlpha(0);

    const scoreLabel = this.add.text(cx + 70, cy - 22, 'ОЧКИ', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '10px',
      color: '#806080',
      letterSpacing: 1,
    }).setOrigin(0.5).setAlpha(0);

    const scoreVal = this.add.text(cx + 70, cy + 4, '0', {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#8b5cf6',
    }).setOrigin(0.5).setAlpha(0);

    // Divider
    const divider = this.add.graphics().setAlpha(0);
    divider.lineStyle(1, 0x330022, 0.6);
    divider.lineBetween(cx - 140, cy - 30, cx + 140, cy - 30);
    divider.lineStyle(1, 0x220033, 0.4);
    divider.lineBetween(cx - 140, cy + 18, cx + 140, cy + 18);

    this.tweens.add({
      targets: [loyaltyLabel, loyaltyVal, scoreLabel, scoreVal, divider],
      alpha: 1,
      duration: 400,
      delay: 700,
      onComplete: () => {
        // Count-up animation
        const obj = { loy: 0, sc: 0 };
        this.tweens.add({
          targets: obj,
          loy: loyalty,
          sc: score,
          duration: 1200,
          ease: 'Cubic.easeOut',
          onUpdate: () => {
            loyaltyVal.setText(`${Math.round(obj.loy)}/100`);
            scoreVal.setText(String(Math.round(obj.sc)));
          },
        });
      },
    });

    // ── High score ───────────────────────────────────────────
    this.checkHighScore(score, cx, cy);

    // ── Restart button ───────────────────────────────────────
    const btnY = cy + 95;

    const btnGlow = this.add.rectangle(cx, btnY, 224, 52, 0x000000, 0)
      .setStrokeStyle(2, 0x8b5cf6)
      .setAlpha(0);

    const btnBg = this.add.rectangle(cx, btnY, 220, 48, 0x0f0a28)
      .setStrokeStyle(1, 0x8b5cf6)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0);

    const btnText = this.add.text(cx, btnY, '↺  НАЧАТЬ ЗАНОВО', {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '14px',
      color: '#c0a0ff',
      letterSpacing: 2,
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: [btnBg, btnText, btnGlow],
      alpha: 1,
      duration: 400,
      delay: 1000,
    });

    // Pulsing glow on button
    this.tweens.add({
      targets: btnGlow,
      alpha: { from: 0.3, to: 0.8 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 1500,
    });

    btnBg.on('pointerover', () => {
      btnBg.setFillStyle(0x1e0a40);
      btnText.setColor('#e8d0ff');
      this.tweens.add({ targets: [btnBg, btnGlow], scaleX: 1.04, scaleY: 1.04, duration: 100 });
    });
    btnBg.on('pointerout', () => {
      btnBg.setFillStyle(0x0f0a28);
      btnText.setColor('#c0a0ff');
      this.tweens.add({ targets: [btnBg, btnGlow], scaleX: 1, scaleY: 1, duration: 100 });
    });
    btnBg.on('pointerdown', async () => {
      try { await restartGame(); } catch { /* ignore */ }
      this.cameras.main.flash(300, 139, 92, 246, false);
      this.time.delayedCall(200, () => {
        this.scene.stop('GameOver');
        this.scene.stop('CybercafeScene');
        this.scene.start('CybercafeScene');
      });
    });

    // ── Falling skull particles ───────────────────────────────
    this.createSkullRain();
  }

  private createSkullRain() {
    const skulls = ['💀', '☠️'];
    let count = 0;
    const maxSkulls = 12;

    const spawnSkull = () => {
      if (count >= maxSkulls) return;
      count++;

      const x = Phaser.Math.Between(20, GAME_WIDTH - 20);
      const skull = this.add.text(x, -20, Phaser.Math.RND.pick(skulls), {
        fontSize: `${Phaser.Math.Between(10, 20)}px`,
      }).setOrigin(0.5).setAlpha(0.7).setDepth(1);

      this.tweens.add({
        targets: skull,
        y: GAME_HEIGHT + 30,
        x: x + Phaser.Math.Between(-30, 30),
        alpha: { from: 0.7, to: 0 },
        duration: Phaser.Math.Between(2000, 4000),
        ease: 'Linear',
        onComplete: () => skull.destroy(),
      });
    };

    // Spawn skulls with stagger
    for (let i = 0; i < maxSkulls; i++) {
      this.time.delayedCall(500 + i * 300, spawnSkull);
    }
  }

  private checkHighScore(score: number, cx: number, cy: number) {
    const key = 'toxicCafe_highScore';
    const best = parseInt(localStorage.getItem(key) || '0');
    if (score > best) {
      localStorage.setItem(key, String(score));

      const trophy = this.add.text(cx, cy + 32, '🏆 НОВЫЙ РЕКОРД!', {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '14px',
        color: '#ffcc00',
        letterSpacing: 2,
      }).setOrigin(0.5).setAlpha(0).setDepth(12);

      trophy.setShadow(0, 0, '#ffaa0088', 12, true, true);

      this.tweens.add({
        targets: trophy,
        alpha: 1,
        y: cy + 28,
        duration: 500,
        delay: 1200,
        ease: 'Back.easeOut',
      });

      // Pulse the trophy
      this.tweens.add({
        targets: trophy,
        scaleX: { from: 1, to: 1.06 },
        scaleY: { from: 1, to: 1.06 },
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: 1800,
      });
    } else {
      this.add.text(cx, cy + 32, `РЕКОРД: ${best} ОЧК`, {
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '11px',
        color: '#504060',
        letterSpacing: 1,
      }).setOrigin(0.5).setAlpha(0)
        .setDepth(12);

      // Reveal
      this.time.delayedCall(1100, () => {
        const el = this.children.list.find(
          c => c instanceof Phaser.GameObjects.Text &&
          (c as Phaser.GameObjects.Text).text.includes('РЕКОРД')
        ) as Phaser.GameObjects.Text | undefined;
        if (el) this.tweens.add({ targets: el, alpha: 1, duration: 400 });
      });
    }
  }
}
