import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { WaterShader } from './shaders.js'
import {
  clamp, fbm, smoothstep, forestHeight, rng, makeStoneTexture, standardMaterial,
  rockGeometry, buildLightShafts,
} from './util.js'

export function buildForest(w) {
  const root = new THREE.Group()
  root.name = 'Verdant Reach'
  w.scene.add(root)
  w.forestRoot = root
  w.zoneRoots[0] = root
  w.zoneObstacles[0] = []

  const geo = new THREE.PlaneGeometry(220, 220, 180, 180)
  geo.rotateX(-Math.PI / 2)
  const pos = geo.attributes.position
  const colors = []
  const cMoss = new THREE.Color('#2f4b34')
  const cGrass = new THREE.Color('#506e45')
  const cEarth = new THREE.Color('#665844')
  const cRock = new THREE.Color('#697266')
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
    tmp.lerp(cEarth, smoothstep(-0.6, -2.2, y) * 0.2)
    tmp.offsetHSL(0, 0, n * 0.025)
    colors.push(tmp.r, tmp.g, tmp.b)
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  const terrain = new THREE.Mesh(geo, standardMaterial({ vertexColors: true, roughness: 1, metalness: 0, color: 0xffffff }))
  terrain.receiveShadow = true
  root.add(terrain)
  w.forestTerrain = terrain

  buildPond(w, root)
  buildPath(w, root)
  buildGrass(w, root)
  buildRocks(w, root)
  buildTrees(w, root)
  buildHeroTree(w, root)
  buildRuins(w, root)
  buildParticles(w, root)
  buildMist(root)
  buildLightShafts(root, new THREE.Vector3(0, 2, -6), '#dfffe9', 6, 31)
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
  const rockMat = standardMaterial({ color: 0x5d6659, roughness: 0.95 })
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

  const glowMat = new THREE.MeshBasicMaterial({ color: 0x9ef5d8, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })
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

function buildPath(w, root) {
  const points = [
    [0, 28], [-1.5, 18], [-0.5, 8], [0.8, 0], [2.4, -6], [0, -12], [-2.6, -18],
  ].map(([x, z]) => new THREE.Vector3(x, forestHeight(x, z) + 0.045, z))
  const path = new THREE.CatmullRomCurve3(points)
  const segments = 160
  const positions = []
  const uvs = []
  const indices = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const p = path.getPoint(t)
    const tangent = path.getTangent(t)
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize()
    const width = 1.45 + Math.sin(t * 14) * 0.12
    for (const s of [-1, 1]) {
      const x = p.x + side.x * width * s
      const z = p.z + side.z * width * s
      positions.push(x, forestHeight(x, z) + 0.055, z)
      uvs.push(s === -1 ? 0 : 1, t * 12)
    }
    if (i < segments) {
      const a = i * 2
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  const tex = makeStoneTexture(false)
  tex.repeat.set(1.6, 8)
  const mesh = new THREE.Mesh(geo, standardMaterial({ map: tex, color: 0x9b9482, roughness: 0.96 }))
  mesh.receiveShadow = true
  root.add(mesh)

  const rand = rng(19)
  const stoneGeo = rockGeometry(0.5)
  const stoneMat = standardMaterial({ color: 0x77776a, roughness: 1 })
  for (let i = 0; i < 70; i++) {
    const t = rand()
    const p = path.getPoint(t)
    const tangent = path.getTangent(t)
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize()
    const s = rand() > 0.5 ? 1 : -1
    const x = p.x + side.x * (1.65 + rand() * 0.5) * s
    const z = p.z + side.z * (1.65 + rand() * 0.5) * s
    const m = new THREE.Mesh(stoneGeo, stoneMat)
    m.position.set(x, forestHeight(x, z) + 0.1, z)
    m.scale.set(0.25 + rand() * 0.4, 0.18 + rand() * 0.3, 0.3 + rand() * 0.5)
    m.rotation.y = rand() * Math.PI
    root.add(m)
  }
}

function buildGrass(w, root) {
  const rand = rng(123)
  const count = w.lowQuality ? 7200 : 15000
  const blade = new THREE.PlaneGeometry(0.075, 0.62, 1, 2)
  blade.translate(0, 0.31, 0)
  const mat = standardMaterial({ color: 0xffffff, roughness: 0.95, side: THREE.DoubleSide })
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 iOrigin = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        float sway = sin(uTime * 1.25 + iOrigin.x * 0.21 + iOrigin.z * 0.16) * 0.13;
        transformed.x += sway * pow(max(position.y, 0.0), 1.4);
        transformed.z += sway * 0.35 * pow(max(position.y, 0.0), 1.4);
      `)
    w.grassShaders.push(shader)
  }
  const mesh = new THREE.InstancedMesh(blade, mat, count)
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
    const nearPath = Math.abs(x) < 3.5 && z > -20 && z < 28
    if (nearPath && rand() < 0.82) continue
    const y = forestHeight(x, z)
    const slope = Math.abs(forestHeight(x + 0.8, z) - forestHeight(x - 0.8, z))
    if (slope > 0.9) continue
    dummy.position.set(x, y, z)
    dummy.rotation.set(0, rand() * Math.PI, 0)
    dummy.rotation.z = (rand() - 0.5) * 0.18
    dummy.scale.set(0.7 + rand() * 1.2, 0.6 + rand() * 1.35, 1)
    dummy.updateMatrix()
    mesh.setMatrixAt(placed, dummy.matrix)
    color.setHSL(0.28 + rand() * 0.08, 0.26 + rand() * 0.26, 0.2 + rand() * 0.16)
    mesh.setColorAt(placed, color)
    placed++
  }
  mesh.count = placed
  mesh.receiveShadow = true
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  root.add(mesh)
}

function buildHeroTree(w, root) {
  const group = new THREE.Group()
  group.position.set(0, forestHeight(0, -25) - 0.15, -25)
  const bark = standardMaterial({ color: 0x3e3a2f, roughness: 0.98 })
  const leaf = standardMaterial({ color: 0x5b8d65, roughness: 0.9, emissive: 0x173d2c, emissiveIntensity: 0.6 })
  const glow = new THREE.MeshBasicMaterial({ color: 0x9ff5ce, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending, depthWrite: false })
  const rand = rng(303)

  const branch = (start, dir, len, radius, depth) => {
    const end = start.clone().add(dir.clone().multiplyScalar(len))
    const mid = start.clone().lerp(end, 0.5)
    mid.y += len * 0.08
    const curve = new THREE.CatmullRomCurve3([start, mid, end])
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 8, radius, 6, false), bark)
    mesh.castShadow = true
    group.add(mesh)
    if (depth > 0) {
      const branches = depth > 2 ? 3 : 2
      for (let i = 0; i < branches; i++) {
        const nd = dir.clone()
        nd.x += (rand() - 0.5) * 1.1
        nd.z += (rand() - 0.5) * 1.1
        nd.y = Math.max(0.22, nd.y + (rand() - 0.25) * 0.55)
        nd.normalize()
        branch(end, nd, len * (0.58 + rand() * 0.18), radius * 0.58, depth - 1)
      }
    } else {
      for (let i = 0; i < 4; i++) {
        const c = new THREE.Mesh(new THREE.SphereGeometry(1.4 + rand() * 1.4, 12, 9), leaf)
        c.position.copy(end).add(new THREE.Vector3((rand() - 0.5) * 3.4, (rand() - 0.2) * 2.4, (rand() - 0.5) * 3.4))
        c.scale.y = 0.8 + rand() * 0.4
        c.castShadow = true
        group.add(c)
        if (rand() > 0.58) {
          const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11 + rand() * 0.12, 1), glow)
          orb.position.copy(c.position).add(new THREE.Vector3((rand() - 0.5) * 2, (rand() - 0.5) * 2, (rand() - 0.5) * 2))
          group.add(orb)
        }
      }
    }
  }
  branch(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0), 8.5, 2.1, 3)
  const light = new THREE.PointLight(0x9ff5ce, 14, 40, 2)
  light.position.set(0, 10, 0)
  group.add(light)
  w.heroLight = light
  w.heroTree = group
  root.add(group)
  w.zoneObstacles[0].push({ x: 0, z: -25, r: 2.5 })
}

function buildRuins(w, root) {
  const stoneTex = makeStoneTexture(false)
  stoneTex.repeat.set(2, 2)
  const stone = standardMaterial({ map: stoneTex, color: 0xb0a992, roughness: 0.95, metalness: 0.02 })
  const moss = standardMaterial({ color: 0x415d42, roughness: 1 })
  const runeMat = new THREE.MeshBasicMaterial({ color: 0x8ff5d4, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })
  const rand = rng(555)

  const ring = new THREE.Group()
  ring.position.set(0, forestHeight(0, -8), -8)
  const count = 9
  for (let i = 0; i < count; i++) {
    if (i === 4) continue
    const a = (i / count) * Math.PI * 2
    const x = Math.cos(a) * 8.2, z = Math.sin(a) * 8.2
    const h = 2.2 + rand() * 2.4
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.1, h, 0.7, 2, 4, 2), stone)
    p.position.set(x, h / 2 + forestHeight(x, -8 + z) - ring.position.y, z)
    p.rotation.y = -a + Math.PI / 2
    p.rotation.z = (rand() - 0.5) * 0.1
    p.castShadow = true
    p.receiveShadow = true
    ring.add(p)
    if (i % 2 === 0) {
      const rune = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 1.2), runeMat)
      rune.position.set(x * 0.985, h * 0.58 + forestHeight(x, -8 + z) - ring.position.y, z * 0.985)
      rune.rotation.y = -a + Math.PI / 2
      ring.add(rune)
    }
    w.zoneObstacles[0].push({ x, z: -8 + z, r: 0.7 })
  }
  root.add(ring)

  const arch = new THREE.Group()
  const ax = 17, az = 9
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
  const vine = new THREE.Mesh(new THREE.ConeGeometry(0.15, 3.2, 5), moss)
  vine.position.set(-2.3, 4.8, 0.2)
  arch.add(vine)
  root.add(arch)
  w.zoneObstacles[0].push({ x: ax - 2.6, z: az, r: 1.1 }, { x: ax + 2.6, z: az, r: 1.1 })

  for (let i = 0; i < 4; i++) {
    const a = rand() * Math.PI * 2
    const x = Math.cos(a) * (27 + rand() * 12), z = Math.sin(a) * (27 + rand() * 12)
    const h = 4 + rand() * 5
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, h, 9, 5), stone)
    p.position.set(x, forestHeight(x, z) + h * 0.4, z)
    p.rotation.z = (rand() - 0.5) * 0.5
    p.rotation.y = rand() * 3
    p.castShadow = true
    root.add(p)
  }

  const lanternMat = new THREE.MeshBasicMaterial({ color: 0x9ff5ce, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })
  for (const [x, z] of [[-3.2, 15], [3.2, 9], [-2.8, -3], [4.2, -16]]) {
    const y = forestHeight(x, z)
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 1.5, 6), standardMaterial({ color: 0x4a4a3c, roughness: 1 }))
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
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color('#d6ffe9') }, uSize: { value: 72 }, uOpacity: { value: 0.8 } },
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
  const fireMat = new THREE.SpriteMaterial({ map: w.glowTexture, color: 0xffdf9e, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })
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
  const mat = new THREE.MeshBasicMaterial({ color: 0x9fd3be, transparent: true, opacity: 0.04, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), mat)
    m.rotation.x = -Math.PI / 2
    m.position.set(0, 1.1 + i * 1.4, 0)
    root.add(m)
  }
}


function buildRocks(w, root) {
  const rand = rng(404)
  const geo = rockGeometry(1)
  const mat = standardMaterial({ color: 0x73796b, roughness: 1 })
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
    if (Math.abs(x) < 3.2 && z > -18 && z < 28) continue
    const y = forestHeight(x, z)
    dummy.position.set(x, y + 0.15, z)
    dummy.rotation.set(rand() * 3, rand() * 6, rand() * 3)
    const s = 0.35 + rand() * 2.6
    dummy.scale.set(s * (0.8 + rand() * 0.5), s * (0.5 + rand() * 0.7), s * (0.8 + rand() * 0.5))
    dummy.updateMatrix()
    mesh.setMatrixAt(placed, dummy.matrix)
    color.setHSL(0.19 + rand() * 0.06, 0.04 + rand() * 0.1, 0.3 + rand() * 0.16)
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

function buildTrees(w, root) {
  const rand = rng(812)
  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.52, 7.5, 7, 5)
  trunkGeo.translate(0, 3.75, 0)
  const canopyParts = []
  const canopyOffsets = [
    [0, 7.2, 0, 2.7], [1.4, 6.4, 0.7, 1.9], [-1.2, 6.6, -0.4, 2.1],
    [0.4, 8.4, -1, 1.6], [-0.6, 5.2, 1.2, 1.5],
  ]
  for (const [x, y, z, s] of canopyOffsets) {
    const g = new THREE.SphereGeometry(s, 12, 9)
    g.scale(1.1, 0.9, 1.05)
    g.translate(x, y, z)
    canopyParts.push(g)
  }
  const treeGeo = mergeGeometries([trunkGeo, ...canopyParts])
  const mat = standardMaterial({ color: 0xffffff, roughness: 0.95 })
  const count = w.lowQuality ? 24 : 42
  const mesh = new THREE.InstancedMesh(treeGeo, mat, count)
  const dummy = new THREE.Object3D()
  const color = new THREE.Color()
  let placed = 0, guard = 0
  while (placed < count && guard++ < 900) {
    const a = rand() * Math.PI * 2
    const r = 13 + Math.sqrt(rand()) * 48
    const x = Math.cos(a) * r, z = Math.sin(a) * r
    if (Math.hypot(x, z + 25) < 9) continue
    if (Math.abs(x) < 4.5 && z > -21 && z < 29) continue
    if (Math.hypot(x + 22, z - 40) < 14) continue
    const y = forestHeight(x, z)
    const s = 0.62 + rand() * 0.85
    dummy.position.set(x, y - 0.1, z)
    dummy.rotation.set(0, rand() * Math.PI * 2, 0)
    dummy.scale.set(s * (0.8 + rand() * 0.3), s, s * (0.8 + rand() * 0.3))
    dummy.updateMatrix()
    mesh.setMatrixAt(placed, dummy.matrix)
    color.setHSL(0.26 + rand() * 0.11, 0.3 + rand() * 0.2, 0.18 + rand() * 0.1)
    mesh.setColorAt(placed, color)
    placed++
    w.zoneObstacles[0].push({ x, z, r: 0.65 })
  }
  mesh.count = placed
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  root.add(mesh)
}
