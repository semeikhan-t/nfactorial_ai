import type { GameState, ActionResponse } from './types';

export async function fetchState(): Promise<GameState> {
  const res = await fetch('/state');
  if (!res.ok) throw new Error('Failed to fetch state');
  return res.json();
}

export async function sendAction(
  pcId: number,
  actionType: 'text' | 'add_time' | 'reboot' | 'ban',
  text?: string
): Promise<ActionResponse> {
  const res = await fetch('/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pc_id: pcId, action_type: actionType, text: text ?? null }),
  });
  if (!res.ok) throw new Error('Failed to send action');
  return res.json();
}

export async function restartGame(): Promise<void> {
  await fetch('/restart', { method: 'POST' });
}
