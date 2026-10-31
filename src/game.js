import * as THREE from 'three'
import { World } from './world.js'
import { Weapon } from './weapon.js'
import { UI } from './ui.js'
import {
  ZONES, FRIENDS, PACE_OPTIONS, DAY_START, DAY_END,
  dayKey, previousDayKey, techniqueById, friendById, itemById, stockForDay,
} from './data.js'

const SAVE_KEY = 'lumenfall.vigil.v2'
const HEART_MAX = 5
const WEAKNESS_MAX = 3
const MAX_TASKS = 6
const MAX_SLOTS = 8

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)) }

function uid(prefix = 'v') {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

function normalizeTask(task) {
  if (!task || typeof task.title !== 'string') return null
  const tech = techniqueById(task.technique)
  return {
    id: task.id || uid('task'),
    title: task.title.slice(0, 80),
    technique: tech.id,
    minutes: clamp(Number(task.minutes) || tech.minutes, 5, 90),
    status: ['pending', 'done', 'failed'].includes(task.status) ? task.status : 'pending',
    attempts: Number(task.attempts) || 0,
  }
}

function normalizeSave(raw) {
  const base = {
    day: dayKey(),
    tasks: [],
    hearts: 3,
    weakness: 0,
    shards: 60,
    inventory: [],
    slots: 4,
    friends: ['lyra'],
    ward: 0,
    clock: DAY_START,
    pace: 'steady',
    streak: 0,
    totalRites: 0,
    victory: false,
    lost: false,
    started: false,
    purchased: {},
    tempTime: 0,
    echoes: 0,
  }
  if (!raw || typeof raw !== 'object') return base
  const friends = Array.isArray(raw.friends)
    ? raw.friends.filter((id) => FRIENDS.some((friend) => friend.id === id))
    : []
  if (!friends.includes('lyra')) friends.unshift('lyra')
  const inventory = Array.isArray(raw.inventory)
    ? raw.inventory
        .filter((entry) => entry && itemById(entry.itemId))
        .slice(0, MAX_SLOTS)
        .map((entry) => ({ uid: entry.uid || uid('item'), itemId: entry.itemId }))
    : []
  return {
    ...base,
    ...raw,
    day: raw.day || base.day,
    tasks: Array.isArray(raw.tasks) ? raw.tasks.map(normalizeTask).filter(Boolean).slice(0, MAX_TASKS) : [],
    hearts: clamp(raw.hearts == null ? 3 : Number(raw.hearts), 0, HEART_MAX),
    weakness: clamp(Number(raw.weakness) || 0, 0, WEAKNESS_MAX - 1),
    shards: Math.max(0, Number(raw.shards) || 0),
    inventory,
    slots: clamp(Number(raw.slots) || 4, 4, MAX_SLOTS),
    friends,
    ward: Math.max(0, Number(raw.ward) || 0),
    clock: clamp(raw.clock == null ? DAY_START : Number(raw.clock), DAY_START, DAY_END),
    pace: PACE_OPTIONS[raw.pace] ? raw.pace : 'steady',
    streak: Math.max(0, Number(raw.streak) || 0),
    totalRites: Math.max(0, Number(raw.totalRites) || 0),
    victory: !!raw.victory,
    lost: !!raw.lost,
    started: !!raw.started,
    purchased: raw.purchased && typeof raw.purchased === 'object' ? raw.purchased : {},
    tempTime: Math.max(0, Number(raw.tempTime) || 0),
    echoes: Math.max(0, Number(raw.echoes) || 0),
  }
}

function loadSave() {
  const today = dayKey()
  let prev = null
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (raw) prev = JSON.parse(raw)
  } catch { prev = null }
  if (prev && prev.day === today) {
    const same = normalizeSave(prev)
    if (!same.tasks.length) same.started = false
    return same
  }
  const meta = normalizeSave(prev)
  const streak = prev && prev.day === previousDayKey() && prev.victory ? (Number(prev.streak) || 0) + 1 : 0
  return {
    ...meta,
    day: today,
    tasks: [],
    hearts: 3,
    weakness: 0,
    clock: DAY_START,
    victory: false,
    lost: false,
    started: false,
    purchased: {},
    tempTime: 0,
    zone: 0,
    streak,
    ward: meta.friends.includes('ori') ? 1 : 0,
  }
}

function tasksMatch(a, b) {
  if (a.length !== b.length) return false
  return a.every((task, index) => (
    task.title === b[index].title
    && task.technique === b[index].technique
    && Number(task.minutes) === Number(b[index].minutes)
  ))
}

function truncate(text, length = 34) {
  return text.length > length ? `${text.slice(0, length - 1)}…` : text
}

export class Game {
  constructor(canvas) {
    this.canvas = canvas
    this.isMobile = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0
    this.lowQuality = this.isMobile
    this.save = loadSave()
    this.save.zone = Number(this.save.zone) || 0
    this.save.unlockedMax = Math.min(2, this.save.tasks.filter((task) => task.status === 'done').length)

    this.world = new World(canvas, { isMobile: this.isMobile, lowQuality: this.lowQuality })
    this.world.scene.add(this.world.camera)
    this.ui = new UI()
    this.ui.setTouchVisible(this.isMobile)
    this.weapon = new Weapon(this.world.camera, this.world.glowTexture)
    this.weapon.setCharges(3)

    this.state = 'cover'
    this.overlayReturn = 'playing'
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
    this.cameraHeight = 0
    this.bob = 0
    this.keys = new Set()
    this.joystick = { active: false, pointerId: null, x: 0, y: 0 }
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
    this.ritual = null
    this.transitioning = false
    this.fireCooldown = 0
    this.hudTimer = 0
    this.persistTimer = 0

    this._onDeviceOrientation = this.onDeviceOrientation.bind(this)
    this._onPointerLockChange = this.onPointerLockChange.bind(this)

    this._bindGame()
    this._prepareCover()
    this._loop = this._loop.bind(this)
    this.clock.start()
    requestAnimationFrame(this._loop)
  }

  get friends() {
    return this.save.friends.map(friendById).filter(Boolean)
  }

  _prepareCover() {
    this.world.setZone(0, true)
    this.world.setProgress(0, 0)
    this.world.setTasks([])
    this.world.setFriends(this.friends)
    const spawn = this.world.getSpawn(0)
    this.player.position.set(spawn.x, spawn.y - this.eyeHeight, spawn.z)
    this.player.yaw = 0
    this.player.pitch = 0.03
    this.cameraHeight = spawn.y
    this.world.camera.rotation.order = 'YXZ'
    this.updateIntroCamera()

    this.ui.setFriends(this.save.friends)
    this.ui.setShards(this.save.shards)
    this.ui.setPace(this.save.pace)
    this.ui.setComfort(true)
    this.ui.setTilt(false)
    this.ui.setSensitivity(1)
    this.ui.setPlannedTasks(this.save.started ? this.save.tasks : [])
    this.ui.showCover({
      label: this.save.victory
        ? 'Review today’s vigil'
        : this.save.lost
          ? 'Begin again'
          : this.save.started
            ? 'Resume today’s vigil'
            : 'Enter the Labyrinth',
      streak: this.save.streak,
      rites: this.save.totalRites,
      shards: this.save.shards,
      friends: this.save.friends.length,
    })
  }

  _bindGame() {
    this.ui.onEnter = () => this.showPlanner()
    this.ui.onBegin = () => this.begin()
    this.ui.onShop = () => this.openShop()
    this.ui.onCloseShop = () => this.closeShop()
    this.ui.onFriends = () => this.openFriends()
    this.ui.onCloseFriends = () => this.closeFriends()
    this.ui.onSettings = () => this.openSettings()
    this.ui.onCloseSettings = () => this.closeSettings()
    this.ui.onRitualHold = (active) => this.setRitualHold(active)
    this.ui.onAbandon = () => this.abandonRitual()
    this.ui.onRewardClose = () => this.closeReward()
    this.ui.onDefeat = () => this.returnToPlanner()
    this.ui.onInteract = () => this.interact()
    this.ui.onFire = () => this.fire()
    this.ui.onSensitivity = (value) => { this.sensitivity = value }
    this.ui.onTiltToggle = () => this.toggleTilt()
    this.ui.onComfortToggle = () => this.toggleComfort()
    this.ui.onOpenTravel = () => { this.ui.closeSettings(); this.openTravel() }
    this.ui.onCloseTravel = () => this.closeTravel()
    this.ui.onTravel = (index) => this.travelTo(index)
    this.ui.onEndDay = () => this.forceEndDay()
    this.ui.onResetDay = () => this.restartVigil()
    this.ui.onPace = (pace) => this.setPace(pace)
    this.ui.onBuy = (itemId) => this.buyItem(itemId)
    this.ui.onUseItem = (itemUid) => this.useItem(itemUid)

    window.addEventListener('resize', () => this.world.resize())
    window.addEventListener('keydown', (e) => this.onKeyDown(e))
    window.addEventListener('keyup', (e) => this.onKeyUp(e))
    window.addEventListener('pointerup', () => { if (this.state === 'ritual') this.setRitualHold(false) })
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

  showPlanner() {
    if (this.state !== 'cover') return
    this.state = 'intro'
    this.ui.hideCover()
    this.ui.showPlanner({
      tasks: this.save.started ? this.save.tasks : [],
      shards: this.save.shards,
      friends: this.save.friends,
      pace: this.save.pace,
      sealed: this.save.victory,
    })
    if (this.save.victory) this.ui.setBeginLabel('Return to the sealed maze')
    else if (this.save.started && !this.save.lost) this.ui.setBeginLabel('Resume today’s vigil')
    else this.ui.setBeginLabel('Seal the day')
  }

  begin() {
    const planned = this.ui.getPlannedTasks()
    if (!planned.length) {
      this.ui.showToast('Add at least one vow before the maze opens.', 3200)
      return
    }
    if (planned.length > MAX_TASKS) {
      this.ui.showToast(`The maze holds ${MAX_TASKS} focus prisms. Remove a vow.`, 3200)
      return
    }

    const sameRun = this.save.started
      && !this.save.lost
      && !this.save.victory
      && this.save.tasks.length === planned.length
      && tasksMatch(planned, this.save.tasks)
    const sealedRun = this.save.victory
      && this.save.tasks.length === planned.length
      && tasksMatch(planned, this.save.tasks)

    if (!sameRun && !sealedRun) {
      this.save.day = dayKey()
      this.save.tasks = planned.map((task) => {
        const tech = techniqueById(task.technique)
        return {
          id: task.id || uid('task'),
          title: task.title,
          technique: tech.id,
          minutes: clamp(Number(task.minutes) || tech.minutes, 5, 90),
          status: 'pending',
          attempts: 0,
        }
      })
      this.save.started = true
      this.save.hearts = 3
      this.save.weakness = 0
      this.save.clock = DAY_START
      this.save.victory = false
      this.save.lost = false
      this.save.purchased = {}
      this.save.tempTime = 0
      this.save.ward = this.save.friends.includes('ori') ? 1 : 0
      this.save.zone = 0
      this.save.unlockedMax = 0
    } else {
      this.save.started = true
    }

    const done = this.save.tasks.filter((task) => task.status === 'done').length
    this.save.unlockedMax = Math.min(2, done)
    this.save.zone = clamp(Number(this.save.zone) || 0, 0, this.save.unlockedMax)
    this.persist()

    this.world.setProgress(done, this.save.unlockedMax)
    this.world.setTasks(this.save.tasks)
    this.world.setFriends(this.friends)
    this.world.setZone(this.save.zone, true)
    const spawn = this.world.getSpawn(this.save.zone)
    this.player.position.set(spawn.x, spawn.y - this.eyeHeight, spawn.z)
    this.player.yaw = 0
    this.player.pitch = 0.02
    this.player.velocity.set(0, 0, 0)
    this.cameraHeight = spawn.y

    this.ui.hideCover()
    this.ui.hidePlanner()
    this.ui.showHUD()
    this.ui.setTouchVisible(this.isMobile)
    this.ui.setTaskCount(this.save.tasks.length)
    this.ui.setFriends(this.save.friends)
    this.state = 'playing'
    this.syncCamera(true)
    this.updateHUD()

    if (this.save.victory) {
      this.ui.showToast('Today is sealed. Explore the crystal reaches, or plan tomorrow with a new vigil.', 5600)
    } else if (sameRun) {
      this.ui.showToast(`Resumed at ${this.timeLabel()}. ${this.remainingVows()} vow(s) still wait.`, 4600)
    } else {
      this.ui.showToast(`${this.save.tasks.length} vows sealed. Nightfall comes at 23:59. Keep them.`, 5600)
    }
    this.ui.setBeginLabel('Seal the day')
  }

  timeLabel() {
    const m = Math.round(this.save.clock)
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  }

  remainingVows() {
    return this.save.tasks.filter((task) => task.status !== 'done').length
  }

  updateHUD() {
    const done = this.save.tasks.filter((task) => task.status === 'done').length
    const unlockedMax = Math.min(2, done)
    this.save.unlockedMax = unlockedMax
    const currentIndex = this.save.tasks.findIndex((task) => task.status !== 'done')
    this.ui.setTaskCount(this.save.tasks.length)
    this.ui.updateHUD({
      tasks: this.save.tasks,
      shards: this.save.shards,
      zoneIndex: this.world.zoneIndex,
      clock: this.save.clock,
      hearts: this.save.hearts,
      weakness: this.save.weakness,
      ward: this.save.ward,
      victory: this.save.victory,
      unlockedMax,
      currentIndex,
    })
    this.ui.setFriends(this.save.friends)
  }

  persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.save)) } catch { /* storage unavailable */ }
  }

  onKeyDown(e) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
    const key = e.key.toLowerCase()
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) e.preventDefault()

    if (this.state === 'ritual') {
      if (key === ' ' || key === 'e') {
        e.preventDefault()
        this.setRitualHold(true)
      }
      return
    }

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
    } else if (this.state === 'shop' && key === 'escape') {
      this.closeShop()
    } else if (this.state === 'friends' && key === 'escape') {
      this.closeFriends()
    } else if (this.state === 'travel' && key === 'escape') {
      this.closeTravel()
    } else if (this.state === 'reward' && (key === 'escape' || key === 'enter')) {
      this.closeReward()
    } else if (this.state === 'intro' && key === 'enter') {
      this.begin()
    }
  }

  onKeyUp(e) {
    const key = e.key.toLowerCase()
    if (this.state === 'ritual' && (key === ' ' || key === 'e')) {
      this.setRitualHold(false)
      return
    }
    this.keys.delete(key)
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
      this.ui.showToast('Mouse captured · E focus · F light · Esc settings', 2600)
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
    this.overlayReturn = 'playing'
    this.clearInput()
    if (document.pointerLockElement) document.exitPointerLock()
    this.ui.setSensitivity(this.sensitivity)
    this.ui.setTilt(this.tiltEnabled, this.tiltEnabled ? 'Tilt look active · hold the device naturally' : 'Use device motion for fine aim')
    this.ui.setComfort(this.comfort)
    this.ui.setPace(this.save.pace)
    this.ui.setSettingsAvailable(this.save.unlockedMax)
    this.ui.openSettings()
  }

  closeSettings() {
    if (this.state !== 'settings') return
    this.ui.closeSettings()
    this.state = 'playing'
    this.syncCamera(true)
  }

  setPace(pace) {
    if (!PACE_OPTIONS[pace]) return
    this.save.pace = pace
    this.persist()
    this.ui.setPace(pace)
    this.ui.showToast(`Day pace · ${PACE_OPTIONS[pace].label}. ${PACE_OPTIONS[pace].blurb}.`, 3400)
  }

  openShop() {
    if (!['playing', 'intro'].includes(this.state)) return
    this.overlayReturn = this.state
    this.state = 'shop'
    this.clearInput()
    if (document.pointerLockElement) document.exitPointerLock()
    this.ui.openShop(this.shopData())
  }

  closeShop() {
    if (this.state !== 'shop') return
    this.ui.closeShop()
    this.state = this.overlayReturn || 'playing'
    if (this.state === 'playing') this.syncCamera(true)
  }

  openFriends() {
    if (this.state !== 'playing') return
    this.overlayReturn = 'playing'
    this.state = 'friends'
    this.clearInput()
    if (document.pointerLockElement) document.exitPointerLock()
    this.ui.openFriends(this.save.friends)
  }

  closeFriends() {
    if (this.state !== 'friends') return
    this.ui.closeFriends()
    this.state = 'playing'
    this.syncCamera(true)
  }

  shopData() {
    return {
      stock: stockForDay(this.save.day),
      inventory: this.save.inventory,
      shards: this.save.shards,
      slots: this.save.slots,
      friends: this.save.friends,
      purchased: this.save.purchased,
      ward: this.save.ward,
    }
  }

  buyItem(itemId) {
    if (this.state !== 'shop') return
    const item = itemById(itemId)
    const stock = stockForDay(this.save.day)
    if (!item || !stock.some((entry) => entry.id === itemId)) return
    if (this.save.purchased[itemId]) return
    if (item.kind === 'friend' && this.save.friends.includes(item.friend)) return
    if (this.save.inventory.length >= this.save.slots) {
      this.ui.showToast('Your satchel is full. Use or make room for another slot.', 3400)
      return
    }
    if (this.save.shards < item.price) {
      this.ui.showToast(`You need ${item.price - this.save.shards} more shards.`, 3200)
      return
    }
    this.save.shards -= item.price
    this.save.inventory.push({ uid: uid('item'), itemId })
    this.save.purchased[itemId] = true
    this.persist()
    this.ui.setShards(this.save.shards)
    this.ui.refreshShop(this.shopData())
    this.ui.showToast(`${item.name} added to your satchel.`, 3000)
  }

  useItem(itemUid) {
    if (this.state !== 'shop') return
    const index = this.save.inventory.findIndex((entry) => entry.uid === itemUid)
    if (index < 0) return
    const item = itemById(this.save.inventory[index].itemId)
    if (!item || item.kind === 'charm') return
    let message = ''
    if (item.effect === 'ward') {
      this.save.ward += 1
      message = 'Ward crystal ready. The next weakness will break it instead of you.'
    } else if (item.effect === 'heart') {
      if (this.save.hearts >= HEART_MAX) {
        this.ui.showToast('Your hearts are already full.', 3000)
        return
      }
      this.save.hearts = Math.min(HEART_MAX, this.save.hearts + 1)
      message = 'Ember Heart used. One heart returns.'
    } else if (item.effect === 'slot') {
      if (this.save.slots >= MAX_SLOTS) {
        this.ui.showToast('Your satchel cannot grow any larger.', 3000)
        return
      }
      this.save.slots = Math.min(MAX_SLOTS, this.save.slots + 1)
      message = 'Satchel Latch used. One more slot opens.'
    } else if (item.effect === 'time') {
      this.save.tempTime += item.value || 0
      message = `Pocket Sundial used. Ritual timers gain ${Math.round((item.value || 0) * 100)}% for the rest of the day.`
    } else if (item.kind === 'friend') {
      if (this.save.friends.includes(item.friend)) {
        this.ui.showToast('That friend already walks with you.', 3000)
        return
      }
      this.save.friends.push(item.friend)
      const friend = friendById(item.friend)
      if (friend && friend.effect === 'ward') this.save.ward += 1
      this.world.setFriends(this.friends)
      this.ui.setFriends(this.save.friends)
      message = `${friend?.name || 'A friend'} joins your walk through the maze.`
    }
    this.save.inventory.splice(index, 1)
    this.persist()
    this.ui.refreshShop(this.shopData())
    this.ui.setShards(this.save.shards)
    this.ui.showToast(message, 4200)
  }

  openTravel() {
    if (this.state !== 'playing') return
    this.overlayReturn = 'playing'
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
      this.ui.showToast('Move closer to a focus prism or waygate.', 2800)
      return
    }
    if (this.nearInteractable.type === 'prism') this.startRitual(this.nearInteractable.taskIndex)
    else if (this.nearInteractable.type === 'gate') this.openTravel()
  }

  friendBonus(effect) {
    return this.friends.reduce((total, friend) => total + (friend.effect === effect ? friend.value : 0), 0)
  }

  itemBonus(effect) {
    let total = effect === 'time' ? (this.save.tempTime || 0) : 0
    for (const entry of this.save.inventory) {
      const item = itemById(entry.itemId)
      if (item && item.kind === 'charm' && item.effect === effect) total += item.value || 0
    }
    return total
  }

  startRitual(taskIndex) {
    if (this.state !== 'playing') return
    const task = this.save.tasks[taskIndex]
    if (!task || task.status === 'done') return
    if (this.world.zoneIndex !== 0) {
      this.ui.showToast('The focus prisms wait in the Azure Labyrinth. Return through a waygate.', 4200)
      return
    }
    if (this.save.victory || this.save.lost) return
    const tech = techniqueById(task.technique)
    const timeBonus = this.friendBonus('time') + this.itemBonus('time')
    const focusBonus = this.friendBonus('focus') + this.itemBonus('focus')
    const duration = Math.max(12, tech.ritual * (1 + timeBonus) * (1 - this.save.weakness * 0.06))
    this.ritual = {
      taskIndex,
      duration,
      remaining: duration,
      progress: 0,
      holding: false,
      focusBonus,
    }
    this.state = 'ritual'
    this.clearInput()
    if (document.pointerLockElement) document.exitPointerLock()
    this.ui.hidePrompt()
    this.ui.setTargeting(false)
    this.ui.showRitual({ task, tech, duration })
  }

  setRitualHold(active) {
    if (this.state !== 'ritual' || !this.ritual) return
    this.ritual.holding = active
    this.ui.setRitualHolding(active)
  }

  abandonRitual() {
    if (this.state !== 'ritual' || !this.ritual) return
    this.failRitual('you broke focus')
  }

  updateRitual(dt) {
    if (this.state !== 'ritual' || !this.ritual) return
    const ritual = this.ritual
    ritual.remaining -= dt
    const rate = (1 + ritual.focusBonus) * (1 - this.save.weakness * 0.09)
    if (ritual.holding) ritual.progress += (dt / (ritual.duration * 0.68)) * rate
    else ritual.progress -= dt / (ritual.duration * 1.9)
    ritual.progress = clamp(ritual.progress, 0, 1)
    this.ui.updateRitual(ritual)
    if (ritual.progress >= 1) {
      this.completeTask(ritual.taskIndex, ritual.remaining)
    } else if (ritual.remaining <= 0) {
      this.failRitual('the timer ran out')
    }
  }

  completeTask(taskIndex, remaining) {
    const task = this.save.tasks[taskIndex]
    if (!task || task.status === 'done') return
    task.status = 'done'
    task.attempts = task.attempts || 0
    const bonus = 12 + Math.round(task.minutes * 0.7) + Math.round(Math.max(0, remaining) * 1.2) + (task.attempts ? 0 : 6)
    this.save.shards += bonus
    this.save.weakness = Math.max(0, this.save.weakness - 1)
    const done = this.save.tasks.filter((entry) => entry.status === 'done').length
    this.save.unlockedMax = Math.min(2, done)
    this.ritual = null
    this.persist()

    this.world.setTasks(this.save.tasks)
    this.world.setProgress(done, this.save.unlockedMax)
    const position = this.world.getFocusPrismPosition(taskIndex).clone()
    position.y += 1.8
    this.world.spawnBurst(position, techniqueById(task.technique).accent, 64)
    this.ui.hideRitual()
    this.ui.hidePrompt()
    this.updateHUD()

    const allDone = done === this.save.tasks.length
    if (allDone) {
      this.sealVictory(bonus)
      return
    }

    this.state = 'reward'
    this.ui.showReward({
      kicker: 'Vow kept',
      title: 'The Prism Answers',
      copy: `“${truncate(task.title, 60)}” is now part of the maze. One weakness faded, and the light holds.`,
      shards: `+${bonus}`,
      time: `+${Math.max(0, Math.round(remaining))}s`,
      next: `${this.save.tasks.length - done} left`,
    })
  }

  failRitual(reason) {
    if (this.state !== 'ritual' || !this.ritual) return
    const task = this.save.tasks[this.ritual.taskIndex]
    if (task) {
      task.status = 'failed'
      task.attempts = (task.attempts || 0) + 1
    }
    this.ritual = null
    this.ui.hideRitual()
    this.ui.hidePrompt()
    const collapsed = this.applyWeakness(1)
    this.world.setTasks(this.save.tasks)
    this.persist()
    if (collapsed) return
    this.state = 'playing'
    this.updateHUD()
    this.syncCamera(true)
    this.ui.showToast(`The ritual fractured because ${reason}. Weakness rises. Return to the prism to try again.`, 5400)
  }

  applyWeakness(count = 1) {
    if (this.save.ward > 0) {
      this.save.ward -= 1
      this.persist()
      this.updateHUD()
      this.ui.showToast('A ward crystal shatters. The weakness is blocked.', 4200)
      return false
    }
    this.save.weakness += count
    if (this.save.weakness >= WEAKNESS_MAX) {
      this.save.hearts -= 1
      this.save.weakness = 0
      if (this.save.hearts <= 0) {
        this.save.hearts = 0
        this.collapse()
        return true
      }
      this.persist()
      this.updateHUD()
      this.ui.showToast('Three weaknesses shatter a heart. The maze grows heavier.', 4600)
      return false
    }
    this.persist()
    this.updateHUD()
    return false
  }

  collapse() {
    this.save.lost = true
    this.save.streak = 0
    this.state = 'defeat'
    this.ritual = null
    this.clearInput()
    this.persist()
    this.ui.hideRitual()
    this.ui.hidePrompt()
    this.ui.setTargeting(false)
    this.updateHUD()
    this.ui.showDefeat({
      kicker: 'The vigil collapses',
      title: 'Your Light Goes Out',
      copy: 'Too many broken promises. The crystals dim, the maze closes, and the day is lost.',
      unfinished: this.remainingVows(),
      hearts: 0,
      streak: this.save.streak,
    })
  }

  sealVictory(lastBonus = 0) {
    if (this.save.victory) return
    this.save.victory = true
    this.save.totalRites = (this.save.totalRites || 0) + 1
    this.save.streak = (this.save.streak || 0) + 1
    this.save.hearts = Math.min(HEART_MAX, this.save.hearts + 1)
    this.save.shards += 30
    this.save.weakness = 0
    this.save.unlockedMax = 2
    this.state = 'reward'
    this.persist()
    this.world.setProgress(this.save.tasks.length, 2)
    this.updateHUD()
    this.ui.showReward({
      variant: 'victory',
      kicker: 'The day is sealed',
      title: 'Every Vow Became Light',
      copy: `All ${this.save.tasks.length} vows are kept before nightfall. The Azure Labyrinth is awake, and the day belongs to you. Return tomorrow with a new plan.`,
      shards: `+${lastBonus + 30}`,
      time: `${this.save.tasks.length} / ${this.save.tasks.length}`,
      next: 'Day complete',
    })
  }

  closeReward() {
    if (this.state !== 'reward') return
    this.ui.hideReward()
    this.state = 'playing'
    this.updateHUD()
    this.syncCamera(true)
    if (this.save.victory) {
      this.ui.showToast('Day complete. Explore the crystal reaches, or return tomorrow with a new study plan.', 5200)
    } else {
      this.ui.showToast(`${this.remainingVows()} vow(s) left. The lit prisms are still waiting.`, 4600)
    }
  }

  fire() {
    if (this.state !== 'playing' || this.fireCooldown > 0) return
    this.fireCooldown = 0.22
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
      this.ui.showToast('Dissonance calmed. Light grants no study progress; only vows move the day.', 3200)
    } else {
      target = this.world.raycaster.ray.at(55, new THREE.Vector3())
    }
    this.world.spawnBeam(from, target, 0x9ff0ff)
  }

  forceEndDay() {
    if (!['settings', 'playing'].includes(this.state)) return
    if (!window.confirm('End the day now? Unfinished vows will trigger the nightfall penalty.')) return
    this.ui.closeSettings()
    this.state = 'playing'
    this.save.clock = DAY_END
    this.endDay(true)
  }

  endDay(forced = false) {
    if (this.save.lost || this.save.victory) return
    const done = this.save.tasks.filter((task) => task.status === 'done').length
    if (this.save.tasks.length && done === this.save.tasks.length) {
      this.sealVictory()
      return
    }
    this.save.lost = true
    this.save.clock = DAY_END
    this.save.streak = 0
    this.save.hearts = Math.max(0, this.save.hearts - 1)
    this.save.weakness = Math.min(WEAKNESS_MAX - 1, this.save.weakness + 1)
    const penaltyShards = Math.min(this.save.shards, 15)
    this.save.shards -= penaltyShards
    this.state = 'defeat'
    this.ritual = null
    this.clearInput()
    this.persist()
    this.ui.hideRitual()
    this.ui.hidePrompt()
    this.ui.setTargeting(false)
    this.updateHUD()
    const unfinished = this.remainingVows()
    this.ui.showDefeat({
      kicker: forced ? 'You close the day early' : 'Nightfall takes the maze',
      title: forced ? 'The Day Ends Early' : 'Nightfall Takes the Maze',
      copy: `${unfinished} vow(s) were left unkept. A heart is lost, the streak is broken, and ${penaltyShards} shards fade into the glass.`,
      unfinished,
      hearts: this.save.hearts,
      streak: this.save.streak,
    })
  }

  restartVigil() {
    if (!window.confirm('Restart today’s vigil? Vows, hearts, weakness, and today’s clock will reset. Shards, friends, and satchel stay.')) return
    this.returnToPlanner()
  }

  returnToPlanner() {
    this.save.day = dayKey()
    this.save.tasks = []
    this.save.hearts = 3
    this.save.weakness = 0
    this.save.clock = DAY_START
    this.save.victory = false
    this.save.lost = false
    this.save.started = false
    this.save.purchased = {}
    this.save.tempTime = 0
    this.save.zone = 0
    this.save.unlockedMax = 0
    this.save.ward = this.save.friends.includes('ori') ? 1 : 0
    this.persist()

    this.state = 'intro'
    this.ritual = null
    this.clearInput()
    this.ui.hideHUD()
    this.ui.hideRitual()
    this.ui.hideReward()
    this.ui.hideDefeat()
    this.ui.closeShop()
    this.ui.closeFriends()
    this.ui.closeSettings()
    this.ui.closeTravel()
    this.ui.hidePrompt()
    this.ui.setTargeting(false)

    this.world.setZone(0, true)
    this.world.setProgress(0, 0)
    this.world.setTasks([])
    this.world.setFriends(this.friends)
    const spawn = this.world.getSpawn(0)
    this.player.position.set(spawn.x, spawn.y - this.eyeHeight, spawn.z)
    this.player.yaw = 0
    this.player.pitch = 0.03
    this.player.velocity.set(0, 0, 0)
    this.cameraHeight = spawn.y
    this.updateIntroCamera()

    this.ui.setFriends(this.save.friends)
    this.ui.setShards(this.save.shards)
    this.ui.setPace(this.save.pace)
    this.ui.showPlanner({
      tasks: [],
      shards: this.save.shards,
      friends: this.save.friends,
      pace: this.save.pace,
      sealed: false,
    })
    this.ui.setBeginLabel('Seal the day')
  }

  syncCamera(instant = false) {
    const targetY = this.world.heightAt(this.player.position.x, this.player.position.z) + this.eyeHeight + this.bob
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
    const speed = 5.1 * (1 - this.save.weakness * 0.08)
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
      const changed = !this.nearInteractable
        || this.nearInteractable.type !== near.type
        || this.nearInteractable.taskIndex !== near.taskIndex
      if (changed) {
        let label = near.label
        if (near.type === 'prism') {
          const task = this.save.tasks[near.taskIndex]
          if (task) label = `Focus · ${truncate(task.title, 30)}`
        }
        this.ui.showPrompt(label)
      }
      this.nearInteractable = near
    } else {
      if (this.nearInteractable) this.ui.hidePrompt()
      this.nearInteractable = null
    }
  }

  updateIntroCamera() {
    const angle = 0.86 + Math.sin(this.elapsed * 0.05) * 0.16 + this.elapsed * 0.009
    const radius = 33
    const x = Math.sin(angle) * radius
    const z = Math.cos(angle) * radius
    const y = this.world.heightAt(0, 0) + 11 + Math.sin(this.elapsed * 0.2) * 0.25
    this.world.camera.position.set(x, y, z)
    this.world.camera.lookAt(0, 4.2, 0)
  }

  updateClock(dt) {
    if (!this.save.started || this.save.victory || this.save.lost) return
    const pace = PACE_OPTIONS[this.save.pace] || PACE_OPTIONS.steady
    this.save.clock += dt / pace.secondsPerMinute
    if (this.save.clock >= DAY_END) {
      this.save.clock = DAY_END
      this.endDay(false)
    }
  }

  _loop() {
    requestAnimationFrame(this._loop)
    const dt = Math.min(this.clock.getDelta(), 0.05)
    this.elapsed += dt
    this.fireCooldown = Math.max(0, this.fireCooldown - dt)

    if (this.state === 'cover' || this.state === 'intro') {
      this.updateIntroCamera()
    } else if (this.state === 'playing') {
      this.updatePlayer(dt)
      this.updateAim()
      this.updateClock(dt)
    } else if (this.state === 'ritual') {
      this.updateClock(dt)
      if (this.state === 'ritual') this.updateRitual(dt)
    } else if (this.state === 'shop' && this.overlayReturn === 'intro') {
      this.updateIntroCamera()
    } else {
      this.syncCamera()
    }

    if (['playing', 'ritual'].includes(this.state)) {
      this.hudTimer += dt
      this.persistTimer += dt
      if (this.hudTimer > 0.4) {
        this.hudTimer = 0
        this.ui.updateClock({ clock: this.save.clock })
      }
      if (this.persistTimer > 6) {
        this.persistTimer = 0
        this.persist()
      }
    }

    this.world.update(dt, this.world.camera, this.player.position)
    this.weapon.update(dt, this.elapsed, this.player.moving, this.lookDelta)
    const inWorld = ['playing', 'ritual', 'reward', 'settings', 'travel'].includes(this.state)
      || (this.state === 'shop' && this.overlayReturn === 'playing')
    this.weapon.group.visible = inWorld && this.world.camera.aspect >= 0.9
    this.lookDelta.x *= 0.82
    this.lookDelta.y *= 0.82
    this.world.render()
  }
}
