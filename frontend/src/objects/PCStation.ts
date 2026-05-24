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

  private pcId: number;
  private pulseTween?: Phaser.Tweens.Tween;
  private lightTween?: Phaser.Tweens.Tween;
  private isSelected = false;
  private particles?: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene, x: number, y: number, pcId: number) {
    super(scene, x, y);
    this.pcId = pcId;
    this.build();
    scene.add.existing(this);
  }

  private build() {
    // ---- Chair (back layer) ----
    const chair = this.scene.add.ellipse(0, 46, 34, 20, 0x100e2a)
      .setStrokeStyle(1, 0x201c40);

    // ---- Desk base ----
    this.deskBase = this.scene.add.rectangle(0, 18, 74, 38, 0x141128)
      .setStrokeStyle(1, 0x2a2250);

    // ---- Monitor casing ----
    const monCase = this.scene.add.rectangle(0, -18, 52, 30, 0x0c0c22)
      .setStrokeStyle(1, 0x252545);

    // ---- Monitor stand ----
    const stand = this.scene.add.rectangle(0, -2, 6, 8, 0x0a0a1a);

    // ---- Incident glow halo (hidden by default) ----
    this.incidentGlow = this.scene.add.rectangle(0, -18, 60, 38, 0xff0000, 0);

    // ---- Monitor glow bg ----
    this.monitorGlow = this.scene.add.rectangle(0, -19, 44, 22, 0x000820);

    // ---- Monitor screen ----
    this.monitorScreen = this.scene.add.rectangle(0, -19, 40, 18, 0x001840);

    // ---- Screen scanline overlay ----
    const scanline = this.scene.add.rectangle(0, -19, 40, 1, 0x000000, 0.2);

    // ---- Status LED ----
    this.statusLight = this.scene.add.arc(24, -30, 4, 0, 360, false, 0x00ff88);

    // ---- Client emoji ----
    this.clientEmoji = this.scene.add.text(0, 42, '🧑‍💻', {
      fontSize: '18px',
    }).setOrigin(0.5);

    // ---- PC label ----
    this.pcLabel = this.scene.add.text(0, 30, `PC ${this.pcId}`, {
      fontSize: '8px',
      color: '#404060',
      fontFamily: 'JetBrains Mono, monospace',
    }).setOrigin(0.5);

    // ---- Selection ring ----
    this.selectionRing = this.scene.add.rectangle(0, 8, 86, 78, 0x000000, 0)
      .setStrokeStyle(2, 0x7c3aed)
      .setVisible(false);

    // Add in render order (bottom → top)
    this.add([
      this.selectionRing,
      chair,
      this.deskBase,
      stand,
      monCase,
      this.incidentGlow,
      this.monitorGlow,
      this.monitorScreen,
      scanline,
      this.statusLight,
      this.clientEmoji,
      this.pcLabel,
    ]);

    // Bubble (separate, floating above)
    this.bubble = new ChatBubble(this.scene, this.x, this.y - 60);

    // Make interactive
    this.setSize(86, 78);
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

  setStatus(status: PCStatus, hasIncident: boolean, clientName: string) {
    const colors = MONITOR_COLORS[status] || MONITOR_COLORS['occupied'];
    this.monitorScreen.setFillStyle(colors.screen);
    this.monitorGlow.setFillStyle(colors.glow);

    this.statusLight.setFillStyle(LED_COLORS[status] || 0x00ff88);
    this.clientEmoji.setText(CLIENT_EMOJIS[status] || '🧑‍💻');
    this.deskBase.setFillStyle(status === 'banned' ? 0x0d0a18 : 0x141128);

    const labelName = status === 'idle' ? `PC ${this.pcId}` : (clientName || `PC ${this.pcId}`);
    this.pcLabel.setText(labelName);
    this.pcLabel.setColor(hasIncident ? '#ff4444' : status === 'occupied' ? '#4488ff' : '#404060');

    if (hasIncident && status === 'occupied') {
      this.startIncidentEffect();
    } else {
      this.stopIncidentEffect();
    }
  }

  private startIncidentEffect() {
    // Pulsing red screen tween
    if (!this.pulseTween) {
      this.pulseTween = this.scene.tweens.add({
        targets: this.monitorScreen,
        fillColor: { from: 0x400010, to: 0x800020 },
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Incident glow halo pulse
    if (!this.lightTween) {
      this.incidentGlow.setAlpha(0);
      this.lightTween = this.scene.tweens.add({
        targets: this.incidentGlow,
        alpha: { from: 0, to: 0.15 },
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    this.statusLight.setFillStyle(0xff2222);

    // Red particle sparks (use pre-generated 'particle' texture)
    if (!this.particles) {
      this.particles = this.scene.add.particles(this.x, this.y - 30, 'particle', {
        speed: { min: 15, max: 40 },
        angle: { min: 250, max: 290 },
        scale: { start: 0.6, end: 0 },
        lifespan: 700,
        quantity: 1,
        frequency: 400,
        alpha: { start: 0.8, end: 0 },
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
      this.selectionRing.setStrokeStyle(2, 0x7c3aed);
      this.scene.tweens.add({
        targets: this.selectionRing,
        alpha: { from: 0.4, to: 1 },
        duration: 150,
        ease: 'Cubic.easeOut',
      });
    }
  }

  showBubble(text: string, isIncident = true) {
    this.bubble.show(text, { isIncident });
  }

  destroyStation() {
    this.stopIncidentEffect();
    this.bubble.destroy();
    this.destroy();
  }
}
