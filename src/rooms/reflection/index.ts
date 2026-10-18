import * as THREE from 'three';
import { BaseRoom } from '../Room';
import { buildShell } from '../shell';
import { ROOMS } from '../../config';
import { mat, rbox } from '../../world/materials';
import { plant, rug } from '../../world/builders';

/** The end of the corridor: compare times and pick an action. */
export class ReflectionRoom extends BaseRoom {
  hasTask = false;
  private close: (() => void) | null = null;
  private orbs: THREE.Mesh[] = [];

  constructor() { super('reflection'); }

  protected build(): void {
    const s = this.scene;
    buildShell(s, this.colliders, { accentWall: '#DCE6D8', floor: '#E2D6C2', sun: 1.2 });
    rug(s, 0, 0, 3, 3, '#CFDCCB');
    const bench = rbox(2, 0.12, 0.5, '#B88A5A', 0.05);
    bench.position.set(0, 0.45, -2.4);
    s.add(bench);
    this.colliders.addMesh(bench);
    for (const [x, z] of [[-3.3, -3.3], [3.3, -3.3], [-3.3, 3.3], [3.3, 3.3], [-1.6, -3.4], [1.6, -3.4]]) plant(s, x, z, 1.4);
    ROOMS.filter((r) => r.id !== 'reflection').forEach((r, i) => {
      const done = this.ctx.results.get(r.id)?.with !== undefined;
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), mat(done ? r.accent : '#D9D2C5', { emissive: done ? r.accent : '#000000', emissiveIntensity: done ? 0.5 : 0 }));
      orb.position.set(-1.5 + i * 0.6, 1.9, -3.2);
      s.add(orb);
      this.orbs.push(orb);
    });
    this.close = this.ctx.showPanel(this.panel());
  }

  private panel(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'card reflection';
    const fmt = (n?: number) => (n === undefined ? '—' : `${n.toFixed(1)}s`);
    const rows = ROOMS.filter((r) => r.id !== 'reflection').map((r) => {
      const res = this.ctx.results.get(r.id);
      return `<tr><th scope="row"><span class="dot" style="background:${r.accent}"></span>${r.icon} ${r.title}</th><td>${fmt(res?.without)}${res?.gaveUp ? ' <small>(gave up)</small>' : ''}</td><td>${fmt(res?.with)}</td></tr>`;
    }).join('');
    const done = [...this.ctx.results.values()].filter((r) => r.with !== undefined).length;
    const actions = ROOMS.filter((r) => r.action).map((r) => `<li><span aria-hidden="true">${r.icon}</span> ${r.action}</li>`).join('');
    el.innerHTML = `
      <h2>Small changes made every task easier.</h2>
      <p class="muted">You completed ${done} of 6 rooms. Here's how long each task took.</p>
      <table class="results"><thead><tr><th>Room</th><th>With the condition</th><th>With support</th></tr></thead><tbody>${rows}</tbody></table>
      <h3>Try one this week</h3>
      <ul class="actions">${actions}</ul>
      <div class="pledge-msg" role="status"></div>
      <div class="btn-row">
        <button class="btn primary" data-a="pledge">I pledge to try one of these</button>
        <button class="btn" data-a="corridor">Back to corridor</button>
        <button class="btn" data-a="restart">Start again</button>
      </div>`;
    el.querySelector('[data-a=pledge]')!.addEventListener('click', (e) => {
      (e.target as HTMLButtonElement).disabled = true;
      el.querySelector('.pledge-msg')!.textContent = 'Thank you. Small actions, repeated, change how people are included.';
    });
    el.querySelector('[data-a=corridor]')!.addEventListener('click', () => this.ctx.goToCorridor());
    el.querySelector('[data-a=restart]')!.addEventListener('click', () => this.ctx.restart());
    return el;
  }

  update(_dt: number, t: number): void {
    this.orbs.forEach((o, i) => (o.position.y = 1.9 + Math.sin(t * 0.8 + i) * 0.05));
  }

  exit(): void {
    this.close?.();
    super.exit();
  }
}
