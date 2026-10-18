import * as THREE from 'three';
import { Colliders } from './collisions';

const EYE = 1.6;
const SPEED = 3;
const TURN = 1.8;

/**
 * First-person player.
 * - Mouse look: pointer lock (press M or the "Mouse look" button), or drag to look.
 * - WASD / arrow keys to move (left/right arrows turn, for keyboard-only users).
 * - Click (without dragging) fires onClick; click-to-move is handled by the app.
 */
export class Player {
  yaw = 0;
  pitch = 0;
  pos = new THREE.Vector3();
  target: THREE.Vector3 | null = null;
  enabled = false;
  private keys = new Set<string>();
  private bob = 0;
  private down: { x: number; y: number; moved: number } | null = null;

  onClick: (clientX: number | null, clientY: number | null) => void = () => {};
  onInteractKey: () => void = () => {};
  onLockChange: (locked: boolean) => void = () => {};

  constructor(public camera: THREE.PerspectiveCamera, private dom: HTMLElement, private reducedMotion: boolean) {
    camera.rotation.order = 'YXZ';
    const isTyping = (e: Event) => {
      const t = e.target as HTMLElement | null;
      return !!t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA');
    };
    window.addEventListener('keydown', (e) => {
      if (isTyping(e)) return;
      const k = e.key.toLowerCase();
      // Let Space press a focused button (e.g. in a room panel) instead of "interact".
      if (k === ' ' && (e.target as HTMLElement | null)?.tagName === 'BUTTON') return;
      if (k === 'm' && this.enabled) { this.locked ? this.unlock() : this.lock(); return; }
      if ((k === 'e' || k === ' ') && this.enabled) { e.preventDefault(); this.onInteractKey(); return; }
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        if (this.enabled) e.preventDefault();
        this.keys.add(k);
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());

    document.addEventListener('pointerlockchange', () => this.onLockChange(this.locked));
    document.addEventListener('mousemove', (e) => {
      if (!this.locked || !this.enabled) return;
      this.look(e.movementX, e.movementY, 0.0022);
    });

    dom.addEventListener('pointerdown', (e) => {
      this.down = { x: e.clientX, y: e.clientY, moved: 0 };
      dom.setPointerCapture(e.pointerId);
    });
    dom.addEventListener('pointermove', (e) => {
      if (!this.down || this.locked || !this.enabled) return;
      const dx = e.clientX - this.down.x, dy = e.clientY - this.down.y;
      this.down.moved += Math.abs(dx) + Math.abs(dy);
      this.down.x = e.clientX;
      this.down.y = e.clientY;
      this.look(-dx, -dy, 0.004); // drag the world
    });
    dom.addEventListener('pointerup', (e) => {
      const d = this.down;
      this.down = null;
      if (!d || !this.enabled) return;
      if (this.locked) this.onClick(null, null);
      else if (d.moved < 6) this.onClick(e.clientX, e.clientY);
    });
  }

  get locked(): boolean { return document.pointerLockElement === this.dom; }

  lock(): void {
    try {
      const p = this.dom.requestPointerLock() as unknown as Promise<void> | undefined;
      p?.catch?.(() => {});
    } catch { /* not available, drag-to-look still works */ }
  }

  unlock(): void { if (this.locked) document.exitPointerLock(); }

  private look(dx: number, dy: number, s: number): void {
    this.yaw -= dx * s;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * s, -1.2, 1.2);
  }

  setPose(x: number, z: number, yaw: number): void {
    this.pos.set(x, 0, z);
    this.yaw = yaw;
    this.pitch = 0;
    this.target = null;
    this.apply();
  }

  update(dt: number, colliders: Colliders): void {
    let f = 0, s = 0;
    if (this.enabled) {
      if (this.keys.has('w') || this.keys.has('arrowup')) f += 1;
      if (this.keys.has('s') || this.keys.has('arrowdown')) f -= 1;
      if (this.keys.has('d')) s += 1;
      if (this.keys.has('a')) s -= 1;
      if (this.keys.has('arrowleft')) this.yaw += TURN * dt;
      if (this.keys.has('arrowright')) this.yaw -= TURN * dt;
    }
    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const move = new THREE.Vector3();
    if (f || s) {
      this.target = null;
      move.addScaledVector(fwd, f).addScaledVector(right, s).normalize().multiplyScalar(SPEED * dt);
    } else if (this.target) {
      const to = this.target.clone().sub(this.pos).setY(0);
      const dist = to.length();
      if (dist < 0.08) this.target = null;
      else move.copy(to.normalize().multiplyScalar(Math.min(dist, SPEED * dt)));
    }
    const moving = move.lengthSq() > 0;
    this.pos.add(move);
    colliders.resolve(this.pos, 0.3);
    if (moving && !this.reducedMotion) this.bob += dt * 9;
    this.apply();
  }

  private apply(): void {
    const bobY = this.reducedMotion ? 0 : Math.sin(this.bob) * 0.025;
    this.camera.position.set(this.pos.x, EYE + bobY, this.pos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }
}
