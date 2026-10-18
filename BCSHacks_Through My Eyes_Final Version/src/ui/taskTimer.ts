import { RoomInfo } from '../config';
import { el, showModal } from './modal';

export class TaskTimer {
  private start = 0;
  running = false;
  begin(): void { this.start = performance.now(); this.running = true; }
  stop(): number { this.running = false; return this.elapsed(); }
  elapsed(): number { return (performance.now() - this.start) / 1000; }
}

const fmt = (s: number) => `${s.toFixed(1)}s`;

/** After the first attempt: show the time, then invite them to try with support. */
export function showFirstResult(root: HTMLElement, info: RoomInfo, seconds: number, gaveUp: boolean, onNext: () => void): void {
  const c = el(`
    <div class="eyebrow"><span class="icon" aria-hidden="true">${info.icon}</span> ${info.title}</div>
    <h2>${gaveUp ? 'That was hard.' : `You took ${fmt(seconds)}.`}</h2>
    <p>${gaveUp ? `You stopped after ${fmt(seconds)}. Many people face this every day.` : 'For many people, this is what everyday tasks feel like.'}</p>
    <p class="task">Now try it with support.</p>
    <p class="muted">${info.supportTask}</p>
    <div class="btn-row"><button class="btn primary">Try with support</button></div>`);
  const close = showModal(root, c, info.accent);
  c.querySelector('button')!.addEventListener('click', () => { close(); onNext(); });
}

/** After the supported attempt: compare both times. */
export function showFinalResult(root: HTMLElement, info: RoomInfo, without: number, withSupport: number, gaveUp: boolean, onCorridor: () => void, onStay: () => void): void {
  const faster = without > 0 && withSupport < without ? Math.round(without / Math.max(withSupport, 0.1)) : 0;
  const c = el(`
    <div class="eyebrow"><span class="icon" aria-hidden="true">${info.icon}</span> ${info.title}</div>
    <h2>${faster >= 2 ? `About ${faster}× faster with support.` : 'Support made a difference.'}</h2>
    <div class="compare">
      <div><span>With the condition</span><b>${fmt(without)}</b>${gaveUp ? '<span>(gave up)</span>' : ''}</div>
      <div><span>With support</span><b>${fmt(withSupport)}</b></div>
    </div>
    <p><strong>What helped:</strong> ${info.helped}</p>
    <p class="muted">The condition didn't go away. The environment changed.</p>
    <div class="btn-row">
      <button class="btn primary" data-a="corridor">Back to corridor</button>
      <button class="btn" data-a="stay">Stay and explore</button>
    </div>`);
  const close = showModal(root, c, info.accent);
  c.querySelector('[data-a=corridor]')!.addEventListener('click', () => { close(); onCorridor(); });
  c.querySelector('[data-a=stay]')!.addEventListener('click', () => { close(); onStay(); });
}
