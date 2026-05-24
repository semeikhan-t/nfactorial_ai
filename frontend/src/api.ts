import type { GameState, ActionResponse } from './types';

// Use dynamic API base URL for production, default to empty string for local Vite proxy
const API_BASE = (import.meta as any).env?.VITE_API_URL || '';

export async function fetchState(): Promise<GameState> {
  const res = await fetch(`${API_BASE}/state`);
  if (!res.ok) throw new Error('Failed to fetch state');
  return res.json();
}

export async function sendAction(
  pcId: number,
  actionType: 'text' | 'add_time' | 'reboot' | 'ban' | 'give_food' | 'replace_hw' | 'turn_ac' | 'warn_neighbor' | 'fix_network' | 'discount',
  text?: string
): Promise<ActionResponse> {
  const res = await fetch(`${API_BASE}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pc_id: pcId, action_type: actionType, text: text ?? null }),
  });
  if (!res.ok) throw new Error('Failed to send action');
  return res.json();
}

export async function restartGame(): Promise<void> {
  await fetch(`${API_BASE}/restart`, { method: 'POST' });
}

