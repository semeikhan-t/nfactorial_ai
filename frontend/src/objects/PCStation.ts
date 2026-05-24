import Phaser from 'phaser';
import { MONITOR_COLORS, LED_COLORS, CLIENT_EMOJIS } from '../core/Constants';
import { ChatBubble } from './ChatBubble';
import type { PCStatus } from '../types';

export class PCStation extends Phaser.GameObjects.Container {
  private monitorScreen!: Phaser.GameObjects.Rectangle;
  private monitorGlow!: Phaser.GameObjects.Rectangle;
  private statusLight!: Phaser.GameObjects.Arc;
  private clientEmoji!: Phaser.GameObjects.Text;
  private pcLabel!: Phaser.GameObjects.Text;
  private selectionRing!: Phaser.GameObjects.Rectangle;
  private deskBase!: Phaser.GameObjects.Rectangle;
  private bubble!: ChatBubble;
  private incidentGlow!: Phaser.GameObjects.Rectangle;
  private screenScanline!: Phaser.GameObjects.Graphics;
  private lampGlow!: Phaser.GameObjects.Arc;
  private mouseObj!: Phaser.GameObjects.Ellipse;

  private pcId: number;
  private pulseTween?: Phaser.Tweens.Tween;
  private lightTween?: Phaser.Tweens.Tween;
  private bobTween?: Phaser.Tweens.Tween;
  private isSelected = false;
  private particles?: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene, x: number, y: number, pcId: number) {
    super(scene, x, y);
    this.pcId = pcId;
    this.build();
    scene.add.existing(this);
    this.startBobAnimation();
  }

  private build() {
    // ── Chair (back layer) ──────────────────────────────────
    const chair = this.scene.add.ellipse(0, 50, 36, 20, 0x0d0c22)
      .setStrokeStyle(1, 0x1e1a40);

    // Chair back
    const chairBack = this.scene.add.rectangle(0, 36, 12, 14, 0x0e0c24)
      .setStrokeStyle(1, 0x1c1840);

    // ── Desk base ───────────────────────────────────────────
    this.deskBase = this.scene.add.rectangle(0, 20, 80, 40, 0x10102a)
      .setStrokeStyle(1, 0x2a2260);

    // Desk corner accents (neon purple)
    const cornerTL = this.scene.add.rectangle(-38, 0, 3, 3, 0x8b5cf6);
    const cornerTR = this.scene.add.rectangle(38, 0, 3, 3, 0x8b5cf6);
    const cornerBL = this.scene.add.rectangle(-38, 40, 3, 3, 0x8b5cf6);
    const cornerBR = this.scene.add.rectangle(38, 40, 3, 3, 0x8b5cf6);

    // ── Monitor casing ──────────────────────────────────────
    const monCase = this.scene.add.rectangle(0, -20, 58, 34, 0x0c0b20)
      .setStrokeStyle(1.5, 0x222248);

    // ── Monitor stand ───────────────────────────────────────
    const standPole = this.scene.add.rectangle(0, -2, 5, 12, 0x0a0920);
    const standBase = this.scene.add.rectangle(0, 4, 18, 4, 0x0c0b22)
      .setStrokeStyle(1, 0x1a1838);

    // ── Incident glow halo ──────────────────────────────────
    this.incidentGlow = this.scene.add.rectangle(0, -20, 66, 42, 0xff0000, 0);

    // ── Monitor glow bg ─────────────────────────────────────
    this.monitorGlow = this.scene.add.rectangle(0, -21, 48, 26, 0x000820);

    // ── Monitor screen ──────────────────────────────────────
    this.monitorScreen = this.scene.add.rectangle(0, -21, 44, 22, 0x001840);

    // ── Screen scanlines (drawn on graphics) ─────────────────
    this.screenScanline = this.scene.add.graphics();
    this.screenScanline.fillStyle(0x000000, 0.15);
    for (let sy = -31; sy < -10; sy += 3) {
      this.screenScanline.fillRect(-22, sy, 44, 1);
    }

    // ── Bezel screws ────────────────────────────────────────
    const screwTL = this.scene.add.arc(-24, -32, 1.5, 0, 360, false, 0x1a1838);
    const screwTR = this.scene.add.arc(24, -32, 1.5, 0, 360, false, 0x1a1838);

    // ── Status LED ──────────────────────────────────────────
    this.statusLight = this.scene.add.arc(28, -33, 4, 0, 360, false, 0x00ff88);

    // ── Desk lamp glow (ambient light on desk) ───────────────
    this.lampGlow = this.scene.add.arc(30, 8, 10, 0, 360, false, 0x8b5cf6, 0.08);

    // ── Keyboard ────────────────────────────────────────────
    const keyboard = this.scene.add.rectangle(-4, 12, 46, 12, 0x0c0c24)
      .setStrokeStyle(1, 0x1e1e44);

    // Keyboard keys row 1
    const keyRow1 = this.scene.add.graphics();
    keyRow1.fillStyle(0x141428, 1);
    for (let k = 0; k < 8; k++) {
      keyRow1.fillRect(-20 + k * 5.5, 7, 4, 3);
    }
    // Keyboard keys row 2
    keyRow1.fillStyle(0x141430, 1);
    for (let k = 0; k < 7; k++) {
      keyRow1.fillRect(-17 + k * 5.5, 12, 4, 3);
    }

    // ── Mouse ───────────────────────────────────────────────
    this.mouseObj = this.scene.add.ellipse(24, 12, 10, 14, 0x0e0e28)
      .setStrokeStyle(1, 0x1e1e46);

    // Mouse scroll wheel
    const mouseWheel = this.scene.add.rectangle(24, 10, 2, 5, 0x282848);

    // ── Client emoji ────────────────────────────────────────
    this.clientEmoji = this.scene.add.text(0, 46, '🧑‍💻', {
      fontSize: '20px',
    }).setOrigin(0.5);

    // ── PC label ────────────────────────────────────────────
    this.pcLabel = this.scene.add.text(0, 33, `PC ${this.pcId}`, {
      fontSize: '9px',
      color: '#404070',
      fontFamily: 'JetBrains Mono, monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // ── Selection ring ──────────────────────────────────────
    this.selectionRing = this.scene.add.rectangle(0, 10, 94, 86, 0x000000, 0)
      .setStrokeStyle(2, 0x8b5cf6)
      .setVisible(false);

    // Add in render order (bottom → top)
    this.add([
      this.selectionRing,
      chair,
      chairBack,
      this.deskBase,
      cornerTL, cornerTR, cornerBL, cornerBR,
      this.lampGlow,
      standPole,
      standBase,
      monCase,
      this.incidentGlow,
      this.monitorGlow,
      this.monitorScreen,
      this.screenScanline,
      screwTL, screwTR,
      this.statusLight,
      keyboard,
      keyRow1,
      this.mouseObj,
      mouseWheel,
      this.clientEmoji,
      this.pcLabel,
    ]);

    // Bubble (separate, floating above)
    this.bubble = new ChatBubble(this.scene, this.x, this.y - 60);

    // Make interactive
    this.setSize(94, 86);
    this.setInteractive({ useHandCursor: true });

    this.on('pointerdown', () => {
      this.scene.events.emit('pc-clicked', this.pcId);
    });
    this.on('pointerover', () => {
      if (!this.isSelected) {
        this.selectionRing.setVisible(true);
        this.selectionRing.setStrokeStyle(2, 0x4444aa);
      }
    });
    this.on('pointerout', () => {
      if (!this.isSelected) {
        this.selectionRing.setVisible(false);
      }
    });

    this.setDepth(10);
  }

  private startBobAnimation() {
    // Gentle floating bob on the client emoji
    this.bobTween = this.scene.tweens.add({
      targets: this.clientEmoji,
      y: { from: 44, to: 48 },
      duration: 1800 + this.pcId * 200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  setStatus(status: PCStatus, hasIncident: boolean, clientName: string) {
    const colors = MONITOR_COLORS[status] || MONITOR_COLORS['occupied'];
    this.monitorScreen.setFillStyle(colors.screen);
    this.monitorGlow.setFillStyle(colors.glow);

    this.statusLight.setFillStyle(LED_COLORS[status] || 0x00ff88);
    this.clientEmoji.setText(CLIENT_EMOJIS[status] || '🧑‍💻');
    this.deskBase.setFillStyle(status === 'banned' ? 0x0d0a18 : 0x10102a);

    const labelName = status === 'idle' ? `PC ${this.pcId}` : (clientName || `PC ${this.pcId}`);
    this.pcLabel.setText(labelName);
    this.pcLabel.setColor(
      hasIncident ? '#ff4455'
      : status === 'occupied' ? '#5588ff'
      : status === 'rebooting' ? '#ffcc00'
      : '#404070'
    );

    // Lamp glow color by status
    const lampColor = hasIncident ? 0xff3344
      : status === 'occupied' ? 0x8b5cf6
      : status === 'rebooting' ? 0xffcc00
      : 0x000000;
    this.lampGlow.setFillStyle(lampColor, hasIncident ? 0.15 : 0.06);

    if (hasIncident && status === 'occupied') {
      this.startIncidentEffect();
    } else {
      this.stopIncidentEffect();
    }
  }

  private startIncidentEffect() {
    if (!this.pulseTween) {
      this.pulseTween = this.scene.tweens.add({
        targets: this.monitorScreen,
        fillColor: { from: 0x400010, to: 0x900020 },
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    if (!this.lightTween) {
      this.incidentGlow.setAlpha(0);
      this.lightTween = this.scene.tweens.add({
        targets: this.incidentGlow,
        alpha: { from: 0, to: 0.2 },
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    this.statusLight.setFillStyle(0xff2233);

    if (!this.particles) {
      this.particles = this.scene.add.particles(this.x, this.y - 30, 'particle', {
        speed: { min: 18, max: 45 },
        angle: { min: 250, max: 290 },
        scale: { start: 0.7, end: 0 },
        lifespan: 750,
        quantity: 1,
        frequency: 350,
        alpha: { start: 0.9, end: 0 },
      });
      this.particles.setDepth(20);
    }
  }

  private stopIncidentEffect() {
    if (this.pulseTween) {
      this.pulseTween.stop();
      this.pulseTween = undefined;
      this.monitorScreen.setFillStyle(MONITOR_COLORS['occupied'].screen);
    }
    if (this.lightTween) {
      this.lightTween.stop();
      this.lightTween = undefined;
      this.incidentGlow.setAlpha(0);
    }
    if (this.particles) {
      this.particles.destroy();
      this.particles = undefined;
    }
  }

  setSelected(selected: boolean) {
    this.isSelected = selected;
    this.selectionRing.setVisible(selected);
    if (selected) {
      this.selectionRing.setStrokeStyle(2.5, 0x8b5cf6);
      this.scene.tweens.add({
        targets: this.selectionRing,
        alpha: { from: 0.3, to: 1 },
        duration: 200,
        ease: 'Cubic.easeOut',
      });
    }
  }

  showBubble(text: string, isIncident = true) {
    this.bubble.show(text, { isIncident });
  }

  destroyStation() {
    this.stopIncidentEffect();
    if (this.bobTween) this.bobTween.stop();
    this.bubble.destroy();
    this.destroy();
  }
}
