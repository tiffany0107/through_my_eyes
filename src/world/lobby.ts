import * as THREE from 'three';
import { Colliders } from '../controls/collisions';
import { COPY, ROOMS } from '../config';
import { FONT, PALETTE, mat, rbox, signPlane, wrap } from './materials';
import { LINTEL, WALL_H, doorFrame, floor, plant, rug, wall } from './builders';

/** Lobby: x -6..6, z 0..10. Opens into the corridor at z = 0 (x -2..2). */
export function buildLobby(scene: THREE.Scene, col: Colliders): (t: number) => void {
  floor(scene, 0, 5, 12, 10);
  rug(scene, 0, 5.2, 6, 5, '#E7D9C3');
  wall(scene, col, -6, 10, 6, 10);
  wall(scene, col, -6, 0, -6, 10);
  wall(scene, col, 6, 0, 6, 10);
  wall(scene, col, -6, 0, -2, 0);
  wall(scene, col, 2, 0, 6, 0);
  wall(scene, null, -2, 0, 2, 0, PALETTE.wall, WALL_H - LINTEL, LINTEL);
  doorFrame(scene, 0, 0, 4 - 0.24, 'x');

  // Title wall (left of the arch)
  const title = signPlane(3.4, 1.7, 360, (c, W, H) => {
    c.fillStyle = PALETTE.cream;
    c.beginPath(); c.roundRect(0, 0, W, H, 40); c.fill();
    c.fillStyle = PALETTE.charcoal;
    c.font = `700 ${H * 0.2}px ${FONT}`;
    c.fillText(COPY.title, 70, H * 0.36);
    c.font = `${H * 0.085}px ${FONT}`;
    c.fillStyle = '#4A4A50';
    c.fillText(COPY.subtitle, 74, H * 0.52);
    ROOMS.filter((r) => r.id !== 'reflection').forEach((r, i) => {
      const x = 110 + i * 150, y = H * 0.76;
      c.fillStyle = r.accent;
      c.beginPath(); c.arc(x, y, 56, 0, Math.PI * 2); c.fill();
      c.font = `${H * 0.09}px ${FONT}`;
      c.textAlign = 'center';
      c.fillText(r.icon, x, y + 22);
      c.textAlign = 'left';
    });
  }, 0.3);
  title.position.set(-4, 1.75, 0.11);
  scene.add(title);

  // Disclaimer + controls (right of the arch)
  const info = signPlane(3.2, 1.7, 360, (c, W, H) => {
    c.fillStyle = PALETTE.cream;
    c.beginPath(); c.roundRect(0, 0, W, H, 40); c.fill();
    c.fillStyle = PALETTE.charcoal;
    c.font = `700 ${H * 0.08}px ${FONT}`;
    c.fillText('Before you begin', 60, 110);
    c.font = `${H * 0.058}px ${FONT}`;
    c.fillStyle = '#3C3C42';
    let y = 180;
    for (const l of wrap(c, COPY.disclaimer, W - 120)) { c.fillText(l, 60, y); y += 50; }
    y += 30;
    c.font = `700 ${H * 0.058}px ${FONT}`;
    c.fillStyle = PALETTE.charcoal;
    c.fillText('Controls', 60, y); y += 54;
    c.font = `${H * 0.052}px ${FONT}`;
    c.fillStyle = '#3C3C42';
    for (const l of ['WASD or arrows: move', 'Drag or M: look around', 'Click / E: interact', 'Click the floor to walk there']) { c.fillText('•  ' + l, 60, y); y += 46; }
  }, 0.3);
  info.position.set(4, 1.75, 0.11);
  scene.add(info);

  // Sculpture: an eye ringed by the six room colours
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.9, 32), mat(PALETTE.cream));
  plinth.position.set(0, 0.45, 4.6);
  plinth.castShadow = plinth.receiveShadow = true;
  scene.add(plinth);
  col.addCircle(0, 4.6, 0.62);
  const eye = new THREE.Group();
  eye.position.set(0, 1.55, 4.6);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.06, 16, 48), mat(PALETTE.charcoal, { roughness: 0.5 }));
  const iris = new THREE.Mesh(new THREE.SphereGeometry(0.22, 32, 16), mat('#56B4E9', { roughness: 0.4 }));
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 12), mat(PALETTE.charcoal, { roughness: 0.3 }));
  pupil.position.z = 0.15;
  eye.add(ring, iris, pupil);
  const orbit = new THREE.Group();
  ROOMS.filter((r) => r.id !== 'reflection').forEach((r, i) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), mat(r.accent, { roughness: 0.5 }));
    const a = (i / 6) * Math.PI * 2;
    s.position.set(Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0);
    s.castShadow = true;
    orbit.add(s);
  });
  eye.add(orbit);
  eye.traverse((o) => { o.castShadow = true; });
  scene.add(eye);

  // Benches and plants
  for (const x of [-4.4, 4.4]) {
    const seat = rbox(1.8, 0.12, 0.55, PALETTE.wood, 0.05);
    seat.position.set(x, 0.45, 7);
    scene.add(seat);
    for (const dx of [-0.75, 0.75]) {
      const leg = rbox(0.1, 0.4, 0.45, PALETTE.woodDark, 0.03);
      leg.position.set(x + dx, 0.2, 7);
      scene.add(leg);
    }
    col.add(x - 0.9, 6.7, x + 0.9, 7.3);
  }
  for (const [x, z] of [[-5.4, 9.4], [5.4, 9.4], [-5.4, 0.7], [5.4, 0.7]]) {
    plant(scene, x, z, 1.3);
    col.add(x - 0.25, z - 0.25, x + 0.25, z + 0.25);
  }

  // Ceiling (does not cast shadows so the sun can light the room)
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(12, 10), mat('#FAF6EF'));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, WALL_H, 5);
  scene.add(ceil);
  const lamp = new THREE.PointLight('#FFD9A8', 3.5, 12, 2);
  lamp.position.set(0, 2.4, 7);
  scene.add(lamp);

  return (t: number) => {
    orbit.rotation.z = t * 0.25;
    eye.rotation.y = Math.sin(t * 0.4) * 0.35;
    eye.position.y = 1.55 + Math.sin(t * 0.8) * 0.03;
  };
}
