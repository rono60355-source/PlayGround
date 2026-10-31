import * as THREE from 'three'

export const SkyShader = {
  uniforms: {
    uTop: { value: new THREE.Color('#03101f') },
    uHorizon: { value: new THREE.Color('#1d5f80') },
    uSunColor: { value: new THREE.Color('#cdefff') },
    uSunDir: { value: new THREE.Vector3(0.5, 0.4, -0.65).normalize() },
    uTime: { value: 0 },
    uStars: { value: 0.18 },
    uGlow: { value: 1 },
  },
  vertexShader: `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uTop;
    uniform vec3 uHorizon;
    uniform vec3 uSunColor;
    uniform vec3 uSunDir;
    uniform float uTime;
    uniform float uStars;
    uniform float uGlow;
    varying vec3 vDir;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i = floor(p); vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1,0)), u.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
    }
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.02 + 7.1; a *= 0.5; }
      return v;
    }

    void main() {
      vec3 d = normalize(vDir);
      float h = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
      vec3 col = mix(uHorizon, uTop, smoothstep(0.42, 0.92, h));
      float sun = max(dot(d, uSunDir), 0.0);
      col += uSunColor * (pow(sun, 1200.0) * 3.4 + pow(sun, 26.0) * 0.42 + pow(sun, 5.0) * 0.08) * uGlow;
      float band = sin(d.y * 32.0 + d.x * 7.0 + uTime * 0.015) * 0.5 + 0.5;
      col += uHorizon * band * 0.012;
      vec2 cp = d.xz / max(abs(d.y) + 0.22, 0.12) * 1.4 + vec2(uTime * 0.003, uTime * 0.0012);
      float cloud = smoothstep(0.48, 0.82, fbm(cp));
      float cloudFade = smoothstep(-0.08, 0.25, d.y) * (1.0 - smoothstep(0.66, 0.95, d.y));
      col = mix(col, uHorizon * 1.22 + uSunColor * 0.16, cloud * cloudFade * 0.38);
      float star = step(0.9982, hash(floor(d.xz * 820.0 + d.y * 320.0)));
      col += vec3(0.7, 0.9, 1.0) * star * uStars * smoothstep(0.15, 0.6, d.y);
      col += vec3(0.04, 0.1, 0.1) * smoothstep(0.1, -0.25, d.y);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
}

export const WaterShader = {
  uniforms: {
    uTime: { value: 0 },
    uDeep: { value: new THREE.Color('#0a2238') },
    uShallow: { value: new THREE.Color('#6fd0f0') },
    uSky: { value: new THREE.Color('#bfe6f5') },
    uOpacity: { value: 0.88 },
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vWorld;
    uniform float uTime;
    void main() {
      vec3 p = position;
      float w = sin(p.x * 0.9 + uTime * 0.7) * 0.035 + sin(p.y * 1.2 - uTime * 0.55) * 0.03;
      p.z += w;
      vUv = uv;
      vWorld = (modelMatrix * vec4(p, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uDeep;
    uniform vec3 uShallow;
    uniform vec3 uSky;
    uniform float uOpacity;
    varying vec2 vUv;
    varying vec3 vWorld;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1,0)), u.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
    }
    void main() {
      vec2 p = vWorld.xz * 0.55;
      float r1 = noise(p + vec2(uTime * 0.13, uTime * 0.07));
      float r2 = noise(p * 2.1 - vec2(uTime * 0.1, uTime * 0.16));
      float ripple = smoothstep(0.55, 0.95, r1 * 0.65 + r2 * 0.45);
      vec3 col = mix(uDeep, uShallow, 0.34 + ripple * 0.38);
      col = mix(col, uSky, 0.15);
      col += uShallow * ripple * 0.22;
      float edge = smoothstep(0.0, 0.18, min(vUv.x, 1.0 - vUv.x));
      gl_FragColor = vec4(col, uOpacity * (0.55 + edge * 0.45));
    }
  `,
}

export const PortalShader = {
  uniforms: {
    uTime: { value: 0 },
    uColorA: { value: new THREE.Color('#7fe6ff') },
    uColorB: { value: new THREE.Color('#d6f7ff') },
    uOpen: { value: 0.25 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `
    uniform float uTime; uniform vec3 uColorA; uniform vec3 uColorB; uniform float uOpen;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p,vec2(17.3,91.7)))*43758.5); }
    float noise(vec2 p){ vec2 i=floor(p),f=fract(p); vec2 u=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y); }
    void main(){
      vec2 c = vUv - 0.5;
      float r = length(c);
      float a = atan(c.y, c.x);
      float swirl = noise(vec2(cos(a + r * 8.0 - uTime * 0.8), sin(a + r * 8.0 - uTime * 0.8)) * 2.0 + r * 4.0);
      float ring = smoothstep(0.5, 0.16, r);
      vec3 col = mix(uColorA, uColorB, swirl * 0.75);
      float alpha = ring * (0.22 + swirl * 0.55) * uOpen;
      float edge = smoothstep(0.42, 0.5, r) * smoothstep(0.5, 0.46, r);
      alpha += edge * 0.4 * uOpen;
      gl_FragColor = vec4(col * (1.0 + swirl * 0.6), alpha);
    }
  `,
}

export const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: 0.9 },
    uGrain: { value: 0.026 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uVignette; uniform float uGrain;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float d = distance(vUv, vec2(0.5));
      float v = smoothstep(0.78, 0.3, d);
      c.rgb *= mix(1.0, v, uVignette * 0.34);
      c.rgb = mix(c.rgb, c.rgb * vec3(0.972, 1.0, 1.03), 0.4);
      float luma = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      c.rgb = mix(vec3(luma), c.rgb, 1.08);
      c.rgb = clamp((c.rgb - 0.5) * 1.045 + 0.5, 0.0, 1.0);
      float g = hash(vUv * 1200.0 + uTime * 13.0) - 0.5;
      c.rgb += g * uGrain;
      gl_FragColor = c;
    }
  `,
}
