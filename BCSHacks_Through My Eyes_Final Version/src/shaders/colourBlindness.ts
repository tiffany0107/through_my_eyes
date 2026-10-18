// Colour vision deficiency simulation, Machado, Oliveira & Fernandes (2009),
// severity 1.0 matrices, applied in linear RGB. Severity blends with identity.

export type CBType = 'protanopia' | 'deuteranopia' | 'tritanopia';

export const CB_LABELS: Record<CBType, string> = {
  protanopia: 'Protanopia (red-blind)',
  deuteranopia: 'Deuteranopia (green-blind)',
  tritanopia: 'Tritanopia (blue-blind)',
};

const M: Record<CBType, number[]> = {
  protanopia: [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
  deuteranopia: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881],
  tritanopia: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039],
};

/** Row-major 3x3 matrix for a type at a severity (0..1). */
export function cbMatrix(type: CBType, severity: number): number[] {
  const id = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  return M[type].map((v, i) => id[i] + (v - id[i]) * severity);
}

export const ColourBlindShader = {
  uniforms: {
    tDiffuse: { value: null },
    uM: { value: null as unknown },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform mat3 uM;
    varying vec2 vUv;
    vec3 toLin(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
    vec3 toSrgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
    void main() {
      vec4 t = texture2D(tDiffuse, vUv);
      vec3 l = clamp(uM * toLin(t.rgb), 0.0, 1.0);
      gl_FragColor = vec4(toSrgb(l), t.a);
    }`,
};
