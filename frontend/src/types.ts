export type PCStatus = 'idle' | 'occupied' | 'rebooting' | 'banned';

export interface PC {
  id: number;
  status: PCStatus;
  client_name: string;
  minutes_left: number;
  current_incident: string | null;
  incident_type: string | null;
  incident_ticks: number;
}

export interface ChatMessage {
  id: number;
  pc_id: number;
  sender: 'client' | 'admin' | 'system';
  text: string;
  timestamp: number;
}

export interface GameState {
  loyalty: number;
  pcs: PC[];
  messages: ChatMessage[];
  tick: number;
  game_over: boolean;
  score: number;
  msg_counter: number;
}

export interface ActionResponse {
  ok: boolean;
  llm_reply: string | null;
  loyalty_delta: number | null;
  new_loyalty: number;
}
