import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './core/Constants';
import { Boot } from './scenes/Boot';
import { Preloader } from './scenes/Preloader';
import { CybercafeScene } from './scenes/CybercafeScene';
import { GameOver } from './scenes/GameOver';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: COLORS.BG_DEEP,
  parent: 'game-container',
  pixelArt: false,
  antialias: true,
  scene: [Boot, Preloader, CybercafeScene, GameOver],
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.NO_CENTER,
  },
};

export default config;
