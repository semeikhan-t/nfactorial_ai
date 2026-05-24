import Phaser from 'phaser';
import config from './config';
import { ChatPanel } from './ui/ChatPanel';

// Boot Phaser game
new Phaser.Game(config);

// Boot HTML chat panel controller
new ChatPanel();
