import * as THREE from 'three'
import { World } from './world.js'
import { Weapon } from './weapon.js'
import { UI } from './ui.js'
import { ZONES, TECHNIQUES, TECHNIQUE_MAP, SHOP_ITEMS, COMPANIONS } from './data.js'

const SAVE_KEY = 'lumenfall.save.v2'
const LEGACY_KEY = 'lumenfall.save.v1'
const BASE_SLOTS = 4
const MAX_WEAKNESS = 5
const FRIEND = Object.fromEntries(COMPANIONS.map((friend) => [friend.id, friend]))
const QUEST_REWARD = 8

function dayKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function previousDayKey() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return dayKey(d)
}
function endOfDay(ts = Date.now()) {
  const d = new Date(ts)
  d.setHours(24, 0, 0, 0)
  return d.getTime()
}
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)) }
function makeId() {
  return `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function freshState(today, now) {
  return {
    day: today,
    technique: null,
    focus: '',
    tasks: [],
    completed: 0,
    charges: 0,
    unlockedMax: 0,
    zone: 0,
    streak: 0,
    totalRites: 0,
    echoes: 0,
    shards: 10,
    weakness: 0,
    inventory: [],
    slots: BASE_SLOTS,
    shopBought: [],
    buffs: { ward: 0, lens: 0 },
    dayEndsAt: endOfDay(now),
    dayPenaltyApplied: false,
    notice: '',
  }
}

function normalizeTask(raw) {
  const title = String(raw?.title || '').trim().slice(0, 58)
  if (title.length < 2) return null
  const status = ['pending', 'done', 'failed'].includes(raw.status) ? raw.status : 'pending'
  const windowMinutes = clamp(Number(raw.windowMinutes) || 15, 1, 720)
  const sprintSeconds = clamp(Number(raw.sprintSeconds) || 45, 10, 600)
  const dueAt = Number.isFinite(Number(raw.dueAt)) ? Number(raw.dueAt) : null
  return {
    id: String(raw.id || makeId()),
    title,
    windowMinutes,
    sprintSeconds,
    dueAt,
    status,
    createdAt: Number(raw.createdAt) || Date.now(),
    completedAt: Number(raw.completedAt) || null,
    failedAt: Number(raw.failedAt) || null,
    note: String(raw.note || '').slice(0, 160),
  }
}

function syncDerived(state) {
  const done = state.tasks.filter((task) => task.status === 'done').length
  state.completed = done
  state.unlockedMax = Math.min(2, done)
  state.zone = clamp(Number(state.zone) || 0, 0, state.unlockedMax)
  state.charges = clamp(Number(state.charges) || 0, 0, 8)
  state.slots = Math.max(BASE_SLOTS, Number(state.slots) || BASE_SLOTS)
  state.weakness = clamp(Number(state.weakness) || 0, 0, MAX_WEAKNESS)
  state.shards = Math.max(0, Math.floor(Number(state.shards) || 0))
}

function missTaskInSave(state, task, now) {
  if (task.status !== 'pending') return false
  task.status = 'failed'
  task.failedAt = now
  if (state.buffs.ward > 0) {
    state.buffs.ward -= 1
  } else {
    state.weakness = Math.min(MAX_WEAKNESS, state.weakness + 1)
    state.shards = Math.floor(state.shards * 0.8)
    state.streak = 0
  }
  return true
}

function loadSave() {
  const today = dayKey()
  const now = Date.now()
  let prev = null
  try {
    const raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem(LEGACY_KEY)
    if (raw) prev = JSON.parse(raw)
  } catch { prev = null }

  if (prev && prev.day === today) {
    const state = {
      ...freshState(today, now),
      ...prev,
      day: today,
      technique: TECHNIQUE_MAP[prev.technique] ? prev.technique : null,
      focus: String(prev.focus || ''),
      tasks: Array.isArray(prev.tasks) ? prev.tasks.map(normalizeTask).filter(Boolean) : [],
      completed: Number(prev.completed) || 0,
      charges: Number(prev.charges) || 0,
      unlockedMax: Number(prev.unlockedMax) || 0,
      zone: Number(prev.zone) || 0,
      streak: Number(prev.streak) || 0,
      totalRites: Number(prev.totalRites) || 0,
      echoes: Number(prev.echoes) || 0,
      shards: Number.isFinite(Number(prev.shards)) ? Number(prev.shards) : 10,
      weakness: Number(prev.weakness) || 0,
      inventory: Array.isArray(prev.inventory) ? prev.inventory.filter((id) => SHOP_ITEMS.some((item) => item.id === id)).slice(0, 20) : [],
      slots: Number(prev.slots) || BASE_SLOTS,
      shopBought: Array.isArray(prev.shopBought) ? prev.shopBought.filter((id) => SHOP_ITEMS.some((item) => item.id === id)) : [],
      buffs: {
        ward: Number(prev.buffs?.ward) || 0,
        lens: Number(prev.buffs?.lens) || 0,
      },
      dayEndsAt: Number(prev.dayEndsAt) || endOfDay(now),
      dayPenaltyApplied: !!prev.dayPenaltyApplied,
      notice: '',
    }
    let missed = 0
    for (const task of state.tasks) {
      if (task.status === 'pending' && task.dueAt && now >= task.dueAt) {
        if (missTaskInSave(state, task, now)) missed += 1
      }
    }
    if (missed) state.notice = `${missed} quest deadline${missed === 1 ? '' : 's'} passed while you were away. Weakness follows you.`
    syncDerived(state)
    return state
  }

  const prevTasks = Array.isArray(prev?.tasks) ? prev.tasks : []
  const hadTasks = prevTasks.length > 0
  const allDone = hadTasks && prevTasks.every((task) => task?.status === 'done')
  const missed = hadTasks && prevTasks.some((task) => task?.status !== 'done')
  const wasYesterday = prev?.day === previousDayKey()
  let shards = (Number.isFinite(Number(prev?.shards)) ? Number(prev.shards) : 0) + 10
  let weakness = Math.max(0, Number(prev?.weakness) || 0)
  let notice = ''
  if (missed) {
    shards = Math.floor(shards * 0.5)
    weakness = Math.min(MAX_WEAKNESS, weakness + 2)
    notice = `Yesterday ended with unfinished quests. Half your shards are gone and weakness ×${weakness} follows you.`
  } else if (allDone && wasYesterday) {
    weakness = Math.max(0, weakness - 1)
    notice = 'Yesterday’s quests were all sealed. Your streak grows and one weakness fades.'
  }
  return {
    ...freshState(today, now),
    shards,
    weakness,
    streak: allDone && wasYesterday ? (Number(prev?.streak) || 0) + 1 : 0,
    totalRites: Number(prev?.totalRites) || 0,
    echoes: Number(prev?.echoes) || 0,
    notice,
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
    this.returnState = 'playing'
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
    this.focus = null
    this.transitioning = false
    this.deadlineTick = 0
    this.shopNotice = ''

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
    this.world.camera.lookAt(0, 4.2, -9)
    if (this.save.technique && this.save.focus) {
      this.ui.selectTechnique(this.save.technique, this.save.focus)
      this.ui.setBeginLabel(this.save.tasks.length ? 'Resume Today’s Quests' : 'Enter the Azure Labyrinth')
    } else {
      this.ui.updateFocusHint()
      this.ui.setBeginLabel('Enter the Azure Labyrinth')
    }
    this.ui.renderPlanner(this.save.tasks)
    this.ui.setIntroShards(this.save.shards)
    this.ui.setIntroNotice(this.save.notice)
    this.ui.setComfort(true)
    this.ui.setTilt(false)
    this.ui.setSensitivity(1)
  }

  _bindGame() {
    this.ui.onBegin = () => this.begin()
    this.ui.onSettings = () => this.openSettings()
    this.ui.onCloseSettings = () => this.closeSettings()
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
    this.ui.onTechniqueSelected = () => {
      if (this.state === 'intro') this.ui.setIntroNotice('')
    }
    this.ui.onAddTask = (task) => this.addTask(task)
    this.ui.onRemoveTask = (id) => this.removeTask(id)
    this.ui.onOpenShop = () => this.openShop()
    this.ui.onCloseShop = () => this.closeShop()
    this.ui.onBuyItem = (id) => this.buyItem(id)
    this.ui.onUseItem = (id, index) => this.useItem(id, index)
    this.ui.onOpenQuests = () => this.openQuests()
    this.ui.onCloseQuests = () => this.closeQuests()
    this.ui.onStartFocus = () => this.startFocusSprint()
    this.ui.onCompleteTask = () => this.completeTask()
    this.ui.onCloseFocus = () => this.closeFocus()

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

  addTask({ title, windowMinutes, sprintSeconds, source }) {
    const now = Date.now()
    if (this.state !== 'intro' && this.state !== 'playing' && this.state !== 'quests') return
    if (this.save.tasks.filter((task) => task.status === 'pending').length >= 8) {
      this.ui.showToast('The board is full. Seal or remove a quest first.')
      return
    }
    const task = normalizeTask({
      id: makeId(),
      title,
      windowMinutes,
      sprintSeconds,
      dueAt: source === 'game' ? now + windowMinutes * 60000 : null,
      status: 'pending',
      createdAt: now,
    })
    if (!task) {
      this.ui.showToast('Name the quest with at least two characters.')
      return
    }
    this.save.tasks.push(task)
    syncDerived(this.save)
    this.persist()
    if (this.state === 'intro') {
      this.ui.renderPlanner(this.save.tasks)
      this.ui.setIntroNotice('')
    } else {
      this.ui.renderPlanner(this.save.tasks)
      if (this.state === 'quests') this.ui.updateQuestBoard(this._questData())
      this.updateHUD()
    }
    this.ui.showToast(source === 'game' ? 'Quest added. Its deadline is already running.' : 'Quest forged. It will begin when you enter the maze.')
  }

  removeTask(id) {
    const task = this.save.tasks.find((entry) => entry.id === id)
    if (!task) return
    if (task.status !== 'pending' || task.dueAt) {
      this.ui.showToast('Started quests cannot be removed. Finish the work or accept the deadline.')
      return
    }
    this.save.tasks = this.save.tasks.filter((entry) => entry.id !== id)
    syncDerived(this.save)
    this.persist()
    this.ui.renderPlanner(this.save.tasks)
  }

  begin() {
    const technique = this.ui.technique
    const focus = this.ui.focus
    if (!technique || focus.length < 2) {
      this.ui.showToast('Choose a technique and name today’s focus.')
      return
    }
    if (!this.save.tasks.length) {
      this.ui.showToast('Forge at least one quest before entering the maze.')
      return
    }
    const now = Date.now()
    this.save.day = dayKey(now)
    this.save.technique = technique
    this.save.focus = focus
    this.save.dayEndsAt = this.save.dayEndsAt || endOfDay(now)
    for (const task of this.save.tasks) {
      if (task.status === 'pending' && !task.dueAt) task.dueAt = now + task.windowMinutes * 60000
    }
    syncDerived(this.save)
    this._expireDueTasks(true)
    this.persist()
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
    const pending = this.save.tasks.filter((task) => task.status === 'pending')
    if (!pending.length && this.save.tasks.length) {
      this.ui.showToast('All quests are already sealed for today. The maze is yours to explore.', 5600)
    } else if (pending.length) {
      this.ui.showToast(`${pending.length} quest${pending.length === 1 ? '' : 's'} active. Reach a beacon before each deadline.`, 5600)
    } else {
      this.ui.showToast('No active quests. Open the quest board to add more work.', 5600)
    }
    this.ui.setBeginLabel('Resume Today’s Quests')
  }

  updateHUD() {
    const pending = this.save.tasks.filter((task) => task.status === 'pending')
    this.ui.updateHUD({
      technique: this.save.technique || TECHNIQUES[0].id,
      focus: this.save.focus || '—',
      zoneIndex: this.world.zoneIndex,
      completed: this.save.completed,
      tasks: this.save.tasks,
      pending: pending.length,
      charges: this.save.charges,
      unlockedMax: this.save.unlockedMax,
      shards: this.save.shards,
      weakness: this.save.weakness,
    })
    this.weapon.setCharges(this.save.charges)
  }

  persist() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.save))
      localStorage.removeItem(LEGACY_KEY)
    } catch { /* storage unavailable */ }
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
      } else if (key === 'q') {
        this.openQuests()
      } else if (key === 'escape') {
        this.openSettings()
      }
    } else if (this.state === 'settings' && key === 'escape') {
      this.closeSettings()
    } else if (this.state === 'travel' && key === 'escape') {
      this.closeTravel()
    } else if (this.state === 'quests' && key === 'escape') {
      this.closeQuests()
    } else if (this.state === 'shop' && key === 'escape') {
      this.closeShop()
    } else if (this.state === 'focus' && key === 'escape') {
      this.closeFocus()
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
      this.ui.showToast('Mouse captured · E focus · F fire · Q quests · Esc settings', 2600)
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

  openQuests() {
    if (this.state !== 'playing') return
    this.state = 'quests'
    this.clearInput()
    if (document.pointerLockElement) document.exitPointerLock()
    this.ui.openQuests(this._questData())
  }

  closeQuests() {
    if (this.state !== 'quests') return
    this.ui.closeQuests()
    this.state = 'playing'
    this.syncCamera(true)
  }

  openShop() {
    if (this.state === 'quests') {
      this.ui.closeQuests()
      this.returnState = 'playing'
    } else if (this.state === 'playing') {
      this.returnState = 'playing'
      this.clearInput()
      if (document.pointerLockElement) document.exitPointerLock()
    } else if (this.state === 'intro') {
      this.returnState = 'intro'
    } else {
      return
    }
    this.state = 'shop'
    this.shopNotice = ''
    this.ui.openShop(this._shopData())
  }

  closeShop() {
    if (this.state !== 'shop') return
    this.ui.closeShop()
    this.state = this.returnState
    if (this.state === 'playing') this.syncCamera(true)
  }

  _questData() {
    return {
      shards: this.save.shards,
      dayEndsAt: this.save.dayEndsAt,
      technique: this.save.technique,
      tasks: this.save.tasks,
      inventory: this.save.inventory,
      slots: this.save.slots,
    }
  }

  _shopData() {
    return {
      shards: this.save.shards,
      bought: this.save.shopBought,
      inventory: this.save.inventory,
      slots: this.save.slots,
      notice: this.shopNotice,
    }
  }

  buyItem(id) {
    const item = SHOP_ITEMS.find((entry) => entry.id === id)
    if (!item || this.save.shopBought.includes(id)) return
    if (this.save.shards < item.price) {
      this.shopNotice = 'Not enough shards. Seal more quests to earn currency.'
      this.ui.updateShop(this._shopData())
      this.ui.showToast(this.shopNotice)
      return
    }
    if (id !== 'pocket' && this.save.inventory.length >= this.save.slots) {
      this.shopNotice = 'Your satchel is full. Use an item or buy Satchel Weave.'
      this.ui.updateShop(this._shopData())
      this.ui.showToast(this.shopNotice)
      return
    }
    this.save.shards -= item.price
    this.save.shopBought.push(id)
    if (id === 'pocket') {
      this.save.slots += 2
      this.shopNotice = 'Satchel expanded by two slots for today.'
    } else {
      this.save.inventory.push(id)
      this.shopNotice = `${item.name} placed in your satchel.`
    }
    this.persist()
    this.ui.updateShop(this._shopData())
    this.ui.setIntroShards(this.save.shards)
    if (this.state !== 'intro') this.updateHUD()
    this.ui.showToast(this.shopNotice)
  }

  useItem(id, index) {
    const item = SHOP_ITEMS.find((entry) => entry.id === id)
    if (!item || this.save.inventory[index] !== id) return
    let used = false
    let message = item.use
    if (id === 'chrono') {
      const pending = this.save.tasks.filter((task) => task.status === 'pending' && task.dueAt)
      if (!pending.length) {
        this.ui.showToast('No active deadlines to extend.')
        return
      }
      for (const task of pending) task.dueAt += 10 * 60000
      message = 'Chrono Charm extended every active deadline by ten minutes.'
      used = true
    } else if (id === 'ward') {
      this.save.buffs.ward += 1
      message = 'Weakness Ward will absorb the next missed deadline or night penalty.'
      used = true
    } else if (id === 'lens') {
      this.save.buffs.lens += 2
      message = 'Focus Lens will boost the next two quest rewards by 30%.'
      used = true
    } else if (id === 'draught') {
      if (this.save.weakness <= 0) {
        this.ui.showToast('You have no weakness to clear.')
        return
      }
      this.save.weakness = Math.max(0, this.save.weakness - 1)
      message = 'Clarity Draught cleared one stack of weakness.'
      used = true
    }
    if (!used) return
    this.save.inventory.splice(index, 1)
    this.persist()
    this.ui.setIntroShards(this.save.shards)
    if (this.state === 'shop') this.ui.updateShop(this._shopData())
    if (this.state === 'quests') this.ui.updateQuestBoard(this._questData())
    if (this.state !== 'intro') this.updateHUD()
    this.ui.showToast(message)
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
    if (this.nearInteractable.type === 'obelisk') this.openFocusSession()
    else if (this.nearInteractable.type === 'gate') this.openTravel()
  }

  openFocusSession() {
    const task = this.save.tasks.find((entry) => entry.status === 'pending')
    if (!task) {
      const failed = this.save.tasks.some((entry) => entry.status === 'failed')
      this.ui.showToast(failed ? 'Every remaining quest missed its deadline. Add fresh work or restart the day.' : 'All quests are sealed. The maze is yours to explore.', 5000)
      return
    }
    if (task.dueAt && Date.now() >= task.dueAt) {
      this.expireTask(task)
      return
    }
    const technique = TECHNIQUE_MAP[this.save.technique] || TECHNIQUES[0]
    const iris = FRIEND.iris
    const sprintSeconds = Math.max(10, Math.round(task.sprintSeconds * (iris?.sprint || 1)))
    this.state = 'focus'
    this.clearInput()
    if (document.pointerLockElement) document.exitPointerLock()
    this.ui.hidePrompt()
    this.ui.setTargeting(false)
    this.focus = {
      taskId: task.id,
      running: false,
      ready: false,
      endsAt: 0,
      remaining: sprintSeconds,
      total: sprintSeconds,
    }
    this.ui.showFocusSession({
      zone: ZONES[this.world.zoneIndex],
      task: { ...task, focus: this.save.focus },
      technique,
      dueLabel: this._dueLabel(task, Date.now()),
      sprintSeconds,
    })
  }

  startFocusSprint() {
    if (this.state !== 'focus' || !this.focus || this.focus.running || this.focus.ready) return
    const task = this.save.tasks.find((entry) => entry.id === this.focus.taskId)
    if (!task || task.status !== 'pending') return
    if (task.dueAt && Date.now() >= task.dueAt) {
      this.expireTask(task)
      return
    }
    this.focus.running = true
    this.focus.endsAt = performance.now() + this.focus.total * 1000
    this.ui.setFocusRunning()
  }

  completeTask() {
    if (this.state !== 'focus' || !this.focus || !this.focus.ready) return
    const task = this.save.tasks.find((entry) => entry.id === this.focus.taskId)
    if (!task || task.status !== 'pending') return
    if (task.dueAt && Date.now() >= task.dueAt) {
      this.expireTask(task)
      return
    }
    const now = Date.now()
    task.status = 'done'
    task.completedAt = now
    task.note = this.ui.focusNote
    const nova = FRIEND.nova
    let reward = QUEST_REWARD + (nova?.shards || 0)
    if (this.save.buffs.lens > 0) {
      reward = Math.round(reward * 1.3)
      this.save.buffs.lens -= 1
    }
    this.save.shards += reward
    this.save.charges = Math.min(8, this.save.charges + 1)
    syncDerived(this.save)
    const allDone = this.save.tasks.length > 0 && this.save.tasks.every((entry) => entry.status === 'done')
    if (allDone) this.save.totalRites = (this.save.totalRites || 0) + 1
    this.persist()
    this.world.setProgress(this.save.completed, this.save.unlockedMax)
    const p = this.world.getObeliskPosition(this.world.zoneIndex).clone()
    p.y += 5
    this.world.spawnBurst(p, ZONES[this.world.zoneIndex].accent, 64)
    this.state = 'reward'
    this.ui.hideFocusSession()
    this.ui.setFocusTimer(0, 1)
    this.focus = null
    this.updateHUD()
    const remaining = this.save.tasks.filter((entry) => entry.status === 'pending').length
    this.ui.showReward({
      kicker: allDone ? 'The day is sealed' : 'Quest sealed',
      title: allDone ? 'Every Crystal Answers' : 'The Blue Maze Remembers',
      copy: allDone
        ? 'Every quest you defined is complete before the day’s end. Your shards, streak, and crystal friends hold the memory.'
        : 'The focus sprint became light. The next beacon is open, but the clock still moves.',
      shards: reward,
      charge: 1,
      next: allDone ? 'Day complete' : `${remaining} remaining`,
    })
  }

  closeFocus() {
    if (this.state !== 'focus') return
    this.ui.hideFocusSession()
    this.focus = null
    this.state = 'playing'
    this.syncCamera(true)
  }

  closeReward() {
    if (this.state !== 'reward') return
    this.ui.hideReward()
    this.state = 'playing'
    this.updateHUD()
    this.syncCamera(true)
    const remaining = this.save.tasks.filter((entry) => entry.status === 'pending').length
    if (remaining) this.ui.showToast(`${remaining} quest${remaining === 1 ? '' : 's'} remain. Watch the deadline.`, 4800)
    else this.ui.showToast('Day complete. Explore freely, shop, or return tomorrow with new work.', 5200)
  }

  _dueLabel(task, now) {
    if (!task.dueAt) return 'Starts on entry'
    const left = task.dueAt - now
    if (left <= 0) return 'Deadline missed'
    const total = Math.ceil(left / 1000)
    const m = Math.floor(total / 60)
    const s = total % 60
    return m > 0 ? `${m}m ${String(s).padStart(2, '0')}s left` : `${s}s left`
  }

  expireTask(task, quiet = false) {
    if (!task || task.status !== 'pending') return
    task.status = 'failed'
    task.failedAt = Date.now()
    let message
    if (this.save.buffs.ward > 0) {
      this.save.buffs.ward -= 1
      message = `“${task.title}” missed its deadline, but a Weakness Ward absorbed the penalty.`
    } else {
      this.save.weakness = Math.min(MAX_WEAKNESS, this.save.weakness + 1)
      this.save.shards = Math.floor(this.save.shards * 0.8)
      this.save.streak = 0
      message = `“${task.title}” missed its deadline. Weakness ×${this.save.weakness}; shards lost.`
    }
    if (this.focus?.taskId === task.id) {
      this.focus.running = false
      this.focus.ready = false
      this.ui.setFocusFailed(message)
    }
    syncDerived(this.save)
    this.persist()
    this.updateHUD()
    if (this.state === 'quests') this.ui.updateQuestBoard(this._questData())
    if (!quiet) this.ui.showToast(message, 5600)
  }

  _expireDueTasks(quiet = false) {
    const now = Date.now()
    for (const task of this.save.tasks) {
      if (task.status === 'pending' && task.dueAt && now >= task.dueAt) this.expireTask(task, quiet)
    }
    if (now >= this.save.dayEndsAt && !this.save.dayPenaltyApplied) this.applyNightPenalty()
  }

  applyNightPenalty() {
    if (this.save.dayPenaltyApplied) return
    for (const task of this.save.tasks) {
      if (task.status === 'pending') {
        task.status = 'failed'
        task.failedAt = Date.now()
      }
    }
    let message
    if (this.save.buffs.ward > 0) {
      this.save.buffs.ward -= 1
      message = 'Midnight passed. A Weakness Ward absorbed the night penalty, but unfinished quests are lost.'
    } else {
      this.save.weakness = Math.min(MAX_WEAKNESS, this.save.weakness + 2)
      this.save.shards = Math.floor(this.save.shards * 0.5)
      this.save.streak = 0
      message = 'Midnight passed with unfinished quests. Half your shards are gone and weakness ×2 remains.'
    }
    this.save.dayPenaltyApplied = true
    syncDerived(this.save)
    this.persist()
    this.updateHUD()
    if (this.state === 'quests') this.ui.updateQuestBoard(this._questData())
    if (this.state === 'focus') this.ui.setFocusFailed('Midnight passed. The unfinished quest is lost.')
    this.ui.showToast(message, 7000)
  }

  _tickDeadlines() {
    const now = Date.now()
    if (now - this.deadlineTick < 400) return
    this.deadlineTick = now
    if (this.state === 'intro') return
    this._expireDueTasks()
    if (this.state === 'focus' && this.focus) {
      const task = this.save.tasks.find((entry) => entry.id === this.focus.taskId)
      if (task) this.ui.setFocusDue(this._dueLabel(task, now))
    }
    if (this.state === 'quests') this.ui.updateQuestBoard(this._questData())
    if (this.state === 'playing') {
      const pending = this.save.tasks.find((entry) => entry.status === 'pending')
      if (pending && pending.dueAt) {
        this.ui.el.nextDue.textContent = `Next deadline in ${this._dueLabel(pending, now)}`
        this.ui.el.nextDue.classList.toggle('urgent', pending.dueAt - now < 120000)
      }
    }
  }

  _updateFocusTimer() {
    if (this.state !== 'focus' || !this.focus) return
    let remaining = this.focus.remaining
    if (this.focus.running) {
      remaining = Math.max(0, (this.focus.endsAt - performance.now()) / 1000)
      if (remaining <= 0) {
        this.focus.running = false
        this.focus.ready = true
        this.focus.remaining = 0
        this.ui.setFocusTimer(0, this.focus.total)
        this.ui.setFocusReady()
        return
      }
      this.focus.remaining = remaining
    }
    if (!this.focus.ready) this.ui.setFocusTimer(remaining, this.focus.total)
  }

  fire() {
    if (this.state !== 'playing') return
    if (this.save.charges <= 0) {
      this.weapon.dormantPulse()
      this.ui.showToast('The prism is dormant. Seal a focus quest to earn Aether charges.', 3600)
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
    this.world.spawnBeam(from, target, 0x8fe8ff)
    if (this.save.charges === 0) this.ui.showToast('Aether depleted. Seal a focus quest to recharge.', 3600)
  }

  resetDay() {
    if (!window.confirm('Restart today’s rite? All quests, shards, items, and weakness for today will be cleared.')) return
    try {
      localStorage.removeItem(SAVE_KEY)
      localStorage.removeItem(LEGACY_KEY)
    } catch { /* ignore */ }
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
    const luma = FRIEND.luma
    const weaknessFactor = Math.max(0.58, 1 - this.save.weakness * 0.085)
    const speed = 5.1 * (luma?.speed || 1) * weaknessFactor
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
    const y = this.world.heightAt(0, 0) + 6.2 + Math.sin(this.elapsed * 0.2) * 0.2
    this.world.camera.position.set(x, y, z)
    this.world.camera.lookAt(0, 4.2, -9)
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
    this._tickDeadlines()
    this._updateFocusTimer()
    this.world.update(dt, this.world.camera, this.player.position)
    this.weapon.update(dt, this.elapsed, this.player.moving, this.lookDelta)
    this.weapon.group.visible = this.state !== 'intro' && this.save.charges > 0 && this.world.camera.aspect >= 0.9
    this.lookDelta.x *= 0.82
    this.lookDelta.y *= 0.82
    this.world.render()
  }
}
