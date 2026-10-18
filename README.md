# Through My Eyes

*See the struggle, then see the solution.*

A browser-based 3D gallery. Visitors walk a corridor of rooms. In each room they try an everyday task while a health condition is simulated, then they switch on support and see how small changes make the task easier.

Built with **TypeScript + three.js + Vite**. 

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the built site
```

**Deploy:** push to GitHub and import the repo into Vercel or Netlify. Build command `npm run build`, output folder `dist`. No other config needed.

## Controls

| Input | Action |
|---|---|
| W A S D / arrow keys | Move (left/right arrows turn, for keyboard-only users) |
| Drag, or **M** to lock the mouse | Look around (Esc releases the mouse) |
| Click, or **E** / Space | Interact with what's under the cursor / crosshair |
| Click the floor | Walk there |
| **Q** | Leave the current room (works even while the mouse is locked) |
| ☰ Rooms | Jump to any room (useful when judging) |

**Dev shortcuts** (browser console): `__goto('tunnelVision')` opens a room, and `__complete()` finishes the current task.

## What's done

| Area | Status |
|---|---|
| Lobby, corridor, 6 doorways + reflection room, lighting, plaques | ✅ |
| Movement, collisions, click-to-walk, pointer lock / drag look | ✅ |
| Room flow: intro card → attempt (timed) → "try with support" → results | ✅ |
| HUD: room chip, exit, support toggle, volume, room menu, toasts, captions | ✅ |
| **Colour blindness** room: pick ripe tomatoes, 3 types + severity, filter also applied to the whole page | ✅ |
| **Tunnel vision** room: find your keys, blurred periphery, support = tidy room + high-contrast tag + 3D sound cue | ✅ |
| **Reflection** room: times per room, actions, pledge | ✅ |
| **Dyslexia** room: café menu, find the waiter's recommendation and pay its price before their patience runs out. Letters swap and drift on a cramped, low-contrast menu; support = cream background, large spaced text, clear sections, read-aloud | ✅ |
| **Face blindness** room: house party where all 10 guests share one face. Round 1: find Sam from his text; round 2: Sam has swapped jackets, so listen for his voice and catchphrase. Support = name tags and introductions | ✅ |
| **Tinnitus** room: listen for your name at the coffee pickup over a 6 kHz ring and café noise (ring loudness slider, hard-capped). Support = captions and an "Order ready" screen; the ring stays | ✅ |
| **Schizophrenia** room: copy 5 details onto a job application while quiet, captioned voices comment from different directions, a card line briefly changes, and a soft shadow drifts at the screen edge. No jump scares. Support = quieter voices and a calm receptionist guiding you step by step | ✅ |

## Project structure

```
src/
  main.ts                 app, render loop, room flow (register new rooms here)
  config.ts               ALL text: room titles, quotes, stats, tasks, sources
  world/                  lobby, corridor, lighting, shared materials and builders
  controls/               first-person movement and collisions
  rooms/
    Room.ts               Room interface + BaseRoom class + RoomContext
    shell.ts              buildShell(): floor, walls, ceiling, lights in one call
    colourBlindness/      ← reference example
    tunnelVision/ dyslexia/ faceBlindness/ tinnitus/ schizophrenia/
    reflection/
  shaders/                colour blindness (Machado 2009) and tunnel vision
  effects/                post-processing passes + whole-page colour filter
  audio/audioManager.ts   volume, tones, murmur, 3D chimes, clips, speech + captions
  ui/                     HUD, modals, intro card, results, room menu, styles.css
public/audio/             put recorded clips here
```

## How to build a room

1. Add an id to `RoomId` and an entry to `ROOMS` in `config.ts`, and register the class in `ROOM_FACTORIES` in `main.ts`.
2. Create `src/rooms/<id>/index.ts` with a class that extends `BaseRoom`:

```ts
import * as THREE from 'three';
import { BaseRoom } from '../Room';
import { buildShell } from '../shell';
import { rbox } from '../../world/materials';

export class DyslexiaRoom extends BaseRoom {
  constructor() { super('dyslexia'); }

  protected build(): void {
    buildShell(this.scene, this.colliders);              // floor, walls, lights
    const counter = rbox(2, 1, 0.6, '#B88A5A');           // soft rounded box
    counter.position.set(0, 0.5, -2);
    this.scene.add(counter);
    this.colliders.addMesh(counter);                      // can't walk through it
    this.ctx.addClickable(counter, () => this.ctx.complete());
    this.ctx.setTaskText('Order the coffee the waiter asks for');
  }

  setAccessible(on: boolean): void { super.setAccessible(on); /* turn support on/off */ }
  resetTask(): void { /* reset for the second (supported) attempt */ }
  update(dt: number, t: number): void { /* per-frame animation */ }
  exit(): void { /* stop your sounds and timers */ super.exit(); }
}
```

3. Run `npm run dev`, open the console, and run `__goto('dyslexia')`.

### The Room interface

| Method | When it's called | What to do |
|---|---|---|
| `build()` | Room is entered | Build the scene, register clickables, set the task text |
| `update(dt, t)` | Every frame | Animate things |
| `setAccessible(on)` | Before each attempt (`false`, then `true`), and by the Support button afterwards | Turn the support version on or off. **The condition usually stays on.** |
| `resetTask()` | Before the supported attempt, and after each completion in "explore" mode | Reset counters and shuffle positions |
| `exit()` | Leaving the room | Stop sounds and intervals, then call `super.exit()` (which disposes the scene and clears effects) |

### Useful things on `this.ctx`

- `addClickable(obj, fn)`: clickable within 4 m. Use an invisible bigger mesh as a hitbox for tiny objects (see the keys in tunnelVision).
- `complete()`: the attempt is finished. The app handles timing and result cards.
- `toast(msg)`, `setTaskText(text)`, `setRoomControls(htmlElement)` (left-side panel)
- `showPanel(htmlElement)`: centred HTML panel for text-heavy tasks (dyslexia menu, job form). Returns a close function.
- `effects.setColourBlind(type, severity)` and `effects.setTunnel(on, radius)`
- `audio.tone(freq, gain, wobble)`, `audio.murmur()`, `audio.chimeAt(pos)`, `audio.whisper(pan)`, `audio.clip('/audio/x.mp3')`, `audio.speak(text, { pitch, rate, volume, caption })` (speech shows captions unless `caption: false`)
- `person({ height, shirt, hair, glasses, hat, apron, face })` in `world/builders.ts` builds a low-poly figure; `faceMaterial()` gives the shared face
- `player.enabled` is true while the visitor is actively doing the task: use it to start sounds and timers. For HTML panel tasks, call `player.unlock()` when the panel opens so the mouse is free

## Design rules (please keep them)

- Palette: walls `#F4EFE6`, floor `#D9CBB3`, charcoal `#2B2B2E`. Room accents are Okabe-Ito colours, always paired with an icon and label.
- Use `rbox()` and `mat()` from `world/materials.ts` for the soft low-poly look. No external models.
- Font: Atkinson Hyperlegible. Large, readable text on signs.
- Never flash more than 3 times a second. No jump scares. Any spoken audio needs captions (use `audio.speak` or call `onCaption`).
- Every new control must be reachable by keyboard.

## Content checklist before the demo

- [x] Quotes and "Why it matters" lines filled in for every room in `config.ts`.
- [ ] Optional: add a `source` to any room in `config.ts` and it appears on the intro card.
- [ ] Record clips into `public/audio/` (optional; speech synthesis is the fallback).
