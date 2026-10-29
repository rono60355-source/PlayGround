import * as THREE from 'three'
import { World } from './world.js'
import { Weapon } from './weapon.js'
import { UI } from './ui.js'
import { ZONES, SUBJECTS, buildTrialQuestions, matchTopic } from './data.js'

const SAVE_KEY = 'lumenfall.save.v1'
const UP = new THREE.Vector3(0, 1, 0)

function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function previousDayKey() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return dayKey(d)
}
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)) }

function loadSave() {
  const today = dayKey()
  let prev = null
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (raw) prev = JSON.parse(raw)
  } catch { prev = null }
  if (prev && prev.day === today) {
    return {
      day: today,
      subject: prev.subject || null,
      focus: prev.focus || '',
      completed: Number(prev.completed) || 0,
      charges: Number(prev.charges) || 0,
      unlockedMax: Number(prev.unlockedMax) || 0,
      zone: Number(prev.zone) || 0,
      streak: Number(prev.streak) || 0,
      totalRites: Number(prev.totalRites) || 0,
      echoes: Number(prev.echoes) || 0,
    }
  }
  const streak = prev && prev.day === previousDayKey() && Number(prev.completed) >= 3
    ? (Number(prev.streak) || 0) + 1
    : 0
  return {
    day: today,
    subject: null,
    focus: '',
    completed: 0,
    charges: 0,
    unlockedMax: 0,
    zone: 0,
    streak,
    totalRites: Number(prev?.totalRites) || 0,
    echoes: 0,
  }
}

export class Game {
  constructor(canvas) {
    this.canvas = canvas
    this.isMobile = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0
    this.lowQuality = this.isMobile
    this.save = loadSave()
    this.world = new World(canvas, { isMobile: this.isMobile, lowQuality: this.lowQuality })
    this.world.scene.add(this.world.camera)
    this.ui = new UI()
    this.ui.setTouchVisible(this.isMobile)
    this.weapon = new Weapon(this.world.camera, this.world.glowTexture)
    this.weapon.setCharges(this.save.charges)

    this.state = 'intro'
    this.elapsed = 0
    this.clock = new THREE.Clock()
    this.player = {
      position: new THREE.Vector3(0, 0, 18),
      yaw: 0,
      pitch: 0.025,
      velocity: new THREE.Vector3(),
      moving: false,
    }
    this.eyeHeight = 1.72
    this.bob = 0
    this.keys = new Set()
    this.joystick = { active: false, pointerId: null, x: 0, y: 0, centerX: 0, centerY: 0 }
    this.lookPointer = null
    this.lookLast = { x: 0, y: 0 }
    this.lookDelta = { x: 0, y: 0 }
    this.sensitivity = 1
    this.comfort = true
    this.tiltEnabled = false
    this.tiltBase = null
    this.tiltYaw = 0
    this.tiltPitch = 0
    this.tiltTargetYaw = 0
    this.tiltTargetPitch = 0
    this.nearInteractable = null
    this.aimedMonster = null
    this.puzzle = null
    this.trials = []
    this.transitioning = false

    this._onDeviceOrientation = this.onDeviceOrientation.bind(this)
    this._onPointerLockChange = this.onPointerLockChange.bind(this)

    this._bindGame()
    this._prepareIntro()
    this._loop = this._loop.bind(this)
    this.clock.start()
    requestAnimationFrame(this._loop)
  }

  _prepareIntro() {
    this.world.setZone(0, true)
    this.world.setProgress(this.save.completed, this.save.unlockedMax)
    const spawn = this.world.getSpawn(0)
    this.player.position.set(spawn.x, spawn.y - this.eyeHeight, spawn.z)
    this.player.yaw = 0
    this.player.pitch = 0.03
    this.world.camera.position.set(18, 5.4, 20)
    this.world.camera.rotation.order = 'YXZ'
    this.world.camera.lookAt(0, 4.2, -15)
    if (this.save.subject && this.save.focus) {
      this.ui.selectSubject(this.save.subject, this.save.focus)
      this.ui.setBeginLabel(this.save.completed >= 3 ? 'Return to the Atlas' : this.save.completed > 0 ? 'Resume Today’s Rite' : 'Enter the Atlas')
    } else {
      this.ui.updateFocusHint()
      this.ui.setBeginLabel('Enter the Atlas')
    }
    this.ui.setComfort(true)
    this.ui.setTilt(false)
    this.ui.setSensitivity(1)
  }

  _bindGame() {
    this.ui.onBegin = () => this.begin()
    this.ui.onSettings = () => this.openSettings()
    this.ui.onCloseSettings = () => this.closeSettings()
    this.ui.onAnswer = (index) => this.answer(index)
    this.ui.onContinue = () => this.continueQuestion()
    this.ui.onRewardClose = () => this.closeReward()
    this.ui.onInteract = () => this.interact()
    this.ui.onFire = () => this.fire()
    this.ui.onSensitivity = (value) => { this.sensitivity = value }
    this.ui.onTiltToggle = () => this.toggleTilt()
    this.ui.onComfortToggle = () => this.toggleComfort()
    this.ui.onOpenTravel = () => { this.ui.closeSettings(); this.openTravel() }
    this.ui.onCloseTravel = () => this.closeTravel()
    this.ui.onTravel = (index) => this.travelTo(index)
    this.ui.onResetDay = () => this.resetDay()
    this.ui.onSubjectSelected = () => {
      if (this.state === 'intro') this.ui.setBeginLabel(this.state === 'intro' && this.save.day === dayKey() && this.save.subject === this.ui.subject && this.save.focus === this.ui.focus ? 'Resume Today’s Rite' : 'Enter the Atlas')
    }

    window.addEventListener('resize', () => this.world.resize())
    window.addEventListener('keydown', (e) => this.onKeyDown(e))
    window.addEventListener('keyup', (e) => this.onKeyUp(e))
    this.canvas.addEventListener('pointerdown', (e) => this.onCanvasPointerDown(e))
    this.canvas.addEventListener('pointermove', (e) => this.onCanvasPointerMove(e))
    window.addEventListener('pointerup', (e) => this.onPointerUp(e))
    window.addEventListener('pointercancel', (e) => this.onPointerUp(e))
    document.addEventListener('pointerlockchange', this._onPointerLockChange)
    this._bindJoystick()
  }

  _bindJoystick() {
    const joy = this.ui.el.joystick
    const update = (e) => {
      const rect = joy.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const max = rect.width * 0.34
      let dx = e.clientX - cx
      let dy = e.clientY - cy
      const dist = Math.hypot(dx, dy)
      if (dist > max) { dx = (dx / dist) * max; dy = (dy / dist) * max }
      this.ui.el.joyThumb.style.transform = `translate(${dx}px, ${dy}px)`
      this.joystick.x = dx / max
      this.joystick.y = dy / max
    }
    joy.addEventListener('pointerdown', (e) => {
      if (this.state !== 'playing') return
      e.preventDefault()
      e.stopPropagation()
      this.joystick.active = true
      this.joystick.pointerId = e.pointerId
      joy.setPointerCapture(e.pointerId)
      update(e)
    })
    joy.addEventListener('pointermove', (e) => {
      if (!this.joystick.active || e.pointerId !== this.joystick.pointerId) return
      e.preventDefault()
      update(e)
    })
    const end = (e) => {
      if (!this.joystick.active || e.pointerId !== this.joystick.pointerId) return
      this.joystick.active = false
      this.joystick.x = 0
      this.joystick.y = 0
      this.ui.el.joyThumb.style.transform = 'translate(0px, 0px)'
    }
    joy.addEventListener('pointerup', end)
    joy.addEventListener('pointercancel', end)
    joy.addEventListener('lostpointercapture', end)
  }

  begin() {
    const subject = this.ui.subject
    const focus = this.ui.focus
    if (!subject || focus.length < 2) {
      this.ui.showToast('Choose a subject and name today’s study focus.')
      return
    }
    const samePlan = this.save.day === dayKey() && this.save.subject === subject && this.save.focus === focus
    if (!samePlan) {
      this.save = {
        ...this.save,
        day: dayKey(),
        subject,
        focus,
        completed: 0,
        charges: 0,
        unlockedMax: 0,
        zone: 0,
        echoes: 0,
      }
      this.persist()
    }
    this.trials = buildTrialQuestions(subject, focus, dayKey())
    this.world.setProgress(this.save.completed, this.save.unlockedMax)
    this.world.setZone(this.save.zone, true)
    const spawn = this.world.getSpawn(this.save.zone)
    this.player.position.set(spawn.x, spawn.y - this.eyeHeight, spawn.z)
    this.player.yaw = 0
    this.player.pitch = 0.02
    this.player.velocity.set(0, 0, 0)
    this.cameraHeight = spawn.y
    this.ui.hideIntro()
    this.ui.setTouchVisible(this.isMobile)
    this.state = 'playing'
    this.syncCamera(true)
    this.updateHUD()
    this.weapon.setCharges(this.save.charges)
    if (this.save.completed >= 3) {
      this.ui.showToast('Today’s rite is complete. The Atlas is open to explore. Return tomorrow with a new study.', 6000)
    } else {
      const zone = ZONES[this.save.completed]
      this.ui.showToast(`${zone.name} · ${zone.objective}. Study is the only key.`, 5600)
    }
    this.ui.setBeginLabel('Enter the Atlas')
  }

  updateHUD() {
    this.ui.updateHUD({
      subject: this.save.subject || 'mathematics',
      focus: this.save.focus || '—',
      zoneIndex: this.world.zoneIndex,
      completed: this.save.completed,
      charges: this.save.charges,
      unlockedMax: this.save.unlockedMax,
    })
    this.weapon.setCharges(this.save.charges)
  }

  persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.save)) } catch { /* storage unavailable */ }
  }

  getMissionQuestions() {
    if (!this.trials.length) this.trials = buildTrialQuestions(this.save.subject, this.save.focus, dayKey())
    return this.trials.slice(this.save.completed * 3, this.save.completed * 3 + 3)
  }

  onKeyDown(e) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
    const key = e.key.toLowerCase()
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) e.preventDefault()
    if (this.state === 'playing') {
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        this.keys.add(key)
      } else if (key === 'e') {
        this.interact()
      } else if (key === 'f') {
        this.fire()
      } else if (key === 'escape') {
        this.openSettings()
      }
    } else if (this.state === 'settings' && key === 'escape') {
      this.closeSettings()
    }
  }

  onKeyUp(e) {
    this.keys.delete(e.key.toLowerCase())
  }

  onCanvasPointerDown(e) {
    if (this.state !== 'playing') return
    if (e.pointerType === 'touch' || this.isMobile) {
      if (this.lookPointer !== null) return
      this.lookPointer = e.pointerId
      this.lookLast.x = e.clientX
      this.lookLast.y = e.clientY
      try { this.canvas.setPointerCapture(e.pointerId) } catch { /* ignore */ }
    } else if (document.pointerLockElement === this.canvas) {
      this.fire()
    } else {
      this.requestPointerLock()
    }
  }

  onCanvasPointerMove(e) {
    if (this.state !== 'playing') return
    if (document.pointerLockElement === this.canvas) {
      this.applyLook(e.movementX, e.movementY, 0.00215)
    } else if (this.lookPointer === e.pointerId) {
      const dx = e.clientX - this.lookLast.x
      const dy = e.clientY - this.lookLast.y
      this.lookLast.x = e.clientX
      this.lookLast.y = e.clientY
      this.applyLook(dx, dy, 0.0042)
    }
  }

  onPointerUp(e) {
    if (this.lookPointer === e.pointerId) this.lookPointer = null
  }

  applyLook(dx, dy, factor) {
    this.player.yaw -= dx * factor * this.sensitivity
    this.player.pitch -= dy * factor * this.sensitivity
    this.player.pitch = clamp(this.player.pitch, -1.28, 1.28)
    this.lookDelta.x += dx
    this.lookDelta.y += dy
  }

  requestPointerLock() {
    if (this.isMobile) return
    this.canvas.requestPointerLock?.()
  }

  onPointerLockChange() {
    if (document.pointerLockElement === this.canvas) {
      this.ui.showToast('Mouse captured · E attune · F fire · Esc settings', 2600)
    }
  }

  async toggleTilt() {
    if (this.tiltEnabled) {
      this.tiltEnabled = false
      window.removeEventListener('deviceorientation', this._onDeviceOrientation)
      this.tiltTargetYaw = 0
      this.tiltTargetPitch = 0
      this.ui.setTilt(false, 'Use device motion for fine aim')
      this.ui.showToast('Tilt look disabled.')
      return
    }
    if (typeof DeviceOrientationEvent === 'undefined') {
      this.ui.showToast('Tilt look is not available on this device.')
      return
    }
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission()
        if (permission !== 'granted') {
          this.ui.showToast('Motion permission was not granted. Enable it in browser settings.')
          return
        }
      } catch {
        this.ui.showToast('Motion permission could not be requested on this device.')
        return
      }
    }
    this.tiltEnabled = true
    this.tiltBase = null
    this.ui.setTilt(true, 'Tilt look active · hold the device naturally')
    window.addEventListener('deviceorientation', this._onDeviceOrientation)
    this.ui.showToast('Tilt look enabled. Tilt gently to aim; drag still turns.')
  }

  onDeviceOrientation(e) {
    if (!this.tiltEnabled || e.gamma == null || e.beta == null) return
    if (!this.tiltBase) this.tiltBase = { beta: e.beta, gamma: e.gamma }
    let dg = e.gamma - this.tiltBase.gamma
    let db = e.beta - this.tiltBase.beta
    if (dg > 90) dg -= 180
    if (dg < -90) dg += 180
    const scale = this.comfort ? 0.62 : 1
    this.tiltTargetYaw = clamp(-THREE.MathUtils.degToRad(dg) * 0.8 * scale, -0.5, 0.5)
    this.tiltTargetPitch = clamp(THREE.MathUtils.degToRad(db) * 0.55 * scale, -0.38, 0.38)
  }

  toggleComfort() {
    this.comfort = !this.comfort
    this.ui.setComfort(this.comfort)
    this.ui.showToast(this.comfort ? 'Motion comfort on · softer camera sway.' : 'Motion comfort off · full camera sway.')
  }

  openSettings() {
    if (this.state !== 'playing') return
    this.state = 'settings'
    this.clearInput()
    if (document.pointerLockElement) document.exitPointerLock()
    this.ui.setSensitivity(this.sensitivity)
    this.ui.setTilt(this.tiltEnabled, this.tiltEnabled ? 'Tilt look active · hold the device naturally' : 'Use device motion for fine aim')
    this.ui.setComfort(this.comfort)
    this.ui.setSettingsAvailable(this.save.unlockedMax)
    this.ui.openSettings()
  }

  closeSettings() {
    if (this.state !== 'settings') return
    this.ui.closeSettings()
    this.state = 'playing'
    this.syncCamera(true)
  }

  openTravel() {
    if (this.state !== 'playing') return
    this.state = 'travel'
    this.clearInput()
    if (document.pointerLockElement) document.exitPointerLock()
    this.ui.openTravel(ZONES, this.world.zoneIndex, this.save.unlockedMax)
  }

  closeTravel() {
    if (this.state !== 'travel') return
    this.ui.closeTravel()
    this.state = 'playing'
    this.syncCamera(true)
  }

  travelTo(index) {
    if (index > this.save.unlockedMax || index === this.world.zoneIndex) return
    this.ui.closeTravel()
    this.state = 'transition'
    this.clearInput()
    this.ui.hidePrompt()
    this.ui.setTargeting(false)
    this.ui.showTransition(ZONES[index].name, `Sector ${ZONES[index].numeral}`)
    setTimeout(() => {
      this.world.setZone(index, true)
      const spawn = this.world.getSpawn(index)
      this.player.position.set(spawn.x, spawn.y - this.eyeHeight, spawn.z)
      this.player.yaw = 0
      this.player.pitch = 0.02
      this.player.velocity.set(0, 0, 0)
      this.cameraHeight = spawn.y
      this.save.zone = index
      this.persist()
      this.syncCamera(true)
      this.updateHUD()
      setTimeout(() => {
        this.ui.hideTransition()
        this.state = 'playing'
        this.ui.showToast(ZONES[index].arrival, 4800)
        this.syncCamera(true)
      }, 480)
    }, 620)
  }

  clearInput() {
    this.keys.clear()
    this.joystick.active = false
    this.joystick.x = 0
    this.joystick.y = 0
    this.ui.el.joyThumb.style.transform = 'translate(0px, 0px)'
    this.player.velocity.set(0, 0, 0)
  }

  interact() {
    if (this.state !== 'playing') return
    if (!this.nearInteractable) {
      this.ui.showToast('Move closer to a beacon or waygate.')
      return
    }
    if (this.nearInteractable.type === 'obelisk') this.openPuzzle()
    else if (this.nearInteractable.type === 'gate') this.openTravel()
  }

  openPuzzle() {
    if (this.save.completed >= 3) {
      this.ui.showToast('All three beacons are restored. Return tomorrow with a new study.')
      return
    }
    if (this.world.zoneIndex !== this.save.completed) {
      this.ui.showToast(`The next beacon waits in ${ZONES[this.save.completed].name}. Follow the waygate.`)
      return
    }
    const questions = this.getMissionQuestions()
    if (!questions.length) {
      this.ui.showToast('The archive could not form a trial. Try a broader study focus.')
      return
    }
    this.state = 'puzzle'
    this.clearInput()
    if (document.pointerLockElement) document.exitPointerLock()
    this.ui.hidePrompt()
    this.ui.setTargeting(false)
    this.puzzle = { index: 0, correct: 0, answered: false, answerCorrect: false }
    this.ui.selectedSubject = this.save.subject
    this.ui.showPuzzle(ZONES[this.save.completed], questions[0], 0, 3)
  }

  answer(choiceIndex) {
    if (this.state !== 'puzzle' || !this.puzzle || this.puzzle.answered) return
    const questions = this.getMissionQuestions()
    const question = questions[this.puzzle.index]
    if (!question) return
    this.puzzle.answered = true
    const correct = choiceIndex === question.answer
    this.puzzle.answerCorrect = correct
    if (correct) this.puzzle.correct += 1
    this.ui.markAnswer(choiceIndex, question.answer, correct, question.why)
    this.ui.setPuzzleProgress(((this.puzzle.index + (correct ? 1 : 0)) / 3) * 100)
    if (correct) {
      const p = this.world.getObeliskPosition().clone()
      p.y += 5.2
      this.world.spawnBurst(p, ZONES[this.save.completed].accent, 16)
    }
  }

  continueQuestion() {
    if (this.state !== 'puzzle' || !this.puzzle || !this.puzzle.answered) return
    const questions = this.getMissionQuestions()
    if (!this.puzzle.answerCorrect) {
      this.puzzle.answered = false
      this.ui.renderQuestion(questions[this.puzzle.index], this.puzzle.index, 3)
      return
    }
    this.puzzle.answered = false
    this.puzzle.index += 1
    if (this.puzzle.index >= 3) {
      this.completeMission()
    } else {
      this.ui.showPuzzle(ZONES[this.save.completed], questions[this.puzzle.index], this.puzzle.index, 3)
    }
  }

  completeMission() {
    const missionIndex = this.save.completed
    const zone = ZONES[missionIndex]
    this.save.completed += 1
    this.save.charges = Math.min(8, this.save.charges + 2)
    this.save.unlockedMax = Math.min(2, this.save.completed)
    if (this.save.completed >= 3) {
      this.save.totalRites = (this.save.totalRites || 0) + 1
    }
    this.persist()
    this.world.setProgress(this.save.completed, this.save.unlockedMax)
    const p = this.world.getObeliskPosition(missionIndex).clone()
    p.y += 5
    this.world.spawnBurst(p, zone.accent, 80)
    this.state = 'reward'
    this.ui.hidePuzzle()
    this.updateHUD()
    const complete = this.save.completed >= 3
    const nextZone = ZONES[this.save.completed]
    this.ui.showReward({
      kicker: complete ? 'The Atlas is whole' : 'Beacon restored',
      title: complete
        ? 'The Skybound Archive Sings'
        : missionIndex === 0 ? 'The Verdant Beacon Burns Again' : 'The Prism Beacon Answers',
      copy: complete
        ? 'Three beacons burn with what you learned today. The waygates are open, and the Atlas will remember this rite. Return tomorrow with a new study.'
        : `Your study has given form to light. The waygate now opens to ${nextZone.name}. Aether charges have replenished your prism.`,
      correct: 3,
      charge: 2,
      next: complete ? 'Day complete' : `Sector ${nextZone.numeral}`,
    })
  }

  closeReward() {
    if (this.state !== 'reward') return
    this.ui.hideReward()
    this.state = 'playing'
    this.updateHUD()
    this.syncCamera(true)
    if (this.save.completed >= 3) {
      this.ui.showToast('Day complete. Explore freely, or return tomorrow with a new study focus.', 5200)
    } else {
      this.ui.showToast(`Waygate unlocked · ${ZONES[this.save.completed].name}. Study is the only key.`, 4800)
    }
  }

  fire() {
    if (this.state !== 'playing') return
    if (this.save.charges <= 0) {
      this.weapon.dormantPulse()
      this.ui.showToast('The prism is dormant. Complete a study mission to earn Aether charges.', 3600)
      return
    }
    this.save.charges -= 1
    this.persist()
    this.updateHUD()
    this.weapon.fire()
    this.world.buildAimRaycaster(0, 0)
    const monster = this.world.getAimedMonster()
    this.world.camera.updateMatrixWorld(true)
    const from = this.weapon.muzzle.getWorldPosition(new THREE.Vector3())
    let target
    if (monster) {
      target = monster.group.position.clone()
      this.world.shatterMonster(monster)
      this.save.echoes = (this.save.echoes || 0) + 1
      this.persist()
      this.ui.showToast('Dissonance calmed. Combat grants insight, never study progress.', 3400)
    } else {
      target = this.world.raycaster.ray.at(55, new THREE.Vector3())
    }
    this.world.spawnBeam(from, target, 0x9ff5d0)
    if (this.save.charges === 0) this.ui.showToast('Aether depleted. Complete a study mission to recharge.', 3600)
  }

  resetDay() {
    if (!window.confirm('Restart today’s rite? Completed study missions and earned charges for today will be cleared.')) return
    try { localStorage.removeItem(SAVE_KEY) } catch { /* ignore */ }
    window.location.reload()
  }

  syncCamera(instant = false) {
    const world = this.world
    const targetY = world.heightAt(this.player.position.x, this.player.position.z) + this.eyeHeight + this.bob
    if (instant || this.cameraHeight == null) this.cameraHeight = targetY
    this.world.camera.position.set(this.player.position.x, this.cameraHeight, this.player.position.z)
    this.world.camera.rotation.order = 'YXZ'
    this.world.camera.rotation.set(
      clamp(this.player.pitch + this.tiltPitch, -1.35, 1.35),
      this.player.yaw + this.tiltYaw,
      0
    )
  }

  updatePlayer(dt) {
    const keys = this.keys
    let inputX = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0)
    let inputZ = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0)
    if (this.joystick.active) {
      inputX += this.joystick.x
      inputZ -= this.joystick.y
    }
    const mag = Math.hypot(inputX, inputZ)
    if (mag > 1) { inputX /= mag; inputZ /= mag }
    const moving = mag > 0.08
    this.player.moving = moving

    const forward = new THREE.Vector3(-Math.sin(this.player.yaw), 0, -Math.cos(this.player.yaw))
    const right = new THREE.Vector3(Math.cos(this.player.yaw), 0, -Math.sin(this.player.yaw))
    const desired = forward.multiplyScalar(inputZ).add(right.multiplyScalar(inputX))
    const speed = 5.1
    const targetVel = desired.multiplyScalar(speed)
    const smooth = 1 - Math.exp(-11 * dt)
    this.player.velocity.x += (targetVel.x - this.player.velocity.x) * smooth
    this.player.velocity.z += (targetVel.z - this.player.velocity.z) * smooth
    this.player.position.x += this.player.velocity.x * dt
    this.player.position.z += this.player.velocity.z * dt

    const center = this.world.getZoneCenter(this.world.zoneIndex)
    let dx = this.player.position.x - center.x
    let dz = this.player.position.z - center.z
    const radius = Math.hypot(dx, dz)
    const limit = this.world.boundaryRadius - 0.6
    if (radius > limit) {
      dx = (dx / radius) * limit
      dz = (dz / radius) * limit
      this.player.position.x = center.x + dx
      this.player.position.z = center.z + dz
    }

    const obstacles = this.world.zoneObstacles[this.world.zoneIndex] || []
    for (const obstacle of obstacles) {
      const ox = this.player.position.x - obstacle.x
      const oz = this.player.position.z - obstacle.z
      const d = Math.hypot(ox, oz)
      const minDist = obstacle.r + 0.42
      if (d < minDist && d > 0.0001) {
        this.player.position.x = obstacle.x + (ox / d) * minDist
        this.player.position.z = obstacle.z + (oz / d) * minDist
      }
    }

    this.player.position.y = this.world.heightAt(this.player.position.x, this.player.position.z)
    const walkAmount = clamp(Math.hypot(this.player.velocity.x, this.player.velocity.z) / speed, 0, 1)
    const bobTarget = moving ? Math.sin(this.elapsed * 10.4) * 0.035 * walkAmount * (this.comfort ? 0.65 : 1) : 0
    this.bob += (bobTarget - this.bob) * Math.min(1, dt * 12)
    const targetY = this.player.position.y + this.eyeHeight + this.bob
    this.cameraHeight += (targetY - this.cameraHeight) * Math.min(1, dt * 15)
    this.tiltYaw += (this.tiltTargetYaw - this.tiltYaw) * Math.min(1, dt * 3.5)
    this.tiltPitch += (this.tiltTargetPitch - this.tiltPitch) * Math.min(1, dt * 3.5)
    this.syncCamera()
  }

  updateAim() {
    this.world.buildAimRaycaster(0, 0)
    const monster = this.world.getAimedMonster()
    this.aimedMonster = monster
    this.ui.setTargeting(!!monster)
    const near = this.world.getNearestInteractable(this.player.position)
    if (near) {
      if (!this.nearInteractable || this.nearInteractable.type !== near.type) {
        this.ui.showPrompt(near.label)
      }
      this.nearInteractable = near
    } else {
      if (this.nearInteractable) this.ui.hidePrompt()
      this.nearInteractable = null
    }
  }

  updateIntroCamera() {
    const angle = 0.86 + Math.sin(this.elapsed * 0.05) * 0.16 + this.elapsed * 0.009
    const radius = 27
    const x = Math.sin(angle) * radius
    const z = Math.cos(angle) * radius - 3
    const y = this.world.heightAt(0, 0) + 5.8 + Math.sin(this.elapsed * 0.2) * 0.2
    this.world.camera.position.set(x, y, z)
    this.world.camera.lookAt(0, 4.2, -15)
  }

  _loop() {
    requestAnimationFrame(this._loop)
    const dt = Math.min(this.clock.getDelta(), 0.05)
    this.elapsed += dt
    if (this.state === 'intro') {
      this.updateIntroCamera()
    } else if (this.state === 'playing') {
      this.updatePlayer(dt)
      this.updateAim()
    } else {
      this.syncCamera()
    }
    this.world.update(dt, this.world.camera, this.player.position)
    this.weapon.update(dt, this.elapsed, this.player.moving, this.lookDelta)
    this.weapon.group.visible = this.state !== 'intro' && this.save.charges > 0 && this.world.camera.aspect >= 0.9
    this.lookDelta.x *= 0.82
    this.lookDelta.y *= 0.82
    this.world.render()
  }
}
