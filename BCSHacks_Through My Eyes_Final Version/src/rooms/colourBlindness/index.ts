import * as THREE from 'three';
import { BaseRoom } from '../Room';
import { buildShell } from '../shell';
import { CBType, CB_LABELS } from '../../shaders/colourBlindness';
import { FONT, PALETTE, canvasTexture, mat, rbox } from '../../world/materials';
import { plant, rug } from '../../world/builders';

// Ripe and unripe shades are chosen with similar brightness, so that once the
// red/green difference is removed they become genuinely hard to tell apart.
const RIPE = ['#B5402E', '#C2452F', '#A83B2B', '#BC4A33'];
const UNRIPE = ['#7A8B2E', '#86913A', '#6F8A33', '#8C8A34'];
const GOAL = 5;

interface Tomato { mesh: THREE.Mesh; ripe: boolean; tag: THREE.Sprite; picked: boolean }
interface Flight { mesh: THREE.Object3D; from: THREE.Vector3; to: THREE.Vector3; t: number }

/** Showcase room: pick ripe tomatoes at a market stall. */
export class ColourBlindnessRoom extends BaseRoom {
  private tomatoes: Tomato[] = [];
  private flights: Flight[] = [];
  private picked = 0;
  private done = false;
  private type: CBType = 'deuteranopia';
  private severity = 1;
  private basketPos = new THREE.Vector3(2.35, 0.78, -1.15);
  private board!: { tex: THREE.CanvasTexture; draw: () => void };

  constructor() { super('colourBlindness'); }

  protected build(): void {
    const s = this.scene;
    buildShell(s, this.colliders, { accentWall: '#F3E3C6' });
    rug(s, 0, 0.6, 4.4, 3, '#E6D3B5');

    // Stall table
    const table = rbox(3.8, 0.1, 0.9, PALETTE.wood, 0.04);
    table.position.set(0, 0.88, -1.65);
    s.add(table);
    const skirt = rbox(3.7, 0.75, 0.05, '#C99A66', 0.02);
    skirt.position.set(0, 0.45, -1.22);
    s.add(skirt);
    this.colliders.add(-1.95, -2.15, 1.95, -1.15);

    // Awning with stripes in the room's accent colour
    for (const x of [-1.85, 1.85]) {
      const post = rbox(0.08, 2.5, 0.08, PALETTE.woodDark, 0.02);
      post.position.set(x, 1.25, -2.05);
      s.add(post);
    }
    const stripes = canvasTexture(512, 64, (c) => {
      for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? PALETTE.cream : this.info.accent; c.fillRect(i * 64, 0, 64, 64); }
    });
    const canopy = new THREE.Mesh(new THREE.PlaneGeometry(4.1, 1.3), new THREE.MeshStandardMaterial({ map: stripes, side: THREE.DoubleSide, roughness: 0.9 }));
    canopy.position.set(0, 2.45, -1.55);
    canopy.rotation.x = -Math.PI / 2 + 0.35;
    canopy.castShadow = true;
    s.add(canopy);

    // Three crates of tomatoes
    const geo = new THREE.SphereGeometry(0.068, 18, 12);
    const tagTex = canvasTexture(160, 80, (c) => {
      c.fillStyle = '#FFFFFF';
      c.beginPath(); c.roundRect(4, 4, 152, 72, 18); c.fill();
      c.lineWidth = 5; c.strokeStyle = PALETTE.charcoal; c.stroke();
      c.fillStyle = PALETTE.charcoal;
      c.font = `700 40px ${FONT}`;
      c.textAlign = 'center';
      c.fillText('✓ RIPE', 80, 54);
    });
    const tagMat = new THREE.SpriteMaterial({ map: tagTex, depthTest: true });
    for (const cx of [-1.2, 0, 1.2]) {
      const crate = rbox(1.08, 0.18, 0.66, '#C8A070', 0.03);
      crate.position.set(cx, 1.02, -1.65);
      s.add(crate);
      for (const sx of [-1, 1]) {
        const side = rbox(1.08, 0.14, 0.04, '#B08658', 0.015);
        side.position.set(cx, 1.13, -1.65 + sx * 0.33);
        s.add(side);
      }
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 3; j++) {
          const m = new THREE.Mesh(geo, mat(RIPE[0], { roughness: 0.45 }));
          m.scale.y = 0.85;
          m.position.set(cx - 0.4 + i * 0.2 + (Math.random() - 0.5) * 0.03, 1.17, -1.84 + j * 0.19 + (Math.random() - 0.5) * 0.03);
          m.castShadow = true;
          s.add(m);
          const tag = new THREE.Sprite(tagMat);
          tag.scale.set(0.13, 0.065, 1);
          tag.position.copy(m.position).add(new THREE.Vector3(0, 0.11, 0));
          tag.visible = false;
          s.add(tag);
          const t: Tomato = { mesh: m, ripe: false, tag, picked: false };
          this.tomatoes.push(t);
          this.ctx.addClickable(m, () => this.pick(t));
        }
      }
    }

    // Basket on a stool
    const stool = rbox(0.5, 0.6, 0.5, PALETTE.woodDark, 0.04);
    stool.position.set(2.35, 0.3, -1.15);
    s.add(stool);
    this.colliders.addMesh(stool, 0.02);
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.2, 24, 1, true), mat('#C49A5C', { side: THREE.DoubleSide }));
    basket.position.set(2.35, 0.7, -1.15);
    basket.castShadow = true;
    s.add(basket);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.015, 8, 32, Math.PI), mat('#A67C44'));
    handle.position.set(2.35, 0.8, -1.15);
    s.add(handle);

    // Chalkboard sign
    const cv = { accessible: false };
    const boardTex = canvasTexture(600, 420, () => {});
    const draw = () => {
      const c = (boardTex.image as HTMLCanvasElement).getContext('2d')!;
      c.fillStyle = '#2F3B34';
      c.fillRect(0, 0, 600, 420);
      c.strokeStyle = '#C8A070'; c.lineWidth = 18; c.strokeRect(9, 9, 582, 402);
      c.fillStyle = '#F4EFE6';
      c.textAlign = 'center';
      c.font = `700 58px ${FONT}`;
      c.fillText('Fresh tomatoes', 300, 105);
      c.font = `36px ${FONT}`;
      c.fillText('Ripe = red   ·   Unripe = green', 300, 180);
      c.font = `700 44px ${FONT}`;
      c.fillText('3 for $2', 300, 260);
      if (cv.accessible) {
        c.fillStyle = '#FFFFFF';
        c.beginPath(); c.roundRect(90, 300, 420, 80, 16); c.fill();
        c.fillStyle = PALETTE.charcoal;
        c.font = `700 38px ${FONT}`;
        c.fillText('✓ tag = ripe', 300, 354);
      }
      boardTex.needsUpdate = true;
    };
    this.board = { tex: boardTex, draw: () => { cv.accessible = this.accessible; draw(); } };
    draw();
    const board = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.84), new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.9 }));
    board.position.set(-2.55, 1.15, -0.9);
    board.rotation.y = 0.5;
    s.add(board);
    const easel = rbox(0.06, 1.2, 0.06, PALETTE.woodDark, 0.02);
    easel.position.set(-2.55, 0.6, -0.95);
    easel.rotation.y = 0.5;
    s.add(easel);
    this.colliders.add(-3.1, -1.3, -2.0, -0.6);

    // Back shelf of other produce (instanced, so it's cheap)
    const shelf = rbox(5, 0.08, 0.5, PALETTE.wood, 0.03);
    shelf.position.set(0, 1.0, -3.7);
    s.add(shelf);
    const shelf2 = shelf.clone();
    shelf2.position.y = 1.6;
    s.add(shelf2);
    this.colliders.add(-2.5, -3.95, 2.5, -3.45);
    const produce: [string, number, number][] = [['#E08A2E', 0.07, -2.2], ['#E9C846', 0.06, -1], ['#5E7F3A', 0.1, 0.3], ['#5B3F6B', 0.07, 1.6]];
    produce.forEach(([color, r, x0], k) => {
      const inst = new THREE.InstancedMesh(new THREE.SphereGeometry(r, 14, 10), mat(color, { roughness: 0.5 }), 14);
      const m4 = new THREE.Matrix4();
      for (let i = 0; i < 14; i++) {
        const y = (k % 2 ? 1.6 : 1.0) + 0.04 + r + (i >= 7 ? r * 1.4 : 0);
        m4.makeTranslation(x0 + (i % 7) * r * 2.1 - 0.4, y, -3.7 + (i >= 7 ? 0 : 0.1));
        inst.setMatrixAt(i, m4);
      }
      inst.castShadow = true;
      s.add(inst);
    });
    plant(s, -3.4, 3.4, 1.2);
    plant(s, 3.4, 3.4, 1.2);

    this.ctx.setRoomControls(this.controlsPanel());
    this.applyFilter();
    this.resetTask();
  }

  private controlsPanel(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'room-controls-inner';
    el.innerHTML = `
      <label class="field"><span>Type</span>
        <select id="cb-type">${(Object.keys(CB_LABELS) as CBType[]).map((k) => `<option value="${k}" ${k === this.type ? 'selected' : ''}>${CB_LABELS[k]}</option>`).join('')}</select>
      </label>
      <label class="field"><span>Severity <output id="cb-sev-out">100%</output></span>
        <input id="cb-sev" type="range" min="0" max="1" step="0.05" value="${this.severity}">
      </label>`;
    el.querySelector<HTMLSelectElement>('#cb-type')!.addEventListener('change', (e) => {
      this.type = (e.target as HTMLSelectElement).value as CBType;
      this.applyFilter();
    });
    el.querySelector<HTMLInputElement>('#cb-sev')!.addEventListener('input', (e) => {
      this.severity = Number((e.target as HTMLInputElement).value);
      el.querySelector('#cb-sev-out')!.textContent = `${Math.round(this.severity * 100)}%`;
      this.applyFilter();
    });
    return el;
  }

  private applyFilter(): void { this.ctx.effects.setColourBlind(this.type, this.severity); }

  resetTask(): void {
    this.picked = 0;
    this.done = false;
    this.flights = [];
    const ripeIdx = new Set<number>();
    while (ripeIdx.size < 14) ripeIdx.add(Math.floor(Math.random() * this.tomatoes.length));
    this.tomatoes.forEach((t, i) => {
      t.ripe = ripeIdx.has(i);
      t.picked = false;
      const pal = t.ripe ? RIPE : UNRIPE;
      t.mesh.material = mat(pal[Math.floor(Math.random() * pal.length)], { roughness: 0.45 });
      t.mesh.visible = true;
      t.mesh.position.set(t.tag.position.x, 1.17, t.tag.position.z);
      t.mesh.rotation.set(0, Math.random() * 6, 0);
      t.tag.visible = this.accessible && t.ripe;
    });
    this.ctx.setTaskText(`Pick ripe tomatoes: 0 / ${GOAL}`);
  }

  setAccessible(on: boolean): void {
    super.setAccessible(on);
    this.tomatoes.forEach((t) => (t.tag.visible = on && t.ripe && !t.picked));
    this.board.draw();
  }

  private pick(t: Tomato): void {
    if (this.done || t.picked) return;
    if (!t.ripe) { this.ctx.toast('Not ripe yet. Try another one.'); return; }
    t.picked = true;
    t.tag.visible = false;
    this.picked++;
    const to = this.basketPos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.2, 0.02 + this.picked * 0.02, (Math.random() - 0.5) * 0.2));
    this.flights.push({ mesh: t.mesh, from: t.mesh.position.clone(), to, t: 0 });
    this.ctx.setTaskText(`Pick ripe tomatoes: ${this.picked} / ${GOAL}`);
    if (this.picked >= GOAL) {
      this.done = true;
      setTimeout(() => this.ctx.complete(), 650);
    }
  }

  update(dt: number): void {
    for (const f of this.flights) {
      f.t = Math.min(1, f.t + dt / 0.5);
      const e = 1 - Math.pow(1 - f.t, 3);
      f.mesh.position.lerpVectors(f.from, f.to, e);
      f.mesh.position.y += Math.sin(f.t * Math.PI) * 0.35;
    }
    this.flights = this.flights.filter((f) => f.t < 1);
  }
}
