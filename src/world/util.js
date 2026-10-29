import * as THREE from 'three'

export const MONSTER_SPEED = 1.55
export const ORBIT_RADIUS = 5.2

export function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }
export function lerp(a, b, t) { return a + (b - a) * t }
export function smoothstep(a, b, x) { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }

function hash2(x, y) {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123
  return h - Math.floor(h)
}

export function valueNoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y)
  const xf = x - xi, yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1)
  return lerp(lerp(a, b, u), lerp(c, d, u), v)
}

export function fbm(x, y, octaves = 4) {
  let value = 0, amp = 0.5, freq = 1, norm = 0
  for (let i = 0; i < octaves; i++) {
    value += (valueNoise(x * freq, y * freq) * 2 - 1) * amp
    norm += amp
    amp *= 0.5
    freq *= 2.03
  }
  return value / norm
}

export function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

export function forestHeight(x, z) {
  const r = Math.hypot(x, z)
  let h = fbm(x * 0.019, z * 0.019, 5) * 4.6 + fbm(x * 0.062 + 4, z * 0.062 - 8, 3) * 0.78
  h += smoothstep(55, 90, r) * (16 + fbm(x * 0.032, z * 0.032, 3) * 12)
  const glade = smoothstep(9, 31, Math.hypot(x, z - 4))
  h = lerp(0.38, h, glade)
  const pond = Math.hypot(x + 22, z - 40)
  h -= (1 - smoothstep(4.5, 13, pond)) * 2.7
  const hero = Math.hypot(x, z + 25)
  h = lerp(h, 0.55, (1 - smoothstep(3, 14, hero)) * 0.7)
  return h
}

export function caveHeight(x, z) {
  const dx = x - 400
  return -0.18 + fbm(dx * 0.17 + 20, z * 0.17 - 3, 3) * 0.17 + fbm(dx * 0.5, z * 0.5, 2) * 0.045
}

export function archiveHeight(x, z) {
  const dx = x - 800
  let h = 68 + fbm(dx * 0.055 + 8, z * 0.055 - 2, 4) * 1.1
  h = lerp(68, h, smoothstep(3, 23, Math.hypot(dx, z + 4)))
  return h
}

export function zoneHeight(index, x, z) {
  if (index === 1) return caveHeight(x, z)
  if (index === 2) return archiveHeight(x, z)
  return forestHeight(x, z)
}

export function makeGlowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.15, 'rgba(210,255,242,0.9)')
  g.addColorStop(0.45, 'rgba(120,230,205,0.22)')
  g.addColorStop(1, 'rgba(60,160,150,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function makeStoneTexture(dark = false) {
  const size = 512
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  const base = dark ? '#232a2b' : '#8d8a7d'
  ctx.fillStyle = base
  ctx.fillRect(0, 0, size, size)
  const rand = rng(dark ? 91 : 44)
  for (let i = 0; i < 2600; i++) {
    const x = rand() * size, y = rand() * size, r = 1 + rand() * 18
    const tone = Math.floor((dark ? 24 : 100) + rand() * (dark ? 32 : 65))
    ctx.fillStyle = `rgba(${tone},${tone + (dark ? 4 : 2)},${tone - (dark ? 0 : 6)},${0.02 + rand() * 0.05})`
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  }
  for (let i = 0; i < 18; i++) {
    ctx.strokeStyle = dark ? 'rgba(8,13,14,0.25)' : 'rgba(53,50,43,0.18)'
    ctx.lineWidth = 0.6 + rand() * 1.4
    ctx.beginPath()
    let x = rand() * size, y = rand() * size
    ctx.moveTo(x, y)
    for (let j = 0; j < 5; j++) { x += (rand() - 0.5) * 90; y += (rand() - 0.5) * 90; ctx.lineTo(x, y) }
    ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

export function makeRuneTexture(glyph, color = '#c8ffe9') {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, 256, 256)
  ctx.strokeStyle = color
  ctx.lineWidth = 3
  ctx.shadowColor = color
  ctx.shadowBlur = 18
  ctx.beginPath(); ctx.arc(128, 128, 92, 0, Math.PI * 2); ctx.stroke()
  ctx.globalAlpha = 0.55
  ctx.beginPath(); ctx.arc(128, 128, 76, 0, Math.PI * 2); ctx.stroke()
  ctx.globalAlpha = 1
  ctx.font = '94px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = color
  ctx.fillText(glyph, 128, 135)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    ctx.beginPath()
    ctx.arc(128 + Math.cos(a) * 84, 128 + Math.sin(a) * 84, 3, 0, Math.PI * 2)
    ctx.fill()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function standardMaterial(opts = {}) {
  return new THREE.MeshStandardMaterial({ roughness: 0.88, metalness: 0.02, ...opts })
}

export function beamMaterial(color) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uOpacity: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
      uniform float uTime; uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv;
      void main(){
        float edge = smoothstep(0.0, 0.22, vUv.x) * smoothstep(1.0, 0.78, vUv.x);
        float flow = sin(vUv.y * 18.0 - uTime * 2.4) * 0.5 + 0.5;
        float fade = smoothstep(1.0, 0.2, vUv.y);
        gl_FragColor = vec4(uColor, (0.22 + flow * 0.16) * edge * fade * uOpacity);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  })
}

export function rockGeometry(radius = 1) {
  const geo = new THREE.DodecahedronGeometry(radius, 1)
  const pos = geo.attributes.position
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const n = fbm(v.x * 2.7 + 4, v.y * 2.7 + v.z * 1.3, 3)
    v.multiplyScalar(1 + n * 0.18)
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  geo.computeVertexNormals()
  return geo
}

export function buildLightShafts(root, center, color, count, seed = 31) {
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.028, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })
  const rand = rng(seed)
  for (let i = 0; i < count; i++) {
    const geo = new THREE.CylinderGeometry(0.4 + rand() * 1.4, 2 + rand() * 3, 16 + rand() * 12, 12, 1, true)
    const m = new THREE.Mesh(geo, mat)
    m.position.set(center.x + (rand() - 0.5) * 30, 11 + rand() * 4, center.z + (rand() - 0.5) * 30)
    m.rotation.z = (rand() - 0.5) * 0.18
    m.rotation.x = (rand() - 0.5) * 0.12
    root.add(m)
  }
}
