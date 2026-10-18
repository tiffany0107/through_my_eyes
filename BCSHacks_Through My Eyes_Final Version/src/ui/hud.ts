import { RoomInfo } from '../config';

const h = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = ''): HTMLElementTagNameMap[K] => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html) el.innerHTML = html;
  return el;
};

/** Heads-up display: room chip, actions, task bar, toasts, captions, fade. */
export class Hud {
  root: HTMLElement;
  modalRoot = h('div', 'modal-root');
  panelRoot = h('div', 'panel-root');
  private chip = h('div', 'chip');
  private actions = h('div', 'hud-actions');
  menuBtn = h('button', 'btn small', '☰ Rooms');
  lookBtn = h('button', 'btn small', '🖱 Mouse look');
  supportBtn = h('button', 'btn small', 'Support: off');
  exitBtn = h('button', 'btn small primary', 'Exit room <kbd>Q</kbd>');
  volume = h('input') as HTMLInputElement;
  private taskBar = h('div', 'card small task-bar');
  private taskText = h('span', 'task-text');
  private timer = h('span', 'timer');
  giveUpBtn = h('button', 'btn small', 'I give up');
  private roomControls = h('div', 'card small room-controls');
  private toastEl = h('div', 'toast');
  private captionEl = h('div', 'caption');
  private crosshair = h('div', 'crosshair');
  private hint = h('div', 'hint');
  private fadeEl = h('div', 'fade');
  private toastTimer = 0;

  constructor(root: HTMLElement) {
    this.root = root;
    this.toastEl.setAttribute('role', 'status');
    this.toastEl.setAttribute('aria-live', 'polite');
    this.captionEl.setAttribute('aria-live', 'polite');
    this.supportBtn.setAttribute('aria-pressed', 'false');
    this.lookBtn.title = 'Lock the mouse to look around (M). Press Esc to release.';

    const vol = h('label', 'volume');
    vol.innerHTML = '<span aria-hidden="true">🔊</span><span class="sr-only">Volume</span>';
    this.volume.type = 'range';
    this.volume.min = '0';
    this.volume.max = '1';
    this.volume.step = '0.05';
    this.volume.value = '0.6';
    vol.appendChild(this.volume);

    this.actions.append(this.lookBtn, this.supportBtn, vol, this.menuBtn, this.exitBtn);
    const top = h('header', 'hud-top');
    top.append(this.chip, this.actions);
    this.taskBar.append(this.taskText, this.timer, this.giveUpBtn);
    root.append(this.fadeEl, this.crosshair, top, this.taskBar, this.roomControls, this.hint, this.toastEl, this.captionEl, this.panelRoot, this.modalRoot);
    this.setRoom(null);
    this.setTask(null);
    this.setSupport('hidden');
    this.giveUpBtn.hidden = true;
    this.captionEl.hidden = true;
    this.setRoomControls(null);
    this.setPlaying(false);
  }

  setRoom(info: RoomInfo | null): void {
    const accent = info?.accent ?? '#2B2B2E';
    this.root.style.setProperty('--accent', accent);
    this.chip.innerHTML = info
      ? `<span class="swatch" aria-hidden="true">${info.icon}</span>${info.title}`
      : `<span class="swatch" aria-hidden="true" style="background:#9DB39A">👣</span>Through My Eyes`;
    this.exitBtn.hidden = !info;
  }

  setTask(text: string | null): void {
    this.taskBar.hidden = text === null;
    if (text !== null) this.taskText.textContent = text;
  }

  setTimer(seconds: number | null): void {
    this.timer.textContent = seconds === null ? '' : `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  }

  setSupport(state: 'hidden' | 'on' | 'off'): void {
    this.supportBtn.hidden = state === 'hidden';
    this.supportBtn.setAttribute('aria-pressed', String(state === 'on'));
    this.supportBtn.textContent = state === 'on' ? '✓ Support: on' : 'Support: off';
  }

  setRoomControls(el: HTMLElement | null): void {
    this.roomControls.replaceChildren(...(el ? [el] : []));
    this.roomControls.hidden = !el;
  }

  /** Playing = free to move (no modal open). */
  setPlaying(on: boolean): void {
    this.crosshair.hidden = !on;
    this.hint.hidden = !on;
  }

  setLocked(locked: boolean): void {
    this.lookBtn.hidden = locked;
    this.hint.textContent = locked
      ? 'WASD to move · Click or E to interact · Esc to release the mouse · Q to exit the room'
      : 'WASD to move · Drag to look · Click to interact or walk · M for mouse look';
  }

  setCrosshairActive(on: boolean): void { this.crosshair.classList.toggle('active', on); }

  toast(msg: string): void {
    this.toastEl.textContent = msg;
    this.toastEl.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove('show'), 2200);
  }

  caption(text: string | null): void {
    this.captionEl.hidden = !text;
    this.captionEl.textContent = text ?? '';
  }

  fade(on: boolean): Promise<void> {
    this.fadeEl.classList.toggle('on', on);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    return new Promise((r) => setTimeout(r, reduced ? 0 : 420));
  }
}
