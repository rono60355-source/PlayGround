import * as THREE from 'three'
import {
  clamp, fbm, smoothstep, mazeHeight, rng, standardMaterial, buildLightShafts,
} from './util.js'

const RING_RADII = [8, 16, 24, 32]
const RING_GAPS = [
  [{ center: Math.PI * 0.25, width: 0.42 }, { center: Math.PI * 1.25, width: 0.42 }],
  [{ center: Math.PI * 0.5, width: 0.4 }, { center: Math.PI * 1.17, width: 0.4 }, { center: Math.PI * 1.83, width: 0.4 }],
  [{ center: Math.PI * 0.17, width: 0.36 }, { center: Math.PI * 0.83, width: 0.36 }, { center: Math.PI * 1.5, width: 0.36 }],
  [{ center: 0, width: 0.34 }, { center: Math.PI * 0.67, width: 0.34 }, { center: Math.PI * 1.33, width: 0.34 }],
]

function angleInGap(angle, gaps) {
  for (const gap of gaps) {
    let d = Math.atan2(Math.sin(angle - gap.center), Math.cos(angle - gap.center))
    if (Math.abs(d) < gap.width / 2) return true
  }
  return false
}

export function buildMaze(w) {
  const root = new THREE.Group()
  root.name = 'Azure Labyrinth'
  w.scene.add(root)
  w.mazeRoot = root
  w.zoneRoots[0] = root
  w.zoneObstacles[0] = []
  w.mazeFloaters = []

  buildTerrain(w, root)
  buildFloorRings(w, root)
  buildMazeWalls(w, root)
  buildCrystalGarden(w, root)
  buildPools(w, root)
  buildParticles(w, root)
  buildMist(root)
  buildLightShafts(root, new THREE.Vector3(0, 3, 0), '#c4efff', 6, 31)
}

function buildTerrain(w, root) {
  const geo = new THREE.PlaneGeometry(230, 230, w.lowQuality ? 110 : 160, w.lowQuality ? 110 : 160)
  geo.rotateX(-Math.PI / 2)
  const pos = geo.attributes.position
  const colors = []
  const cDeep = new THREE.Color('#0b2238')
  const cGlass = new THREE.Color('#1d4d6b')
  const cVein = new THREE.Color('#2f7fa8')
  const cFrost = new THREE.Color('#6fb9d8')
  const tmp = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const y = mazeHeight(x, z)
    pos.setY(i, y)
    const n = fbm(x * 0.09 + 2, z * 0.09 - 5, 3)
    const r = Math.hypot(x, z)
    const vein = Math.pow(clamp(1 - Math.abs(Math.sin(r * 0.33 + n * 2.4)), 0, 1), 9)
    tmp.copy(cDeep).lerp(cGlass, clamp(0.4 + n * 0.5, 0, 1))
    tmp.lerp(cVein, vein * 0.55)
    tmp.lerp(cFrost, smoothstep(48, 82, r) * 0.4)
    tmp.offsetHSL(0.01, 0.05, n * 0.03)
    colors.push(tmp.r, tmp.g, tmp.b)
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  const terrain = new THREE.Mesh(geo, standardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.28, color: 0xffffff }))
  terrain.receiveShadow = true
  root.add(terrain)
  w.mazeTerrain = terrain

  const under = new THREE.Mesh(
    new THREE.CylinderGeometry(120, 54, 20, 64, 1, true),
    standardMaterial({ color: 0x071726, roughness: 1, side: THREE.DoubleSide })
  )
  under.position.y = -10.2
  root.add(under)
}

function buildFloorRings(w, root) {
  const mat = new THREE.MeshBasicMaterial({ color: 0x7fe6ff, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
  RING_RADII.forEach((radius, i) => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(radius - 0.06, radius + 0.06, 128), mat)
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.09 + i * 0.002
    root.add(ring)
  })
  const dais = new THREE.Mesh(new THREE.CircleGeometry(5.4, 80), new THREE.MeshBasicMaterial({ color: 0x5fd4ff, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false }))
  dais.rotation.x = -Math.PI / 2
  dais.position.y = 0.075
  root.add(dais)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const rune = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 1.4), new THREE.MeshBasicMaterial({ color: 0x9feaff, transparent: true, opacity: 0.24, blending: THREE.AdditiveBlending, depthWrite: false }))
    rune.rotation.x = -Math.PI / 2
    rune.rotation.z = -a
    rune.position.set(Math.cos(a) * 4.3, 0.085, Math.sin(a) * 4.3)
    root.add(rune)
  }
}

function buildMazeWalls(w, root) {
  const rand = rng(418)
  const segments = []
  const crystals = []

  RING_RADII.forEach((radius, ringIndex) => {
    const gaps = RING_GAPS[ringIndex]
    const step = 0.82 / radius
    const maxAngle = Math.PI * 2
    for (let a = 0; a < maxAngle; a += step) {
      if (angleInGap(a, gaps)) continue
      const x = Math.cos(a) * radius
      const z = Math.sin(a) * radius
      const y = mazeHeight(x, z)
      const h = 2.7 + rand() * 1.9 + ringIndex * 0.18
      segments.push({ x, z, y, h, angle: a, radius })
      w.zoneObstacles[0].push({ x, z, r: 0.62 })
      if (rand() > 0.86) {
        crystals.push({ x, z, y: y + h, h: 0.9 + rand() * 2.1, angle: a })
      }
      // avoid an accidental double registration at wrap
      if (a + step >= maxAngle) break
    }
  })

  const wallGeo = new THREE.BoxGeometry(1, 1, 1)
  const wallMat = standardMaterial({ color: 0xffffff, roughness: 0.36, metalness: 0.22, emissive: 0x0a2a44, emissiveIntensity: 0.55 })
  const mesh = new THREE.InstancedMesh(wallGeo, wallMat, segments.length)
  mesh.castShadow = true
  mesh.receiveShadow = true
  const dummy = new THREE.Object3D()
  const color = new THREE.Color()
  const palette = ['#3b7fa6', '#4b96c2', '#2d6b91', '#5aa8cf', '#387fa8']
  segments.forEach((s, i) => {
    dummy.position.set(s.x, s.y + s.h / 2 - 0.15, s.z)
    dummy.rotation.set(0, -s.angle - Math.PI / 2, (rand() - 0.5) * 0.035)
    dummy.scale.set(1.62, s.h, 0.56 + rand() * 0.2)
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
    color.set(palette[Math.floor(rand() * palette.length)])
    mesh.setColorAt(i, color)
  })
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  root.add(mesh)

  const crystalGeo = new THREE.OctahedronGeometry(0.5, 0)
  crystalGeo.scale(0.6, 1.8, 0.6)
  const crystalMat = new THREE.MeshStandardMaterial({ color: 0x9feaff, emissive: 0x2d9ccc, emissiveIntensity: 1.5, roughness: 0.16, metalness: 0.35 })
  const shards = new THREE.InstancedMesh(crystalGeo, crystalMat, crystals.length)
  crystals.forEach((c, i) => {
    dummy.position.set(c.x, c.y + c.h * 0.55, c.z)
    dummy.rotation.set((rand() - 0.5) * 0.3, rand() * Math.PI, (rand() - 0.5) * 0.3)
    dummy.scale.set(0.5 + rand() * 0.7, 0.6 + rand() * 1.2, 0.5 + rand() * 0.7)
    dummy.updateMatrix()
    shards.setMatrixAt(i, dummy.matrix)
  })
  shards.instanceMatrix.needsUpdate = true
  shards.castShadow = true
  root.add(shards)

  // Soft cyan beacons mark the open gaps so the maze stays readable.
  const gapMat = new THREE.MeshBasicMaterial({ color: 0xa8f0ff, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false })
  RING_RADII.forEach((radius, ringIndex) => {
    for (const gap of RING_GAPS[ringIndex]) {
      const x = Math.cos(gap.center) * radius
      const z = Math.sin(gap.center) * radius
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.6), gapMat)
      glow.position.set(x, mazeHeight(x, z) + 0.1, z)
      glow.rotation.x = -Math.PI / 2
      glow.rotation.z = -gap.center
      root.add(glow)
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.075, 2.6, 6), gapMat)
      post.position.set(x, mazeHeight(x, z) + 1.3, z)
      root.add(post)
    }
  })
}

function buildCrystalGarden(w, root) {
  const rand = rng(812)
  const palette = ['#6fd8ff', '#8fb4ff', '#b8a4ff', '#9ff0ff', '#5ab8e8']
  const coneGeo = new THREE.ConeGeometry(0.7, 3.4, 6)
  const clusters = []
  for (let i = 0; i < 46; i++) {
    const a = rand() * Math.PI * 2
    const r = 5 + Math.sqrt(rand()) * 58
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    if (r < 6) continue
    // keep the spawn and gate approaches clear
    if (Math.hypot(x, z - 18) < 4) continue
    if (Math.hypot(x - 18, z + 22) < 5) continue
    clusters.push({ x, z, y: mazeHeight(x, z), r })
  }
  clusters.forEach((c, i) => {
    const group = new THREE.Group()
    group.position.set(c.x, c.y, c.z)
    const color = palette[i % palette.length]
    const mat = standardMaterial({ color, emissive: color, emissiveIntensity: 0.7 + rand() * 0.5, roughness: 0.2, metalness: 0.35 })
    const n = 2 + Math.floor(rand() * 4)
    for (let j = 0; j < n; j++) {
      const shard = new THREE.Mesh(coneGeo, mat)
      shard.position.set((rand() - 0.5) * 2.2, 1.4 + rand() * 1.3, (rand() - 0.5) * 2.2)
      shard.scale.set(0.45 + rand() * 1.2, 0.6 + rand() * 1.5, 0.45 + rand() * 1.2)
      shard.rotation.set((rand() - 0.5) * 0.55, rand() * 3, (rand() - 0.5) * 0.55)
      shard.castShadow = true
      group.add(shard)
    }
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: w.glowTexture, color, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false }))
    halo.position.y = 2
    halo.scale.set(5, 5, 1)
    group.add(halo)
    root.add(group)
    if (c.r < 20) w.zoneObstacles[0].push({ x: c.x, z: c.z, r: 1.15 })
    if (i < 7) {
      const light = new THREE.PointLight(color, 3.4, 15, 2)
      light.position.set(c.x, c.y + 3, c.z)
      root.add(light)
      w.crystalLights.push({ light, phase: rand() * 6, base: 3.4 })
    }
  })

  // Tall outer spires frame the labyrinth.
  const spireGeo = new THREE.ConeGeometry(1.2, 12, 6)
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2 + rand() * 0.14
    const r = 52 + rand() * 26
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    const h = 7 + rand() * 14
    const mat = standardMaterial({ color: '#3f88b0', emissive: '#0e3c5c', emissiveIntensity: 0.7, roughness: 0.3, metalness: 0.3 })
    const spire = new THREE.Mesh(spireGeo, mat)
    spire.position.set(x, mazeHeight(x, z) + h * 0.5, z)
    spire.scale.set(0.8 + rand() * 1.2, h / 12, 0.8 + rand() * 1.2)
    spire.rotation.y = rand() * Math.PI
    spire.castShadow = true
    root.add(spire)
  }

  const floatGeo = new THREE.OctahedronGeometry(0.5, 0)
  floatGeo.scale(0.7, 1.4, 0.7)
  for (let i = 0; i < 26; i++) {
    const a = rand() * Math.PI * 2
    const r = 6 + rand() * 30
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    const color = palette[i % palette.length]
    const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.1, roughness: 0.15, metalness: 0.4, transparent: true, opacity: 0.85 })
    const shard = new THREE.Mesh(floatGeo, mat)
    shard.position.set(x, mazeHeight(x, z) + 3 + rand() * 7, z)
    shard.scale.setScalar(0.5 + rand() * 1.1)
    root.add(shard)
    w.mazeFloaters.push({ mesh: shard, base: shard.position.clone(), phase: rand() * 8, speed: 0.15 + rand() * 0.25 })
  }
}

function buildPools(w, root) {
  const rand = rng(515)
  const poolGeo = new THREE.CircleGeometry(1, 56)
  poolGeo.rotateX(-Math.PI / 2)
  for (let i = 0; i < 5; i++) {
    const a = rand() * Math.PI * 2
    const r = 12 + rand() * 20
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    const scale = 1.8 + rand() * 2.4
    const mat = new THREE.MeshBasicMaterial({ color: i % 2 ? 0x6fd8ff : 0x8fb4ff, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false })
    const pool = new THREE.Mesh(poolGeo, mat)
    pool.position.set(x, mazeHeight(x, z) + 0.04, z)
    pool.scale.setScalar(scale)
    root.add(pool)
    const rim = new THREE.Mesh(new THREE.TorusGeometry(scale, 0.045, 5, 64), new THREE.MeshBasicMaterial({ color: 0x9feaff, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }))
    rim.rotation.x = Math.PI / 2
    rim.position.copy(pool.position)
    root.add(rim)
  }
}

function buildParticles(w, root) {
  const rand = rng(202)
  const count = w.lowQuality ? 420 : 980
  const positions = new Float32Array(count * 3)
  const phases = new Float32Array(count)
  const scales = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2
    const r = 4 + Math.sqrt(rand()) * 60
    positions[i * 3] = Math.cos(a) * r
    positions[i * 3 + 1] = mazeHeight(Math.cos(a) * r, Math.sin(a) * r) + 0.5 + rand() * 14
    positions[i * 3 + 2] = Math.sin(a) * r
    phases[i] = rand() * 10
    scales[i] = 0.5 + rand() * 1.5
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
  geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1))
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color('#c8f2ff') }, uSize: { value: 70 }, uOpacity: { value: 0.82 } },
    vertexShader: `
      attribute float aPhase; attribute float aScale;
      uniform float uTime; uniform float uSize;
      varying float vFade;
      void main(){
        vec3 p = position;
        p.x += sin(uTime * 0.2 + aPhase) * 0.8;
        p.y += sin(uTime * 0.15 + aPhase * 1.7) * 0.8;
        p.z += cos(uTime * 0.17 + aPhase * 0.8) * 0.8;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aScale * uSize / max(-mv.z, 1.0);
        gl_Position = projectionMatrix * mv;
        vFade = smoothstep(95.0, 6.0, -mv.z);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor; uniform float uOpacity; varying float vFade;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(uColor, a * a * uOpacity * vFade);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const points = new THREE.Points(geo, mat)
  points.frustumCulled = false
  root.add(points)
  w.mazeMotes = mat

  const fireflies = []
  const fireMat = new THREE.SpriteMaterial({ map: w.glowTexture, color: 0xaef4ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })
  for (let i = 0; i < 28; i++) {
    const s = new THREE.Sprite(fireMat)
    const a = rand() * Math.PI * 2
    const r = 7 + rand() * 32
    s.position.set(Math.cos(a) * r, mazeHeight(Math.cos(a) * r, Math.sin(a) * r) + 1 + rand() * 5, Math.sin(a) * r)
    s.scale.setScalar(0.4 + rand() * 0.5)
    root.add(s)
    fireflies.push({ sprite: s, phase: rand() * 10, base: s.position.clone() })
  }
  w.fireflies = fireflies
}

function buildMist(root) {
  const mat = new THREE.MeshBasicMaterial({ color: 0x7fd4f0, transparent: true, opacity: 0.035, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), mat)
    m.rotation.x = -Math.PI / 2
    m.position.set(0, 1.2 + i * 1.6, 0)
    root.add(m)
  }
}
