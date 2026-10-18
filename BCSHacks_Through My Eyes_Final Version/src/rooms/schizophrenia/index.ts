import * as THREE from 'three';
import { BaseRoom } from '../Room';
import { buildShell } from '../shell';
import { FONT, PALETTE, mat, rbox, signPlane } from '../../world/materials';
import { faceMaterial, person, plant, rug } from '../../world/builders';
import { Visions } from './visions';

interface Field { key: string; label: string; value: string; alt: string; digits?: boolean; hint: string }

const FIELDS: Field[] = [
  { key: 'name', label: 'Full name', value: 'Alex Morgan', alt: 'Alex Morgen', hint: 'Copy your full name from the card.' },
  { key: 'dob', label: 'Date of birth', value: '14/03/1998', alt: '14/08/1998', digits: true, hint: 'Next, your date of birth. Numbers only is fine.' },
  { key: 'phone', label: 'Phone number', value: '0412 555 019', alt: '0412 555 091', digits: true, hint: 'Now your phone number. Take it a few digits at a time.' },
  { key: 'role', label: 'Position applied for', value: 'Library assistant', alt: 'Library manager', hint: 'Which job are you applying for? It is on the card.' },
  { key: 'start', label: 'Available from', value: 'Monday 3 June', alt: 'Tuesday 3 June', hint: 'Last one: the day you can start. Then press Submit.' },
];

// Quiet, unsettling-but-ordinary comments. No threats, no horror.
const VOICES = [
  "You'll get it wrong.", 'Hurry up.', "That's not right.", 'Why bother?', 'They can tell.',
  'Did you hear that?', 'Check it again.', 'Everyone is looking.', "You're too slow.", 'Not that one.',
];

const norm = (s: string, digits?: boolean) => (digits ? s.replace(/\D/g, '') : s.toLowerCase().replace(/[^a-z0-9]/g, ''));
const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** Fill in a short job application while voices talk over you and things appear that aren't there. */
export class SchizophreniaRoom extends BaseRoom {
  private panel: HTMLElement | null = null;
  private closePanel: (() => void) | null = null;
  private shadow: HTMLElement | null = null;
  private closeShadow: (() => void) | null = null;
  private values: Record<string, string> = {};
  private voiceIn = 3;
  private cardIn = 18;
  private shadowIn = 25;
  private done = false;
  private receptionist!: THREE.Group;
  private visions: Visions | null = null;

  constructor() { super('schizophrenia'); }

  protected build(): void {
    const s = this.scene;
    const c = this.colliders;
    buildShell(s, c, { accentWall: '#F1E2D6', floor: '#D3C6B2', sun: 1.4 });
    rug(s, 0, 0.8, 3.6, 2.4, '#E3D2C2');

    // Reception desk with a clipboard
    const desk = rbox(3, 1.0, 0.7, PALETTE.wood, 0.05);
    desk.position.set(0, 0.5, -2.2);
    s.add(desk);
    const deskTop = rbox(3.1, 0.06, 0.8, PALETTE.cream, 0.02);
    deskTop.position.set(0, 1.03, -2.2);
    s.add(deskTop);
    c.add(-1.55, -2.6, 1.55, -1.8);
    const board = rbox(0.3, 0.02, 0.4, PALETTE.woodDark, 0.01);
    board.position.set(0.6, 1.07, -1.95);
    board.rotation.y = 0.2;
    const paper = rbox(0.26, 0.012, 0.34, '#FFFFFF', 0.004);
    paper.position.set(0.6, 1.085, -1.94);
    paper.rotation.y = 0.2;
    const clip = rbox(0.1, 0.03, 0.04, '#9AA3AD', 0.008);
    clip.position.set(0.6 - 0.03, 1.095, -2.11);
    clip.rotation.y = 0.2;
    s.add(board, paper, clip);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.6), mat('#ffffff'));
    hit.visible = false;
    hit.position.set(0.6, 1.15, -1.95);
    s.add(hit);
    this.ctx.addClickable(hit, () => this.openForm());
    this.ctx.addClickable(desk, () => this.openForm());

    this.receptionist = person({ height: 1.0, shirt: '#9DB39A', hair: '#8A5A2B', glasses: true, face: faceMaterial() });
    this.receptionist.position.set(-0.4, 0, -2.9);
    s.add(this.receptionist);
    const deskHit = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.9, 0.6), mat('#ffffff'));
    deskHit.visible = false;
    deskHit.position.y = 0.95;
    this.receptionist.add(deskHit);
    this.ctx.addClickable(this.receptionist, () => this.openForm());

    // Calm waiting area: chairs, water cooler, clock, picture
    for (const x of [-3.4, 3.4]) {
      for (const z of [-0.6, 0.3, 1.2]) {
        const seat = rbox(0.5, 0.08, 0.5, '#6E8CA0', 0.03);
        seat.position.set(x, 0.45, z);
        const back = rbox(0.08, 0.5, 0.5, '#647F92', 0.03);
        back.position.set(x + Math.sign(x) * 0.22, 0.72, z);
        s.add(seat, back);
      }
      c.add(x - 0.3, -0.9, x + 0.3, 1.5);
    }
    const cooler = rbox(0.35, 1.0, 0.35, '#F4EFE6', 0.04);
    cooler.position.set(2.9, 0.5, -3.5);
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.4, 16), new THREE.MeshStandardMaterial({ color: '#A8D4F0', transparent: true, opacity: 0.6 }));
    bottle.position.set(2.9, 1.2, -3.5);
    s.add(cooler, bottle);
    c.add(2.7, -3.7, 3.1, -3.3);
    const clock = signPlane(0.5, 0.5, 300, (g, W) => {
      g.fillStyle = '#F1E2D6'; g.fillRect(0, 0, W, W); // match the wall behind
      g.fillStyle = '#FFFFFF'; g.beginPath(); g.arc(W / 2, W / 2, W / 2 - 6, 0, Math.PI * 2); g.fill();
      g.lineWidth = 10; g.strokeStyle = PALETTE.charcoal; g.stroke();
      g.lineCap = 'round'; g.beginPath(); g.moveTo(W / 2, W / 2); g.lineTo(W / 2, W * 0.2); g.moveTo(W / 2, W / 2); g.lineTo(W * 0.7, W / 2); g.stroke();
    }, 0.2);
    clock.position.set(-1.6, 2.5, -3.89);
    s.add(clock);
    const sign = signPlane(1.4, 0.5, 250, (g, W, H) => {
      g.fillStyle = '#F1E2D6'; g.fillRect(0, 0, W, H);
      g.fillStyle = PALETTE.cream; g.beginPath(); g.roundRect(0, 0, W, H, 20); g.fill();
      g.fillStyle = PALETTE.charcoal; g.textAlign = 'center';
      g.font = `700 54px ${FONT}`; g.fillText('Reception', W / 2, 62);
      g.font = `30px ${FONT}`; g.fillText('Forms on the desk, please', W / 2, 104);
    }, 0.3);
    sign.position.set(0.6, 2.3, -3.89);
    s.add(sign);
    const plants = [plant(s, -3.4, -3.4, 1.3), plant(s, -3.4, 3.3, 1.1), plant(s, 3.4, 3.3, 1.1)];

    this.visions = new Visions(s, this.ctx.camera, plants, this.receptionist, () => !!this.panel);
    // Dev helper, like __goto: __vision("cat") shows one hallucination now.
    (window as unknown as { __vision: (n: string) => void }).__vision = (n) => this.visions?.force(n);
    this.resetTask();
  }

  resetTask(): void {
    this.hideForm();
    this.values = {};
    this.done = false;
    this.voiceIn = 3;
    this.cardIn = rand(14, 20);
    this.shadowIn = rand(20, 30);
    this.ctx.setTaskText('Ask the receptionist for a job application form');
  }

  setAccessible(on: boolean): void {
    super.setAccessible(on);
    if (this.panel) this.renderForm();
  }

  private openForm(): void {
    if (this.panel || this.done || !this.ctx.player.enabled) return;
    this.ctx.player.unlock(); // the form needs the mouse and keyboard
    this.panel = document.createElement('div');
    addEventListener('keydown', this.onEsc);
    this.closePanel = this.ctx.showPanel(this.panel);
    this.renderForm();
    this.ctx.setTaskText('Copy the details from the card into the form');
    if (this.accessible) {
      this.ctx.audio.stopSpeech();
      this.ctx.audio.speak("Hi, take your time, there's no rush. Start with your name at the top.", { rate: 0.9 });
    }
  }

  /** Put the form down (answers are kept) so the visitor can walk around again. */
  private closeForm(): void {
    this.hideForm();
    this.ctx.setTaskText('Ask the receptionist for the form when you are ready to continue');
  }

  /** Esc puts the panel down, wherever focus is. */
  private onEsc = (e: KeyboardEvent): void => { if (e.key === 'Escape' && this.panel) this.closeForm(); };

  private hideForm(): void {
    removeEventListener('keydown', this.onEsc);
    this.closePanel?.();
    this.closePanel = null;
    this.panel = null;
    this.closeShadow?.();
    this.closeShadow = null;
    this.shadow = null;
  }

  private renderForm(): void {
    const el = this.panel!;
    el.className = `card form-card ${this.accessible ? 'calm' : ''}`;
    el.innerHTML = `
      <div class="instr" aria-label="Instruction card">
        <h3>Your details</h3>
        <dl>${FIELDS.map((f) => `<dt>${f.label}</dt><dd data-k="${f.key}">${f.value}</dd>`).join('')}</dl>
      </div>
      <form novalidate>
        <div class="panel-head"><h2>Job application</h2><button class="btn small" type="button" data-a="close" aria-label="Close the form (Esc)">✕ Close <kbd>Esc</kbd></button></div>
        ${this.accessible ? '<p class="guide" role="status"></p>' : ''}
        ${FIELDS.map((f) => `<label data-k="${f.key}"><span>${f.label}</span><input type="text" name="${f.key}" autocomplete="off" value="${this.values[f.key] ?? ''}"></label>`).join('')}
        <p class="form-err" role="alert"></p>
        <div class="btn-row"><button class="btn primary" type="submit">Submit application</button></div>
      </form>`;
    const form = el.querySelector('form')!;
    form.addEventListener('input', (e) => {
      const i = e.target as HTMLInputElement;
      this.values[i.name] = i.value;
      this.updateGuide();
    });
    form.addEventListener('submit', (e) => { e.preventDefault(); this.submit(); });
    el.querySelector('[data-a=close]')!.addEventListener('click', () => this.closeForm());
    this.updateGuide();
    requestAnimationFrame(() => el.querySelector<HTMLInputElement>('input')?.focus());
  }

  /** Support: highlight the next field and say what to do, step by step. */
  private updateGuide(): void {
    if (!this.panel || !this.accessible) return;
    const next = FIELDS.find((f) => norm(this.values[f.key] ?? '', f.digits) !== norm(f.value, f.digits));
    this.panel.querySelectorAll('label').forEach((l) => l.classList.toggle('next', l.dataset.k === next?.key));
    const step = next ? FIELDS.indexOf(next) + 1 : FIELDS.length;
    this.panel.querySelector('.guide')!.textContent = next
      ? `Receptionist: "${next.hint}"  (Step ${step} of ${FIELDS.length})`
      : 'Receptionist: "That all looks right. Press Submit when you\'re ready."';
  }

  private submit(): void {
    if (this.done || !this.panel) return;
    const wrong = FIELDS.filter((f) => norm(this.values[f.key] ?? '', f.digits) !== norm(f.value, f.digits));
    this.panel.querySelectorAll<HTMLInputElement>('input').forEach((i) => i.setAttribute('aria-invalid', String(wrong.some((f) => f.key === i.name))));
    if (wrong.length) {
      this.panel.querySelector('.form-err')!.textContent = `Some answers don't match the card: ${wrong.map((f) => f.label).join(', ')}.`;
      return;
    }
    this.done = true;
    this.visions?.stop();
    this.hideForm();
    this.ctx.audio.stopSpeech();
    this.ctx.audio.speak("Thank you, that's everything. We'll be in touch.", { rate: 0.95 });
    setTimeout(() => this.ctx.complete(), 600);
  }

  /** A quiet voice: panned whisper texture plus captioned words. */
  private voice(): void {
    const quiet = this.accessible;
    const line = VOICES[Math.floor(Math.random() * VOICES.length)];
    this.ctx.audio.whisper(rand(-0.9, 0.9), quiet ? 0.015 : 0.04, 1.2);
    if (!('speechSynthesis' in window) || !speechSynthesis.speaking) {
      this.ctx.audio.speak(line, { volume: quiet ? 0.12 : 0.35, rate: 0.85, pitch: rand(0.6, 0.9) });
    }
  }

  /** Rarely, one line on the card briefly reads differently. */
  private changeCard(): void {
    const f = FIELDS[Math.floor(Math.random() * FIELDS.length)];
    const dd = this.panel?.querySelector<HTMLElement>(`dd[data-k="${f.key}"]`);
    if (!dd) return;
    dd.textContent = f.alt;
    setTimeout(() => { dd.textContent = f.value; }, 2500);
  }

  /** A soft dark shape at the edge of the screen that slowly fades in and out. */
  private edgeShadow(): void {
    if (!this.shadow) {
      this.shadow = document.createElement('div');
      this.shadow.className = 'edge-shadow';
      this.closeShadow = this.ctx.showPanel(this.shadow);
    }
    const sh = this.shadow;
    const left = Math.random() < 0.5;
    sh.style.left = left ? '-8vmin' : '';
    sh.style.right = left ? '' : '-8vmin';
    sh.style.top = `${rand(15, 55)}vh`;
    requestAnimationFrame(() => sh.classList.add('on'));
    setTimeout(() => sh.classList.remove('on'), 3500);
  }

  update(dt: number, t: number): void {
    this.receptionist.rotation.y = Math.sin(t * 0.4) * 0.15;
    // Hallucinations run from the start of the attempt, form open or not.
    this.visions?.update(dt, this.ctx.player.enabled && !this.done, this.accessible ? 0.35 : 1);
    if (!this.panel || this.done || !this.ctx.player.enabled) return;
    this.voiceIn -= dt;
    if (this.voiceIn <= 0) {
      this.voiceIn = this.accessible ? rand(14, 20) : rand(5, 8);
      this.voice();
    }
    if (this.accessible) return; // support: no changes to the card, no shadows
    this.cardIn -= dt;
    if (this.cardIn <= 0) { this.cardIn = rand(16, 24); this.changeCard(); }
    this.shadowIn -= dt;
    if (this.shadowIn <= 0) { this.shadowIn = rand(25, 35); this.edgeShadow(); }
  }

  exit(): void {
    this.visions?.dispose();
    this.visions = null;
    this.hideForm();
    super.exit();
  }
}
