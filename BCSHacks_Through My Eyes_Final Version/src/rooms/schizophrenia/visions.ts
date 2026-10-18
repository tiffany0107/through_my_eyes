import * as THREE from 'three';
import { PALETTE, canvasTexture } from '../../world/materials';
import { person } from '../../world/builders';

/*
 * Visual hallucinations for the schizophrenia room.
 * Rules: one at a time, every change fades over at least a second (nothing
 * flashes or jumps out), and nothing is violent or gory. They are meant to
 * be distracting and uncanny, not scary.
 */

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
/** 0 -> 1 -> 0 envelope over `dur`, with fade-in and fade-out times. */
const envelope = (k: number, dur: number, fin = 1.5, fout = 1.5) => Math.max(0, Math.min(1, k / fin, (dur - k) / fout));

interface Vision {
  dur: number;
  begin(): void;
  tick(k: number, dt: number): void; // k = seconds since begin
  end(): void;
  /** If the visitor looks straight at it, it may end early. */
  lookedAt?(): void;
}

/** Own (non-shared) transparent material so each vision can fade on its own. */
function ghostMat(color: string, opacity = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, transparent: true, opacity, roughness: 0.9, depthWrite: false });
}

function setOpacity(obj: THREE.Object3D, o: number): void {
  obj.traverse((m) => {
    const mesh = m as THREE.Mesh;
    if (mesh.material && !Array.isArray(mesh.material)) (mesh.material as THREE.Material).opacity = o;
  });
}

/** Remove a vision from the scene and free its geometry and (non-shared) materials. */
function drop(scene: THREE.Scene, obj: THREE.Object3D): void {
  scene.remove(obj);
  obj.traverse((o) => {
    const mesh = o as THREE.Mesh;
    mesh.geometry?.dispose();
    const m = mesh.material as THREE.MeshStandardMaterial | undefined;
    if (m && !Array.isArray(m)) { m.map?.dispose(); m.dispose(); }
  });
}

function overlay(cls: string, html: string): HTMLElement {
  const el = document.createElement('div');
  el.className = `vision-overlay ${cls}`;
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

const SPIDER_SVG = `<svg viewBox="-50 -50 100 100" width="100%" height="100%">
  <g stroke="#1d1d20" stroke-width="4" stroke-linecap="round" fill="none" class="legs">
    ${[-1, 1].map((s) => [-30, -10, 10, 30].map((y, i) => `<path class="leg l${i % 2}" d="M0 ${y / 3} Q ${s * 28} ${y - 10} ${s * 42} ${y + 8}"/>`).join('')).join('')}
  </g>
  <ellipse cx="0" cy="10" rx="14" ry="18" fill="#1d1d20"/><circle cx="0" cy="-12" r="9" fill="#1d1d20"/></svg>`;

const CAT_SVG = `<svg viewBox="0 0 160 100" width="100%" height="100%">
  <path d="M30 40 Q5 30 12 8" stroke="#2b2b2e" stroke-width="7" fill="none" stroke-linecap="round" class="tail"/>
  <rect class="leg l0" x="40" y="55" width="9" height="34" rx="4" fill="#2b2b2e"/><rect class="leg l1" x="56" y="55" width="9" height="34" rx="4" fill="#2b2b2e"/>
  <rect class="leg l1" x="100" y="55" width="9" height="34" rx="4" fill="#2b2b2e"/><rect class="leg l0" x="116" y="55" width="9" height="34" rx="4" fill="#2b2b2e"/>
  <ellipse cx="80" cy="50" rx="52" ry="20" fill="#2b2b2e"/>
  <circle cx="134" cy="32" r="16" fill="#2b2b2e"/><path d="M122 22 L124 4 L134 18 Z M138 18 L148 4 L148 24 Z" fill="#2b2b2e"/>
  <circle cx="141" cy="30" r="3" fill="#F0E442"/></svg>`;

export class Visions {
  private active: Vision | null = null;
  private k = 0;
  private wait = 6;
  private last = '';
  private portraitPupils: THREE.Mesh[] = [];
  private portraitHome: THREE.Vector3[] = [];
  private overlays = new Set<HTMLElement>();
  private svgFilter: SVGSVGElement | null = null;

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.Camera,
    private plants: THREE.Object3D[],
    private receptionist: THREE.Object3D,
    private formOpen: () => boolean,
  ) {
    this.buildPortrait();
  }

  /** A framed portrait on the left wall whose eyes follow you (always, without support). */
  private buildPortrait(): void {
    const g = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.95, 0.75), new THREE.MeshStandardMaterial({ color: PALETTE.woodDark }));
    const tex = canvasTexture(256, 320, (c) => {
      c.fillStyle = '#C9D3C4'; c.fillRect(0, 0, 256, 320);
      c.fillStyle = '#6E8CA0'; c.beginPath(); c.ellipse(128, 330, 110, 90, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#E8B98F'; c.beginPath(); c.ellipse(128, 150, 62, 78, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#3B2A20'; c.beginPath(); c.ellipse(128, 92, 66, 40, 0, Math.PI, Math.PI * 2); c.fill();
      c.fillStyle = '#FFFFFF';
      for (const x of [104, 152]) { c.beginPath(); c.ellipse(x, 145, 15, 10, 0, 0, Math.PI * 2); c.fill(); }
      c.strokeStyle = '#7E5A3A'; c.lineWidth = 4; c.beginPath(); c.moveTo(110, 195); c.lineTo(146, 195); c.stroke();
    });
    const canvas = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.84), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
    canvas.rotation.y = Math.PI / 2;
    canvas.position.x = 0.035;
    g.add(frame, canvas);
    // Pupils sit just in front of the painted eye whites (canvas coords -> plane coords)
    for (const px of [104, 152]) {
      const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.018, 14), new THREE.MeshBasicMaterial({ color: '#1d1d20' }));
      pupil.rotation.y = Math.PI / 2;
      // The plane is turned to face +x, so the image's left edge is at +z.
      const home = new THREE.Vector3(0.037, (0.5 - 145 / 320) * 0.84, -(px / 256 - 0.5) * 0.66);
      pupil.position.copy(home);
      g.add(pupil);
      this.portraitPupils.push(pupil);
      this.portraitHome.push(home);
    }
    g.position.set(-3.88, 1.75, -1.8);
    this.scene.add(g);
  }

  private trackPupils(): void {
    const cam = this.camera.position;
    this.portraitPupils.forEach((p, i) => {
      const home = this.portraitHome[i];
      const world = p.parent!.localToWorld(home.clone());
      const d = cam.clone().sub(world).normalize();
      p.position.set(home.x, home.y + THREE.MathUtils.clamp(d.y, -1, 1) * 0.006, home.z + THREE.MathUtils.clamp(d.z, -1, 1) * 0.009);
    });
  }

  /** Where the visitor is looking, flattened onto the floor. */
  private forward(): THREE.Vector3 {
    const f = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    f.y = 0;
    return f.normalize();
  }

  /** A point off to the side of the visitor's view: noticed out of the corner of the eye. */
  private peripheral(dist: number): THREE.Vector3 {
    const f = this.forward();
    const side = new THREE.Vector3(-f.z, 0, f.x).multiplyScalar(Math.random() < 0.5 ? 1 : -1);
    // About 30 degrees off-centre: inside the view, but near its edge.
    const p = this.camera.position.clone().add(f.multiplyScalar(dist)).add(side.multiplyScalar(dist * 0.55));
    p.x = THREE.MathUtils.clamp(p.x, -3.4, 3.4);
    p.z = THREE.MathUtils.clamp(p.z, -3.4, 3.4);
    p.y = 0;
    return p;
  }

  private isLookedAt(pos: THREE.Vector3): boolean {
    const to = pos.clone().sub(this.camera.position).normalize();
    const f = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    return to.dot(f) > 0.94;
  }

  // ---------- The visions ----------

  private shadowFigure(): Vision {
    const fig = person({ height: rand(1.05, 1.2) });
    const m = ghostMat('#141418');
    fig.traverse((o) => { if ((o as THREE.Mesh).isMesh) { (o as THREE.Mesh).material = m; o.castShadow = false; } });
    let leaving = -1;
    const v: Vision = {
      dur: 10,
      begin: () => {
        fig.position.copy(this.peripheral(2.6));
        fig.lookAt(this.camera.position.x, 0, this.camera.position.z);
        this.scene.add(fig);
      },
      tick: (k) => {
        if (leaving < 0 && k > 2 && this.isLookedAt(fig.position.clone().setY(1.2))) leaving = k;
        const base = envelope(k, v.dur, 2.5, 2);
        m.opacity = 0.62 * (leaving < 0 ? base : Math.max(0, base * (1 - (k - leaving) / 1.2)));
        if (leaving >= 0 && k - leaving > 1.2) v.dur = k; // vanished when looked at
      },
      end: () => drop(this.scene, fig),
    };
    return v;
  }

  private cat(): Vision {
    const g = new THREE.Group();
    const m = ghostMat('#2b2b2e', 1);
    const box = (w: number, h: number, d: number, x: number, y: number, z: number) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      b.position.set(x, y, z);
      g.add(b);
      return b;
    };
    box(0.42, 0.16, 0.16, 0, 0.24, 0);
    box(0.15, 0.14, 0.14, 0.26, 0.33, 0);
    for (const z of [-0.04, 0.04]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.06, 4), m);
      ear.position.set(0.27, 0.43, z);
      g.add(ear);
    }
    const tail = box(0.04, 0.24, 0.04, -0.22, 0.38, 0);
    tail.rotation.z = 0.5;
    const legs = [[0.14, 0.05], [0.14, -0.05], [-0.14, 0.05], [-0.14, -0.05]].map(([x, z]) => {
      const leg = box(0.04, 0.18, 0.04, x, 0.09, z);
      leg.geometry.translate(0, -0.09, 0);
      leg.position.y = 0.18;
      return leg;
    });
    for (const eyeZ of [-0.035, 0.035]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: '#F0E442', transparent: true }));
      eye.position.set(0.335, 0.35, eyeZ);
      g.add(eye);
    }
    const z = rand(-0.4, 1.8);
    const dir = Math.random() < 0.5 ? 1 : -1;
    const v: Vision = {
      dur: 11,
      begin: () => {
        g.rotation.y = dir > 0 ? 0 : Math.PI;
        this.scene.add(g);
      },
      tick: (k) => {
        g.position.set(dir * (-3.4 + k * 0.62), 0, z);
        legs.forEach((l, i) => (l.rotation.z = Math.sin(k * 9 + (i % 2) * Math.PI) * 0.45));
        tail.rotation.z = 0.5 + Math.sin(k * 2) * 0.25;
        setOpacity(g, envelope(k, v.dur, 1, 1.2));
      },
      end: () => drop(this.scene, g),
    };
    return v;
  }

  private spider(): Vision {
    const g = new THREE.Group();
    const m = ghostMat('#1d1d20', 1);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), m);
    body.scale.set(1, 1.3, 0.6);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), m);
    head.position.y = 0.07;
    g.add(body, head);
    const legs: THREE.Mesh[] = [];
    for (const s of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.008, 0.008), m);
        leg.geometry.translate(0.06, 0, 0);
        leg.position.set(s * 0.02, 0.04 - i * 0.03, 0);
        leg.rotation.z = s > 0 ? 0.5 - i * 0.35 : Math.PI - 0.5 + i * 0.35;
        g.add(leg);
        legs.push(leg);
      }
    }
    // Crawl across the back wall, on its surface
    const start = new THREE.Vector2(rand(-3, 3), rand(1.2, 2.8));
    const heading = rand(0, Math.PI * 2);
    const v: Vision = {
      dur: 10,
      begin: () => { g.position.set(start.x, start.y, -3.88); this.scene.add(g); },
      tick: (k, dt) => {
        const a = heading + Math.sin(k * 0.8) * 1.2;
        g.position.x = THREE.MathUtils.clamp(g.position.x + Math.cos(a) * dt * 0.25, -3.6, 3.6);
        g.position.y = THREE.MathUtils.clamp(g.position.y + Math.sin(a) * dt * 0.25, 0.5, 3.1);
        g.rotation.z = a - Math.PI / 2;
        legs.forEach((l, i) => (l.rotation.y = Math.sin(k * 14 + i) * 0.3));
        setOpacity(g, envelope(k, v.dur, 1, 1.5));
      },
      end: () => drop(this.scene, g),
    };
    return v;
  }

  private floatingHand(): Vision {
    const g = new THREE.Group();
    const m = ghostMat('#E8B98F');
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 0.03), m);
    g.add(palm);
    [-0.033, -0.011, 0.011, 0.033].forEach((x, i) => {
      const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.01, 0.05 + (i === 1 || i === 2 ? 0.015 : 0), 4, 8), m);
      f.position.set(x, 0.09, 0);
      g.add(f);
    });
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.04, 4, 8), m);
    thumb.position.set(0.06, 0.01, 0);
    thumb.rotation.z = -0.8;
    g.add(thumb);
    g.scale.setScalar(1.6);
    const from = this.peripheral(1.8).setY(1.5);
    const drift = new THREE.Vector3(rand(-0.2, 0.2), 0.15, rand(-0.2, 0.2));
    const v: Vision = {
      dur: 9,
      begin: () => { g.position.copy(from); this.scene.add(g); },
      tick: (k) => {
        g.position.copy(from).addScaledVector(drift, k).setY(from.y + Math.sin(k * 0.9) * 0.08 + k * 0.03);
        g.rotation.set(Math.sin(k * 0.5) * 0.4, k * 0.4, Math.sin(k * 0.7) * 0.3);
        m.opacity = 0.85 * envelope(k, v.dur, 2, 2);
      },
      end: () => drop(this.scene, g),
    };
    return v;
  }

  private watchingEyes(): Vision {
    const g = new THREE.Group();
    const white = ghostMat('#F4EFE6');
    const dark = ghostMat('#1d1d20');
    const pupils: THREE.Mesh[] = [];
    for (const x of [-0.14, 0.14]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), white);
      e.scale.z = 0.4;
      e.position.x = x;
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 8), dark);
      p.position.set(x, 0, 0.02);
      g.add(e, p);
      pupils.push(p);
    }
    // On a side wall at eye height, clear of the portrait (left wall, z -2.3 to -1.3)
    const wallX = Math.random() < 0.5 ? -3.86 : 3.86;
    const wallZ = wallX < 0 ? rand(-0.6, 2.2) : rand(-2.8, 2.2);
    const v: Vision = {
      dur: 8,
      begin: () => {
        g.position.set(wallX, rand(1.5, 2.3), wallZ);
        g.rotation.y = wallX < 0 ? Math.PI / 2 : -Math.PI / 2;
        this.scene.add(g);
      },
      tick: (k) => {
        const local = g.worldToLocal(this.camera.position.clone()).normalize();
        pupils.forEach((p, i) => p.position.set((i ? 0.14 : -0.14) + local.x * 0.04, local.y * 0.04, 0.03));
        // A slow blink (one every few seconds, well under any flash threshold)
        g.scale.y = 1 - Math.max(0, Math.sin(k * 1.4) - 0.92) * 10;
        const o = envelope(k, v.dur, 2, 2);
        white.opacity = 0.9 * o;
        dark.opacity = o;
      },
      end: () => drop(this.scene, g),
    };
    return v;
  }

  private creepingShadow(): Vision {
    const tex = canvasTexture(128, 128, (c) => {
      const grd = c.createRadialGradient(64, 64, 4, 64, 64, 62);
      grd.addColorStop(0, 'rgba(10,10,14,0.9)');
      grd.addColorStop(1, 'rgba(10,10,14,0)');
      c.fillStyle = grd;
      c.fillRect(0, 0, 128, 128);
    });
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false });
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(3, 2), m);
    blob.rotation.x = -Math.PI / 2;
    const from = this.peripheral(4.5);
    const v: Vision = {
      dur: 10,
      begin: () => { blob.position.copy(from).setY(0.03); this.scene.add(blob); },
      tick: (k, dt) => {
        // Creeps slowly towards the visitor, stretching as it goes. It stops about 3 m
        // away: any closer and it would drop below the bottom of the view.
        const to = this.camera.position.clone().setY(0.03).sub(blob.position);
        if (to.length() > 3) blob.position.addScaledVector(to.normalize(), dt * 0.3);
        blob.rotation.z = Math.atan2(to.x, to.z);
        blob.scale.set(1 + Math.sin(k * 0.8) * 0.15, 1 + Math.sin(k * 0.6) * 0.2, 1);
        m.opacity = 0.7 * envelope(k, v.dur, 2.5, 2.5);
      },
      end: () => drop(this.scene, blob),
    };
    return v;
  }

  /** Plants slowly breathe and the receptionist turns to stare at you. */
  private morph(): Vision {
    const base = this.plants.map((p) => p.scale.x);
    const rest = this.receptionist.rotation.y;
    const v: Vision = {
      dur: 9,
      begin: () => {},
      tick: (k) => {
        const e = envelope(k, v.dur, 2, 2);
        this.plants.forEach((p, i) => {
          p.scale.set(base[i] * (1 + Math.sin(k * 1.6 + i) * 0.18 * e), base[i] * (1 + Math.sin(k * 1.1 + i) * 0.25 * e), base[i] * (1 + Math.cos(k * 1.6 + i) * 0.18 * e));
        });
        const r = this.receptionist;
        const target = Math.atan2(this.camera.position.x - r.position.x, this.camera.position.z - r.position.z);
        r.rotation.y = rest + (target - rest) * e;
      },
      end: () => {
        this.plants.forEach((p, i) => p.scale.setScalar(base[i]));
        this.receptionist.rotation.y = rest;
      },
    };
    return v;
  }

  /** The room gently ripples, via an SVG displacement filter on the canvas. */
  private wiggle(): Vision {
    const canvas = document.querySelector<HTMLCanvasElement>('#app canvas');
    let disp: SVGFEDisplacementMapElement | null = null;
    let turb: SVGFETurbulenceElement | null = null;
    const v: Vision = {
      dur: 7,
      begin: () => {
        if (!this.svgFilter) {
          const ns = 'http://www.w3.org/2000/svg';
          const svg = document.createElementNS(ns, 'svg');
          svg.setAttribute('width', '0');
          svg.setAttribute('height', '0');
          svg.style.position = 'absolute';
          svg.innerHTML = `<filter id="vision-wiggle"><feTurbulence type="fractalNoise" baseFrequency="0.008 0.02" numOctaves="1" seed="3"/><feDisplacementMap in="SourceGraphic" scale="0"/></filter>`;
          document.body.appendChild(svg);
          this.svgFilter = svg;
        }
        turb = this.svgFilter.querySelector('feTurbulence');
        disp = this.svgFilter.querySelector('feDisplacementMap');
        if (canvas) canvas.style.filter = 'url(#vision-wiggle)';
      },
      tick: (k) => {
        disp?.setAttribute('scale', String(14 * envelope(k, v.dur, 2, 2)));
        turb?.setAttribute('baseFrequency', `${0.006 + Math.sin(k * 0.7) * 0.002} ${0.018 + Math.sin(k * 0.5) * 0.004}`);
      },
      end: () => { if (canvas) canvas.style.filter = ''; },
    };
    return v;
  }

  /** Screen-space spider crawling over the form. */
  private screenSpider(): Vision {
    const el = overlay('vision-spider', SPIDER_SVG);
    const from = { x: rand(10, 90), y: -10 };
    const to = { x: rand(20, 80), y: 110 };
    const v: Vision = {
      dur: 9,
      begin: () => this.overlays.add(el),
      tick: (k) => {
        const t = k / v.dur;
        const wob = Math.sin(k * 1.3) * 6;
        el.style.left = `${from.x + (to.x - from.x) * t + wob}vw`;
        el.style.top = `${from.y + (to.y - from.y) * t}vh`;
        el.style.transform = `rotate(${180 + Math.atan2(to.x - from.x, to.y - from.y) * -57 + wob * 3}deg)`;
        el.style.opacity = String(envelope(k, v.dur, 1, 1));
      },
      end: () => { el.remove(); this.overlays.delete(el); },
    };
    return v;
  }

  /** Screen-space cat walking along the bottom of the screen. */
  private screenCat(): Vision {
    const el = overlay('vision-cat', CAT_SVG);
    const dir = Math.random() < 0.5 ? 1 : -1;
    const v: Vision = {
      dur: 9,
      begin: () => { this.overlays.add(el); el.style.transform = dir > 0 ? '' : 'scaleX(-1)'; },
      tick: (k) => {
        const t = k / v.dur;
        el.style.left = `${dir > 0 ? -15 + t * 125 : 110 - t * 125}vw`;
        el.style.opacity = String(envelope(k, v.dur, 1, 1));
      },
      end: () => { el.remove(); this.overlays.delete(el); },
    };
    return v;
  }

  // ---------- Scheduling ----------

  /** intensity 1 = condition, 0.35 = with support (rarer, no distortions). */
  update(dt: number, running: boolean, intensity: number): void {
    if (intensity >= 1) this.trackPupils();
    else this.portraitPupils.forEach((p, i) => p.position.copy(this.portraitHome[i]));

    if (this.active) {
      this.k += dt;
      this.active.tick(this.k, dt);
      if (this.k >= this.active.dur) this.stop();
      return;
    }
    if (!running) return;
    this.wait -= dt;
    if (this.wait > 0) return;
    this.wait = intensity >= 1 ? rand(4, 8) : rand(18, 26);

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const options: [string, () => Vision][] = this.formOpen()
      ? [['screenSpider', () => this.screenSpider()], ['screenCat', () => this.screenCat()], ['shadowFigure', () => this.shadowFigure()], ['eyes', () => this.watchingEyes()]]
      : [
          ['shadowFigure', () => this.shadowFigure()], ['cat', () => this.cat()], ['spider', () => this.spider()],
          ['hand', () => this.floatingHand()], ['eyes', () => this.watchingEyes()], ['creep', () => this.creepingShadow()],
          ['morph', () => this.morph()],
        ];
    if (intensity >= 1 && !reduced) options.push(['wiggle', () => this.wiggle()]);
    const choices = options.filter(([n]) => n !== this.last);
    const [name, make] = pick(choices);
    this.start(name, make);
  }

  private start(name: string, make: () => Vision): void {
    this.stop();
    this.last = name;
    this.active = make();
    this.k = 0;
    this.active.begin();
  }

  /** Dev helper: show one vision now, e.g. __vision('cat') in the console. */
  force(name: string): void {
    const all: Record<string, () => Vision> = {
      shadowFigure: () => this.shadowFigure(), cat: () => this.cat(), spider: () => this.spider(), hand: () => this.floatingHand(),
      eyes: () => this.watchingEyes(), creep: () => this.creepingShadow(), morph: () => this.morph(), wiggle: () => this.wiggle(),
      screenSpider: () => this.screenSpider(), screenCat: () => this.screenCat(),
    };
    if (all[name]) this.start(name, all[name]);
    else console.warn('Visions:', Object.keys(all).join(', '));
  }

  /** End the current vision straight away (e.g. the task is done). */
  stop(): void {
    this.active?.end();
    this.active = null;
  }

  dispose(): void {
    this.stop();
    for (const el of this.overlays) el.remove();
    this.overlays.clear();
    this.svgFilter?.remove();
    this.svgFilter = null;
  }
}
