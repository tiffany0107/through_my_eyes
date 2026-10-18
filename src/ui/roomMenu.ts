import { ROOMS, RoomId } from '../config';
import { RoomResult } from '../rooms/Room';
import { el, showModal } from './modal';

/** Jump-to-room overlay, handy during judging. */
export function showRoomMenu(root: HTMLElement, results: Map<RoomId, RoomResult>, onPick: (id: RoomId | 'lobby') => void, onClose: () => void): void {
  const items = ROOMS.map((r) => {
    const done = results.get(r.id)?.with !== undefined;
    return `<li><button data-id="${r.id}"><span class="swatch" style="background:${r.id === 'reflection' ? '#9DB39A' : r.accent}" aria-hidden="true">${r.icon}</span><span><strong>${r.title}</strong><small>${r.tagline}</small></span>${done ? '<span class="done">✓ Done</span>' : ''}</button></li>`;
  }).join('');
  const c = el(`
    <h2>Rooms</h2>
    <p class="muted">Jump straight to any room.</p>
    <ul class="room-list">
      <li><button data-id="lobby"><span class="swatch" style="background:#E2D8C8" aria-hidden="true">🏛️</span><span><strong>Lobby</strong><small>Back to the start</small></span></button></li>
      ${items}
    </ul>
    <div class="btn-row"><button class="btn" data-close>Close</button></div>`);
  const close = showModal(root, c);
  c.querySelectorAll<HTMLButtonElement>('[data-id]').forEach((b) => b.addEventListener('click', () => { close(); onPick(b.dataset.id as RoomId | 'lobby'); }));
  c.querySelector('[data-close]')!.addEventListener('click', () => { close(); onClose(); });
}
