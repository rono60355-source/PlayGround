import * as THREE from 'three'
import { caveHeight, fbm, rng, standardMaterial, rockGeometry, buildLightShafts, clamp } from './util.js'

export function buildCave(w) {
  const root = new THREE.Group()
  root.name = 'Prism Hollow'
  w.scene.add(root)
  w.caveRoot = root
  w.zoneRoots[1] = root
  w.zoneObstacles[1] = []
  const cx = 400

  const floorGeo = new THREE.CircleGeometry(29, 96)
  floorGeo.rotateX(-Math.PI / 2)
  const pos = floorGeo.attributes.position
  const colors = []
  const cA = new THREE.Color('#1b2c2e')
  const cB = new THREE.Color('#263d40')
  const cC = new THREE.Color('#152224')
  const tmp = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + cx, z = pos.getZ(i)
    pos.setXYZ(i, pos.getX(i), caveHeight(x, z), pos.getZ(i))
    const n = fbm(x * 0.23, z * 0.23, 3)
    tmp.copy(cA).lerp(cB, clamp(n * 0.5 + 0.5, 0, 1)).lerp(cC, 0.18)
    colors.push(tmp.r, tmp.g, tmp.b)
  }
  floorGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  floorGeo.computeVertexNormals()
  const floor = new THREE.Mesh(floorGeo, standardMaterial({ vertexColors: true, roughness: 0.98 }))
  floor.position.x = cx
  floor.receiveShadow = true
  root.add(floor)

  const domeGeo = new THREE.SphereGeometry(34, 64, 40, 0, Math.PI * 2, 0, Math.PI * 0.68)
  const dpos = domeGeo.attributes.position
  const v = new THREE.Vector3()
  for (let i = 0; i < dpos.count; i++) {
    v.fromBufferAttribute(dpos, i)
    const n = fbm(v.x * 0.09 + 11, v.y * 0.09 + v.z * 0.09, 4)
    v.multiplyScalar(1 + n * 0.14)
    dpos.setXYZ(i, v.x, v.y, v.z)
  }
  domeGeo.computeVertexNormals()
  const dome = new THREE.Mesh(domeGeo, standardMaterial({ color: 0x263234, roughness: 1, side: THREE.BackSide }))
  dome.position.set(cx, -1.5, 0)
  root.add(dome)

  const rand = rng(661)
  const rockGeo = rockGeometry(1.8)
  const rockMat = standardMaterial({ color: 0x3b4749, roughness: 1 })
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2 + rand() * 0.09
    const r = 23 + rand() * 7
    const x = cx + Math.cos(a) * r, z = Math.sin(a) * r
    const m = new THREE.Mesh(rockGeo, rockMat)
    m.position.set(x, caveHeight(x, z) + rand() * 3, z)
    m.scale.set(2.2 + rand() * 3.5, 2 + rand() * 5, 2.2 + rand() * 3.5)
    m.rotation.set(rand() * 3, rand() * 6, rand() * 3)
    m.castShadow = true
    m.receiveShadow = true
    root.add(m)
  }

  const crystalGeo = new THREE.ConeGeometry(0.6, 3.8, 6)
  const crystalColors = [0x69e2ff, 0xb18cff, 0xffc879]
  const crystalLights = []
  for (let i = 0; i < 16; i++) {
    const a = rand() * Math.PI * 2
    const r = 10 + rand() * 13
    const x = cx + Math.cos(a) * r, z = Math.sin(a) * r
    if (Math.hypot(x - cx, z - 14) < 10 || (Math.abs(x - cx) < 4.5 && z > -10 && z < 20)) continue
    const color = crystalColors[i % crystalColors.length]
    const mat = standardMaterial({ color, emissive: color, emissiveIntensity: 0.9, roughness: 0.25, metalness: 0.2 })
    const g = new THREE.Group()
    g.position.set(x, caveHeight(x, z), z)
    const n = 2 + Math.floor(rand() * 4)
    for (let j = 0; j < n; j++) {
      const m = new THREE.Mesh(crystalGeo, mat)
      m.position.set((rand() - 0.5) * 1.8, 1.7 + rand() * 1.4, (rand() - 0.5) * 1.8)
      m.scale.set(0.5 + rand() * 1.3, 0.7 + rand() * 1.6, 0.5 + rand() * 1.3)
      m.rotation.set((rand() - 0.5) * 0.5, rand() * 3, (rand() - 0.5) * 0.5)
      m.castShadow = true
      g.add(m)
    }
    root.add(g)
    if (r < 18) w.zoneObstacles[1].push({ x, z, r: 1.2 })
    if (i < 6) {
      const light = new THREE.PointLight(color, 5, 19, 2)
      light.position.set(x, caveHeight(x, z) + 3, z)
      root.add(light)
      crystalLights.push({ light, phase: rand() * 6, base: 5 })
    }
  }
  w.crystalLights = crystalLights

  const stalactiteMat = standardMaterial({ color: 0x364345, roughness: 1 })
  for (let i = 0; i < 28; i++) {
    const a = rand() * Math.PI * 2
    const r = 3 + rand() * 22
    const x = cx + Math.cos(a) * r, z = Math.sin(a) * r
    const h = 2 + rand() * 7
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.4 + rand() * 1.1, h, 6), stalactiteMat)
    m.position.set(x, 13 + rand() * 7 - h * 0.2, z)
    m.rotation.z = Math.PI
    m.castShadow = true
    root.add(m)
  }

  const poolGeo = new THREE.CircleGeometry(4.4, 56)
  poolGeo.rotateX(-Math.PI / 2)
  const poolMat = new THREE.MeshBasicMaterial({ color: 0x57d9d7, transparent: true, opacity: 0.24, blending: THREE.AdditiveBlending, depthWrite: false })
  for (const [px, pz] of [[cx - 9, 8], [cx + 11, -7], [cx + 4, 13]]) {
    const pool = new THREE.Mesh(poolGeo, poolMat)
    pool.position.set(px, caveHeight(px, pz) + 0.02, pz)
    pool.scale.setScalar(0.5 + rand() * 0.8)
    root.add(pool)
  }

  buildCaveParticles(w, root)
  buildLightShafts(root, new THREE.Vector3(cx, 0, 0), '#8fe9ff', 5, 78)
}

function buildCaveParticles(w, root) {
  const rand = rng(702)
  const count = w.lowQuality ? 280 : 620
  const positions = new Float32Array(count * 3)
  const phases = new Float32Array(count)
  const scales = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2
    const r = 3 + Math.sqrt(rand()) * 21
    positions[i * 3] = 400 + Math.cos(a) * r
    positions[i * 3 + 1] = 0.5 + rand() * 12
    positions[i * 3 + 2] = Math.sin(a) * r
    phases[i] = rand() * 10
    scales[i] = 0.4 + rand() * 1.4
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
  geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1))
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color('#8fe9ff') }, uSize: { value: 54 }, uOpacity: { value: 0.75 } },
    vertexShader: `
      attribute float aPhase; attribute float aScale; uniform float uTime; uniform float uSize; varying float vFade;
      void main(){
        vec3 p = position;
        p.y += sin(uTime * 0.12 + aPhase) * 0.7;
        p.x += sin(uTime * 0.09 + aPhase * 1.4) * 0.5;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aScale * uSize / max(-mv.z, 1.0);
        gl_Position = projectionMatrix * mv;
        vFade = smoothstep(48.0, 5.0, -mv.z);
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
  w.caveMotes = mat
}
