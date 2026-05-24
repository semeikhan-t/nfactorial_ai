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

    // Dark overlay
    const overlay = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0);
    this.tweens.add({
      targets: overlay,
      alpha: 0.88,
      duration: 600,
      ease: 'Cubic.easeOut',
    });

    // Panel background
    const panel = this.add.rectangle(cx, cy, 360, 260, 0x0a0820, 0);
    panel.setStrokeStyle(2, COLORS.NEON_RED);
    this.tweens.add({
      targets: panel,
      alpha: 1,
      duration: 400,
      delay: 200,
      ease: 'Cubic.easeOut',
    });

    // GAME OVER title
    const title = this.add.text(cx, cy - 90, 'GAME OVER', {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '36px',
      fontStyle: 'bold',
      color: '#ff3333',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: title,
      alpha: 1,
      y: cy - 95,
      duration: 500,
      delay: 300,
      ease: 'Back.easeOut',
    });

    // Flicker effect on title
    this.time.addEvent({
      delay: 80,
      repeat: 5,
      callback: () => {
        title.setAlpha(title.alpha > 0.5 ? 0.3 : 1);
      },
    });

    // Subtitle
    this.add.text(cx, cy - 52, 'КЛУБ ЗАКРЫТ. ВЫ УВОЛЕНЫ.', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '11px',
      color: '#ff8080',
      letterSpacing: 2,
    }).setOrigin(0.5).setAlpha(0)
      .setData('tweenStart', 400);

    // Stats
    const statsText = [
      `ФИНАЛЬНАЯ ЛОЯЛЬНОСТЬ: ${loyalty}/100`,
      `ОЧКИ: ${score}`,
    ];

    statsText.forEach((line, i) => {
      const txt = this.add.text(cx, cy - 10 + i * 28, line, {
        fontFamily: 'Orbitron, monospace',
        fontSize: '14px',
        color: '#c0c0e0',
      }).setOrigin(0.5).setAlpha(0);

      this.tweens.add({
        targets: txt,
        alpha: 1,
        duration: 400,
        delay: 500 + i * 120,
        ease: 'Cubic.easeOut',
      });
    });

    // High score from localStorage
    this.checkHighScore(score, cx, cy);

    // Restart button
    const btnBg = this.add.rectangle(cx, cy + 90, 200, 44, 0x1a0530)
      .setStrokeStyle(2, 0x7c3aed)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0);

    const btnText = this.add.text(cx, cy + 90, '↺  НАЧАТЬ ЗАНОВО', {
      fontFamily: 'Orbitron, sans-serif',
      fontSize: '13px',
      color: '#c0a0ff',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: [btnBg, btnText],
      alpha: 1,
      duration: 400,
      delay: 800,
      ease: 'Cubic.easeOut',
    });

    btnBg.on('pointerover', () => {
      btnBg.setFillStyle(0x2d0a5a);
      this.tweens.add({ targets: btnBg, scaleX: 1.04, scaleY: 1.04, duration: 100 });
    });
    btnBg.on('pointerout', () => {
      btnBg.setFillStyle(0x1a0530);
      this.tweens.add({ targets: btnBg, scaleX: 1, scaleY: 1, duration: 100 });
    });
    btnBg.on('pointerdown', async () => {
      try { await restartGame(); } catch { /* ignore */ }
      this.scene.stop('GameOver');
      this.scene.stop('CybercafeScene');
      this.scene.start('CybercafeScene');
    });

    // Reveal subtitle with delay
    this.time.delayedCall(400, () => {
      const sub = this.children.list.find(
        c => c instanceof Phaser.GameObjects.Text && (c as Phaser.GameObjects.Text).text.includes('ЗАКРЫТ')
      ) as Phaser.GameObjects.Text | undefined;
      if (sub) this.tweens.add({ targets: sub, alpha: 1, duration: 400 });
    });
  }

  private checkHighScore(score: number, cx: number, cy: number) {
    const key = 'toxicCafe_highScore';
    const best = parseInt(localStorage.getItem(key) || '0');
    if (score > best) {
      localStorage.setItem(key, String(score));
      this.add.text(cx, cy + 55, '🏆 НОВЫЙ РЕКОРД!', {
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '12px',
        color: '#ffcc00',
      }).setOrigin(0.5).setAlpha(0)
        .setData('tween', this.tweens.add({ targets: this, alpha: 1, delay: 700, duration: 400 }));
    } else {
      this.add.text(cx, cy + 55, `РЕКОРД: ${best} очков`, {
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '11px',
        color: '#606090',
      }).setOrigin(0.5);
    }
  }
}
