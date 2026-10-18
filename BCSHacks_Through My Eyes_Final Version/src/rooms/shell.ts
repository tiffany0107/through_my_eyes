import * as THREE from 'three';
import { Colliders } from '../controls/collisions';
import { PALETTE, mat } from '../world/materials';
import { WALL_H, doorFrame, floor, wall } from '../world/builders';
import { addLighting } from '../world/lighting';

export interface ShellOpts { w?: number; d?: number; wall?: string; floor?: string; accentWall?: string; sun?: number }

/**
 * A simple room: floor, four walls, ceiling, lights and a door frame behind the
 * spawn point. Centred on the origin; the player spawns near +z facing -z.
 */
export function buildShell(scene: THREE.Scene, col: Colliders, o: ShellOpts = {}): void {
  const w = o.w ?? 8, d = o.d ?? 8;
  const hw = w / 2, hd = d / 2;
  addLighting(scene, { size: Math.max(w, d) * 0.7, sun: o.sun ?? 1.6 });
  floor(scene, 0, 0, w, d, o.floor ?? PALETTE.floor);
  wall(scene, col, -hw, -hd, hw, -hd, o.accentWall ?? o.wall ?? PALETTE.wall);
  wall(scene, col, -hw, hd, hw, hd, o.wall ?? PALETTE.wall);
  wall(scene, col, -hw, -hd, -hw, hd, o.wall ?? PALETTE.wall);
  wall(scene, col, hw, -hd, hw, hd, o.wall ?? PALETTE.wall);
  doorFrame(scene, 0, hd - 0.1, 1.36, 'x');
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat('#FAF6EF'));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = WALL_H;
  scene.add(ceil);
  const lamp = new THREE.PointLight('#FFE0B5', 3.5, 12, 2);
  lamp.position.set(0, 2.3, 1);
  scene.add(lamp);
}
