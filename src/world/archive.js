import * as THREE from 'three'
import { archiveHeight, fbm, rng, standardMaterial, makeStoneTexture, buildLightShafts, clamp } from './util.js'

export function buildArchive(w) {
  const root = new THREE.Group()
  root.name = 'Skybound Archive'
  w.scene.add(root)
  w.archiveRoot = root
  w.zoneRoots[2] = root
  w.zoneObstacles[2] = []
  const cx = 800

  const topGeo = new THREE.CircleGeometry(34, 96)
  topGeo.rotateX(-Math.PI / 2)
  const pos = topGeo.attributes.position
  const colors = []
  const cA = new THREE.Color('#9fc4d6')
  const cB = new THREE.Color('#c8e6f2')
  const cC = new THREE.Color('#7fa6b8')
  const tmp = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + cx, z = pos.getZ(i)
    pos.setXYZ(i, pos.getX(i), archiveHeight(x, z) - 68, pos.getZ(i))
    const n = fbm(x * 0.08, z * 0.08, 3)
    tmp.copy(cA).lerp(cB, clamp(n * 0.5 + 0.5, 0, 1)).lerp(cC, 0.2)
    colors.push(tmp.r, tmp.g, tmp.b)
  }
  topGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  topGeo.computeVertexNormals()
  const top = new THREE.Mesh(topGeo, standardMaterial({ vertexColors: true, roughness: 1 }))
  top.position.set(cx, 68, 0)
  top.receiveShadow = true
  root.add(top)

  const undersideGeo = new THREE.CylinderGeometry(34, 7, 24, 64, 12, true)
  const upos = undersideGeo.attributes.position
  const v = new THREE.Vector3()
  for (let i = 0; i < upos.count; i++) {
    v.fromBufferAttribute(upos, i)
    const n = fbm(v.x * 0.08 + 5, v.y * 0.08 + v.z * 0.08, 4)
    const radial = Math.hypot(v.x, v.z)
    v.x += (v.x / Math.max(radial, 0.001)) * n * 2.4
    v.z += (v.z / Math.max(radial, 0.001)) * n * 2.4
    upos.setXYZ(i, v.x, v.y, v.z)
  }
  undersideGeo.computeVertexNormals()
  const underside = new THREE.Mesh(undersideGeo, standardMaterial({ color: 0x3c5a6e, roughness: 1, side: THREE.DoubleSide }))
  underside.position.set(cx, 56, 0)
  underside.scale.y = 1.0
  root.add(underside)

  const rand = rng(930)
  const stoneTex = makeStoneTexture(false)
  stoneTex.repeat.set(2, 2)
  const stone = standardMaterial({ map: stoneTex, color: 0xc2dbe6, roughness: 0.9, metalness: 0.03 })
  const pale = standardMaterial({ color: 0xd9eef7, roughness: 0.82 })
  const gold = new THREE.MeshBasicMaterial({ color: 0xb9f0ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })

  const temple = new THREE.Group()
  temple.position.set(cx, archiveHeight(cx, -8), -8)
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(17 - i * 1.8, 0.42, 12 - i * 1.2), stone)
    m.position.y = -1.3 + i * 0.42
    m.receiveShadow = true
    m.castShadow = true
    temple.add(m)
  }
  for (const s of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.78, 8.6, 14, 8), pale)
      col.position.set(s * (5.2 + i * 3.1), 4.3, 0)
      col.castShadow = true
      col.receiveShadow = true
      temple.add(col)
      for (let b = 0; b < 3; b++) {
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.67, 0.055, 6, 14), gold)
        band.rotation.x = Math.PI / 2
        band.position.set(s * (5.2 + i * 3.1), 1.2 + b * 2.5, 0)
        temple.add(band)
      }
      w.zoneObstacles[2].push({ x: cx + s * (5.2 + i * 3.1), z: -8, r: 0.95 })
    }
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(14.5, 1.1, 2.1), stone)
  lintel.position.set(0, 8.8, 0)
  lintel.castShadow = true
  lintel.receiveShadow = true
  temple.add(lintel)
  const archRing = new THREE.Mesh(new THREE.TorusGeometry(4.5, 0.62, 10, 42, Math.PI), pale)
  archRing.position.set(0, 8.2, 0)
  archRing.castShadow = true
  temple.add(archRing)
  const keystone = new THREE.Mesh(new THREE.OctahedronGeometry(0.68, 1), gold)
  keystone.position.set(0, 12.74, 0)
  temple.add(keystone)
  root.add(temple)

  const pathRand = rng(935)
  for (let z = 16; z > -3.4; z -= 1.28) {
    const offset = Math.sin(z * 0.32) * 0.9
    const tile = new THREE.Mesh(new THREE.BoxGeometry(3.35 + pathRand() * 0.35, 0.24, 1.46), pale)
    tile.position.set(cx + offset, archiveHeight(cx + offset, z) + 0.035, z)
    tile.rotation.y = (pathRand() - 0.5) * 0.08
    tile.receiveShadow = true
    root.add(tile)
  }

  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + 0.15
    const r = 19 + (i % 2) * 4
    const x = cx + Math.cos(a) * r, z = Math.sin(a) * r
    const h = 5 + rand() * 6
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.68, h, 12, 5), pale)
    col.position.set(x, archiveHeight(x, z) + h / 2 - 0.4, z)
    col.rotation.z = (rand() - 0.5) * 0.13
    col.rotation.y = rand() * 3
    col.castShadow = true
    col.receiveShadow = true
    root.add(col)
    w.zoneObstacles[2].push({ x, z, r: 0.85 })
    if (i % 3 === 0) {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(2, 0.4, 2), stone)
      cap.position.set(x, archiveHeight(x, z) + h - 0.3, z)
      cap.rotation.y = rand() * 3
      cap.castShadow = true
      root.add(cap)
    }
  }

  const tower = new THREE.Group()
  tower.position.set(cx - 22, archiveHeight(cx - 22, 16), 16)
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(3.4 - i * 0.42, 3.8 - i * 0.42, 3.4, 16, 2), stone)
    m.position.y = i * 3.05
    m.castShadow = true
    tower.add(m)
  }
  const crown = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.16, 8, 30), gold)
  crown.rotation.x = Math.PI / 2
  crown.position.y = 10.8
  tower.add(crown)
  root.add(tower)
  w.zoneObstacles[2].push({ x: cx - 22, z: 16, r: 3.5 })

  const floaters = []
  for (let i = 0; i < 7; i++) {
    const a = rand() * Math.PI * 2
    const r = 9 + rand() * 16
    const x = cx + Math.cos(a) * r, z = Math.sin(a) * r
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.5 + rand() * 2, 0.5 + rand() * 1.2, 1 + rand() * 1.6), pale)
    m.position.set(x, archiveHeight(x, z) + 5 + rand() * 7, z)
    m.rotation.set(rand() * 3, rand() * 3, rand() * 3)
    m.castShadow = true
    root.add(m)
    floaters.push({ mesh: m, base: m.position.clone(), phase: rand() * 8 })
  }
  w.archiveFloaters = floaters

  const goldenLeaf = standardMaterial({ color: 0xa8e8ff, roughness: 0.55, emissive: 0x1a5c78, emissiveIntensity: 0.7 })
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.6
    const r = 13 + rand() * 7
    const x = cx + Math.cos(a) * r, z = Math.sin(a) * r
    const y = archiveHeight(x, z)
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.26, 2.4, 7), standardMaterial({ color: 0x695c3e, roughness: 1 }))
    trunk.position.set(x, y + 1.2, z)
    root.add(trunk)
    for (let j = 0; j < 3; j++) {
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.8 + rand() * 0.6, 12, 9), goldenLeaf)
      c.position.set(x + (rand() - 0.5) * 1.1, y + 2.7 + rand() * 0.8, z + (rand() - 0.5) * 1.1)
      c.castShadow = true
      root.add(c)
    }
  }

  const ringMat = new THREE.MeshBasicMaterial({ color: 0xb9f0ff, transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
  w.archiveRings = []
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(9 + i * 3, 0.05, 5, 80), ringMat)
    ring.position.set(cx, 78 + i * 1.6, 0)
    ring.rotation.x = Math.PI / 2 + (rand() - 0.5) * 0.2
    ring.rotation.y = rand() * 2
    root.add(ring)
    w.archiveRings.push({ mesh: ring, phase: rand() * 6, speed: 0.05 + rand() * 0.04 })
  }

  buildArchiveParticles(w, root)
  buildLightShafts(root, new THREE.Vector3(cx, 0, 0), '#d8f6ff', 4, 90)
}

function buildArchiveParticles(w, root) {
  const rand = rng(1001)
  const count = w.lowQuality ? 260 : 520
  const positions = new Float32Array(count * 3)
  const phases = new Float32Array(count)
  const scales = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2
    const r = 3 + Math.sqrt(rand()) * 28
    positions[i * 3] = 800 + Math.cos(a) * r
    positions[i * 3 + 1] = 68 + rand() * 17
    positions[i * 3 + 2] = Math.sin(a) * r
    phases[i] = rand() * 10
    scales[i] = 0.4 + rand() * 1.6
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
  geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1))
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color('#d8f6ff') }, uSize: { value: 58 }, uOpacity: { value: 0.8 } },
    vertexShader: `
      attribute float aPhase; attribute float aScale; uniform float uTime; uniform float uSize; varying float vFade;
      void main(){
        vec3 p = position;
        p.y += sin(uTime * 0.18 + aPhase) * 1.1;
        p.x += cos(uTime * 0.12 + aPhase) * 0.7;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aScale * uSize / max(-mv.z, 1.0);
        gl_Position = projectionMatrix * mv;
        vFade = smoothstep(70.0, 5.0, -mv.z);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor; uniform float uOpacity; varying float vFade;
      void main(){ float d=length(gl_PointCoord-0.5); float a=smoothstep(0.5,0.0,d); gl_FragColor=vec4(uColor,a*a*uOpacity*vFade); }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const points = new THREE.Points(geo, mat)
  points.frustumCulled = false
  root.add(points)
  w.archiveMotes = mat
}
