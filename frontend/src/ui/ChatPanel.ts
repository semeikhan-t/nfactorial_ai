import type { GameState, PC } from '../types';
import { fetchState, sendAction, restartGame } from '../api';
import { EventBus, EV } from '../core/EventBus';

export class ChatPanel {
  private selectedPcId = 1;
  private gameState: GameState | null = null;
  private isLoading = false;

  // DOM refs
  private msgContainer!: HTMLElement;
  private textInput!: HTMLInputElement;
  private sendBtn!: HTMLButtonElement;
  private addTimeBtn!: HTMLButtonElement;
  private rebootBtn!: HTMLButtonElement;
  private banBtn!: HTMLButtonElement;
  private loyaltyFill!: HTMLElement;
  private loyaltyText!: HTMLElement;
  private pcTitle!: HTMLElement;
  private pcBadge!: HTMLElement;
  private clockEl!: HTMLElement;
  private pcDots!: HTMLElement;
  private loadingEl!: HTMLElement;

  constructor() {
    this.bindElements();
    this.bindEvents();
    this.startClock();
  }

  private bindElements() {
    this.msgContainer = document.getElementById('message-list')!;
    this.textInput     = document.getElementById('text-input') as HTMLInputElement;
    this.sendBtn       = document.getElementById('send-btn') as HTMLButtonElement;
    this.addTimeBtn    = document.getElementById('add-time-btn') as HTMLButtonElement;
    this.rebootBtn     = document.getElementById('reboot-btn') as HTMLButtonElement;
    this.banBtn        = document.getElementById('ban-btn') as HTMLButtonElement;
    this.loyaltyFill   = document.getElementById('loyalty-fill')!;
    this.loyaltyText   = document.getElementById('loyalty-text')!;
    this.pcTitle       = document.getElementById('pc-title')!;
    this.pcBadge       = document.getElementById('pc-status-badge')!;
    this.clockEl       = document.getElementById('header-clock')!;
    this.pcDots        = document.getElementById('pc-indicators')!;
    this.loadingEl     = document.getElementById('loading-indicator')!;
  }

  private bindEvents() {
    // Phaser → HTML
    EventBus.on(EV.STATE_UPDATED, (state: GameState) => {
      this.gameState = state;
      this.render();
    });

    EventBus.on(EV.PC_SELECTED, (pcId: number) => {
      this.selectedPcId = pcId;
      this.render();
    });

    // User actions
    this.sendBtn.addEventListener('click', () => this.onSendText());
    this.textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.onSendText(); }
    });
    this.addTimeBtn.addEventListener('click', () => this.onQuickAction('add_time'));
    this.rebootBtn.addEventListener('click', () => this.onQuickAction('reboot'));
    this.banBtn.addEventListener('click', () => this.onQuickAction('ban'));
  }

  private render() {
    if (!this.gameState) return;
    this.updateLoyalty(this.gameState.loyalty);
    this.updatePCDots(this.gameState.pcs);

    const pc = this.gameState.pcs.find(p => p.id === this.selectedPcId);
    if (!pc) return;
    this.updatePCHeader(pc);
    this.updateMessages(this.gameState.messages.filter(m => m.pc_id === this.selectedPcId));
    this.updateButtonStates(pc);
  }

  private updateLoyalty(val: number) {
    this.loyaltyFill.style.width = `${val}%`;
    this.loyaltyText.textContent = `${val}/100`;
    if (val > 60) {
      this.loyaltyFill.style.background = 'linear-gradient(90deg, #00cc44, #00ff88)';
    } else if (val > 30) {
      this.loyaltyFill.style.background = 'linear-gradient(90deg, #cc7700, #ffcc00)';
    } else {
      this.loyaltyFill.style.background = 'linear-gradient(90deg, #cc1100, #ff3300)';
    }
  }

  private updatePCDots(pcs: PC[]) {
    this.pcDots.innerHTML = '';
    pcs.forEach(pc => {
      const dot = document.createElement('div');
      dot.className = `pc-dot${pc.id === this.selectedPcId ? ' active' : ''}`;
      dot.dataset.pcId = String(pc.id);

      const dotStatus = pc.current_incident ? 'incident'
        : pc.status === 'occupied' ? 'ok'
        : pc.status;

      dot.innerHTML = `
        <div class="dot-status ${dotStatus}"></div>
        <div class="dot-label">${pc.client_name ? pc.client_name.substring(0, 4) : `PC${pc.id}`}</div>
      `;
      dot.addEventListener('click', () => EventBus.emit(EV.PC_CLICKED, pc.id));
      this.pcDots.appendChild(dot);
    });
  }

  private updatePCHeader(pc: PC) {
    this.pcTitle.textContent = `PC #${pc.id} — ${pc.client_name || '(пусто)'}`;

    if (pc.current_incident) {
      this.pcBadge.textContent = '🔴 ИНЦИДЕНТ';
      this.pcBadge.className = 'incident';
    } else if (pc.status === 'occupied') {
      this.pcBadge.textContent = `🟢 ${pc.minutes_left} МИН`;
      this.pcBadge.className = 'ok';
    } else if (pc.status === 'rebooting') {
      this.pcBadge.textContent = '🔄 РЕБУТ';
      this.pcBadge.className = 'rebooting';
    } else if (pc.status === 'banned') {
      this.pcBadge.textContent = '🚫 КИКНУТ';
      this.pcBadge.className = 'idle';
    } else {
      this.pcBadge.textContent = '💤 СВОБОДЕН';
      this.pcBadge.className = 'idle';
    }
  }

  private updateMessages(messages: GameState['messages']) {
    const prevScroll = this.msgContainer.scrollTop;
    const atBottom = this.msgContainer.scrollHeight - prevScroll - this.msgContainer.clientHeight < 30;

    this.msgContainer.innerHTML = '';
    messages.slice(-60).forEach(msg => {
      const div = document.createElement('div');
      div.className = `message message-${msg.sender}`;

      const icon = msg.sender === 'client' ? '👤' : msg.sender === 'admin' ? '🎮' : '⚙️';
      const bubble = document.createElement('div');
      bubble.className = 'msg-bubble';
      bubble.textContent = msg.text;

      const iconEl = document.createElement('span');
      iconEl.className = 'msg-sender';
      iconEl.textContent = icon;

      div.appendChild(iconEl);
      div.appendChild(bubble);
      this.msgContainer.appendChild(div);
    });

    if (atBottom) {
      this.msgContainer.scrollTop = this.msgContainer.scrollHeight;
    }
  }

  private updateButtonStates(pc: PC) {
    const canAct = pc.status === 'occupied' && !this.isLoading;
    this.addTimeBtn.disabled = !canAct;
    this.rebootBtn.disabled = !canAct;
    this.banBtn.disabled = !canAct;
    this.sendBtn.disabled = !canAct;
    this.textInput.disabled = !canAct;
  }

  private async onSendText() {
    const text = this.textInput.value.trim();
    if (!text || this.isLoading) return;
    this.textInput.value = '';
    await this.doAction('text', text);
  }

  private async onQuickAction(type: 'add_time' | 'reboot' | 'ban') {
    if (this.isLoading) return;
    await this.doAction(type);
  }

  private async doAction(type: 'text' | 'add_time' | 'reboot' | 'ban', text?: string) {
    this.setLoading(true);
    try {
      await sendAction(this.selectedPcId, type, text);
      const state = await fetchState();
      this.gameState = state;
      this.render();
      EventBus.emit(EV.STATE_UPDATED, state);
      EventBus.emit(EV.ACTION_SENT);
    } catch (e) {
      console.error('Action failed:', e);
    } finally {
      this.setLoading(false);
    }
  }

  private setLoading(loading: boolean) {
    this.isLoading = loading;
    this.loadingEl.style.display = loading ? 'flex' : 'none';
    this.sendBtn.textContent = loading ? '⏳' : '↑';
  }

  private startClock() {
    const update = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      if (this.clockEl) this.clockEl.textContent = `${h}:${m}:${s}`;
    };
    update();
    setInterval(update, 1000);
  }
}
