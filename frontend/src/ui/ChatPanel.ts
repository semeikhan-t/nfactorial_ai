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
  private pcHeader!: HTMLElement;
  private clockEl!: HTMLElement;
  private pcDots!: HTMLElement;
  private loadingEl!: HTMLElement;
  private scoreEl!: HTMLElement;
  private incidentCounterEl!: HTMLElement;

  // New Services DOM buttons
  private foodBtn!: HTMLButtonElement;
  private hwBtn!: HTMLButtonElement;
  private acBtn!: HTMLButtonElement;
  private warnBtn!: HTMLButtonElement;
  private netBtn!: HTMLButtonElement;
  private discountBtn!: HTMLButtonElement;

  constructor() {
    this.bindElements();
    this.bindEvents();
    this.startClock();
    this.startDiagnostics();
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
    this.pcHeader      = document.getElementById('pc-header')!;
    this.clockEl       = document.getElementById('header-clock')!;
    this.pcDots        = document.getElementById('pc-indicators')!;
    this.loadingEl     = document.getElementById('loading-indicator')!;
    this.scoreEl       = document.getElementById('score-value')!;
    this.incidentCounterEl = document.getElementById('incident-counter')!;

    // Bind new Services buttons
    this.foodBtn       = document.getElementById('btn-food') as HTMLButtonElement;
    this.hwBtn        = document.getElementById('btn-hw') as HTMLButtonElement;
    this.acBtn        = document.getElementById('btn-ac') as HTMLButtonElement;
    this.warnBtn      = document.getElementById('btn-warn') as HTMLButtonElement;
    this.netBtn       = document.getElementById('btn-net') as HTMLButtonElement;
    this.discountBtn  = document.getElementById('btn-discount') as HTMLButtonElement;
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

    // Bind click listeners for new services
    this.foodBtn.addEventListener('click', () => this.onQuickAction('give_food'));
    this.hwBtn.addEventListener('click', () => this.onQuickAction('replace_hw'));
    this.acBtn.addEventListener('click', () => this.onQuickAction('turn_ac'));
    this.warnBtn.addEventListener('click', () => this.onQuickAction('warn_neighbor'));
    this.netBtn.addEventListener('click', () => this.onQuickAction('fix_network'));
    this.discountBtn.addEventListener('click', () => this.onQuickAction('discount'));
  }

  private render() {
    if (!this.gameState) return;
    this.updateLoyalty(this.gameState.loyalty);
    this.updateScore(this.gameState.score);
    this.updateIncidentCounter(this.gameState.pcs);
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

  private updateScore(score: number) {
    if (this.scoreEl) this.scoreEl.textContent = String(score);
  }

  private updateIncidentCounter(pcs: import('../types').PC[]) {
    const count = pcs.filter(p => p.current_incident).length;
    if (this.incidentCounterEl) {
      this.incidentCounterEl.textContent = `⚠ ${count} ИНЦИДЕНТ${count === 1 ? '' : 'ОВ'}`;
      this.incidentCounterEl.classList.toggle('has-incidents', count > 0);
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

  private updatePCHeader(pc: import('../types').PC) {
    this.pcTitle.textContent = `PC #${pc.id} — ${pc.client_name || '(пусто)'}`;

    if (pc.current_incident) {
      this.pcBadge.textContent = '🔴 ИНЦИДЕНТ';
      this.pcBadge.className = 'incident';
      this.pcHeader?.classList.remove('is-ok');
      this.pcHeader?.classList.add('has-incident');
    } else if (pc.status === 'occupied') {
      this.pcBadge.textContent = `🟢 ${pc.minutes_left} МИН`;
      this.pcBadge.className = 'ok';
      this.pcHeader?.classList.remove('has-incident');
      this.pcHeader?.classList.add('is-ok');
    } else if (pc.status === 'rebooting') {
      this.pcBadge.textContent = '🔄 РЕБУТ';
      this.pcBadge.className = 'rebooting';
      this.pcHeader?.classList.remove('has-incident', 'is-ok');
    } else if (pc.status === 'banned') {
      this.pcBadge.textContent = '🚫 КИКНУТ';
      this.pcBadge.className = 'idle';
      this.pcHeader?.classList.remove('has-incident', 'is-ok');
    } else {
      this.pcBadge.textContent = '💤 СВОБОДЕН';
      this.pcBadge.className = 'idle';
      this.pcHeader?.classList.remove('has-incident', 'is-ok');
    }
  }

  private updateMessages(messages: GameState['messages']) {
    const atBottom =
      this.msgContainer.scrollHeight - this.msgContainer.scrollTop - this.msgContainer.clientHeight < 30;

    this.msgContainer.innerHTML = '';
    messages.slice(-60).forEach(msg => {
      const div = document.createElement('div');
      div.className = `message message-${msg.sender}`;

      const avatarIcon = msg.sender === 'client' ? '👤' : msg.sender === 'admin' ? '🎮' : '⚙️';

      const avatar = document.createElement('div');
      avatar.className = 'msg-avatar';
      avatar.textContent = avatarIcon;

      const body = document.createElement('div');
      body.className = 'msg-body';

      const bubble = document.createElement('div');
      bubble.className = 'msg-bubble';
      bubble.textContent = msg.text;

      body.appendChild(bubble);
      div.appendChild(avatar);
      div.appendChild(body);
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

    // Toggle new buttons
    this.foodBtn.disabled = !canAct;
    this.hwBtn.disabled = !canAct;
    this.acBtn.disabled = !canAct;
    this.warnBtn.disabled = !canAct;
    this.netBtn.disabled = !canAct;
    this.discountBtn.disabled = !canAct;
  }

  private async onSendText() {
    const text = this.textInput.value.trim();
    if (!text || this.isLoading) return;
    this.textInput.value = '';
    await this.doAction('text', text);
  }

  private async onQuickAction(type: 'add_time' | 'reboot' | 'ban' | 'give_food' | 'replace_hw' | 'turn_ac' | 'warn_neighbor' | 'fix_network' | 'discount') {
    if (this.isLoading) return;
    await this.doAction(type);
  }

  private async doAction(type: 'text' | 'add_time' | 'reboot' | 'ban' | 'give_food' | 'replace_hw' | 'turn_ac' | 'warn_neighbor' | 'fix_network' | 'discount', text?: string) {
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

  private startDiagnostics() {
    const logEl = document.querySelector('.terminal-logs');
    if (!logEl) return;

    const logTemplates = [
      '<span class="log-tag tag-ok">[OK]</span> Temperature check complete: Core within safety bounds.',
      '<span class="log-tag tag-sys">[SYS]</span> Running garbage collection... freed 14MB memory.',
      '<span class="log-tag tag-info">[INFO]</span> Incoming packet load: {traffic} pps.',
      '<span class="log-tag tag-ok">[OK]</span> Syncing database checkpoints... success.',
      '<span class="log-tag tag-info">[INFO]</span> Active clients: {active_clients}/5. Net load stable.',
      '<span class="log-tag tag-warn">[WARN]</span> Port 5175 traffic surge: Check routing logs.',
      '<span class="log-tag tag-sys">[SYS]</span> System report generated: Health Index 98.4%.',
      '<span class="log-tag tag-ok">[OK]</span> Firewall tables rebuilt successfully.',
      '<span class="log-tag tag-info">[INFO]</span> Mainframe CPU load: {cpu}%. GPU load: {gpu}%.'
    ];

    setInterval(() => {
      // Pick a random template
      let template = logTemplates[Math.floor(Math.random() * logTemplates.length)];
      
      // Interpolate values
      template = template
        .replace('{traffic}', String(Math.floor(Math.random() * 40 + 10)))
        .replace('{active_clients}', String(this.gameState?.pcs.filter(p => p.status === 'occupied').length || 0))
        .replace('{cpu}', String(Math.floor(Math.random() * 15 + 25)))
        .replace('{gpu}', String(Math.floor(Math.random() * 20 + 40)));

      const div = document.createElement('div');
      div.className = 'log-line';
      div.innerHTML = template;

      logEl.appendChild(div);

      // Remove oldest log if list is too long (keep last 30 logs)
      while (logEl.children.length > 30) {
        logEl.removeChild(logEl.firstChild!);
      }

      // Scroll to bottom
      logEl.scrollTop = logEl.scrollHeight;
    }, 4000);
  }
}
