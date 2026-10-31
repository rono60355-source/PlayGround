import * as THREE from 'three'

export class Weapon {
  constructor(camera, glowTexture) {
    this.camera = camera
    this.group = new THREE.Group()
    this.base = new THREE.Vector3(0.34, -0.31, -1.02)
    this.group.scale.setScalar(0.55)
    this.group.position.copy(this.base)
    this.group.rotation.set(-0.06, -0.18, 0.08)
    this.recoil = 0
    this.flashLife = 0
    this.charges = 0

    const dark = new THREE.MeshStandardMaterial({ color: 0x1a2425, roughness: 0.34, metalness: 0.72 })
    const accent = new THREE.MeshStandardMaterial({ color: 0x7fe6ff, emissive: 0x2a9dcc, emissiveIntensity: 1.2, roughness: 0.18, metalness: 0.35 })
    const faint = new THREE.MeshBasicMaterial({ color: 0x7fe6ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })

    const housing = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.042, 10, 36, Math.PI * 1.45), dark)
    housing.rotation.set(0.6, 0.2, -0.35)
    this.group.add(housing)
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.045, 0.31, 8), dark)
    stem.position.set(-0.03, -0.14, 0.05)
    stem.rotation.z = 0.32
    this.group.add(stem)
    const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, 0.08, 8), dark)
    socket.position.set(0.0, -0.02, 0.02)
    this.group.add(socket)

    this.core = new THREE.Mesh(new THREE.OctahedronGeometry(0.095, 1), accent)
    this.core.position.set(0.01, 0.015, -0.02)
    this.core.scale.y = 1.6
    this.group.add(this.core)
    this.cage = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 1), new THREE.MeshBasicMaterial({ color: 0x7fe6ff, wireframe: true, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }))
    this.cage.position.copy(this.core.position)
    this.group.add(this.cage)
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.006, 5, 44), faint)
    this.ring.position.copy(this.core.position)
    this.ring.rotation.x = 1.2
    this.group.add(this.ring)
    this.ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.005, 5, 36), faint)
    this.ring2.position.copy(this.core.position)
    this.ring2.rotation.set(0.8, 0.6, 0.2)
    this.group.add(this.ring2)

    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2
      const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(0.03, 0), accent)
      shard.position.set(Math.cos(a) * 0.22, Math.sin(a) * 0.07, Math.sin(a) * 0.22)
      shard.userData.angle = a
      this.group.add(shard)
      if (!this.shards) this.shards = []
      this.shards.push(shard)
    }

    this.light = new THREE.PointLight(0x7fe6ff, 0.7, 2.6, 2)
    this.light.position.set(0, 0.05, 0.1)
    this.group.add(this.light)

    this.muzzle = new THREE.Object3D()
    this.muzzle.position.set(0.01, 0.02, -0.17)
    this.group.add(this.muzzle)

    this.flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color: 0xd6f7ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }))
    this.flash.position.set(0.01, 0.02, -0.24)
    this.flash.scale.set(0.9, 0.9, 1)
    this.group.add(this.flash)
    this.glowTexture = glowTexture

    camera.add(this.group)
  }

  setCharges(charges) {
    this.charges = charges
  }

  fire() {
    this.recoil = Math.min(1, this.recoil + 0.72)
    this.flashLife = 0.11
    this.flash.material.opacity = 0.95
    this.flash.scale.set(1.4, 1.4, 1)
  }

  dormantPulse() {
    this.recoil = Math.min(0.5, this.recoil + 0.2)
  }

  update(dt, time, moving, lookDelta) {
    this.recoil = Math.max(0, this.recoil - dt * 5.4)
    const bob = moving ? Math.sin(time * 8.2) * 0.011 : Math.sin(time * 1.7) * 0.003
    const swayX = Math.sin(time * 4.1) * 0.006
    const lookX = THREE.MathUtils.clamp((lookDelta?.x || 0) * -0.0011, -0.024, 0.024)
    const lookY = THREE.MathUtils.clamp((lookDelta?.y || 0) * 0.0011, -0.02, 0.02)
    const baseX = this.camera.aspect < 0.9 ? 0.2 : this.base.x
    this.group.position.x = baseX + swayX + lookX
    this.group.position.y = this.base.y + bob + lookY - this.recoil * 0.03
    this.group.position.z = this.base.z + this.recoil * 0.09
    this.group.rotation.x = -0.06 + this.recoil * 0.18
    this.group.rotation.z = 0.08 + Math.sin(time * 2.3) * 0.012
    this.core.rotation.y += dt * 0.9
    this.core.rotation.x += dt * 0.35
    this.cage.rotation.y -= dt * 0.4
    this.cage.rotation.z += dt * 0.18
    this.ring.rotation.z += dt * 0.5
    this.ring2.rotation.y -= dt * 0.65
    for (const shard of this.shards) {
      shard.userData.angle += dt * 0.5
      const a = shard.userData.angle
      shard.position.x = Math.cos(a) * 0.22
      shard.position.z = Math.sin(a) * 0.22
      shard.position.y = Math.sin(a * 1.7) * 0.07
    }
    const active = this.charges > 0
    const pulse = active ? 1.2 + Math.sin(time * 2.2) * 0.24 : 0.26 + Math.sin(time * 1.1) * 0.06
    this.core.material.emissiveIntensity = pulse + this.recoil * 1.6
    this.cage.material.opacity = active ? 0.34 : 0.13
    this.ring.material.opacity = active ? 0.5 : 0.14
    this.ring2.material.opacity = active ? 0.44 : 0.12
    this.light.intensity = active ? 0.65 + this.recoil * 2.4 : 0.16
    if (this.flashLife > 0) {
      this.flashLife -= dt
      this.flash.material.opacity = Math.max(0, this.flashLife / 0.11) * 0.95
      this.flash.scale.setScalar(0.9 + (1 - this.flashLife / 0.11) * 1.5)
    } else {
      this.flash.material.opacity = 0
    }
  }
}
