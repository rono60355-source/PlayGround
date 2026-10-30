import * as THREE from 'three'
import { COMPANIONS } from '../data.js'

export function createCompanions(w) {
  const root = new THREE.Group()
  root.name = 'Crystal Companions'
  w.scene.add(root)
  w.companions = []
  const glowTexture = w.glowTexture
  COMPANIONS.forEach((friend, index) => {
    const color = new THREE.Color(friend.color)
    const group = new THREE.Group()
    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.3, 0),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.8, roughness: 0.12, metalness: 0.28 })
    )
    core.scale.y = 1.35
    const shell = new THREE.Mesh(
      new THREE.TorusGeometry(0.52, 0.022, 5, 36),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.62, blending: THREE.AdditiveBlending, depthWrite: false })
    )
    shell.rotation.set(1.1, 0.4, 0.2)
    const orbit = new THREE.Mesh(
      new THREE.TorusGeometry(0.72, 0.012, 4, 40),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false })
    )
    orbit.rotation.x = Math.PI / 2.4
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture, color, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }))
    halo.scale.set(3.1, 3.1, 1)
    group.add(halo, core, shell, orbit)
    root.add(group)
    w.companions.push({
      def: friend,
      group,
      core,
      shell,
      orbit,
      halo,
      phase: index * 2.15,
      offset: index === 0 ? -1.35 : index === 1 ? 0 : 1.35,
    })
  })
  w.companionRoot = root
  return root
}

export function updateCompanions(w, dt, t, playerPosition) {
  if (!w.companions?.length) return
  const baseY = w.heightAt(playerPosition.x, playerPosition.z)
  w.companions.forEach((friend) => {
    const a = t * 0.38 + friend.phase
    const radius = 2.5 + Math.sin(t * 0.6 + friend.phase) * 0.28
    const targetX = playerPosition.x + Math.cos(a) * radius
    const targetZ = playerPosition.z + Math.sin(a) * radius + friend.offset * 0.42
    const targetY = baseY + 2.45 + Math.sin(t * 1.1 + friend.phase) * 0.22
    const target = friend.group.position
    target.x += (targetX - target.x) * Math.min(1, dt * 3.2)
    target.y += (targetY - target.y) * Math.min(1, dt * 3.8)
    target.z += (targetZ - target.z) * Math.min(1, dt * 3.2)
    friend.core.rotation.y += dt * 1.15
    friend.core.rotation.x += dt * 0.36
    friend.shell.rotation.z += dt * 0.8
    friend.shell.rotation.y -= dt * 0.45
    friend.orbit.rotation.z += dt * 0.55
    friend.halo.material.opacity = 0.38 + Math.sin(t * 1.7 + friend.phase) * 0.12
  })
}
