import * as THREE from 'three';
import { BaseRoom } from '../Room';
import { buildShell } from '../shell';
import { FONT, PALETTE, canvasTexture, mat, rbox } from '../../world/materials';
import { plant, rug } from '../../world/builders';

/** Find your keys in a cluttered living room, with peripheral vision loss. */
export class TunnelVisionRoom extends BaseRoom {
  private keys = new THREE.Group();
  private tag!: THREE.Sprite;
  private messy: THREE.Object3D[] = [];
  private spots: THREE.Vector3[] = [];
  private spot = -1;
  private found = false;
  private chimeTimer = 0;

  constructor() { super('tunnelVision'); }

  protected build(): void {
    const s = this.scene;
    const c = this.colliders;
    buildShell(s, c, { accentWall: '#E4EDF2', sun: 1.3 });
    rug(s, 0, -1.4, 3.6, 2.6, '#C9B48F');

    const add = (m: THREE.Object3D, messy = false) => { s.add(m); if (messy) this.messy.push(m); return m; };
    const box = (w: number, h: number, d: number, color: string, x: number, y: number, z: number, messy = false, ry = 0) => {
      const m = rbox(w, h, d, color, Math.min(0.04, h / 3));
      m.position.set(x, y, z);
      m.rotation.y = ry;
      return add(m, messy);
    };

    // Sofa against the back wall
    box(2.6, 0.45, 0.95, '#6E8CA0', 0, 0.225, -3.35);
    box(2.6, 0.65, 0.25, '#647F92', 0, 0.65, -3.75);
    box(0.25, 0.6, 0.95, '#647F92', -1.4, 0.3, -3.35);
    box(0.25, 0.6, 0.95, '#647F92', 1.4, 0.3, -3.35);
    c.add(-1.55, -3.9, 1.55, -2.85);
    box(0.5, 0.45, 0.16, '#E69F00', -0.8, 0.68, -3.5, false, 0.2);
    box(0.5, 0.45, 0.16, '#CC79A7', 0.85, 0.68, -3.5, true, -0.25);
    box(1.0, 0.04, 0.8, '#9DB39A', 0.3, 0.47, -3.25, true, 0.3); // blanket

    // Coffee table
    box(1.4, 0.07, 0.75, PALETTE.wood, 0, 0.42, -1.5);
    for (const [x, z] of [[-0.6, -1.78], [0.6, -1.78], [-0.6, -1.22], [0.6, -1.22]]) box(0.06, 0.4, 0.06, PALETTE.woodDark, x, 0.2, z);
    c.add(-0.72, -1.9, 0.72, -1.1);
    const mug = (x: number, y: number, z: number, color: string, messy: boolean) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 16), mat(color));
      m.position.set(x, y + 0.05, z);
      m.castShadow = true;
      return add(m, messy);
    };
    mug(-0.45, 0.455, -1.6, '#F4EFE6', true);
    mug(0.5, 0.455, -1.35, '#0072B2', true);
    for (let i = 0; i < 4; i++) box(0.3, 0.012, 0.22, ['#D55E00', '#56B4E9', '#F0E442', '#F4EFE6'][i], -0.1 + i * 0.05, 0.465 + i * 0.012, -1.45, i > 0, i * 0.4);

    // Bookshelf on the left wall
    box(0.4, 2.1, 1.7, PALETTE.woodDark, -3.7, 1.05, -1.2);
    c.add(-3.95, -2.1, -3.45, -0.3);
    const bookColors = ['#D55E00', '#0072B2', '#009E73', '#E69F00', '#CC79A7', '#F4EFE6', '#56B4E9', '#2B2B2E'];
    for (const y of [0.5, 1.0, 1.5]) {
      box(0.42, 0.04, 1.6, PALETTE.wood, -3.48, y - 0.02, -1.2);
      let z = -1.95;
      while (z < -0.5) {
        const w = 0.05 + Math.random() * 0.05;
        const h = 0.26 + Math.random() * 0.14;
        if (Math.random() > 0.2) box(0.26, h, w, bookColors[Math.floor(Math.random() * 8)], -3.45, y + h / 2, z, Math.random() > 0.6);
        z += w + 0.01;
      }
    }

    // Side table + lamp, TV console
    box(0.5, 0.55, 0.5, PALETTE.wood, 2.2, 0.275, -3.4);
    c.add(1.95, -3.65, 2.45, -3.15);
    const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.4, 16), mat(PALETTE.charcoal));
    lampBase.position.set(2.2, 0.75, -3.45);
    s.add(lampBase);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 0.24, 20, 1, true), mat('#FBF0DC', { side: THREE.DoubleSide, emissive: '#FFD9A0', emissiveIntensity: 0.6 }));
    shade.position.set(2.2, 1.05, -3.45);
    s.add(shade);
    box(0.5, 0.55, 1.8, PALETTE.wood, 3.65, 0.275, 0.4);
    c.add(3.4, -0.5, 3.9, 1.3);
    box(0.08, 0.7, 1.3, PALETTE.charcoal, 3.75, 0.95, 0.4);

    // Floor clutter (hidden when the room is tidied)
    box(0.3, 0.1, 0.12, '#2B2B2E', 1.3, 0.05, -0.2, true, 0.6);
    box(0.3, 0.1, 0.12, '#2B2B2E', 1.45, 0.05, -0.05, true, 1.1);
    const laundry = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 0), mat('#E9DCC6', { flatShading: true }));
    laundry.scale.y = 0.45;
    laundry.position.set(-2.4, 0.13, -3.2);
    laundry.castShadow = true;
    add(laundry, true);
    box(0.4, 0.3, 0.2, '#B5402E', 2.6, 0.15, 1.6, true, 0.4); // bag
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), mat('#F0E442'));
    ball.position.set(-1.2, 0.11, 0.6);
    add(ball, true);
    plant(s, -3.4, -3.4, 1.2);
    plant(s, 3.3, 3.3, 1.0);

    // Six places the keys might be
    this.spots = [
      new THREE.Vector3(0.35, 0.47, -1.62), // coffee table
      new THREE.Vector3(-0.3, 0.46, -3.2), // sofa seat
      new THREE.Vector3(-3.42, 1.0, -0.42), // bookshelf
      new THREE.Vector3(2.08, 0.56, -3.3), // side table
      new THREE.Vector3(3.6, 0.56, 1.15), // TV console
      new THREE.Vector3(-3.0, 0.01, -2.85), // floor by plant
    ];

    // Keys
    const gold = mat('#C9A227', { metalness: 0.7, roughness: 0.35 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 8, 24), gold);
    ring.rotation.x = Math.PI / 2;
    this.keys.add(ring);
    for (const a of [0.3, -0.5]) {
      const k = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.004, 0.018), gold);
      k.position.set(Math.cos(a) * 0.07, 0.003, Math.sin(a) * 0.07);
      k.rotation.y = -a;
      this.keys.add(k);
    }
    const fob = rbox(0.045, 0.012, 0.03, '#3E4A57', 0.005);
    fob.position.set(-0.05, 0.006, 0.03);
    this.keys.add(fob);
    s.add(this.keys);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), mat('#ffffff'));
    hit.visible = false; // invisible, but still clickable: makes small keys fair to click
    this.keys.add(hit);
    this.ctx.addClickable(this.keys, () => this.onFound());

    // Support: high-contrast tag
    const tex = canvasTexture(256, 112, (g) => {
      g.fillStyle = '#F0E442';
      g.beginPath(); g.roundRect(4, 4, 248, 104, 24); g.fill();
      g.lineWidth = 8; g.strokeStyle = '#000000'; g.stroke();
      g.fillStyle = '#000000';
      g.font = `700 56px ${FONT}`;
      g.textAlign = 'center';
      g.fillText('KEYS', 128, 76);
    });
    this.tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex }));
    this.tag.scale.set(0.32, 0.14, 1);
    this.tag.position.y = 0.18;
    this.keys.add(this.tag);

    this.ctx.effects.setTunnel(true, 0.2);
    this.resetTask();
  }

  resetTask(): void {
    let n = this.spot;
    while (n === this.spot) n = Math.floor(Math.random() * this.spots.length);
    this.spot = n;
    this.keys.position.copy(this.spots[n]);
    this.keys.rotation.y = Math.random() * Math.PI * 2;
    this.found = false;
    this.ctx.setTaskText('Find your keys');
  }

  setAccessible(on: boolean): void {
    super.setAccessible(on);
    this.tag.visible = on;
    this.messy.forEach((m) => (m.visible = !on));
    this.chimeTimer = 0;
  }

  private onFound(): void {
    if (this.found) return;
    this.found = true;
    this.ctx.toast('Found them!');
    this.ctx.complete();
  }

  update(dt: number): void {
    if (!this.accessible || this.found) return;
    this.chimeTimer -= dt;
    if (this.chimeTimer <= 0) {
      this.chimeTimer = 1.6;
      const cam = this.ctx.camera;
      const to = this.keys.position.clone().sub(cam.position).normalize();
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
      const facing = Math.max(0, to.dot(fwd));
      this.ctx.audio.chimeAt(this.keys.position, 0.12 + 0.3 * facing * facing);
    }
  }
}
