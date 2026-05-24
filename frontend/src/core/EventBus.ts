import Phaser from 'phaser';

// Simple typed EventBus singleton built on Phaser.Events.EventEmitter
class EventBusClass extends Phaser.Events.EventEmitter {
  constructor() {
    super();
  }
}

export const EventBus = new EventBusClass();

// Event name constants
export const EV = {
  PC_CLICKED:     'pc:clicked',
  PC_SELECTED:    'pc:selected',
  STATE_UPDATED:  'state:updated',
  ACTION_SENT:    'action:sent',
  GAME_OVER:      'game:over',
} as const;
