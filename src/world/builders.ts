import * as THREE from 'three';
import { Colliders } from '../controls/collisions';
import { FONT, PALETTE, mat, rbox, signPlane, wrap } from './materials';
import { RoomInfo } from '../config';

export const WALL_H = 3.4;
/** Where the wall above a doorway starts: inside doorFrame's top bar (2.5 to 2.62), so their faces never overlap and flicker. */
export const LINTEL = 2.56;
const T = 0.2;

/** Axis-aligned wall from (x1,z1) to (x2,z2), with a collider. */
export function wall(scene: THREE.Object3D, col: Colliders | null, x1: number, z1: number, x2: number, z2: number, color = PALETTE.wall, h = WALL_H, y0 = 0): THREE.Mesh {
  const vertical = x1 === x2;
  const len = vertical ? Math.abs(z2 - z1) : Math.abs(x2 - x1);
  const geo = new THREE.BoxGeometry(vertical ? T : len, h, vertical ? len : T);
  const m = new THREE.Mesh(geo, mat(color, { roughness: 0.95 }));
  m.position.set((x1 + x2) / 2, y0 + h / 2, (z1 + z2) / 2);
  m.receiveShadow = true;
  m.castShadow = true;
  scene.add(m);
  if (col && y0 < 1.8) {
    const hx = vertical ? T / 2 : len / 2, hz = vertical ? len / 2 : T / 2;
    col.add(m.position.x - hx, m.position.z - hz, m.position.x + hx, m.position.z + hz);
  }
  return m;
}

/** Floor plane tagged for click-to-move. */
export function floor(scene: THREE.Object3D, cx: number, cz: number, w: number, d: number, color = PALETTE.floor): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(color, { roughness: 0.9 }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(cx, 0, cz);
  m.receiveShadow = true;
  m.userData.floor = true;
  scene.add(m);
  return m;
}

/** Soft rounded rug, also walkable. */
export function rug(scene: THREE.Object3D, cx: number, cz: number, w: number, d: number, color: string): THREE.Mesh {
  const m = rbox(w, 0.02, d, color, 0.01);
  m.position.set(cx, 0.011, cz);
  m.castShadow = false;
  m.userData.floor = true;
  scene.add(m);
  return m;
}

/** Room plaque: accent stripe, icon, title and tagline, in large readable text. */
export function plaque(info: RoomInfo, w = 1.0, h = 1.25): THREE.Mesh {
  return signPlane(w, h, 400, (c, W, H) => {
    c.fillStyle = PALETTE.cream;
    c.beginPath(); c.roundRect(0, 0, W, H, 28); c.fill();
    c.fillStyle = info.accent;
    c.beginPath(); c.roundRect(0, 0, W, 26, [28, 28, 0, 0]); c.fill();
    c.textAlign = 'center';
    c.font = `${W * 0.2}px ${FONT}`;
    c.fillText(info.icon, W / 2, H * 0.3);
    c.fillStyle = PALETTE.charcoal;
    c.font = `700 ${W * 0.105}px ${FONT}`;
    const tl = wrap(c, info.title, W * 0.86);
    tl.forEach((l, i) => c.fillText(l, W / 2, H * 0.47 + i * W * 0.12));
    c.font = `${W * 0.065}px ${FONT}`;
    c.fillStyle = '#4A4A50';
    const lines = wrap(c, info.tagline, W * 0.82);
    lines.forEach((l, i) => c.fillText(l, W / 2, H * 0.47 + tl.length * W * 0.12 + 20 + i * W * 0.085));
    c.font = `700 ${W * 0.055}px ${FONT}`;
    c.fillStyle = PALETTE.charcoal;
    c.fillText('ENTER  →', W / 2, H - 40);
  }, 0.35);
}

/** Wooden frame around an opening. `axis` = the axis the wall runs along. */
export function doorFrame(scene: THREE.Object3D, cx: number, cz: number, width: number, axis: 'x' | 'z', color = PALETTE.charcoal): void {
  const h = 2.5, t = 0.12, d = 0.32;
  const along = (o: number) => (axis === 'z' ? new THREE.Vector3(cx, 0, cz + o) : new THREE.Vector3(cx + o, 0, cz));
  for (const s of [-1, 1]) {
    const post = axis === 'z' ? rbox(d, h, t, color, 0.03) : rbox(t, h, d, color, 0.03);
    post.position.copy(along(s * (width / 2 + t / 2))).setY(h / 2);
    scene.add(post);
  }
  const top = axis === 'z' ? rbox(d, t, width + t * 2, color, 0.03) : rbox(width + t * 2, t, d, color, 0.03);
  top.position.copy(along(0)).setY(h + t / 2);
  scene.add(top);
}

/** A small warm wall light (emissive, no real light, so it's cheap). */
export function sconce(scene: THREE.Object3D, x: number, y: number, z: number): void {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat('#FFE7C2', { emissive: '#FFD9A0', emissiveIntensity: 1.2 }));
  m.rotation.x = Math.PI;
  m.position.set(x, y, z);
  scene.add(m);
}

/** Potted plant for warmth. */
export function plant(scene: THREE.Object3D, x: number, z: number, s = 1): THREE.Group {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * s, 0.14 * s, 0.35 * s, 16), mat('#C9805A'));
  pot.position.y = 0.175 * s;
  pot.castShadow = true;
  g.add(pot);
  const leaf = mat(PALETTE.sage, { flatShading: true });
  for (const [dx, dy, dz, r] of [[0, 0.6, 0, 0.26], [0.12, 0.8, 0.05, 0.18], [-0.1, 0.75, -0.06, 0.2]]) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s, 0), leaf);
    b.position.set(dx * s, dy * s, dz * s);
    b.castShadow = true;
    g.add(b);
  }
  g.position.set(x, 0, z);
  scene.add(g);
  return g;
}

export interface PersonOpts {
  height?: number; // 1 = average
  width?: number;
  shirt?: string;
  skin?: string;
  hair?: string | null;
  glasses?: boolean;
  hat?: string | null;
  apron?: string | null;
  /** Shared face material (a transparent canvas with eyes and mouth). */
  face?: THREE.Material;
}

/** A face drawn on a transparent canvas, for use with person(). */
export function faceMaterial(): THREE.MeshBasicMaterial {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const c = cv.getContext('2d')!;
  c.fillStyle = PALETTE.charcoal;
  for (const x of [44, 84]) { c.beginPath(); c.arc(x, 56, 7, 0, Math.PI * 2); c.fill(); }
  c.strokeStyle = PALETTE.charcoal;
  c.lineWidth = 5;
  c.lineCap = 'round';
  c.beginPath(); c.arc(64, 74, 18, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke();
  c.fillStyle = 'rgba(214, 120, 110, 0.35)';
  for (const x of [34, 94]) { c.beginPath(); c.arc(x, 76, 9, 0, Math.PI * 2); c.fill(); }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: tex, transparent: true });
}

/**
 * A friendly low-poly person built from primitives, facing +z, feet at y = 0.
 * userData: shirt (mesh to recolour), top (height of the head's top), parts.
 */
export function person(o: PersonOpts = {}): THREE.Group {
  const h = o.height ?? 1, w = o.width ?? 1;
  const g = new THREE.Group();
  const skin = mat(o.skin ?? '#E8B98F');
  const legs = rbox(0.34 * w, 0.78 * h, 0.22, '#3E4A57', 0.08);
  legs.position.y = 0.39 * h;
  g.add(legs);
  const r = 0.2 * w, len = 0.42 * h;
  const torsoY = 0.74 * h + len / 2 + r * 0.6;
  const shirt = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 16), mat(o.shirt ?? '#9DB39A'));
  shirt.position.y = torsoY;
  shirt.scale.z = 0.75;
  shirt.castShadow = true;
  g.add(shirt);
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.42 * h, 4, 10), shirt.material);
    arm.position.set(s * (r + 0.06), torsoY - 0.04, 0);
    arm.rotation.z = s * 0.12;
    arm.castShadow = true;
    g.add(arm);
    arm.userData.sleeve = true;
  }
  if (o.apron) {
    const apron = rbox(0.34 * w, 0.5 * h, 0.03, o.apron, 0.012);
    apron.position.set(0, torsoY - 0.1, r * 0.75 + 0.01);
    g.add(apron);
  }
  const headY = torsoY + len / 2 + r + 0.17;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 14), skin);
  head.position.y = headY;
  head.castShadow = true;
  g.add(head);
  if (o.face) {
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.11, 20), o.face);
    face.position.set(0, headY, 0.148);
    g.add(face);
  }
  if (o.hair) {
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.158, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), mat(o.hair));
    hair.position.y = headY + 0.005;
    hair.rotation.x = -0.25;
    g.add(hair);
  }
  if (o.glasses) {
    const frame = mat(PALETTE.charcoal);
    for (const x of [-0.045, 0.045]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.006, 6, 18), frame);
      ring.position.set(x, headY + 0.03, 0.152);
      g.add(ring);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.006, 0.006), frame);
    bridge.position.set(0, headY + 0.035, 0.155);
    g.add(bridge);
  }
  let top = headY + 0.15;
  if (o.hat) {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 20), mat(o.hat));
    brim.position.y = headY + 0.1;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.14, 20), brim.material);
    crown.position.y = headY + 0.17;
    g.add(brim, crown);
    top = headY + 0.24;
  }
  g.userData.shirt = shirt;
  g.userData.top = top;
  return g;
}

/** Recolour a person's shirt and sleeves. */
export function setShirt(p: THREE.Group, color: string): void {
  const m = mat(color);
  p.traverse((o) => { if (o === p.userData.shirt || o.userData.sleeve) (o as THREE.Mesh).material = m; });
}
