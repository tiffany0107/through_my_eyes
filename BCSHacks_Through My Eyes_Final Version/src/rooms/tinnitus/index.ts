import * as THREE from 'three';
import { BaseRoom } from '../Room';
import { buildShell } from '../shell';
import { FONT, PALETTE, canvasTexture, mat, rbox } from '../../world/materials';
import { faceMaterial, person, plant, rug } from '../../world/builders';
import type { ToneHandle } from '../../audio/audioManager';

const YOU = 'Mia';
const DECOYS = ['Nia', 'Maya', 'Leah', 'Tia', 'Mina', 'Mike', 'Leo'];
const DRINKS = ['Oat latte', 'Flat white', 'Iced mocha', 'Chai latte', 'Cappuccino', 'Hot chocolate'];
const CALL_EVERY = 4.5; // seconds between orders
const CLAIM_WINDOW = 7; // seconds after your name during which "That's me!" counts
const TONE_MAX = 0.06; // slider 100%; AudioManager also hard-caps every tone

/** Wait for your coffee while a constant ring sits over the café noise. */
export class TinnitusRoom extends BaseRoom {
  private ring: ToneHandle | null = null;
  private noise: ToneHandle | null = null;
  private level = 0.65; // tone slider, 0..1
  private queue: string[] = [];
  private nextCall = 2;
  private last: { name: string; drink: string; at: number } | null = null;
  private ready: { name: string; drink: string }[] = [];
  private clock = 0;
  private wasActive = false;
  private done = false;
  private screen!: { tex: THREE.CanvasTexture; draw: () => void };
  private barista!: THREE.Group;

  constructor() { super('tinnitus'); }

  protected build(): void {
    const s = this.scene;
    const c = this.colliders;
    buildShell(s, c, { accentWall: '#DCE5EE', floor: '#CDB89A' });
    rug(s, 0, 1.0, 3.4, 2.2, '#BCCBDA');

    // Counter, pickup shelf and espresso machines
    const counter = rbox(5, 1.05, 0.7, PALETTE.woodDark, 0.05);
    counter.position.set(0, 0.525, -1.9);
    s.add(counter);
    const top = rbox(5.1, 0.06, 0.8, '#E9E1D3', 0.02);
    top.position.set(0, 1.08, -1.9);
    s.add(top);
    c.add(-2.55, -2.3, 2.55, -1.5);
    for (const x of [-1.6, -0.6]) {
      const m = rbox(0.6, 0.5, 0.45, '#5A6672', 0.05);
      m.position.set(x, 1.36, -2.0);
      s.add(m);
    }
    const pickup = rbox(1.4, 0.05, 0.5, PALETTE.cream, 0.02);
    pickup.position.set(1.5, 1.14, -1.75);
    s.add(pickup);
    const pickupSign = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.22), new THREE.MeshStandardMaterial({
      map: canvasTexture(360, 88, (g) => {
        g.fillStyle = this.info.accent; g.beginPath(); g.roundRect(0, 0, 360, 88, 20); g.fill();
        g.fillStyle = '#FFFFFF'; g.font = `700 46px ${FONT}`; g.textAlign = 'center'; g.fillText('PICK UP', 180, 60);
      }),
    }));
    pickupSign.position.set(1.5, 1.32, -1.49);
    s.add(pickupSign);
    for (let i = 0; i < 3; i++) {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.13, 16), mat(PALETTE.cream));
      cup.position.set(1.1 + i * 0.35, 1.23, -1.8);
      s.add(cup);
    }
    this.ctx.addClickable(pickup, () => this.claim());
    this.ctx.addClickable(pickupSign, () => this.claim());

    // Barista
    this.barista = person({ height: 0.98, shirt: '#F4EFE6', apron: this.info.accent, hair: '#1E1A18', face: faceMaterial() });
    this.barista.position.set(0.4, 0, -2.6);
    s.add(this.barista);

    // "Order ready" screen on the back wall (blank until support is on)
    const tex = canvasTexture(640, 400, () => {});
    this.screen = { tex, draw: () => this.drawScreen() };
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.92, 1.2), new THREE.MeshStandardMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.5 }));
    screen.position.set(1.4, 2.2, -3.88);
    s.add(screen);
    const frame = rbox(2.0, 1.28, 0.05, PALETTE.charcoal, 0.02);
    frame.position.set(1.4, 2.2, -3.92);
    s.add(frame);

    // Waiting customers and tables
    const face = faceMaterial();
    [[-2.6, 0.3, '#56B4E9'], [-1.9, -0.6, '#E69F00'], [2.8, 0.6, '#CC79A7']].forEach(([x, z, col]) => {
      const p = person({ height: 0.95 + Math.random() * 0.15, shirt: col as string, hair: '#3B2A20', face });
      p.position.set(x as number, 0, z as number);
      p.lookAt(0.5, 0, -2);
      s.add(p);
      c.addCircle(x as number, z as number, 0.3);
    });
    for (const [x, z] of [[-2.6, 2.4], [2.6, 2.4]]) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.04, 24), mat(PALETTE.cream));
      t.position.set(x, 0.74, z);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.72, 10), mat(PALETTE.charcoal));
      leg.position.set(x, 0.36, z);
      s.add(t, leg);
      c.addCircle(x, z, 0.5);
    }
    plant(s, -3.4, -3.4, 1.2);
    plant(s, 3.4, 3.4, 1.0);

    this.ctx.setRoomControls(this.controlsPanel());
    this.resetTask();
  }

  private controlsPanel(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'room-controls-inner';
    el.innerHTML = `
      <p class="order-ticket">🧾 Your order: <b>Oat latte</b><br>Name on the cup: <b>${YOU}</b></p>
      <button class="btn primary" data-a="claim">🙋 That's me!</button>
      <label class="field"><span>Ringing loudness <output>${Math.round(this.level * 100)}%</output></span>
        <input type="range" min="0" max="1" step="0.05" value="${this.level}">
      </label>
      <p class="note">With support on, the ringing stays. Tinnitus doesn't switch off.</p>`;
    el.querySelector('[data-a=claim]')!.addEventListener('click', () => this.claim());
    el.querySelector('input')!.addEventListener('input', (e) => {
      this.level = Number((e.target as HTMLInputElement).value);
      el.querySelector('output')!.textContent = `${Math.round(this.level * 100)}%`;
      this.ring?.setGain(this.level * TONE_MAX);
    });
    return el;
  }

  private drawScreen(): void {
    const g = (this.screen.tex.image as HTMLCanvasElement).getContext('2d')!;
    g.fillStyle = '#1F2933';
    g.fillRect(0, 0, 640, 400);
    g.textAlign = 'center';
    if (!this.accessible) {
      g.fillStyle = '#8A96A3';
      g.font = `700 48px ${FONT}`;
      g.fillText('☕  Brew & Co.', 320, 215);
    } else {
      g.fillStyle = '#F0E442';
      g.font = `700 44px ${FONT}`;
      g.fillText('ORDER READY', 320, 64);
      g.textAlign = 'left';
      this.ready.slice(0, 4).forEach((o, i) => {
        g.fillStyle = i === 0 ? '#FFFFFF' : '#AEB8C2';
        g.font = `${i === 0 ? 700 : 400} ${i === 0 ? 48 : 36}px ${FONT}`;
        g.fillText(`${o.name}  ·  ${o.drink}`, 50, 140 + i * 70);
      });
      if (!this.ready.length) { g.fillStyle = '#AEB8C2'; g.font = `36px ${FONT}`; g.textAlign = 'center'; g.fillText('Waiting for orders…', 320, 210); }
    }
    this.screen.tex.needsUpdate = true;
  }

  /** Decoys first, then your name somewhere in the next few calls. */
  private refill(first: boolean): void {
    const decoys = [...DECOYS].sort(() => Math.random() - 0.5).slice(0, first ? 4 : 3);
    decoys.splice(first ? 3 + Math.floor(Math.random() * 2) : Math.floor(Math.random() * 3), 0, YOU);
    this.queue.push(...decoys);
  }

  resetTask(): void {
    this.queue = [];
    this.refill(true);
    this.nextCall = 2.5;
    this.last = null;
    this.ready = [];
    this.done = false;
    this.ctx.setTaskText(`Listen for your name (${YOU}), then press "That's me!" or click the pickup counter`);
    if (this.screen) this.drawScreen();
  }

  setAccessible(on: boolean): void {
    super.setAccessible(on);
    if (this.screen) this.drawScreen();
  }

  private call(): void {
    if (!this.queue.length) this.refill(false);
    const name = this.queue.shift()!;
    const drink = name === YOU ? 'Oat latte' : DRINKS[Math.floor(Math.random() * DRINKS.length)];
    this.last = { name, drink, at: this.clock };
    this.ready.unshift({ name, drink });
    this.ctx.audio.stopSpeech();
    // Without support: no captions, and the voice sits low under the ringing.
    this.ctx.audio.speak(`${drink} for ${name}!`, { caption: this.accessible, rate: 1.1, pitch: 1.15, volume: this.accessible ? 1 : 0.55 });
    this.drawScreen();
  }

  private claim(): void {
    if (this.done || !this.ctx.player.enabled) return;
    const l = this.last;
    if (l && l.name === YOU && this.clock - l.at < CLAIM_WINDOW) {
      this.done = true;
      this.ctx.audio.stopSpeech();
      this.ctx.audio.speak(`Here you go, ${YOU}. Enjoy!`, { pitch: 1.15 });
      setTimeout(() => this.ctx.complete(), 600);
    } else if (l && l.name === YOU) {
      this.ctx.toast('Too slow, it went cold. Wait for the next call.');
    } else if (l) {
      this.ctx.toast(`Oops, that order was for ${l.name}.`);
    } else {
      this.ctx.toast('Nobody has been called yet.');
    }
  }

  update(dt: number, t: number): void {
    this.barista.rotation.y = Math.sin(t * 0.6) * 0.3;
    const active = this.ctx.player.enabled && !!this.ctx.audio.ctx;
    // Sounds start when the attempt starts, and go quiet behind result cards.
    if (active && !this.ring) {
      this.ring = this.ctx.audio.tone(6000, this.level * TONE_MAX, 40);
      this.noise = this.ctx.audio.murmur(0.1);
      this.wasActive = true;
    }
    if (active !== this.wasActive) {
      this.wasActive = active;
      this.ring?.setGain(active ? this.level * TONE_MAX : 0);
      this.noise?.setGain(active ? 0.1 : 0);
    }
    if (!active || this.done) return;
    this.clock += dt;
    this.nextCall -= dt;
    if (this.nextCall <= 0) {
      this.nextCall = CALL_EVERY + Math.random();
      this.call();
    }
  }

  exit(): void {
    this.ring?.stop();
    this.noise?.stop();
    super.exit();
  }
}
