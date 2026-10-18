import { COPY, ROOMS, RoomInfo } from '../config';
import { el, showModal } from './modal';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** First screen: what this is, controls, volume note. */
export function showStart(root: HTMLElement, onEnter: () => void): void {
  const dots = ROOMS.filter((r) => r.id !== 'reflection').map((r) => `<span style="background:${r.accent}" title="${r.title}">${r.icon}</span>`).join('');
  const c = el(`
    <h1>${COPY.title}</h1>
    <p class="tagline">${COPY.subtitle}</p>
    <div class="dots" aria-hidden="true">${dots}</div>
    <p>${COPY.description}</p>
    <div class="controls-list">
      <span><kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd></span><span>Move (arrow keys also work)</span>
      <span><kbd>Drag</kbd> or <kbd>M</kbd></span><span>Look around (M locks the mouse, Esc releases it)</span>
      <span><kbd>Click</kbd> or <kbd>E</kbd></span><span>Interact, or click the floor to walk there</span>
    </div>
    <p class="note">🎧 Headphones recommended. Some rooms use sound; you can change the volume at any time. ${esc(COPY.disclaimer)}</p>
    <div class="btn-row"><button class="btn primary">Enter the gallery →</button></div>`);
  c.classList.add('start');
  const close = showModal(root, c);
  c.querySelector('button')!.addEventListener('click', () => { close(); onEnter(); });
}

/** Card shown before a room: quote, stat, task, warnings. */
export function showIntro(root: HTMLElement, info: RoomInfo, onBegin: () => void, onSkip: () => void): void {
  const c = el(`
    <div class="eyebrow"><span class="icon" aria-hidden="true">${info.icon}</span> Room</div>
    <h2>${esc(info.title)}</h2>
    <p class="muted">${esc(info.tagline)}</p>
    ${info.quote ? `<blockquote class="quote">“${esc(info.quote)}”<cite>${esc(info.quoteBy)}</cite></blockquote>` : ''}
    <div class="stat"><b class="stat-label">Why it matters</b>${esc(info.stat)}${info.source ? `<small>Source: ${esc(info.source)}</small>` : ''}</div>
    ${info.warning ? `<div class="warning" role="note"><span aria-hidden="true">⚠️</span><span>${esc(info.warning)}</span></div>` : ''}
    ${info.note ? `<p class="note">${esc(info.note)}</p>` : ''}
    <p class="muted" style="margin-bottom:4px">Your task</p>
    <p class="task">${esc(info.task)}</p>
    <div class="btn-row">
      <button class="btn primary" data-a="begin">Begin</button>
      <button class="btn" data-a="skip">Back to corridor</button>
    </div>`);
  const close = showModal(root, c, info.accent);
  c.querySelector('[data-a=begin]')!.addEventListener('click', () => { close(); onBegin(); });
  c.querySelector('[data-a=skip]')!.addEventListener('click', () => { close(); onSkip(); });
}
