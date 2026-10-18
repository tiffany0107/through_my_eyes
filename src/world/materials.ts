import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const PALETTE = {
  wall: '#F4EFE6',
  floor: '#D9CBB3',
  charcoal: '#2B2B2E',
  wood: '#B88A5A',
  woodDark: '#7E5A3A',
  cream: '#FBF7F0',
  sage: '#9DB39A',
};

export const FONT = '"Atkinson Hyperlegible", system-ui, sans-serif';

const cache = new Map<string, THREE.MeshStandardMaterial>();
const shared = new Set<THREE.Material>();

/** Shared, cached material. Never disposed per room. */
export function mat(color: string, opts: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
  const key = color + JSON.stringify(opts);
  let m = cache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...opts });
    cache.set(key, m);
    shared.add(m);
  }
  return m;
}

/** Soft rounded box mesh. */
export function rbox(w: number, h: number, d: number, color: string, radius = 0.04): THREE.Mesh {
  const r = Math.min(radius, w / 2.01, h / 2.01, d / 2.01);
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, r), mat(color));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function canvasTexture(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d')!;
  draw(c);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** A flat sign made from a canvas drawing. glow lightly lifts it out of shadow. */
export function signPlane(w: number, h: number, ppm: number, draw: (c: CanvasRenderingContext2D, W: number, H: number) => void, glow = 0.25): THREE.Mesh {
  const W = Math.round(w * ppm);
  const H = Math.round(h * ppm);
  const tex = canvasTexture(W, H, (c) => draw(c, W, H));
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: glow });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
}

/** Wrap text to a width; returns lines. */
export function wrap(c: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (c.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** Dispose everything in a scene except shared cached materials. */
export function disposeScene(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mats = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : [];
    for (const m of mats) {
      if (shared.has(m)) continue;
      const anyM = m as THREE.MeshStandardMaterial & { map?: THREE.Texture | null };
      anyM.map?.dispose();
      m.dispose();
    }
  });
}
