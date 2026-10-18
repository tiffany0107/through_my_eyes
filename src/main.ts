import './ui/styles.css';
import * as THREE from 'three';
import { RoomId, roomInfo } from './config';
import { AudioManager } from './audio/audioManager';
import { Player } from './controls/firstPerson';
import { Effects } from './effects/postProcessing';
import { buildHub } from './world/corridor';
import { Hud } from './ui/hud';
import { showIntro, showStart } from './ui/introCard';
import { TaskTimer, showFinalResult, showFirstResult } from './ui/taskTimer';
import { showRoomMenu } from './ui/roomMenu';
import { Room, RoomContext, RoomResult } from './rooms/Room';
import { ColourBlindnessRoom } from './rooms/colourBlindness';
import { TunnelVisionRoom } from './rooms/tunnelVision';
import { DyslexiaRoom } from './rooms/dyslexia';
import { FaceBlindnessRoom } from './rooms/faceBlindness';
import { TinnitusRoom } from './rooms/tinnitus';
import { SchizophreniaRoom } from './rooms/schizophrenia';
import { ReflectionRoom } from './rooms/reflection';

// To add a room: create a class extending BaseRoom and register it here.
const ROOM_FACTORIES: Record<RoomId, () => Room> = {
  colourBlindness: () => new ColourBlindnessRoom(),
  tunnelVision: () => new TunnelVisionRoom(),
  dyslexia: () => new DyslexiaRoom(),
  faceBlindness: () => new FaceBlindnessRoom(),
  tinnitus: () => new TinnitusRoom(),
  schizophrenia: () => new SchizophreniaRoom(),
  reflection: () => new ReflectionRoom(),
};

const REACH = 4; // metres
const GIVE_UP_AFTER = 60; // seconds

async function main(): Promise<void> {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const appEl = document.getElementById('app')!;
  const uiRoot = document.getElementById('ui')!;

  // Canvas text needs the font loaded first (don't wait forever if offline).
  await Promise.race([
    Promise.all([document.fonts.load('400 32px "Atkinson Hyperlegible"'), document.fonts.load('700 32px "Atkinson Hyperlegible"')]),
    new Promise((r) => setTimeout(r, 2500)),
  ]).catch(() => {});

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  const pixelRatio = Math.min(devicePixelRatio, 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-label', '3D gallery view');
  appEl.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 100);
  const hud = new Hud(uiRoot);
  const audio = new AudioManager();
  audio.onCaption = (t) => hud.caption(t);
  const hub = buildHub();
  const effects = new Effects(renderer, hub.scene, camera, uiRoot, reduced);
  effects.setSize(innerWidth, innerHeight, pixelRatio);
  const player = new Player(camera, renderer.domElement, reduced);
  const results = new Map<RoomId, RoomResult>();
  const timer = new TaskTimer();

  // ---- State ----
  let room: Room | null = null;
  let phase: 'idle' | 'attempt1' | 'attempt2' | 'free' = 'free';
  let clickables: { obj: THREE.Object3D; fn: (hit: THREE.Intersection) => void }[] = [];
  let floors: THREE.Object3D[] = [];
  let taskText = '';
  let busy = false;
  let mouse: { x: number; y: number } | null = null;

  const scene = () => (room ? room.scene : hub.scene);
  const colliders = () => (room ? room.colliders : hub.colliders);
  const collectFloors = () => {
    floors = [];
    scene().traverse((o) => { if (o.userData.floor) floors.push(o); });
  };
  collectFloors();

  function setPlaying(on: boolean): void {
    player.enabled = on;
    hud.setPlaying(on);
    if (!on) player.unlock();
  }

  const ctx: RoomContext = {
    camera,
    player,
    audio,
    effects,
    results,
    addClickable: (obj, fn) => clickables.push({ obj, fn }),
    complete: () => onComplete(false),
    toast: (m) => hud.toast(m),
    setTaskText: (t) => { taskText = t; if (phase !== 'idle') hud.setTask(t); },
    setRoomControls: (e) => hud.setRoomControls(e),
    showPanel: (e) => { hud.panelRoot.appendChild(e); return () => e.remove(); },
    goToCorridor: () => void leave('corridor'),
    restart: () => { results.clear(); void leave('lobby'); },
  };

  // ---- Room flow: intro -> attempt -> support -> results ----
  async function enterRoom(id: RoomId): Promise<void> {
    if (busy) return;
    busy = true;
    setPlaying(false);
    await hud.fade(true);
    hud.modalRoot.replaceChildren();
    if (room) room.exit();
    timer.running = false;
    phase = 'idle';
    clickables = [];
    room = ROOM_FACTORIES[id]();
    hud.setRoom(room.info);
    hud.setTask(null);
    hud.setSupport('hidden');
    hud.giveUpBtn.hidden = true;
    await room.enter(ctx);
    room.setAccessible(false);
    effects.setScene(room.scene);
    collectFloors();
    player.setPose(room.spawn.x, room.spawn.z, room.spawn.yaw);
    await hud.fade(false);
    busy = false;
    if (!room.hasTask) {
      phase = 'free';
      hud.setTask(null); // no task, so no task bar
      setPlaying(true);
      return;
    }
    showIntro(hud.modalRoot, room.info, () => startAttempt(1), () => void leave('corridor'));
  }

  function startAttempt(n: 1 | 2): void {
    if (!room) return;
    audio.init();
    phase = n === 1 ? 'attempt1' : 'attempt2';
    if (n === 2) {
      room.resetTask();
      room.setAccessible(true);
      hud.setSupport('on');
    }
    hud.setTask(taskText);
    hud.giveUpBtn.hidden = true;
    timer.begin();
    setPlaying(true);
    if (finePointer) player.lock(); // called inside the click, so the browser allows it
  }

  function onComplete(gaveUp: boolean): void {
    if (!room) return;
    const info = room.info;
    if (phase === 'attempt1') {
      const t = timer.stop();
      results.set(info.id, { without: t, gaveUp });
      setPlaying(false);
      hud.giveUpBtn.hidden = true;
      showFirstResult(hud.modalRoot, info, t, gaveUp, () => startAttempt(2));
    } else if (phase === 'attempt2') {
      const t = timer.stop();
      const r = results.get(info.id) ?? {};
      r.with = t;
      results.set(info.id, r);
      setPlaying(false);
      hud.giveUpBtn.hidden = true;
      hud.setTimer(null);
      showFinalResult(hud.modalRoot, info, r.without ?? 0, t, !!r.gaveUp, () => void leave('corridor'), () => {
        phase = 'free';
        room?.resetTask();
        setPlaying(true);
      });
    } else if (phase === 'free') {
      hud.toast('Nice! Task reset, try again.');
      setTimeout(() => room?.resetTask(), 700);
    }
  }

  async function leave(to: 'corridor' | 'lobby'): Promise<void> {
    if (busy) return;
    busy = true;
    setPlaying(false);
    await hud.fade(true);
    hud.modalRoot.replaceChildren();
    const fromId = room?.id;
    room?.exit();
    room = null;
    clickables = [];
    timer.running = false;
    phase = 'free';
    effects.clear();
    effects.setScene(hub.scene);
    collectFloors();
    hud.setRoom(null);
    hud.setTask(null);
    hud.setTimer(null);
    hud.setSupport('hidden');
    hud.giveUpBtn.hidden = true;
    const trig = hub.triggers.find((t) => t.id === fromId);
    const sp = to === 'corridor' && trig ? trig.spawn : hub.spawn;
    player.setPose(sp.x, sp.z, sp.yaw);
    await hud.fade(false);
    busy = false;
    setPlaying(true);
  }

  // ---- HUD wiring ----
  hud.exitBtn.addEventListener('click', () => void leave('corridor'));
  // Q leaves the room from anywhere, including while the mouse is locked (locked clicks can't reach the HUD).
  addEventListener('keydown', (e) => {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (e.key.toLowerCase() !== 'q' || !room || busy || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    void leave('corridor');
  });
  hud.lookBtn.addEventListener('click', () => player.lock());
  hud.volume.addEventListener('input', () => audio.setVolume(Number(hud.volume.value)));
  hud.giveUpBtn.addEventListener('click', () => onComplete(true));
  hud.supportBtn.addEventListener('click', () => {
    if (!room || phase !== 'free') return;
    const on = hud.supportBtn.getAttribute('aria-pressed') !== 'true';
    room.setAccessible(on);
    hud.setSupport(on ? 'on' : 'off');
  });
  hud.menuBtn.addEventListener('click', () => {
    const wasPlaying = player.enabled;
    const timing = timer.running;
    setPlaying(false);
    showRoomMenu(hud.modalRoot, results, (id) => {
      if (id === 'lobby') void leave('lobby');
      else void enterRoom(id);
    }, () => { if (wasPlaying) setPlaying(true); timer.running = timing; });
  });
  player.onLockChange = (locked) => hud.setLocked(locked);
  hud.setLocked(false);

  // ---- Interaction ----
  const ray = new THREE.Raycaster();
  function pick(x: number | null, y: number | null) {
    const ndc = x === null || y === null ? new THREE.Vector2(0, 0) : new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects([...clickables.map((c) => c.obj), ...floors], true);
    const hit = hits[0];
    if (!hit) return null;
    let o: THREE.Object3D | null = hit.object;
    while (o) {
      const c = clickables.find((k) => k.obj === o);
      if (c) return hit.distance <= REACH ? { hit, click: c } : { hit, click: null, far: true };
      o = o.parent;
    }
    return { hit, click: null, floor: true };
  }

  function interact(x: number | null, y: number | null): void {
    const p = pick(x, y);
    if (!p) return;
    if (p.click) p.click.fn(p.hit);
    else if ('far' in p) hud.toast('Move closer to reach that.');
    else if ('floor' in p && x !== null) player.target = p.hit.point.clone();
  }
  player.onClick = interact;
  player.onInteractKey = () => interact(null, null);
  renderer.domElement.addEventListener('pointermove', (e) => (mouse = { x: e.clientX, y: e.clientY }));
  renderer.domElement.addEventListener('pointerleave', () => (mouse = null));

  // ---- Loop ----
  const clock = new THREE.Clock();
  const p2 = new THREE.Vector2();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    player.update(dt, colliders());
    if (room) room.update(dt, t);
    else hub.update(t);

    if (!room && player.enabled && !busy) {
      p2.set(player.pos.x, player.pos.z);
      const trig = hub.triggers.find((tr) => tr.box.containsPoint(p2));
      if (trig) void enterRoom(trig.id);
    }

    if (timer.running) {
      const e = timer.elapsed();
      hud.setTimer(e);
      if (e > GIVE_UP_AFTER && hud.giveUpBtn.hidden) hud.giveUpBtn.hidden = false;
    }

    if (player.enabled) {
      const p = player.locked ? pick(null, null) : mouse ? pick(mouse.x, mouse.y) : null;
      const can = !!p?.click;
      hud.setCrosshairActive(player.locked && can);
      renderer.domElement.style.cursor = player.locked ? 'none' : can ? 'pointer' : p && 'floor' in p ? 'crosshair' : 'grab';
    }

    audio.updateListener(camera);
    effects.update(t);
    effects.render();
  });

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    effects.setSize(innerWidth, innerHeight, pixelRatio);
  });

  // ---- Start ----
  player.setPose(hub.spawn.x, hub.spawn.z, hub.spawn.yaw);
  setPlaying(false);
  showStart(hud.modalRoot, () => {
    audio.init();
    setPlaying(true);
    if (finePointer) player.lock();
  });

  // Dev helpers (browser console): __goto('tunnelVision'), __complete()
  const w = window as unknown as { __goto: (id: RoomId) => void; __complete: () => void };
  w.__goto = (id) => { roomInfo(id); void enterRoom(id); };
  w.__complete = () => onComplete(false);
}

void main();
