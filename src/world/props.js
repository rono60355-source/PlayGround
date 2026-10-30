import * as THREE from 'three'
import { ZONES } from '../data.js'
import {
  zoneHeight, makeStoneTexture, makeRuneTexture, standardMaterial, beamMaterial, rng, MONSTER_SPEED,
} from './util.js'
import { PortalShader } from './shaders.js'

export function createObelisk(w, zone, position, index) {
  const group = new THREE.Group()
  const worldY = zoneHeight(index, position.x, position.z)
  group.position.set(position.x, worldY, position.z)
  group.userData.zone = index
  const stoneTex = makeStoneTexture(index === 1)
  stoneTex.repeat.set(1, 2)
  const stone = standardMaterial({ map: stoneTex, color: index === 2 ? 0xa8c2df : 0x7e8fab, roughness: 0.9 })
  const accent = new THREE.Color(zone.accent)
  const glow = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })
  const crystalMat = standardMaterial({ color: accent, emissive: accent, emissiveIntensity: 1.25, roughness: 0.2, metalness: 0.1 })

  for (let i = 0; i < 3; i++) {
    const tier = new THREE.Mesh(new THREE.CylinderGeometry(2.5 - i * 0.55, 2.85 - i * 0.55, 0.55, 6), stone)
    tier.position.y = 0.27 + i * 0.5
    tier.rotation.y = (i % 2) * 0.12
    tier.castShadow = true
    tier.receiveShadow = true
    group.add(tier)
  }

  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.86, 4.8, 6, 5), stone)
  core.position.y = 3.2
  core.castShadow = true
  group.add(core)

  for (let i = 0; i < 3; i++) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.045, 6, 6), glow)
    band.rotation.x = Math.PI / 2
    band.position.y = 1.8 + i * 1.2
    group.add(band)
  }

  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.8, 1), crystalMat)
  crystal.position.y = 6.35
  crystal.scale.y = 1.5
  crystal.castShadow = true
  group.add(crystal)
  const cage = new THREE.Mesh(new THREE.IcosahedronGeometry(1.45, 1), new THREE.MeshBasicMaterial({ color: accent, wireframe: true, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }))
  cage.position.y = 6.35
  group.add(cage)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.025, 5, 54), glow)
  ring.position.y = 6.35
  ring.rotation.x = Math.PI / 2.3
  group.add(ring)
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.018, 5, 48), glow)
  ring2.position.y = 6.35
  ring2.rotation.x = Math.PI / 2
  ring2.rotation.y = 0.7
  group.add(ring2)

  const rune = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeRuneTexture(zone.glyph, zone.accent), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }))
  rune.position.y = 6.4
  rune.scale.set(4.4, 4.4, 1)
  group.add(rune)

  const shader = beamMaterial(zone.accent)
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 1.1, 46, 16, 1, true), shader)
  beam.position.y = 29
  beam.renderOrder = 3
  group.add(beam)

  const light = new THREE.PointLight(accent, 6, 18, 2)
  light.position.y = 6.2
  group.add(light)

  group.userData.ring = ring
  group.userData.ring2 = ring2
  group.userData.crystal = crystal
  group.userData.cage = cage
  group.userData.rune = rune
  group.userData.beam = beam
  group.userData.beamMat = shader
  group.userData.light = light
  group.userData.index = index
  group.userData.completed = false
  group.userData.position = new THREE.Vector3(position.x, worldY + 2, position.z)
  return group
}

export function createWaygate(w, zone, position, index) {
  const group = new THREE.Group()
  const worldY = zoneHeight(index, position.x, position.z)
  group.position.set(position.x, worldY, position.z)
  group.userData.zone = index
  const stoneTex = makeStoneTexture(index === 1)
  const stone = standardMaterial({ map: stoneTex, color: index === 2 ? 0xa9c5e5 : 0x788ba6, roughness: 0.92 })
  const gold = new THREE.MeshBasicMaterial({ color: zone.accent, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })

  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.1, 6.8, 1.1, 2, 5, 2), stone)
    p.position.set(s * 3.4, 3.4, 0)
    p.rotation.z = s * 0.045
    p.castShadow = true
    p.receiveShadow = true
    group.add(p)
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.6, 1.7), stone)
    base.position.set(s * 3.4, 0.3, 0)
    base.castShadow = true
    group.add(base)
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(9.1, 0.9, 1.4), stone)
  lintel.position.y = 6.8
  lintel.castShadow = true
  group.add(lintel)
  const arch = new THREE.Mesh(new THREE.TorusGeometry(4.5, 0.35, 8, 34, Math.PI), stone)
  arch.position.y = 6.35
  group.add(arch)
  const keystone = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 1), gold)
  keystone.position.y = 11.3
  group.add(keystone)
  for (let i = 0; i < 3; i++) {
    const rune = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeRuneTexture('◇', zone.accent), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }))
    rune.position.set(-3.4, 2.4 + i * 1.7, 0.62)
    rune.scale.set(1.1, 1.1, 1)
    group.add(rune)
  }
  const portalUniforms = THREE.UniformsUtils.clone(PortalShader.uniforms)
  portalUniforms.uColorA.value = new THREE.Color(zone.accent)
  portalUniforms.uColorB.value = new THREE.Color(index === 2 ? '#a8c8ff' : '#d8f4ff')
  const portalMat = new THREE.ShaderMaterial({
    uniforms: portalUniforms,
    vertexShader: PortalShader.vertexShader,
    fragmentShader: PortalShader.fragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const portal = new THREE.Mesh(new THREE.CircleGeometry(3.25, 64), portalMat)
  portal.position.y = 4.25
  portal.position.z = 0.05
  group.add(portal)
  const light = new THREE.PointLight(zone.accent, 4, 14, 2)
  light.position.y = 4.5
  group.add(light)
  group.userData.portalMat = portalMat
  group.userData.portal = portal
  group.userData.index = index
  group.userData.position = new THREE.Vector3(position.x, worldY + 1, position.z)
  group.userData.locked = true
  return group
}

export function spawnMonsters(w, zoneIndex, root) {
  const positions = {
    0: [[12, -9], [-15, 4], [19, 19], [-21, 27], [11, 35]],
    1: [[410, 2], [388, -3], [412, -6], [387, 6]],
    2: [[812, -3], [788, -2], [810, 18], [790, 20]],
  }[zoneIndex]
  const colors = zoneIndex === 0
    ? ['#7fd8ff', '#b6a8ff', '#8fe8ff']
    : zoneIndex === 1 ? ['#79dcff', '#b18cff', '#7fe0d0'] : ['#b9d8ff', '#8fc8ff', '#d8f0ff']
  positions.forEach(([x, z], i) => {
    const group = new THREE.Group()
    const baseY = zoneHeight(zoneIndex, x, z)
    group.position.set(x, baseY + 2.2, z)
    const color = colors[i % colors.length]
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.78, 1), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.25, roughness: 0.12, metalness: 0.3 }))
    core.scale.y = 1.35
    const shell = new THREE.Group()
    const bandMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.52, blending: THREE.AdditiveBlending, depthWrite: false })
    for (let j = 0; j < 3; j++) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(1.05 + j * 0.16, 0.018, 5, 64), bandMat)
      band.rotation.set(1.1 + j * 0.28, j * 0.7, j * 0.45)
      shell.add(band)
    }
    const shards = new THREE.Group()
    for (let j = 0; j < 4; j++) {
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.16 + j * 0.025, 0), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }))
      const a = (j / 4) * Math.PI * 2
      shard.position.set(Math.cos(a) * 1.75, Math.sin(a * 1.7) * 0.35, Math.sin(a) * 1.75)
      shards.add(shard)
    }
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: w.glowTexture, color, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false }))
    glow.scale.set(3.2, 3.2, 1)
    const hit = new THREE.Mesh(new THREE.SphereGeometry(2.1, 10, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }))
    hit.userData.isMonsterHit = true
    group.add(glow, core, shell, shards, hit)
    root.add(group)
    const monster = {
      group, core, shell, shards, hit, glow, color: new THREE.Color(color),
      anchor: new THREE.Vector2(x, z), angle: (i / positions.length) * Math.PI * 2,
      phase: i * 1.7, baseY, alive: true, respawn: 0, scale: 1, zone: zoneIndex,
      hitFlash: 0, shatterTimer: 0,
    }
    hit.userData.monsterRef = monster
    w.monsters.push(monster)
  })
}
