// Peripheral vision loss: a clear centre, blurred and darkened edges.
export const TunnelShader = {
  uniforms: {
    tDiffuse: { value: null },
    uRadius: { value: 0.2 }, // in screen-height units
    uSoft: { value: 0.14 },
    uAspect: { value: 1.6 },
    uCenter: { value: [0, 0] as unknown },
    uTexel: { value: [1 / 1600, 1 / 900] as unknown },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uRadius, uSoft, uAspect;
    uniform vec2 uCenter, uTexel;
    varying vec2 vUv;
    void main() {
      vec2 p = vUv - 0.5 - uCenter;
      p.x *= uAspect;
      float m = smoothstep(uRadius, uRadius + uSoft, length(p));
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      if (m > 0.001) {
        vec3 b = vec3(0.0);
        float r = 2.0 + m * 10.0;
        for (int i = 0; i < 8; i++) {
          float a = float(i) * 0.785398;
          b += texture2D(tDiffuse, vUv + vec2(cos(a), sin(a)) * uTexel * r).rgb;
        }
        col = mix(col, b / 8.0, m);
        col = mix(col, vec3(0.06, 0.055, 0.05), m * 0.93);
      }
      gl_FragColor = vec4(col, 1.0);
    }`,
};
