import * as THREE from 'three';
import { BaseRoom } from '../Room';
import { buildShell } from '../shell';
import { FONT, PALETTE, canvasTexture, mat, rbox } from '../../world/materials';
import { faceMaterial, person, plant, rug, setShirt } from '../../world/builders';

interface Guest {
  name: string;
  height: number;
  width: number;
  jacket: string;
  hair: string | null;
  glasses: boolean;
  hat: string | null;
  pitch: number;
  rate: number;
  line: string; // what they say when you walk up (without support)
  figure?: THREE.Group;
  tag?: THREE.Sprite;
  phase?: number;
}

const GREEN = '#009E73';
const BLUE = '#0072B2';

// Sam is the only guest who is tall, wears glasses AND a green jacket.
// Everyone else shares one or two of those clues, so you have to check all three.
const GUESTS: Guest[] = [
  { name: 'Sam', height: 1.14, width: 1, jacket: GREEN, hair: '#3B2A20', glasses: true, hat: null, pitch: 0.55, rate: 0.9, line: 'Hey hey!' },
  { name: 'Jordan', height: 1.12, width: 1.05, jacket: BLUE, hair: '#1E1A18', glasses: true, hat: null, pitch: 1.3, rate: 1.05, line: 'Oh, hi! Sorry, have we met?' },
  { name: 'Chen', height: 1.13, width: 0.95, jacket: GREEN, hair: '#1E1A18', glasses: false, hat: null, pitch: 0.9, rate: 1.1, line: 'Hello! Great party, isn\'t it?' },
  { name: 'Alex', height: 0.88, width: 1, jacket: GREEN, hair: '#8A5A2B', glasses: true, hat: null, pitch: 1.5, rate: 1, line: 'Hi there! I don\'t think we\'ve met.' },
  { name: 'Riley', height: 1.12, width: 0.9, jacket: '#E69F00', hair: null, glasses: true, hat: '#2B2B2E', pitch: 0.8, rate: 1.15, line: 'Hey. Do I know you?' },
  { name: 'Priya', height: 0.98, width: 0.9, jacket: GREEN, hair: '#1E1A18', glasses: false, hat: null, pitch: 1.6, rate: 1.05, line: 'Hi! Love your shoes!' },
  { name: 'Maya', height: 1.0, width: 0.95, jacket: '#CC79A7', hair: '#C9A227', glasses: true, hat: '#E9DCC6', pitch: 1.4, rate: 0.95, line: 'Oh, hello! Are you a friend of Sam\'s?' },
  { name: 'Tom', height: 1.0, width: 1.2, jacket: '#8A8F98', hair: null, glasses: false, hat: '#7E5A3A', pitch: 0.7, rate: 1, line: 'Alright? Snacks are over there.' },
  { name: 'Zoe', height: 0.9, width: 0.95, jacket: '#F0E442', hair: '#D55E00', glasses: false, hat: null, pitch: 1.7, rate: 1.1, line: 'Hiya! Sorry, I\'m terrible with names.' },
  { name: 'Leo', height: 1.02, width: 1.05, jacket: '#D55E00', hair: '#3B2A20', glasses: true, hat: null, pitch: 1.0, rate: 0.95, line: 'Hello! Have we met before?' },
];

// Where guests stand. Each spot has a fixed collider; guests are shuffled between spots.
const SPOTS: [number, number][] = [
  [-2.8, -2.6], [-1.0, -3.0], [1.0, -2.5], [2.9, -2.9], [-2.5, -0.7],
  [-0.5, -1.2], [1.3, -0.6], [3.0, -0.8], [-2.9, 1.3], [2.6, 1.5],
];

/** A house party where everyone shares one face. Find Sam, twice. */
export class FaceBlindnessRoom extends BaseRoom {
  private guests: Guest[] = GUESTS.map((g) => ({ ...g }));
  private round: 1 | 2 = 1;
  private done = false;
  private sms!: HTMLElement;

  constructor() { super('faceBlindness'); }

  protected build(): void {
    const s = this.scene;
    const c = this.colliders;
    buildShell(s, c, { accentWall: '#EEDDE6', floor: '#C9B397', sun: 1.2 });
    rug(s, 0, -1.2, 5, 3.6, '#D8C7D6');

    // Snack table and a sofa
    const table = rbox(1.8, 0.08, 0.6, PALETTE.wood, 0.03);
    table.position.set(0, 0.78, -3.55);
    s.add(table);
    const tableLegs = rbox(1.7, 0.74, 0.5, PALETTE.woodDark, 0.03);
    tableLegs.position.set(0, 0.37, -3.55);
    s.add(tableLegs);
    c.add(-0.9, -3.9, 0.9, -3.25);
    ['#E69F00', '#F4EFE6', '#D55E00', '#9DB39A'].forEach((col, i) => {
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.09, 0.08, 16), mat(col));
      bowl.position.set(-0.6 + i * 0.4, 0.86, -3.55);
      s.add(bowl);
    });
    const sofa = rbox(0.9, 0.45, 2.2, '#6E8CA0', 0.08);
    sofa.position.set(-3.45, 0.225, 2.6);
    s.add(sofa);
    const sofaBack = rbox(0.25, 0.7, 2.2, '#647F92', 0.06);
    sofaBack.position.set(-3.8, 0.6, 2.6);
    s.add(sofaBack);
    c.add(-3.95, 1.5, -3.0, 3.7);

    // String lights (emissive, steady: no flashing)
    const bulbColors = ['#FFE7C2', '#F0E442', '#E69F00', '#FFD9A0'];
    for (let i = 0; i < 26; i++) {
      const x = -3.8 + i * 0.3;
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), mat(bulbColors[i % 4], { emissive: bulbColors[i % 4], emissiveIntensity: 1.1 }));
      b.position.set(x, 3.05 - Math.sin((i / 25) * Math.PI) * 0.35, -3.8);
      s.add(b);
    }
    plant(s, 3.4, 3.3, 1.2);
    plant(s, 3.4, -3.4, 1.1);

    // Guests: all share ONE face texture.
    const face = faceMaterial();
    for (const g of this.guests) {
      g.figure = person({ height: g.height, width: g.width, shirt: g.jacket, hair: g.hair, glasses: g.glasses, hat: g.hat, face });
      const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.9, 8), mat('#ffffff'));
      hit.visible = false;
      hit.position.y = 0.95;
      g.figure.add(hit);
      g.phase = Math.random() * 6;
      g.tag = this.nameTag(g.name);
      g.tag.position.y = g.figure.userData.top + 0.2;
      g.figure.add(g.tag);
      s.add(g.figure);
      this.ctx.addClickable(g.figure, () => this.talkTo(g));
    }
    for (const [x, z] of SPOTS) c.addCircle(x, z, 0.3);

    this.sms = document.createElement('div');
    this.sms.className = 'room-controls-inner';
    this.ctx.setRoomControls(this.sms);
    this.resetTask();
  }

  private nameTag(name: string): THREE.Sprite {
    const tex = canvasTexture(256, 96, (g) => {
      g.fillStyle = '#FFFFFF';
      g.beginPath(); g.roundRect(4, 4, 248, 88, 18); g.fill();
      g.lineWidth = 6; g.strokeStyle = this.info.accent; g.stroke();
      g.fillStyle = PALETTE.charcoal;
      g.font = `700 52px ${FONT}`;
      g.textAlign = 'center';
      g.fillText(name, 128, 66);
    });
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex }));
    tag.scale.set(0.42, 0.16, 1);
    return tag;
  }

  /** Shuffle guests between spots and turn them to face the room. */
  private shuffle(): void {
    const order = [...SPOTS].sort(() => Math.random() - 0.5);
    this.guests.forEach((g, i) => {
      const [x, z] = order[i];
      g.figure!.position.set(x, 0, z);
      g.figure!.lookAt(x * 0.3, 0, 2.8);
      g.figure!.rotateY((Math.random() - 0.5) * 0.6);
    });
  }

  private setMessage(lines: string[]): void {
    this.sms.innerHTML = `<p class="sms-from">📱 Messages from Sam</p>${lines.map((l) => `<p class="sms">${l}</p>`).join('')}`;
  }

  resetTask(): void {
    this.round = 1;
    this.done = false;
    this.guests.forEach((g) => { setShirt(g.figure!, g.jacket); });
    this.shuffle();
    this.setMessage(["I'm here! I'm the tall one with glasses and a green jacket 😊"]);
    this.ctx.setTaskText('Find Sam: tall, glasses, green jacket');
  }

  setAccessible(on: boolean): void {
    super.setAccessible(on);
    this.guests.forEach((g) => (g.tag!.visible = on));
  }

  private say(g: Guest, text: string): void {
    this.ctx.audio.stopSpeech();
    this.ctx.audio.speak(text, { pitch: g.pitch, rate: g.rate });
  }

  private talkTo(g: Guest): void {
    if (this.done) return;
    const intro = this.accessible ? `Hi, I'm ${g.name}! ` : '';
    if (g.name !== 'Sam') {
      this.say(g, intro + g.line);
      return;
    }
    if (this.round === 1) {
      this.say(g, this.accessible ? "Hi, it's me, Sam! You found me." : 'Hey hey! You found me!');
      this.round = 2;
      this.done = true; // ignore clicks while the scene changes
      setTimeout(() => this.startRound2(), 2200);
    } else {
      this.say(g, this.accessible ? "Hi, it's Sam! Sorry about the jacket." : 'Hey hey! There you are. Sorry about the jacket!');
      this.done = true;
      setTimeout(() => this.ctx.complete(), 900);
    }
  }

  private startRound2(): void {
    // Sam spills a drink and borrows a jacket that someone else is also wearing.
    const sam = this.guests.find((g) => g.name === 'Sam')!;
    setShirt(sam.figure!, BLUE);
    this.shuffle();
    this.done = false;
    this.setMessage([
      "I'm here! I'm the tall one with glasses and a green jacket 😊",
      'Oops, spilled my drink 🙈 Borrowed a jacket. Went to get a snack, come find me again!',
    ]);
    this.ctx.toast('New message from Sam');
    this.ctx.setTaskText('Sam changed jackets. Find Sam again (try listening)');
  }

  update(_dt: number, t: number): void {
    for (const g of this.guests) {
      g.figure!.rotation.z = Math.sin(t * 1.2 + g.phase!) * 0.025;
      g.figure!.position.y = Math.max(0, Math.sin(t * 2 + g.phase!)) * 0.01;
    }
  }

}
