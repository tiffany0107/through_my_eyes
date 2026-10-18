import * as THREE from 'three';
import { Colliders } from '../controls/collisions';
import { RoomId, roomInfo } from '../config';
import { PALETTE, mat, rbox } from './materials';
import { LINTEL, WALL_H, doorFrame, floor, plaque, plant, sconce, wall } from './builders';
import { addLighting } from './lighting';
import { buildLobby } from './lobby';

export interface Spawn { x: number; z: number; yaw: number }
export interface Trigger { id: RoomId; box: THREE.Box2; spawn: Spawn }
export interface Hub {
  scene: THREE.Scene;
  colliders: Colliders;
  triggers: Trigger[];
  spawn: Spawn;
  update(t: number): void;
}

const GAP = 0.8; // half door width
const DOORS: { id: RoomId; side: -1 | 1; z: number }[] = [
  { id: 'colourBlindness', side: -1, z: -7 },
  { id: 'tunnelVision', side: 1, z: -7 },
  { id: 'dyslexia', side: -1, z: -15 },
  { id: 'faceBlindness', side: 1, z: -15 },
  { id: 'tinnitus', side: -1, z: -23 },
  { id: 'schizophrenia', side: 1, z: -23 },
];
const END = -32;

/** Lobby + corridor with six doorways and the reflection room at the far end. */
export function buildHub(): Hub {
  const scene = new THREE.Scene();
  const col = new Colliders();
  addLighting(scene, { cx: 0, cz: -11, size: 22, sun: 1.1, fog: [10, 34] });
  const updateLobby = buildLobby(scene, col);
  const triggers: Trigger[] = [];

  floor(scene, 0, END / 2, 4, -END);
  // Runner rug down the corridor
  const runner = rbox(1.6, 0.02, -END - 2, '#CDBB9E', 0.01);
  runner.position.set(0, 0.011, END / 2);
  runner.castShadow = false;
  runner.userData.floor = true;
  scene.add(runner);

  for (const side of [-1, 1] as const) {
    const x = 2 * side;
    const doorZs = DOORS.filter((d) => d.side === side).map((d) => d.z);
    let from = 0;
    for (const z of doorZs) {
      wall(scene, col, x, from, x, z + GAP);
      wall(scene, null, x, z + GAP, x, z - GAP, PALETTE.wall, WALL_H - LINTEL, LINTEL);
      from = z - GAP;
    }
    wall(scene, col, x, from, x, END);
  }
  wall(scene, col, -2, END, -GAP, END);
  wall(scene, col, GAP, END, 2, END);
  wall(scene, null, -GAP, END, GAP, END, PALETTE.wall, WALL_H - LINTEL, LINTEL);

  for (const d of DOORS) {
    const info = roomInfo(d.id);
    const x = 2 * d.side;
    const depth = 1.4;
    const bx = x + d.side * depth;
    doorFrame(scene, x, d.z, GAP * 2 - 0.24, 'z');
    // Alcove so the doorway leads somewhere, lit in the room's accent colour
    floor(scene, x + (d.side * depth) / 2, d.z, depth, GAP * 2);
    wall(scene, col, x, d.z - GAP, bx, d.z - GAP);
    wall(scene, col, x, d.z + GAP, bx, d.z + GAP);
    wall(scene, col, bx, d.z - GAP, bx, d.z + GAP, info.accent);
    const glow = new THREE.PointLight(info.accent, 2.5, 3, 2);
    glow.position.set(x + d.side * 0.9, 2.2, d.z);
    scene.add(glow);
    // Plaque beside the door, at eye level
    const p = plaque(info);
    p.position.set(x - d.side * 0.101, 1.55, d.z + 1.55);
    p.rotation.y = -d.side * Math.PI / 2;
    scene.add(p);
    const minX = Math.min(bx, x + d.side * 0.75), maxX = Math.max(bx, x + d.side * 0.75);
    triggers.push({ id: d.id, box: new THREE.Box2(new THREE.Vector2(minX, d.z - GAP), new THREE.Vector2(maxX, d.z + GAP)), spawn: { x: x - d.side * 0.9, z: d.z, yaw: d.side * Math.PI / 2 } });
  }

  // Reflection room door at the far end
  const ref = roomInfo('reflection');
  doorFrame(scene, 0, END, GAP * 2 - 0.24, 'x');
  floor(scene, 0, END - 0.7, GAP * 2, 1.4);
  wall(scene, col, -GAP, END, -GAP, END - 1.4);
  wall(scene, col, GAP, END, GAP, END - 1.4);
  wall(scene, col, -GAP, END - 1.4, GAP, END - 1.4, '#9DB39A');
  const rp = plaque({ ...ref, accent: PALETTE.sage }, 0.9, 1.1);
  rp.position.set(1.4, 1.55, END + 0.101);
  scene.add(rp);
  triggers.push({ id: 'reflection', box: new THREE.Box2(new THREE.Vector2(-GAP, END - 1.4), new THREE.Vector2(GAP, END - 0.6)), spawn: { x: 0, z: END + 1.2, yaw: Math.PI } });

  // Ceiling, sconces, warm lights
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(4, -END), mat('#FAF6EF'));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, WALL_H, END / 2);
  scene.add(ceil);
  for (const z of [-3, -11, -19, -27]) {
    sconce(scene, -1.88, 2.5, z);
    sconce(scene, 1.88, 2.5, z);
  }
  for (const z of [-4, -14, -24]) {
    const l = new THREE.PointLight('#FFD9A8', 3.5, 10, 2);
    l.position.set(0, 2.5, z);
    scene.add(l);
  }
  plant(scene, -1.6, END + 0.5, 1.1);
  col.add(-1.85, END + 0.25, -1.35, END + 0.75);

  return { scene, colliders: col, triggers, spawn: { x: -1.1, z: 8.6, yaw: -0.12 }, update: updateLobby };
}
