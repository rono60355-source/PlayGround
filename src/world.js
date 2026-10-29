import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { ZONES } from './data.js'
import { SkyShader, GradeShader } from './world/shaders.js'
import {
  MONSTER_SPEED, ORBIT_RADIUS, clamp, zoneHeight, forestHeight, caveHeight, archiveHeight,
  rng, makeGlowTexture, smoothstep,
} from './world/util.js'
import { buildForest } from './world/forest.js'
import { buildCave } from './world/cave.js'
import { buildArchive } from './world/archive.js'
import { createObelisk, createWaygate, spawnMonsters } from './world/props.js'

const UP = new THREE.Vector3(0, 1, 0)
const ZONE_CENTERS = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(400, 0, 0), new THREE.Vector3(800, 68, 0)]

export class World {
  constructor(canvas, options = {}) {
    this.canvas = canvas
    this.isMobile = options.isMobile || false
    this.lowQuality = options.lowQuality || false
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(66, window.innerWidth / window.innerHeight, 0.08, 1600)
    this.camera.position.set(0, 2.4, 18)
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !this.lowQuality, powerPreference: 'high-performance', alpha: false })
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.04
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    const maxDpr = this.isMobile ? 1.5 : 2
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr))
    this.renderer.setSize(window.innerWidth, window.innerHeight, false)

    this.time = 0
    this.zoneIndex = 0
    this.zoneRoots = []
    this.zoneObelisks = []
    this.zoneGates = []
    this.zoneSpawns = []
    this.zoneObstacles = []
    this.zoneEnv = []
    this.monsters = []
    this.activeMonsters = []
    this.beams = []
    this.bursts = []
    this.grassShaders = []
    this.floaters = []
    this.archiveFloaters = []
    this.archiveRings = []
    this.crystalLights = []
    this.fireflies = []
    this.boundaryRadius = 66
    this.raycaster = new THREE.Raycaster()
    this.glowTexture = makeGlowTexture()
    this.completedCount = 0
    this.unlockedMax = 0

    this.scene.fog = new THREE.FogExp2(0x5c887f, 0.0058)
    this.scene.background = new THREE.Color('#081013')

    this._buildSky()
    this._buildSkyBodies()
    this._buildLights()
    buildForest(this)
    buildCave(this)
    buildArchive(this)
    this._buildClouds()
    this._buildZonesShared()
    this._buildComposer()
    this.setZone(0, true)
    this.resize()
  }

  _buildSky() {
    this.skyGroup = new THREE.Group()
    this.skyMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(SkyShader.uniforms),
      vertexShader: SkyShader.vertexShader,
      fragmentShader: SkyShader.fragmentShader,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    })
    this.skyMesh = new THREE.Mesh(new THREE.SphereGeometry(620, 64, 40), this.skyMaterial)
    this.skyMesh.renderOrder = -1000
    this.skyGroup.add(this.skyMesh)
    this.scene.add(this.skyGroup)
  }

  _buildSkyBodies() {
    const planet = new THREE.Group()
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(30, 32, 24),
      new THREE.MeshBasicMaterial({ color: 0x89aeb4, transparent: true, opacity: 0.2, fog: false, depthWrite: false })
    )
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTexture, color: 0x9fd6ce, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }))
    halo.scale.set(110, 110, 1)
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(42, 64, 96),
      new THREE.MeshBasicMaterial({ color: 0xe7dcc0, transparent: true, opacity: 0.13, side: THREE.DoubleSide, fog: false, depthWrite: false })
    )
    ring.rotation.x = Math.PI * 0.46
    ring.rotation.z = 0.2
    planet.add(body, halo, ring)
    planet.position.set(250, 195, -440)
    planet.rotation.z = 0.18
    planet.renderOrder = -900
    this.skyGroup.add(planet)
    this.skyBodies = planet
  }

  _buildLights() {
    this.hemi = new THREE.HemisphereLight(0x8ed8c9, 0x1d2b20, 0.72)
    this.scene.add(this.hemi)
    this.sun = new THREE.DirectionalLight(0xffdda0, 2.0)
    this.sun.castShadow = true
    const shadowSize = this.lowQuality ? 1024 : 2048
    this.sun.shadow.mapSize.set(shadowSize, shadowSize)
    this.sun.shadow.camera.near = 0.5
    this.sun.shadow.camera.far = 260
    this.sun.shadow.camera.left = -74
    this.sun.shadow.camera.right = 74
    this.sun.shadow.camera.top = 74
    this.sun.shadow.camera.bottom = -74
    this.sun.shadow.bias = -0.0006
    this.sun.shadow.normalBias = 0.04
    this.scene.add(this.sun)
    this.sunTarget = new THREE.Object3D()
    this.scene.add(this.sunTarget)
    this.sun.target = this.sunTarget
    this.fill = new THREE.DirectionalLight(0x7ea9c8, 0.35)
    this.fill.position.set(-40, 30, 60)
    this.scene.add(this.fill)
  }

  _buildClouds() {
    const c = document.createElement('canvas')
    c.width = c.height = 512
    const ctx = c.getContext('2d')
    ctx.clearRect(0, 0, 512, 512)
    const rand = rng(444)
    for (let i = 0; i < 380; i++) {
      const x = rand() * 512, y = rand() * 512
      const r = 18 + rand() * 66
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, `rgba(255,244,218,${0.03 + rand() * 0.06})`)
      g.addColorStop(1, 'rgba(255,244,218,0)')
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
    }
    const tex = new THREE.CanvasTexture(c)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.colorSpace = THREE.SRGBColorSpace
    tex.repeat.set(2, 2)
    this.cloudLayers = []
    for (let i = 0; i < 3; i++) {
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.36 - i * 0.07, depthWrite: false, side: THREE.DoubleSide, color: 0xffe9c7, fog: false, blending: THREE.AdditiveBlending })
      const m = new THREE.Mesh(new THREE.PlaneGeometry(760, 760), mat)
      m.rotation.x = -Math.PI / 2
      m.position.set(800, 42 + i * 7, 0)
      m.renderOrder = -100
      this.scene.add(m)
      this.cloudLayers.push({ mesh: m, mat, speed: 0.001 + i * 0.0006 })
    }
  }

  _buildZonesShared() {
    this.zoneSpawns = [
      new THREE.Vector3(0, 0, 18),
      new THREE.Vector3(400, 0, 14),
      new THREE.Vector3(800, 0, 13),
    ]
    const obeliskPositions = [
      new THREE.Vector3(0, 0, -12),
      new THREE.Vector3(400, 0, -4),
      new THREE.Vector3(800, 0, -4),
    ]
    const gatePositions = [
      new THREE.Vector3(18, 0, -22),
      new THREE.Vector3(412, 0, 12),
      new THREE.Vector3(812, 0, 12),
    ]
    for (let i = 0; i < 3; i++) {
      const root = this.zoneRoots[i]
      const obelisk = createObelisk(this, ZONES[i], obeliskPositions[i], i)
      root.add(obelisk)
      this.zoneObelisks[i] = obelisk
      const gate = createWaygate(this, ZONES[i], gatePositions[i], i)
      root.add(gate)
      this.zoneGates[i] = gate
      this.zoneObstacles[i] = this.zoneObstacles[i] || []
      this.zoneObstacles[i].push({ x: obeliskPositions[i].x, z: obeliskPositions[i].z, r: 1.25 })
      this.zoneObstacles[i].push({ x: gatePositions[i].x, z: gatePositions[i].z, r: 1.9 })
      spawnMonsters(this, i, root)
    }
    this._buildZoneEnv()
  }

  _buildZoneEnv() {
    this.zoneEnv = [
      {
        top: new THREE.Color('#12333d'), horizon: new THREE.Color('#ddbb86'), sun: new THREE.Color('#ffe8bc'),
        fog: new THREE.Color('#5c887f'), fogDensity: 0.0058, hemiSky: new THREE.Color('#8ed8c9'), hemiGround: new THREE.Color('#1d2b20'),
        hemiIntensity: 0.72, sunColor: new THREE.Color('#ffdda0'), sunIntensity: 2.0, exposure: 0.9, stars: 0.12,
        sunPos: new THREE.Vector3(58, 72, 24), sunDir: new THREE.Vector3(0.5, 0.45, -0.6),
      },
      {
        top: new THREE.Color('#01070b'), horizon: new THREE.Color('#0b2a33'), sun: new THREE.Color('#8fe9ff'),
        fog: new THREE.Color('#061416'), fogDensity: 0.016, hemiSky: new THREE.Color('#4ba5b5'), hemiGround: new THREE.Color('#061012'),
        hemiIntensity: 0.38, sunColor: new THREE.Color('#7fc7d6'), sunIntensity: 0.4, exposure: 1.02, stars: 0.02,
        sunPos: new THREE.Vector3(40, 60, 20), sunDir: new THREE.Vector3(0.2, 0.7, -0.4),
      },
      {
        top: new THREE.Color('#101d3a'), horizon: new THREE.Color('#f2c17d'), sun: new THREE.Color('#ffe4b0'),
        fog: new THREE.Color('#b09f80'), fogDensity: 0.004, hemiSky: new THREE.Color('#ffdfb0'), hemiGround: new THREE.Color('#3e392c'),
        hemiIntensity: 0.9, sunColor: new THREE.Color('#ffd7a0'), sunIntensity: 2.4, exposure: 0.94, stars: 0.4,
        sunPos: new THREE.Vector3(44, 76, 18), sunDir: new THREE.Vector3(0.4, 0.5, -0.55),
      },
    ]
    this.env = { ...this.zoneEnv[0] }
    this.env.fog = this.zoneEnv[0].fog.clone()
    this.env.top = this.zoneEnv[0].top.clone()
    this.env.horizon = this.zoneEnv[0].horizon.clone()
    this.env.sun = this.zoneEnv[0].sun.clone()
    this.env.hemiSky = this.zoneEnv[0].hemiSky.clone()
    this.env.hemiGround = this.zoneEnv[0].hemiGround.clone()
    this.env.sunColor = this.zoneEnv[0].sunColor.clone()
    this._applyEnv()
  }

  _applyEnv() {
    const e = this.env
    this.scene.fog.color.copy(e.fog)
    this.scene.fog.density = e.fogDensity
    this.scene.background.copy(e.fog)
    this.skyMaterial.uniforms.uTop.value.copy(e.top)
    this.skyMaterial.uniforms.uHorizon.value.copy(e.horizon)
    this.skyMaterial.uniforms.uSunColor.value.copy(e.sun)
    this.skyMaterial.uniforms.uSunDir.value.copy(e.sunDir).normalize()
    this.skyMaterial.uniforms.uStars.value = e.stars
    this.hemi.color.copy(e.hemiSky)
    this.hemi.groundColor.copy(e.hemiGround)
    this.hemi.intensity = e.hemiIntensity
    this.sun.color.copy(e.sunColor)
    this.sun.intensity = e.sunIntensity
    this.fill.intensity = e.sunIntensity * 0.14
    this.renderer.toneMappingExposure = e.exposure
  }

  _buildComposer() {
    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), this.lowQuality ? 0.32 : 0.44, 0.58, 0.9)
    this.composer.addPass(this.bloom)
    this.gradePass = new ShaderPass(GradeShader)
    this.composer.addPass(this.gradePass)
    this.composer.addPass(new OutputPass())
  }

  setZone(index, instant = false) {
    this.zoneIndex = index
    for (let i = 0; i < 3; i++) this.zoneRoots[i].visible = i === index
    this.cloudLayers.forEach((layer) => { layer.mesh.visible = index === 2 })
    this.activeMonsters = this.monsters.filter((m) => m.zone === index)
    this.boundaryRadius = index === 0 ? 66 : index === 1 ? 25 : 28
    const target = this.zoneEnv[index]
    this.env = {
      ...target,
      fog: target.fog.clone(), top: target.top.clone(), horizon: target.horizon.clone(), sun: target.sun.clone(),
      hemiSky: target.hemiSky.clone(), hemiGround: target.hemiGround.clone(), sunColor: target.sunColor.clone(),
      sunDir: target.sunDir.clone(),
    }
    this._applyEnv()
  }

  heightAt(x, z) {
    return zoneHeight(this.zoneIndex, x, z)
  }

  getSpawn(index = this.zoneIndex) {
    const base = this.zoneSpawns[index]
    return new THREE.Vector3(base.x, zoneHeight(index, base.x, base.z) + 1.72, base.z)
  }

  getZoneCenter(index = this.zoneIndex) {
    return ZONE_CENTERS[index]
  }

  getObeliskPosition(index = this.zoneIndex) {
    return this.zoneObelisks[index].userData.position
  }

  getGatePosition(index = this.zoneIndex) {
    return this.zoneGates[index].userData.position
  }

  getNearestInteractable(playerPosition) {
    const items = []
    const ob = this.zoneObelisks[this.zoneIndex]
    if (ob && !ob.userData.completed) {
      items.push({ type: 'obelisk', label: 'Attune the Beacon', position: ob.userData.position, distance: ob.userData.position.distanceTo(playerPosition) })
    }
    const gate = this.zoneGates[this.zoneIndex]
    if (gate) {
      items.push({ type: 'gate', label: 'Open Waygate Map', position: gate.userData.position, distance: gate.userData.position.distanceTo(playerPosition) })
    }
    items.sort((a, b) => a.distance - b.distance)
    return items[0] && items[0].distance < 6.2 && Math.abs(items[0].position.y - playerPosition.y) < 6 ? items[0] : null
  }

  setProgress(completedCount, unlockedMax) {
    this.completedCount = completedCount
    this.unlockedMax = unlockedMax
    for (let i = 0; i < 3; i++) {
      const ob = this.zoneObelisks[i]
      const done = i < completedCount
      ob.userData.completed = done
      ob.userData.beamMat.uniforms.uOpacity.value = done ? 0.3 : 1
      ob.userData.light.intensity = done ? 3 : 6
      ob.userData.cage.material.opacity = done ? 0.5 : 0.28
      ob.userData.crystal.material.emissiveIntensity = done ? 1.8 : 1.25
      const gate = this.zoneGates[i]
      const open = unlockedMax >= Math.max(1, i)
      gate.userData.locked = !open
      gate.userData.portalMat.uniforms.uOpen.value = open ? 0.92 : 0.18
    }
  }

  buildAimRaycaster(x = 0, y = 0) {
    this.raycaster.setFromCamera({ x, y }, this.camera)
    return this.raycaster
  }

  getAimedMonster() {
    const hits = []
    for (const m of this.activeMonsters) {
      if (!m.alive || !m.group.visible) continue
      const hit = this.raycaster.intersectObject(m.hit, false)
      if (hit.length) hits.push({ monster: m, distance: hit[0].distance })
    }
    hits.sort((a, b) => a.distance - b.distance)
    return hits[0]?.monster || null
  }

  shatterMonster(monster) {
    if (!monster || !monster.alive) return
    monster.alive = false
    monster.respawn = 18
    monster.group.visible = false
    const p = monster.group.position.clone()
    this.spawnBurst(p, monster.color, 46)
  }

  spawnBeam(from, to, color) {
    const dir = to.clone().sub(from)
    const distance = dir.length()
    if (distance < 0.01) return
    const geo = new THREE.CylinderGeometry(0.026, 0.055, 1, 7, 1, true)
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.copy(from).add(to).multiplyScalar(0.5)
    mesh.quaternion.setFromUnitVectors(UP, dir.normalize())
    mesh.scale.y = distance
    mesh.renderOrder = 5
    this.scene.add(mesh)
    this.beams.push({ mesh, mat, life: 0.18, maxLife: 0.18 })
    const spark = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTexture, color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }))
    spark.position.copy(to)
    spark.scale.set(1.6, 1.6, 1)
    this.scene.add(spark)
    this.beams.push({ mesh: spark, mat: spark.material, life: 0.25, maxLife: 0.25, isSprite: true })
  }

  spawnBurst(position, color, count = 30) {
    const positions = new Float32Array(count * 3)
    const velocities = []
    const rand = rng(Math.floor(this.time * 1000) + count + position.x * 7)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x
      positions[i * 3 + 1] = position.y
      positions[i * 3 + 2] = position.z
      const a = rand() * Math.PI * 2
      const up = (rand() - 0.2) * 1.8
      const speed = 2 + rand() * 7
      velocities.push(new THREE.Vector3(Math.cos(a) * speed, up * speed * 0.6, Math.sin(a) * speed))
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const mat = new THREE.PointsMaterial({ color, map: this.glowTexture, size: 0.34, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, fog: false })
    const points = new THREE.Points(geo, mat)
    points.frustumCulled = false
    this.scene.add(points)
    this.bursts.push({ points, mat, velocities, life: 1.25, maxLife: 1.25 })
  }

  resize() {
    const width = window.innerWidth
    const height = window.innerHeight
    this.camera.aspect = width / height
    this.camera.fov = this.camera.aspect < 0.8 ? 72 : 66
    this.camera.updateProjectionMatrix()
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.isMobile ? 1.5 : 2))
    this.renderer.setSize(width, height, false)
    this.composer.setSize(width, height)
  }

  update(dt, camera, playerPosition) {
    this.time += dt
    const t = this.time
    this.skyGroup.position.copy(camera.position)
    this.skyMaterial.uniforms.uTime.value = t
    if (this.waterMaterial) this.waterMaterial.uniforms.uTime.value = t
    for (const shader of this.grassShaders) shader.uniforms.uTime.value = t
    if (this.forestMotes) this.forestMotes.uniforms.uTime.value = t
    if (this.caveMotes) this.caveMotes.uniforms.uTime.value = t
    if (this.archiveMotes) this.archiveMotes.uniforms.uTime.value = t

    this.fireflies.forEach((f) => {
      f.sprite.position.x = f.base.x + Math.sin(t * 0.33 + f.phase) * 0.7
      f.sprite.position.y = f.base.y + Math.sin(t * 0.5 + f.phase * 1.4) * 0.45
      f.sprite.position.z = f.base.z + Math.cos(t * 0.28 + f.phase) * 0.7
      f.sprite.material.opacity = 0.55 + Math.sin(t * 1.4 + f.phase) * 0.25
    })
    if (this.heroLight) this.heroLight.intensity = 12 + Math.sin(t * 0.8) * 2
    this.crystalLights.forEach((c) => { c.light.intensity = c.base + Math.sin(t * 1.1 + c.phase) * 2.2 })
    this.archiveRings.forEach((r) => {
      r.mesh.rotation.z += dt * r.speed
      r.mesh.rotation.y += dt * r.speed * 0.4
    })
    this.archiveFloaters.forEach((f) => {
      f.mesh.position.y = f.base.y + Math.sin(t * 0.45 + f.phase) * 0.65
      f.mesh.rotation.y += dt * 0.08
    })
    this.cloudLayers.forEach((c, i) => {
      if (c.mat.map) {
        c.mat.map.offset.x = t * c.speed
        c.mat.map.offset.y = t * c.speed * 0.3
      }
    })

    const ob = this.zoneObelisks[this.zoneIndex]
    if (ob) {
      ob.userData.ring.rotation.z += dt * 0.24
      ob.userData.ring2.rotation.z -= dt * 0.36
      ob.userData.cage.rotation.y += dt * 0.2
      ob.userData.crystal.position.y = 6.35 + Math.sin(t * 1.2) * 0.12
      ob.userData.rune.material.rotation += dt * 0.05
      ob.userData.beamMat.uniforms.uTime.value = t
      ob.userData.light.intensity = (ob.userData.completed ? 3 : 6) + Math.sin(t * 1.6) * 0.7
    }
    const gate = this.zoneGates[this.zoneIndex]
    if (gate) {
      gate.userData.portalMat.uniforms.uTime.value = t
      gate.userData.portalMat.uniforms.uOpen.value += ((gate.userData.locked ? 0.18 : 0.95) - gate.userData.portalMat.uniforms.uOpen.value) * Math.min(1, dt * 2.5)
    }

    const speed = MONSTER_SPEED / ORBIT_RADIUS
    for (const m of this.activeMonsters) {
      if (!m.alive) {
        m.respawn -= dt
        if (m.respawn <= 0) {
          m.alive = true
          m.group.visible = true
          m.scale = 0.01
          m.group.position.set(m.anchor.x + Math.cos(m.angle) * ORBIT_RADIUS, m.baseY + 2.2, m.anchor.y + Math.sin(m.angle) * ORBIT_RADIUS)
          this.spawnBurst(m.group.position.clone(), m.color, 18)
        }
        continue
      }
      m.angle += dt * speed
      m.group.position.x = m.anchor.x + Math.cos(m.angle) * ORBIT_RADIUS
      m.group.position.z = m.anchor.y + Math.sin(m.angle) * ORBIT_RADIUS
      m.group.position.y = m.baseY + 2.15 + Math.sin(t * 0.9 + m.phase) * 0.32
      m.core.rotation.y += dt * 0.8
      m.core.rotation.x += dt * 0.35
      m.shell.rotation.y -= dt * 0.45
      m.shell.rotation.z += dt * 0.2
      m.shards.rotation.y += dt * 0.55
      m.shards.rotation.x = Math.sin(t * 0.6 + m.phase) * 0.3
      m.scale += (1 - m.scale) * Math.min(1, dt * 3)
      m.group.scale.setScalar(m.scale)
      m.glow.material.opacity = 0.13 + Math.sin(t * 1.6 + m.phase) * 0.045
      if (m.hitFlash > 0) {
        m.hitFlash -= dt
        m.core.material.emissiveIntensity = 1.25 + m.hitFlash * 7
      } else {
        m.core.material.emissiveIntensity = 1.25 + Math.sin(t * 2 + m.phase) * 0.2
      }
    }

    const env = this.env
    const baseY = this.zoneIndex === 2 ? 68 : 0
    this.sun.position.set(playerPosition.x + env.sunPos.x, baseY + env.sunPos.y, playerPosition.z + env.sunPos.z)
    this.sunTarget.position.set(playerPosition.x, playerPosition.y - 1.5, playerPosition.z)
    this.sunTarget.updateMatrixWorld()
    this.fill.position.set(camera.position.x - 40, camera.position.y + 28, camera.position.z + 60)
    this.gradePass.uniforms.uTime.value = t

    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i]
      b.life -= dt
      b.mat.opacity = Math.max(0, b.life / b.maxLife)
      if (!b.isSprite) b.mesh.scale.x = b.mesh.scale.z = 1 + (1 - b.life / b.maxLife) * 2.5
      if (b.life <= 0) {
        this.scene.remove(b.mesh)
        b.mesh.geometry?.dispose?.()
        b.mat.dispose?.()
        this.beams.splice(i, 1)
      }
    }
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i]
      b.life -= dt
      const pos = b.points.geometry.attributes.position
      for (let j = 0; j < b.velocities.length; j++) {
        const v = b.velocities[j]
        v.y -= dt * 4.5
        pos.setXYZ(j, pos.getX(j) + v.x * dt, pos.getY(j) + v.y * dt, pos.getZ(j) + v.z * dt)
        v.multiplyScalar(1 - dt * 1.4)
      }
      pos.needsUpdate = true
      b.mat.opacity = Math.max(0, b.life / b.maxLife)
      if (b.life <= 0) {
        this.scene.remove(b.points)
        b.points.geometry.dispose()
        b.mat.dispose()
        this.bursts.splice(i, 1)
      }
    }
  }

  render() {
    this.composer.render()
  }
}
