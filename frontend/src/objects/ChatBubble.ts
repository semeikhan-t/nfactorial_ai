import Phaser from 'phaser';
import { COLORS } from '../core/Constants';

interface ChatBubbleConfig {
  isIncident?: boolean;
}

export class ChatBubble extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private textObj: Phaser.GameObjects.Text;
  private hideTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.bg = scene.add.graphics();
    this.textObj = scene.add.text(0, 0, '', {
      fontSize: '9px',
      color: '#ffeeff',
      fontFamily: 'JetBrains Mono, monospace',
      wordWrap: { width: 130 },
      align: 'center',
    }).setOrigin(0.5);

    this.add([this.bg, this.textObj]);
    this.setVisible(false);
    this.setDepth(50);
    scene.add.existing(this);
  }

  show(text: string, config: ChatBubbleConfig = {}) {
    const display = text.length > 70 ? text.substring(0, 67) + '...' : text;
    this.textObj.setText(display);

    const bounds = this.textObj.getBounds();
    const pad = 8;
    const w = Math.max(bounds.width + pad * 2, 80);
    const h = bounds.height + pad * 2;

    const bgColor = config.isIncident ? 0x2a0015 : 0x0c0c2a;
    const borderColor = config.isIncident ? 0xff2266 : 0x4466ff;

    this.bg.clear();
    this.bg.fillStyle(bgColor, 0.95);
    this.bg.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
    this.bg.lineStyle(1, borderColor, 1);
    this.bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 6);
    // Arrow pointing down
    this.bg.fillStyle(bgColor, 0.95);
    this.bg.fillTriangle(-5, h / 2 - 1, 5, h / 2 - 1, 0, h / 2 + 7);
    this.bg.lineStyle(1, borderColor, 1);
    this.bg.strokeTriangle(-5, h / 2 - 1, 5, h / 2 - 1, 0, h / 2 + 7);

    // Reset & animate in
    this.setAlpha(0);
    this.setY(-70);
    this.setVisible(true);

    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      y: -62,
      duration: 350,
      ease: 'Back.easeOut',
    });

    if (this.hideTimer) this.hideTimer.remove();
    this.hideTimer = this.scene.time.delayedCall(6000, () => this.hide());
  }

  hide() {
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      y: this.y - 6,
      duration: 250,
      ease: 'Cubic.easeIn',
      onComplete: () => this.setVisible(false),
    });
  }
}
