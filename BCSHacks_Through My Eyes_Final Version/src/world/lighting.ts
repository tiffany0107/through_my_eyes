import * as THREE from 'three';

export interface LightOpts {
  cx?: number;
  cz?: number;
  size?: number; // half-extent of the shadow area
  sun?: number;
  fog?: [number, number] | null;
  background?: string;
}

/** Soft hemisphere fill + one warm sun with soft shadows. */
export function addLighting(scene: THREE.Scene, o: LightOpts = {}): THREE.DirectionalLight {
  const cx = o.cx ?? 0, cz = o.cz ?? 0, size = o.size ?? 6;
  const bg = o.background ?? '#EFE7DA';
  scene.background = new THREE.Color(bg);
  if (o.fog) scene.fog = new THREE.Fog(bg, o.fog[0], o.fog[1]);

  scene.add(new THREE.HemisphereLight('#FFF8EE', '#BFAE94', 1.5));

  const sun = new THREE.DirectionalLight('#FFE3BF', o.sun ?? 1.8);
  sun.position.set(cx + 4, 9, cz + 3);
  sun.target.position.set(cx, 0, cz);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const sc = sun.shadow.camera;
  sc.left = -size; sc.right = size; sc.top = size; sc.bottom = -size;
  sc.near = 1; sc.far = 30;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 4;
  scene.add(sun, sun.target);
  return sun;
}
