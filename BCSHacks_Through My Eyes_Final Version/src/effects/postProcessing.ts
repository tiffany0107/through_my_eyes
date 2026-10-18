import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ColourBlindShader, cbMatrix, CBType } from '../shaders/colourBlindness';
import { TunnelShader } from '../shaders/tunnelVision';
import { setPageFilter } from './pageFilter';

/**
 * Pass order: Render -> Output (tone map + sRGB) -> colour blindness -> tunnel vision.
 * The vision passes work in display (sRGB) space, matching what the eye sees.
 */
export class Effects {
  composer: EffectComposer;
  renderPass: RenderPass;
  private cb: ShaderPass;
  private tunnel: ShaderPass;
  private drift = true;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, private uiRoot: HTMLElement, reducedMotion: boolean) {
    this.composer = new EffectComposer(renderer);
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(new OutputPass());

    this.cb = new ShaderPass(ColourBlindShader);
    this.cb.uniforms.uM.value = new THREE.Matrix3();
    this.cb.enabled = false;
    this.composer.addPass(this.cb);

    this.tunnel = new ShaderPass(TunnelShader);
    this.tunnel.uniforms.uCenter.value = new THREE.Vector2();
    this.tunnel.uniforms.uTexel.value = new THREE.Vector2();
    this.tunnel.enabled = false;
    this.composer.addPass(this.tunnel);
    this.drift = !reducedMotion;
  }

  setScene(scene: THREE.Scene): void { this.renderPass.scene = scene; }

  setColourBlind(type: CBType | null, severity = 1): void {
    if (!type || severity <= 0) {
      this.cb.enabled = false;
      setPageFilter(this.uiRoot, null);
      return;
    }
    const m = cbMatrix(type, severity);
    (this.cb.uniforms.uM.value as THREE.Matrix3).set(m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7], m[8]);
    this.cb.enabled = true;
    setPageFilter(this.uiRoot, m);
  }

  setTunnel(on: boolean, radius = 0.2): void {
    this.tunnel.enabled = on;
    this.tunnel.uniforms.uRadius.value = radius;
  }

  clear(): void {
    this.setColourBlind(null);
    this.setTunnel(false);
  }

  setSize(w: number, h: number, pixelRatio: number): void {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(w, h);
    this.tunnel.uniforms.uAspect.value = w / h;
    (this.tunnel.uniforms.uTexel.value as THREE.Vector2).set(1 / (w * pixelRatio), 1 / (h * pixelRatio));
  }

  update(t: number): void {
    if (this.tunnel.enabled && this.drift) {
      (this.tunnel.uniforms.uCenter.value as THREE.Vector2).set(Math.sin(t * 0.37) * 0.025, Math.cos(t * 0.29) * 0.018);
    }
  }

  render(): void { this.composer.render(); }
}
