# Through My Eyes

*See the struggle, then see the solution.*

A browser-based 3D gallery. Visitors walk a corridor of rooms. In each room they try an everyday task while a health condition is simulated, then they switch on support and see how small changes make the task easier.

Built with **TypeScript + three.js + Vite**.

## Project overview

This project was created to help people understand accessibility through experience, not just explanation. Instead of reading about disability and inclusion, users step into a simulated world where common tasks become harder because the environment around them is designed without that support.

In the hallway, each door represents a different condition. Behind each door is a simple everyday task—finding keys, reading a menu, processing audio, recognizing a person, or completing a form. The first attempt shows the struggle. With support enabled, users can see how small changes in design can make a major difference.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the built site
```

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

```text
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

## Final message

Through My Eyes is more than a game or demo. It is an empathy-driven experience that helps people see the world from another perspective and understand why accessibility should be built into design from the start.

Because when we design with inclusion in mind, we build spaces, products, and experiences that work better for everyone.
