import * as THREE from 'three';
import { RoomId, RoomInfo, roomInfo } from '../config';
import { Colliders } from '../controls/collisions';
import { Player } from '../controls/firstPerson';
import { AudioManager } from '../audio/audioManager';
import { Effects } from '../effects/postProcessing';
import { Spawn } from '../world/corridor';
import { disposeScene } from '../world/materials';

export interface RoomResult { without?: number; with?: number; gaveUp?: boolean }

/** Everything a room can use. Provided by the app when the room is entered. */
export interface RoomContext {
  camera: THREE.PerspectiveCamera;
  player: Player;
  audio: AudioManager;
  effects: Effects;
  results: Map<RoomId, RoomResult>;
  /** Make an object clickable (within reach). */
  addClickable(obj: THREE.Object3D, onClick: (hit: THREE.Intersection) => void): void;
  /** Call when the current attempt of the task is finished. */
  complete(): void;
  toast(msg: string): void;
  /** Short instruction shown in the task bar. */
  setTaskText(text: string): void;
  /** Room-specific controls panel (e.g. sliders). Pass null to hide. */
  setRoomControls(el: HTMLElement | null): void;
  /** Show a centred card (for HTML-based tasks). Returns a close function. */
  showPanel(el: HTMLElement): () => void;
  goToCorridor(): void;
  restart(): void;
}

export interface Room {
  id: RoomId;
  info: RoomInfo;
  scene: THREE.Scene;
  colliders: Colliders;
  spawn: Spawn;
  /** false for rooms without a timed task (e.g. reflection). */
  hasTask: boolean;
  enter(ctx: RoomContext): Promise<void>; // build scene, start audio
  update(dt: number, t: number): void;
  setAccessible(on: boolean): void; // the "flip"
  resetTask(): void; // called before the second (supported) attempt
  exit(): void; // dispose geometry, stop audio
}

/** Base class: handles the boring parts. Override build(), and the hooks you need. */
export abstract class BaseRoom implements Room {
  scene = new THREE.Scene();
  colliders = new Colliders();
  spawn: Spawn = { x: 0, z: 2.8, yaw: 0 };
  hasTask = true;
  info: RoomInfo;
  protected ctx!: RoomContext;
  protected accessible = false;

  constructor(public id: RoomId) {
    this.info = roomInfo(id);
  }

  async enter(ctx: RoomContext): Promise<void> {
    this.ctx = ctx;
    this.scene = new THREE.Scene();
    this.colliders = new Colliders();
    await this.build();
  }

  protected abstract build(): Promise<void> | void;
  update(_dt: number, _t: number): void {}
  setAccessible(on: boolean): void { this.accessible = on; }
  resetTask(): void {}

  exit(): void {
    this.ctx.effects.clear();
    this.ctx.audio.stopSpeech();
    this.ctx.setRoomControls(null);
    disposeScene(this.scene);
  }
}
