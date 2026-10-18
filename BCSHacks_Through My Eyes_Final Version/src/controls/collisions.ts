import * as THREE from 'three';

/** Axis-aligned boxes on the floor plane (x, z). Simple and fast. */
export class Colliders {
  boxes: THREE.Box2[] = [];
  circles: { x: number; z: number; r: number }[] = [];

  /** Round obstacle: the player slides around it smoothly. */
  addCircle(x: number, z: number, r: number): void { this.circles.push({ x, z, r }); }

  add(minX: number, minZ: number, maxX: number, maxZ: number): void {
    this.boxes.push(new THREE.Box2(new THREE.Vector2(minX, minZ), new THREE.Vector2(maxX, maxZ)));
  }

  /** Block the footprint of a mesh (uses its world bounding box). */
  addMesh(obj: THREE.Object3D, pad = 0): void {
    obj.updateWorldMatrix(true, true);
    const b = new THREE.Box3().setFromObject(obj);
    this.add(b.min.x - pad, b.min.z - pad, b.max.x + pad, b.max.z + pad);
  }

  /** Push a point out of any box it is inside (expanded by radius). */
  resolve(p: THREE.Vector3, r: number): void {
    for (const c of this.circles) {
      const dx = p.x - c.x, dz = p.z - c.z, min = c.r + r;
      const d = Math.hypot(dx, dz);
      if (d < min && d > 1e-6) { p.x = c.x + (dx / d) * min; p.z = c.z + (dz / d) * min; }
    }
    for (const b of this.boxes) {
      const minX = b.min.x - r, maxX = b.max.x + r, minZ = b.min.y - r, maxZ = b.max.y + r;
      if (p.x > minX && p.x < maxX && p.z > minZ && p.z < maxZ) {
        const dl = p.x - minX, dr = maxX - p.x, dt = p.z - minZ, db = maxZ - p.z;
        const m = Math.min(dl, dr, dt, db);
        if (m === dl) p.x = minX;
        else if (m === dr) p.x = maxX;
        else if (m === dt) p.z = minZ;
        else p.z = maxZ;
      }
    }
  }
}
