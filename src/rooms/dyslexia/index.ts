import * as THREE from 'three';
import { BaseRoom } from '../Room';
import { buildShell } from '../shell';
import { FONT, PALETTE, mat, rbox, signPlane } from '../../world/materials';
import { faceMaterial, person, plant, rug } from '../../world/builders';

interface Item { name: string; price: string }

const MENU: { title: string; items: Item[] }[] = [
  { title: 'Hot drinks', items: [
    { name: 'Flat white', price: '$4.20' }, { name: 'Caramel latte', price: '$4.80' }, { name: 'Chai latte', price: '$4.50' },
    { name: 'Hot chocolate', price: '$3.90' }, { name: 'Peppermint tea', price: '$3.20' },
  ] },
  { title: 'Cold drinks', items: [
    { name: 'Iced latte', price: '$4.60' }, { name: 'Lemonade', price: '$3.40' },
    { name: 'Mango smoothie', price: '$5.40' }, { name: 'Sparkling water', price: '$2.80' },
  ] },
  { title: 'Food', items: [
    { name: 'Blueberry muffin', price: '$3.60' }, { name: 'Banana bread', price: '$3.80' }, { name: 'Cheese toastie', price: '$6.40' },
    { name: 'Chicken wrap', price: '$7.20' }, { name: 'Carrot cake', price: '$4.40' },
  ] },
];
const ITEMS = MENU.flatMap((s) => s.items);
const PATIENCE = 40; // seconds before the waiter gives up and comes back later
const JUMBLE_EVERY = 0.35; // seconds; text changes, never flashes

/** Swap a share of neighbouring letters inside a word (never the first or last). */
function jumble(word: string, p: number): string {
  const a = [...word];
  for (let i = 1; i < a.length - 2; i++) if (Math.random() < p) { [a[i], a[i + 1]] = [a[i + 1], a[i]]; i++; }
  return a.join('');
}

/** Find a menu item and pay its price before the waiter loses patience. */
export class DyslexiaRoom extends BaseRoom {
  private target: Item = ITEMS[0];
  private patience = 1;
  private panel: HTMLElement | null = null;
  private closePanel: (() => void) | null = null;
  private words: { el: HTMLElement; text: string }[] = [];
  private jumbleTimer = 0;
  private done = false;
  private waiter!: THREE.Group;

  constructor() { super('dyslexia'); }

  protected build(): void {
    const s = this.scene;
    const c = this.colliders;
    buildShell(s, c, { accentWall: '#DCEBE3', floor: '#CDB89A' });
    rug(s, 0, 1.2, 3, 2, '#BFD3C6');

    // Counter with a pastry case
    const counter = rbox(4.4, 1.05, 0.7, PALETTE.wood, 0.05);
    counter.position.set(0, 0.525, -1.6);
    s.add(counter);
    const top = rbox(4.5, 0.06, 0.8, '#E9E1D3', 0.02);
    top.position.set(0, 1.08, -1.6);
    s.add(top);
    c.add(-2.25, -2.0, 2.25, -1.2);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.36, 0.6), new THREE.MeshStandardMaterial({ color: '#DDEFF2', transparent: true, opacity: 0.35, roughness: 0.1 }));
    glass.position.set(-1.3, 1.29, -1.6);
    s.add(glass);
    const cakes = ['#E9C846', '#7E5A3A', '#F4EFE6', '#CC79A7', '#E08A2E'];
    cakes.forEach((col, i) => {
      const cake = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.1, 16), mat(col));
      cake.position.set(-1.85 + i * 0.27, 1.17, -1.6);
      s.add(cake);
    });
    const machine = rbox(0.6, 0.5, 0.45, '#5A6672', 0.05);
    machine.position.set(1.4, 1.36, -1.65);
    s.add(machine);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.1, 16), mat(PALETTE.cream));
    cup.position.set(1.4, 1.16, -1.38);
    s.add(cup);

    // Back wall: shelves and a decorative chalkboard
    const board = signPlane(2.4, 1.2, 200, (g, W, H) => {
      g.fillStyle = '#2F3B34'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#C8A070'; g.lineWidth = 14; g.strokeRect(7, 7, W - 14, H - 14);
      g.fillStyle = '#F4EFE6'; g.textAlign = 'center';
      g.font = `700 64px ${FONT}`; g.fillText('Café Mosaic', W / 2, 90);
      g.font = `30px ${FONT}`; g.fillText('Ask the waiter for a menu', W / 2, 150);
      g.strokeStyle = 'rgba(244,239,230,0.5)'; g.lineWidth = 3;
      for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(80, 190 + i * 22); g.lineTo(W - 80 - (i % 2) * 120, 190 + i * 22); g.stroke(); }
    }, 0.2);
    board.position.set(0, 2.25, -3.89);
    s.add(board);
    for (const y of [1.3, 1.75]) {
      const shelf = rbox(1.2, 0.05, 0.3, PALETTE.woodDark, 0.02);
      shelf.position.set(-2.6, y, -3.75);
      s.add(shelf);
      for (let i = 0; i < 5; i++) {
        const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.18, 12), mat(['#E69F00', '#9DB39A', '#F4EFE6', '#7E5A3A', '#56B4E9'][i]));
        jar.position.set(-3.05 + i * 0.22, y + 0.115, -3.75);
        s.add(jar);
      }
    }
    c.add(-3.25, -3.95, -1.95, -3.55);

    // Waiter behind the counter
    this.waiter = person({ height: 1.02, shirt: PALETTE.charcoal, apron: this.info.accent, hair: '#3B2A20', face: faceMaterial() });
    this.waiter.position.set(0.1, 0, -2.35);
    s.add(this.waiter);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.9, 0.6), mat('#ffffff'));
    hit.visible = false;
    hit.position.y = 0.95;
    this.waiter.add(hit);
    this.ctx.addClickable(this.waiter, () => this.openMenu());
    this.ctx.addClickable(counter, () => this.openMenu());

    // Café tables
    for (const [x, z] of [[-2.4, 1.2], [2.4, 1.2]]) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.04, 24), mat(PALETTE.cream));
      t.position.set(x, 0.74, z);
      t.castShadow = true;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.72, 10), mat(PALETTE.charcoal));
      leg.position.set(x, 0.36, z);
      s.add(t, leg);
      c.addCircle(x, z, 0.5);
      for (const dx of [-0.65, 0.65]) {
        const seat = rbox(0.4, 0.06, 0.4, PALETTE.wood, 0.02);
        seat.position.set(x + dx, 0.45, z);
        const back = rbox(0.06, 0.45, 0.4, PALETTE.wood, 0.02);
        back.position.set(x + dx * 1.3, 0.68, z);
        s.add(seat, back);
      }
    }
    plant(s, -3.4, 3.3, 1.2);
    plant(s, 3.4, 3.3, 1.2);
    plant(s, 3.4, -3.3, 1.0);

    this.resetTask();
  }

  resetTask(): void {
    this.hideMenu();
    let next = this.target;
    while (next === this.target) next = ITEMS[Math.floor(Math.random() * ITEMS.length)];
    this.target = next;
    this.patience = 1;
    this.done = false;
    this.ctx.setTaskText('Talk to the waiter at the counter');
  }

  setAccessible(on: boolean): void {
    super.setAccessible(on);
    if (this.panel) this.renderMenu();
  }

  private openMenu(): void {
    if (this.panel || this.done || !this.ctx.player.enabled) return;
    this.ctx.player.unlock(); // the menu needs the mouse
    this.panel = document.createElement('div');
    addEventListener('keydown', this.onEsc);
    this.closePanel = this.ctx.showPanel(this.panel);
    this.renderMenu();
    this.greet();
  }

  private greet(): void {
    this.ctx.audio.stopSpeech();
    this.ctx.audio.speak(`Hi! I really recommend the ${this.target.name.toLowerCase()} today. Want to pay for one?`, { pitch: 1.1 });
    this.ctx.setTaskText(`Find the ${this.target.name} on the menu and pay its price`);
  }

  /** Put the menu down; the waiter's request and patience carry on. */
  private closeMenu(): void {
    this.hideMenu();
    this.ctx.setTaskText(`Talk to the waiter when you're ready to order the ${this.target.name}`);
  }

  /** Esc puts the panel down, wherever focus is. */
  private onEsc = (e: KeyboardEvent): void => { if (e.key === 'Escape' && this.panel) this.closeMenu(); };

  private hideMenu(): void {
    removeEventListener('keydown', this.onEsc);
    this.closePanel?.();
    this.closePanel = null;
    this.panel = null;
    this.words = [];
  }

  private renderMenu(): void {
    const el = this.panel!;
    const easy = this.accessible;
    el.className = `card menu-card ${easy ? 'easy' : 'hard'}`;
    const word = (t: string) => t.split(' ').map((w) => `<span class="w">${w}</span>`).join(' ');
    const sections = MENU.map((sec) => `
      <section class="menu-sec"><h4>${word(sec.title)}</h4>
        ${sec.items.map((it) => `<div class="menu-row" ${easy ? `data-say="${it.name}, ${it.price}" tabindex="0" role="button" aria-label="Read ${it.name} aloud"` : ''}><span>${word(it.name)}</span><span class="price">${it.price}</span></div>`).join('')}
      </section>`).join('');
    // Options: the right price plus the three closest prices on the menu.
    const cents = (p: string) => Math.round(Number(p.slice(1)) * 100);
    const others = [...new Set(ITEMS.map((i) => i.price))].filter((p) => p !== this.target.price)
      .sort((a, b) => Math.abs(cents(a) - cents(this.target.price)) - Math.abs(cents(b) - cents(this.target.price))).slice(0, 3);
    const options = [this.target.price, ...others].sort(() => Math.random() - 0.5);
    el.innerHTML = `
      <div class="panel-head"><p class="ask">🧑‍🍳 <b>Waiter:</b> “I really recommend the <b>${this.target.name}</b> today.”</p><button class="btn small" data-a="close" aria-label="Close the menu (Esc)">✕ Close <kbd>Esc</kbd></button></div>
      <div class="patience-row"><span>Waiter's patience</span><div class="patience" role="progressbar" aria-label="Waiter's patience" aria-valuemin="0" aria-valuemax="100"><i></i></div></div>
      <div class="menu"><h3 class="menu-title">${word('Café Mosaic · Menu')}</h3><div class="menu-grid">${sections}</div></div>
      ${easy ? '<button class="btn small" data-a="read">🔊 Read the menu aloud</button>' : ''}
      <p class="pay-label">Pay for the ${this.target.name}:</p>
      <div class="btn-row price-options">${options.map((p) => `<button class="btn" data-price="${p}">Pay ${p}</button>`).join('')}</div>`;
    this.words = [...el.querySelectorAll<HTMLElement>('.w')].map((w) => ({ el: w, text: w.textContent ?? '' }));
    el.querySelector('[data-a=close]')!.addEventListener('click', () => this.closeMenu());
    el.querySelectorAll<HTMLButtonElement>('[data-price]').forEach((b) => b.addEventListener('click', () => this.pay(b.dataset.price!)));
    el.querySelector('[data-a=read]')?.addEventListener('click', () => {
      this.ctx.audio.stopSpeech();
      this.ctx.audio.speak(MENU.map((sec) => `${sec.title}: ${sec.items.map((i) => `${i.name}, ${i.price}`).join('. ')}`).join('. '), { rate: 1.05 });
    });
    el.querySelectorAll<HTMLElement>('[data-say]').forEach((row) => {
      const say = () => { this.ctx.audio.stopSpeech(); this.ctx.audio.speak(row.dataset.say!); };
      row.addEventListener('click', say);
      row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); say(); } });
    });
    this.drawPatience();
  }

  private drawPatience(): void {
    const bar = this.panel?.querySelector<HTMLElement>('.patience');
    if (!bar) return;
    bar.querySelector('i')!.style.width = `${this.patience * 100}%`;
    bar.setAttribute('aria-valuenow', String(Math.round(this.patience * 100)));
  }

  private pay(price: string): void {
    if (this.done) return;
    if (price !== this.target.price) {
      this.patience = Math.max(0, this.patience - 0.2);
      this.drawPatience();
      this.ctx.toast("That's not the right price. Check the menu again.");
      return;
    }
    this.done = true;
    this.ctx.audio.stopSpeech();
    this.ctx.audio.speak('Perfect, thank you! Coming right up.', { pitch: 1.1 });
    this.hideMenu();
    setTimeout(() => this.ctx.complete(), 500);
  }

  update(dt: number, t: number): void {
    this.waiter.rotation.z = Math.sin(t * 1.3) * 0.02;
    if (!this.panel || this.done || !this.ctx.player.enabled) return;

    this.patience -= dt / PATIENCE;
    if (this.patience <= 0) {
      this.ctx.toast('The waiter sighed and served someone else. They\'re back now…');
      const old = this.target;
      while (this.target === old) this.target = ITEMS[Math.floor(Math.random() * ITEMS.length)];
      this.patience = 1;
      this.renderMenu();
      this.greet();
    }
    this.drawPatience();

    if (this.accessible) return;
    this.jumbleTimer -= dt;
    if (this.jumbleTimer > 0) return;
    this.jumbleTimer = JUMBLE_EVERY;
    for (const w of this.words) {
      w.el.textContent = jumble(w.text, 0.22);
      w.el.style.transform = `translate(${(Math.random() - 0.5) * 3}px, ${(Math.random() - 0.5) * 2.5}px)`;
    }
  }

  exit(): void {
    this.hideMenu();
    super.exit();
  }
}
