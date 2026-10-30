import * as THREE from 'three'
import { WaterShader } from './shaders.js'
import {
  clamp, fbm, smoothstep, forestHeight, rng, makeStoneTexture, standardMaterial,
  rockGeometry, buildLightShafts,
} from './util.js'

export function buildForest(w) {
  const root = new THREE.Group()
  root.name = 'Azure Labyrinth'
  w.scene.add(root)
  w.forestRoot = root
  w.zoneRoots[0] = root
  w.zoneObstacles[0] = []

  const geo = new THREE.PlaneGeometry(220, 220, 160, 160)
  geo.rotateX(-Math.PI / 2)
  const pos = geo.attributes.position
  const colors = []
  const cMoss = new THREE.Color('#0a1a31')
  const cGrass = new THREE.Color('#173458')
  const cEarth = new THREE.Color('#0d1a2e')
  const cRock = new THREE.Color('#2d5078')
  const tmp = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i)
    const y = forestHeight(x, z)
    pos.setY(i, y)
    const n = fbm(x * 0.08 + 2, z * 0.08 - 5, 3)
    const pond = Math.hypot(x + 22, z - 40)
    const wet = 1 - smoothstep(5, 16, pond)
    const slope = Math.abs(forestHeight(x + 1.4, z) - forestHeight(x - 1.4, z)) + Math.abs(forestHeight(x, z + 1.4) - forestHeight(x, z - 1.4))
    tmp.copy(cGrass).lerp(cMoss, clamp(0.28 + n * 0.7 + wet * 0.4, 0, 1))
    tmp.lerp(cRock, smoothstep(0.35, 1.3, slope))
    tmp.lerp(cEarth, smoothstep(-0.6, -2.2, y) * 0.22)
    tmp.offsetHSL(0, 0, n * 0.03)
    colors.push(tmp.r, tmp.g, tmp.b)
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  const terrain = new THREE.Mesh(geo, standardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0.06, color: 0xffffff }))
  terrain.receiveShadow = true
  root.add(terrain)
  w.forestTerrain = terrain

  buildPond(w, root)
  buildCrystalShards(w, root)
  buildRocks(w, root)
  buildCrystalGrove(w, root)
  buildHeartCrystal(w, root)
  buildRuins(w, root)
  buildParticles(w, root)
  buildMist(root)
  buildCrystalMaze(w, root)
  buildLightShafts(root, new THREE.Vector3(0, 2, -8), '#bfeaff', 6, 31)
}

function buildPond(w, root) {
  const geo = new THREE.CircleGeometry(10.5, 96)
  geo.rotateX(-Math.PI / 2)
  const uniforms = THREE.UniformsUtils.clone(WaterShader.uniforms)
  w.waterMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: WaterShader.vertexShader,
    fragmentShader: WaterShader.fragmentShader,
    transparent: true,
    depthWrite: false,
  })
  const water = new THREE.Mesh(geo, w.waterMaterial)
  water.position.set(-22, -0.08, 40)
  water.renderOrder = 2
  root.add(water)
  w.water = water

  const rand = rng(77)
  const rockGeo = rockGeometry(1.2)
  const rockMat = standardMaterial({ color: 0x3f5b7a, roughness: 0.9 })
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2 + rand() * 0.18
    const rr = 10.2 + rand() * 1.8
    const x = -22 + Math.cos(a) * rr, z = 40 + Math.sin(a) * rr
    const m = new THREE.Mesh(rockGeo, rockMat)
    m.position.set(x, forestHeight(x, z) - 0.12, z)
    m.scale.set(0.4 + rand() * 1.1, 0.25 + rand() * 0.6, 0.5 + rand() * 1.2)
    m.rotation.set(rand() * 3, rand() * 6, rand() * 3)
    m.castShadow = true
    root.add(m)
  }

  const glowMat = new THREE.MeshBasicMaterial({ color: 0x8fe8ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })
  const padGeo = new THREE.CircleGeometry(0.28, 12)
  padGeo.rotateX(-Math.PI / 2)
  for (let i = 0; i < 16; i++) {
    const a = rand() * Math.PI * 2, rr = 2 + rand() * 6
    const pad = new THREE.Mesh(padGeo, glowMat)
    pad.position.set(-22 + Math.cos(a) * rr, 0.02, 40 + Math.sin(a) * rr)
    pad.scale.setScalar(0.5 + rand())
    root.add(pad)
  }
  w.zoneObstacles[0].push({ x: -22, z: 40, r: 9.4 })
}

function buildCrystalShards(w, root) {
  const rand = rng(123)
  const count = w.lowQuality ? 6200 : 13000
  const shard = new THREE.ConeGeometry(0.075, 0.62, 4, 1)
  shard.translate(0, 0.31, 0)
  const mat = standardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.16, emissive: 0x0a2442, emissiveIntensity: 0.35 })
  const mesh = new THREE.InstancedMesh(shard, mat, count)
  mesh.frustumCulled = false
  const dummy = new THREE.Object3D()
  const color = new THREE.Color()
  let placed = 0, guard = 0
  while (placed < count && guard++ < count * 3) {
    const a = rand() * Math.PI * 2
    const r = 4 + Math.sqrt(rand()) * 62
    const x = Math.cos(a) * r, z = Math.sin(a) * r
    const pond = Math.hypot(x + 22, z - 40)
    if (pond < 12) continue
    const y = forestHeight(x, z)
    const slope = Math.abs(forestHeight(x + 0.8, z) - forestHeight(x - 0.8, z))
    if (slope > 0.9) continue
    dummy.position.set(x, y, z)
    dummy.rotation.set((rand() - 0.5) * 0.25, rand() * Math.PI, (rand() - 0.5) * 0.22)
    dummy.scale.set(0.7 + rand() * 1.2, 0.6 + rand() * 1.45, 0.7 + rand() * 1.2)
    dummy.updateMatrix()
    mesh.setMatrixAt(placed, dummy.matrix)
    color.setHSL(0.54 + rand() * 0.1, 0.42 + rand() * 0.25, 0.32 + rand() * 0.25)
    mesh.setColorAt(placed, color)
    placed++
  }
  mesh.count = placed
  mesh.receiveShadow = true
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  root.add(mesh)
}

function buildRocks(w, root) {
  const rand = rng(404)
  const geo = rockGeometry(1)
  const mat = standardMaterial({ color: 0x4f6d8e, roughness: 1 })
  const count = w.lowQuality ? 55 : 95
  const mesh = new THREE.InstancedMesh(geo, mat, count)
  const dummy = new THREE.Object3D()
  const color = new THREE.Color()
  let placed = 0, guard = 0
  while (placed < count && guard++ < 900) {
    const a = rand() * Math.PI * 2
    const r = 9 + Math.sqrt(rand()) * 58
    const x = Math.cos(a) * r, z = Math.sin(a) * r
    const pond = Math.hypot(x + 22, z - 40)
    if (pond < 13) continue
    if (Math.abs(x) < 30 && z > -24 && z < 30) continue
    const y = forestHeight(x, z)
    dummy.position.set(x, y + 0.15, z)
    dummy.rotation.set(rand() * 3, rand() * 6, rand() * 3)
    const s = 0.35 + rand() * 2.6
    dummy.scale.set(s * (0.8 + rand() * 0.5), s * (0.5 + rand() * 0.7), s * (0.8 + rand() * 0.5))
    dummy.updateMatrix()
    mesh.setMatrixAt(placed, dummy.matrix)
    color.setHSL(0.55 + rand() * 0.06, 0.18 + rand() * 0.18, 0.3 + rand() * 0.2)
    mesh.setColorAt(placed, color)
    placed++
  }
  mesh.count = placed
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  root.add(mesh)
}

function buildCrystalGrove(w, root) {
  const rand = rng(812)
  const geo = new THREE.ConeGeometry(1, 1, 6, 2)
  geo.translate(0, 0.5, 0)
  const mat = standardMaterial({ color: 0xffffff, roughness: 0.22, metalness: 0.32, emissive: 0x0a2c5a, emissiveIntensity: 0.55 })
  const count = w.lowQuality ? 90 : 180
  const mesh = new THREE.InstancedMesh(geo, mat, count)
  const dummy = new THREE.Object3D()
  const color = new THREE.Color()
  let placed = 0, guard = 0
  while (placed < count && guard++ < 1800) {
    const a = rand() * Math.PI * 2
    const r = 31 + Math.sqrt(rand()) * 32
    const x = Math.cos(a) * r, z = Math.sin(a) * r
    if (Math.hypot(x + 22, z - 40) < 14) continue
    if (Math.hypot(x, z + 26) < 12) continue
    const y = forestHeight(x, z)
    const s = 0.7 + rand() * 1.7
    const height = 4 + rand() * 11
    dummy.position.set(x, y - 0.2, z)
    dummy.rotation.set((rand() - 0.5) * 0.16, rand() * Math.PI, (rand() - 0.5) * 0.16)
    dummy.scale.set(s, height, s)
    dummy.updateMatrix()
    mesh.setMatrixAt(placed, dummy.matrix)
    color.setHSL(0.54 + rand() * 0.1, 0.58 + rand() * 0.24, 0.42 + rand() * 0.22)
    mesh.setColorAt(placed, color)
    placed++
    if (r < 48 && rand() > 0.5) w.zoneObstacles[0].push({ x, z, r: s * 0.7 })
  }
  mesh.count = placed
  mesh.castShadow = !w.lowQuality
  mesh.receiveShadow = true
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  root.add(mesh)
}

function buildHeartCrystal(w, root) {
  const group = new THREE.Group()
  const baseY = forestHeight(0, -26)
  group.position.set(0, baseY - 0.2, -26)
  const rand = rng(303)
  const glow = new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })
  const shardMat = standardMaterial({ color: 0x8fd8ff, emissive: 0x1a6aa8, emissiveIntensity: 0.85, roughness: 0.18, metalness: 0.34 })
  const violetMat = standardMaterial({ color: 0xb6c8ff, emissive: 0x3a3f9a, emissiveIntensity: 0.7, roughness: 0.2, metalness: 0.28 })
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2
    const radius = 0.6 + rand() * 2.6
    const height = 4 + rand() * 9
    const shard = new THREE.Mesh(new THREE.ConeGeometry(0.5 + rand() * 0.65, height, 6, 2), i % 3 ? shardMat : violetMat)
    shard.position.set(Math.cos(a) * radius, height * 0.5, Math.sin(a) * radius)
    shard.rotation.set((rand() - 0.5) * 0.22, rand() * 3, (rand() - 0.5) * 0.22)
    shard.castShadow = true
    group.add(shard)
  }
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(1.5, 1), glow)
  core.position.y = 8.5
  core.scale.y = 1.8
  group.add(core)
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.2 + i * 1.1, 0.035, 5, 64), glow)
    ring.position.y = 6.4 + i * 1.2
    ring.rotation.x = Math.PI / 2 + (rand() - 0.5) * 0.25
    ring.rotation.y = rand() * 2
    group.add(ring)
    if (i === 0) w.heartRing = ring
  }
  const light = new THREE.PointLight(0x9fe8ff, 14, 42, 2)
  light.position.set(0, 10, 0)
  group.add(light)
  w.heroLight = light
  root.add(group)
  w.zoneObstacles[0].push({ x: 0, z: -26, r: 3.8 })
}

function buildRuins(w, root) {
  const stoneTex = makeStoneTexture(false)
  stoneTex.repeat.set(2, 2)
  const stone = standardMaterial({ map: stoneTex, color: 0x7892b0, roughness: 0.88, metalness: 0.08 })
  const pale = standardMaterial({ color: 0xa8c4de, roughness: 0.82 })
  const runeMat = new THREE.MeshBasicMaterial({ color: 0x8fe8ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })
  const rand = rng(555)

  const arch = new THREE.Group()
  const ax = -32, az = 8
  arch.position.set(ax, forestHeight(ax, az), az)
  for (const s of [-1, 1]) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.72, 6.2, 12, 6), stone)
    col.position.set(s * 2.6, 3.1, 0)
    col.rotation.z = s * 0.055
    col.castShadow = true
    arch.add(col)
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 1.5), stone)
    base.position.set(s * 2.6, 0.25, 0)
    arch.add(base)
  }
  const top = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.8, 1.4), stone)
  top.position.y = 6.2
  top.rotation.z = 0.02
  top.castShadow = true
  arch.add(top)
  const broken = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 1.3), stone)
  broken.position.set(3.9, 6.9, 0)
  broken.rotation.z = -0.36
  arch.add(broken)
  const rune = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 1.3), runeMat)
  rune.position.set(0, 5.1, 0.72)
  arch.add(rune)
  root.add(arch)
  w.zoneObstacles[0].push({ x: ax - 2.6, z: az, r: 1.1 }, { x: ax + 2.6, z: az, r: 1.1 })

  const circle = new THREE.Group()
  const cx = 33, cz = -7
  circle.position.set(cx, forestHeight(cx, cz), cz)
  for (let i = 0; i < 7; i++) {
    if (i === 3) continue
    const a = (i / 7) * Math.PI * 2
    const x = Math.cos(a) * 6.2, z = Math.sin(a) * 6.2
    const h = 2.8 + rand() * 3.8
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.8, h, 0.55, 2, 4, 2), i % 2 ? stone : pale)
    p.position.set(x, h / 2 - 0.2, z)
    p.rotation.y = -a + Math.PI / 2
    p.rotation.z = (rand() - 0.5) * 0.12
    p.castShadow = true
    circle.add(p)
    if (i % 2 === 0) {
      const glyph = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.9), runeMat)
      glyph.position.set(x * 0.98, h * 0.58, z * 0.98)
      glyph.rotation.y = -a + Math.PI / 2
      circle.add(glyph)
    }
    w.zoneObstacles[0].push({ x: cx + x, z: cz + z, r: 0.6 })
  }
  root.add(circle)

  for (let i = 0; i < 4; i++) {
    const a = rand() * Math.PI * 2
    const x = Math.cos(a) * (32 + rand() * 16), z = Math.sin(a) * (32 + rand() * 16)
    const h = 4 + rand() * 6
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, h, 9, 5), stone)
    p.position.set(x, forestHeight(x, z) + h * 0.4, z)
    p.rotation.z = (rand() - 0.5) * 0.5
    p.rotation.y = rand() * 3
    p.castShadow = true
    root.add(p)
  }

  const lanternMat = new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })
  for (const [x, z] of [[-31, 16], [30, 9], [-30, -4], [34, -15]]) {
    const y = forestHeight(x, z)
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 1.5, 6), standardMaterial({ color: 0x334964, roughness: 1 }))
    post.position.set(x, y + 0.75, z)
    root.add(post)
    const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), lanternMat)
    orb.position.set(x, y + 1.65, z)
    root.add(orb)
  }
}

function buildParticles(w, root) {
  const rand = rng(202)
  const count = w.lowQuality ? 420 : 900
  const positions = new Float32Array(count * 3)
  const phases = new Float32Array(count)
  const scales = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2
    const r = 4 + Math.sqrt(rand()) * 56
    positions[i * 3] = Math.cos(a) * r
    positions[i * 3 + 1] = forestHeight(Math.cos(a) * r, Math.sin(a) * r) + 0.6 + rand() * 13
    positions[i * 3 + 2] = Math.sin(a) * r
    phases[i] = rand() * 10
    scales[i] = 0.5 + rand() * 1.5
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
  geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1))
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color('#c8f2ff') }, uSize: { value: 72 }, uOpacity: { value: 0.82 } },
    vertexShader: `
      attribute float aPhase; attribute float aScale;
      uniform float uTime; uniform float uSize;
      varying float vFade;
      void main(){
        vec3 p = position;
        p.x += sin(uTime * 0.22 + aPhase) * 0.8;
        p.y += sin(uTime * 0.16 + aPhase * 1.7) * 0.7;
        p.z += cos(uTime * 0.19 + aPhase * 0.8) * 0.8;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aScale * uSize / max(-mv.z, 1.0);
        gl_Position = projectionMatrix * mv;
        vFade = smoothstep(90.0, 6.0, -mv.z);
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
  w.forestMotes = mat

  const fireflies = []
  const fireMat = new THREE.SpriteMaterial({ map: w.glowTexture, color: 0x9fe8ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })
  for (let i = 0; i < 30; i++) {
    const s = new THREE.Sprite(fireMat)
    const a = rand() * Math.PI * 2, r = 8 + rand() * 30
    s.position.set(Math.cos(a) * r, forestHeight(Math.cos(a) * r, Math.sin(a) * r) + 1 + rand() * 5, Math.sin(a) * r)
    s.scale.setScalar(0.45 + rand() * 0.5)
    root.add(s)
    fireflies.push({ sprite: s, phase: rand() * 10, base: s.position.clone() })
  }
  w.fireflies = fireflies
}

function buildMist(root) {
  const mat = new THREE.MeshBasicMaterial({ color: 0x8fc8ee, transparent: true, opacity: 0.045, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), mat)
    m.rotation.x = -Math.PI / 2
    m.position.set(0, 1.1 + i * 1.4, 0)
    root.add(m)
  }
}

function buildCrystalMaze(w, root) {
  const cols = 9, rows = 8, cell = 6
  const originX = -27, originZ = -21
  const rand = rng(4242)
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false))
  const walls = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({ n: true, e: true, s: true, w: true })))
  const stack = [[4, 6]]
  visited[6][4] = true
  const shuffle = (items) => {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[items[i], items[j]] = [items[j], items[i]]
    }
    return items
  }
  const dirs = [
    { d: 'n', dc: 0, dr: -1, opposite: 's' },
    { d: 'e', dc: 1, dr: 0, opposite: 'w' },
    { d: 's', dc: 0, dr: 1, opposite: 'n' },
    { d: 'w', dc: -1, dr: 0, opposite: 'e' },
  ]
  while (stack.length) {
    const [col, row] = stack[stack.length - 1]
    const options = shuffle(dirs.filter(({ dc, dr }) => {
      const nc = col + dc, nr = row + dr
      return nc >= 0 && nc < cols && nr >= 0 && nr < rows && !visited[nr][nc]
    }))
    if (!options.length) { stack.pop(); continue }
    const { d, dc, dr, opposite } = options[0]
    const nc = col + dc, nr = row + dr
    walls[row][col][d] = false
    walls[nr][nc][opposite] = false
    visited[nr][nc] = true
    stack.push([nc, nr])
  }

  const edges = []
  const seen = new Set()
  const addEdge = (orientation, fixed, start, end, row, col, dir) => {
    if (row === 0 && col === 7 && dir === 'n') return
    const key = `${orientation}:${fixed}:${start}`
    if (seen.has(key)) return
    seen.add(key)
    edges.push({ orientation, fixed, start, end })
  }
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cellWalls = walls[row][col]
      const x = originX + col * cell
      const z = originZ + row * cell
      if (cellWalls.n) addEdge('h', z, x, x + cell, row, col, 'n')
      if (cellWalls.s) addEdge('h', z + cell, x, x + cell, row, col, 's')
      if (cellWalls.w) addEdge('v', x, z, z + cell, row, col, 'w')
      if (cellWalls.e) addEdge('v', x + cell, z, z + cell, row, col, 'e')
    }
  }

  const transforms = []
  const colors = []
  const dummy = new THREE.Object3D()
  const color = new THREE.Color()
  const clearings = [
    { x: 0, z: 18, r: 4.2 },
    { x: 0, z: -12, r: 5 },
    { x: 18, z: -22, r: 5.5 },
  ]
  const steps = w.lowQuality ? 4 : 5
  for (const edge of edges) {
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) / steps
      let x, z
      if (edge.orientation === 'h') {
        x = edge.start + t * (edge.end - edge.start) + (rand() - 0.5) * 0.24
        z = edge.fixed
      } else {
        x = edge.fixed
        z = edge.start + t * (edge.end - edge.start) + (rand() - 0.5) * 0.24
      }
      if (clearings.some((c) => Math.hypot(x - c.x, z - c.z) < c.r)) continue
      const height = 2.5 + rand() * 3.3
      const radius = 0.58 + rand() * 0.28
      const y = forestHeight(x, z) - 0.25
      dummy.position.set(x, y, z)
      dummy.rotation.set((rand() - 0.5) * 0.13, rand() * Math.PI, (rand() - 0.5) * 0.13)
      dummy.scale.set(radius, height, radius)
      dummy.updateMatrix()
      transforms.push({ matrix: dummy.matrix.clone(), x, z, y, height })
      color.setHSL(0.54 + rand() * 0.1, 0.62 + rand() * 0.24, 0.48 + rand() * 0.2)
      colors.push(color.clone())
      w.zoneObstacles[0].push({ x, z, r: radius * 0.92 })
    }
  }

  const geo = new THREE.ConeGeometry(1, 1, 6, 2)
  geo.translate(0, 0.5, 0)
  const mat = standardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.36, emissive: 0x0a2f60, emissiveIntensity: 0.72 })
  const mesh = new THREE.InstancedMesh(geo, mat, transforms.length)
  transforms.forEach((entry, index) => {
    mesh.setMatrixAt(index, entry.matrix)
    mesh.setColorAt(index, colors[index])
  })
  mesh.count = transforms.length
  mesh.castShadow = !w.lowQuality
  mesh.receiveShadow = true
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  root.add(mesh)
  w.mazeMesh = mesh

  const lightColors = [0x7fd8ff, 0x8fe8ff, 0xb6a8ff]
  for (let i = 0; i < 8; i++) {
    const entry = transforms[Math.floor((i + 0.5) * transforms.length / 8)]
    if (!entry) continue
    const light = new THREE.PointLight(lightColors[i % lightColors.length], 4.4, 17, 2)
    light.position.set(entry.x, entry.y + entry.height * 0.85, entry.z)
    root.add(light)
    w.crystalLights.push({ light, phase: i * 0.8, base: 4.4 })
  }
}
