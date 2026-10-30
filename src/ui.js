import { TECHNIQUES, TECHNIQUE_MAP, ZONES, SHOP_ITEMS, COMPANIONS } from './data.js'

const $ = (id) => document.getElementById(id)
const formatDuration = (ms) => {
  if (!Number.isFinite(ms)) return '—'
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`
  return `${s}s`
}

export class UI {
  constructor() {
    this.el = {
      intro: $('intro'),
      techniqueGrid: $('techniqueGrid'),
      topicInput: $('topicInput'),
      focusHint: $('focusHint'),
      taskTitle: $('taskTitle'),
      taskWindow: $('taskWindow'),
      taskSprint: $('taskSprint'),
      addTaskBtn: $('addTaskBtn'),
      plannerTasks: $('plannerTasks'),
      plannerCount: $('plannerCount'),
      beginBtn: $('beginBtn'),
      openShopBtn: $('openShopBtn'),
      introShards: $('introShards'),
      introNotice: $('introNotice'),
      hud: $('hud'),
      hudTechnique: $('hudTechnique'),
      hudFocus: $('hudFocus'),
      hudSector: $('hudSector'),
      hudShards: $('hudShards'),
      hudWeakness: $('hudWeakness'),
      missionDots: $('missionDots'),
      objectiveText: $('objectiveText'),
      nextDue: $('nextDue'),
      chargePips: $('chargePips'),
      chargeText: $('chargeText'),
      questsBtn: $('questsBtn'),
      shopBtn: $('shopBtn'),
      settingsBtn: $('settingsBtn'),
      crosshair: $('crosshair'),
      targetTag: $('targetTag'),
      prompt: $('prompt'),
      promptLabel: $('promptLabel'),
      interactBtn: $('interactBtn'),
      toast: $('toast'),
      touchLayer: $('touchLayer'),
      joystick: $('joystick'),
      joyThumb: $('joyThumb'),
      fireBtn: $('fireBtn'),
      hintText: $('hintText'),
      focusSession: $('focusSession'),
      focusSigil: $('focusSigil'),
      focusKicker: $('focusKicker'),
      focusTitle: $('focusTitle'),
      focusMeta: $('focusMeta'),
      focusGuide: $('focusGuide'),
      focusSteps: $('focusSteps'),
      focusDue: $('focusDue'),
      focusSprintTime: $('focusSprintTime'),
      focusRingFill: $('focusRingFill'),
      focusProgressBar: $('focusProgressBar'),
      focusStatus: $('focusStatus'),
      focusNoteField: $('focusNoteField'),
      focusNote: $('focusNote'),
      startFocusBtn: $('startFocusBtn'),
      completeTaskBtn: $('completeTaskBtn'),
      closeFocus: $('closeFocus'),
      reward: $('reward'),
      rewardKicker: $('rewardKicker'),
      rewardTitle: $('rewardTitle'),
      rewardCopy: $('rewardCopy'),
      rewardShards: $('rewardShards'),
      rewardCharge: $('rewardCharge'),
      rewardNext: $('rewardNext'),
      rewardBtn: $('rewardBtn'),
      quests: $('quests'),
      closeQuests: $('closeQuests'),
      questShards: $('questShards'),
      questDeadline: $('questDeadline'),
      questTechnique: $('questTechnique'),
      questList: $('questList'),
      questTitle: $('questTitle'),
      questWindow: $('questWindow'),
      questSprint: $('questSprint'),
      addQuestBtn: $('addQuestBtn'),
      questShopBtn: $('questShopBtn'),
      inventoryGrid: $('inventoryGrid'),
      inventoryCount: $('inventoryCount'),
      friendsPanel: $('friendsPanel'),
      shop: $('shop'),
      closeShop: $('closeShop'),
      shopShards: $('shopShards'),
      shopStatus: $('shopStatus'),
      shopList: $('shopList'),
      shopInventory: $('shopInventory'),
      shopSlots: $('shopSlots'),
      settings: $('settings'),
      closeSettings: $('closeSettings'),
      sensitivity: $('sensitivity'),
      tiltBtn: $('tiltBtn'),
      tiltStatus: $('tiltStatus'),
      comfortBtn: $('comfortBtn'),
      travelBtn: $('travelBtn'),
      resetDayBtn: $('resetDayBtn'),
      travel: $('travel'),
      closeTravel: $('closeTravel'),
      travelList: $('travelList'),
      transition: $('transition'),
      transitionTitle: $('transitionTitle'),
      transitionSub: $('transitionSub'),
    }
    this.selectedTechnique = null
    this.toastTimer = null
    this.taskCount = 0
    this._buildTechniques()
    this._buildPips()
    this._buildFriends()
    this._bind()
  }

  _buildTechniques() {
    this.el.techniqueGrid.innerHTML = ''
    for (const technique of TECHNIQUES) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'subject-chip'
      btn.dataset.technique = technique.id
      btn.innerHTML = `<span class="glyph">${technique.glyph}</span><span class="label">${technique.name}</span>`
      btn.title = technique.blurb
      btn.addEventListener('click', () => this.selectTechnique(technique.id))
      this.el.techniqueGrid.appendChild(btn)
    }
  }

  _buildPips() {
    this.el.chargePips.innerHTML = ''
    for (let i = 0; i < 8; i++) this.el.chargePips.appendChild(document.createElement('i'))
  }

  _buildFriends() {
    this.el.friendsPanel.innerHTML = COMPANIONS.map((friend) =>
      `<div class="friend-row"><b>${friend.glyph}</b>${friend.name}<span>${friend.buff}</span></div>`
    ).join('')
  }

  _bind() {
    this.el.beginBtn.addEventListener('click', () => this.onBegin?.())
    this.el.topicInput.addEventListener('input', () => this.updateFocusHint())
    this.el.topicInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !this.el.beginBtn.disabled) this.onBegin?.()
    })
    this.el.taskTitle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._addPlannedTask()
    })
    this.el.addTaskBtn.addEventListener('click', () => this._addPlannedTask())
    this.el.questTitle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._addQuest()
    })
    this.el.addQuestBtn.addEventListener('click', () => this._addQuest())
    this.el.openShopBtn.addEventListener('click', () => this.onOpenShop?.('intro'))
    this.el.shopBtn.addEventListener('click', () => this.onOpenShop?.('game'))
    this.el.questShopBtn.addEventListener('click', () => this.onOpenShop?.('game'))
    this.el.questsBtn.addEventListener('click', () => this.onOpenQuests?.())
    this.el.closeQuests.addEventListener('click', () => this.onCloseQuests?.())
    this.el.closeShop.addEventListener('click', () => this.onCloseShop?.())
    this.el.settingsBtn.addEventListener('click', () => this.onSettings?.())
    this.el.interactBtn.addEventListener('click', () => this.onInteract?.())
    this.el.fireBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.onFire?.() })
    this.el.rewardBtn.addEventListener('click', () => this.onRewardClose?.())
    this.el.startFocusBtn.addEventListener('click', () => this.onStartFocus?.())
    this.el.completeTaskBtn.addEventListener('click', () => this.onCompleteTask?.())
    this.el.closeFocus.addEventListener('click', () => this.onCloseFocus?.())
    this.el.closeSettings.addEventListener('click', () => this.onCloseSettings?.())
    this.el.closeTravel.addEventListener('click', () => this.onCloseTravel?.())
    this.el.sensitivity.addEventListener('input', () => this.onSensitivity?.(Number(this.el.sensitivity.value)))
    this.el.tiltBtn.addEventListener('click', () => this.onTiltToggle?.())
    this.el.comfortBtn.addEventListener('click', () => this.onComfortToggle?.())
    this.el.travelBtn.addEventListener('click', () => this.onOpenTravel?.())
    this.el.resetDayBtn.addEventListener('click', () => this.onResetDay?.())
  }

  _addPlannedTask() {
    const title = this.el.taskTitle.value.trim()
    if (title.length < 2) {
      this.showToast('Name the quest before adding it.')
      return
    }
    const windowMinutes = Number(this.el.taskWindow.value)
    const sprintSeconds = Number(this.el.taskSprint.value)
    this.onAddTask?.({ title, windowMinutes, sprintSeconds, source: 'intro' })
    this.el.taskTitle.value = ''
    this.el.taskTitle.focus()
  }

  _addQuest() {
    const title = this.el.questTitle.value.trim()
    if (title.length < 2) {
      this.showToast('Name the quest before adding it.')
      return
    }
    const windowMinutes = Number(this.el.questWindow.value)
    const sprintSeconds = Number(this.el.questSprint.value)
    this.onAddTask?.({ title, windowMinutes, sprintSeconds, source: 'game' })
    this.el.questTitle.value = ''
  }

  selectTechnique(id, focus = null) {
    if (!TECHNIQUE_MAP[id]) return
    this.selectedTechnique = id
    for (const chip of this.el.techniqueGrid.children) chip.classList.toggle('active', chip.dataset.technique === id)
    if (focus !== null) this.el.topicInput.value = focus
    this.updateFocusHint()
    this.updateBeginState()
    this.onTechniqueSelected?.(id)
  }

  get technique() { return this.selectedTechnique }
  get focus() { return this.el.topicInput.value.trim() }

  updateFocusHint() {
    const focus = this.focus
    const technique = TECHNIQUE_MAP[this.selectedTechnique]
    if (!technique) {
      this.el.focusHint.textContent = 'Choose a technique above, then name the work you want to remember.'
      this.el.focusHint.classList.remove('matched')
      this.updateBeginState()
      return
    }
    if (focus.length > 1) {
      this.el.focusHint.textContent = `${technique.name} · ${technique.guide}`
      this.el.focusHint.classList.add('matched')
    } else {
      this.el.focusHint.textContent = `Name today's focus. ${technique.blurb}.`
      this.el.focusHint.classList.remove('matched')
    }
    this.updateBeginState()
  }

  updateBeginState() {
    this.el.beginBtn.disabled = !(this.selectedTechnique && this.focus.length > 1 && this.taskCount > 0)
  }

  setBeginLabel(text) {
    const span = this.el.beginBtn.querySelector('span')
    if (span) span.textContent = text
  }

  setIntroShards(shards) { this.el.introShards.textContent = String(shards) }

  setIntroNotice(text) {
    this.el.introNotice.textContent = text || ''
    this.el.introNotice.classList.toggle('hidden', !text)
  }

  renderPlanner(tasks = []) {
    this.taskCount = tasks.length
    this.el.plannerCount.textContent = `${tasks.length} quest${tasks.length === 1 ? '' : 's'} forged`
    if (!tasks.length) {
      this.el.plannerTasks.innerHTML = '<div class="planner-empty">No quests yet. Add at least one to enter the maze.</div>'
    } else {
      this.el.plannerTasks.innerHTML = ''
      tasks.forEach((task) => {
        const row = document.createElement('div')
        row.className = 'planner-task'
        row.innerHTML = `<div><strong>${this._escape(task.title)}</strong><span>${task.windowMinutes} min deadline · ${task.sprintSeconds}s sprint</span></div>`
        const remove = document.createElement('button')
        remove.type = 'button'
        remove.className = 'task-remove'
        remove.setAttribute('aria-label', `Remove ${task.title}`)
        remove.textContent = '✕'
        remove.addEventListener('click', () => this.onRemoveTask?.(task.id))
        row.appendChild(remove)
        this.el.plannerTasks.appendChild(row)
      })
    }
    this.updateBeginState()
  }

  setTilt(enabled, status = null) {
    this.el.tiltBtn.setAttribute('aria-checked', String(enabled))
    if (status) this.el.tiltStatus.textContent = status
  }

  setComfort(enabled) { this.el.comfortBtn.setAttribute('aria-checked', String(enabled)) }
  setSensitivity(value) { this.el.sensitivity.value = String(value) }

  hideIntro() {
    this.el.intro.classList.add('fading')
    setTimeout(() => this.el.intro.classList.add('hidden'), 850)
    this.el.hud.classList.remove('hidden')
  }

  updateHUD(data) {
    const zone = ZONES[data.zoneIndex]
    const technique = TECHNIQUE_MAP[data.technique] || TECHNIQUES[0]
    this.el.hudTechnique.textContent = `${technique.glyph} ${technique.name.toUpperCase()}`
    this.el.hudTechnique.style.color = technique.accent
    this.el.hudFocus.textContent = data.focus || '—'
    this.el.hudSector.textContent = `Sector ${zone.numeral} · ${zone.name}`
    this.el.hudShards.textContent = String(data.shards)
    this.el.hudWeakness.textContent = data.weakness > 0 ? `Weakness ×${data.weakness}` : 'No weakness'
    this.el.hudWeakness.classList.toggle('weakness-live', data.weakness > 0)
    this.el.hudWeakness.classList.toggle('weakness-zero', data.weakness === 0)
    document.body.classList.toggle('weakness-live', data.weakness > 0)

    const tasks = data.tasks || []
    this.el.missionDots.innerHTML = ''
    const dotCount = Math.max(3, Math.min(6, tasks.length || 3))
    for (let i = 0; i < dotCount; i++) {
      const dot = document.createElement('i')
      const task = tasks[i]
      if (task?.status === 'done') dot.className = 'done'
      else if (task?.status === 'failed') dot.className = 'failed'
      else if (i === tasks.findIndex((t) => t.status === 'pending')) dot.className = 'current'
      this.el.missionDots.appendChild(dot)
    }

    const done = tasks.filter((t) => t.status === 'done').length
    const failed = tasks.filter((t) => t.status === 'failed').length
    const pending = tasks.find((t) => t.status === 'pending')
    if (tasks.length && done >= tasks.length) {
      this.el.objectiveText.textContent = 'All quests sealed · the maze remembers'
    } else if (pending) {
      this.el.objectiveText.textContent = `${done + failed + 1}/${tasks.length} · ${pending.title}`
    } else {
      this.el.objectiveText.textContent = data.completed >= 3 ? 'Day complete · the Atlas remembers' : 'Complete your next focus quest'
    }
    this.el.nextDue.textContent = pending ? `Next deadline in ${formatDuration(pending.dueAt - Date.now())}` : 'No active deadline'
    this.el.nextDue.classList.toggle('urgent', !!pending && pending.dueAt - Date.now() < 120000)

    const pips = this.el.chargePips.children
    for (let i = 0; i < pips.length; i++) pips[i].className = i < data.charges ? 'full' : ''
    this.el.chargeText.textContent = data.charges > 0 ? `${data.charges} charge${data.charges === 1 ? '' : 's'} ready` : 'Dormant'
    this.el.chargeText.classList.toggle('ready', data.charges > 0)
    this.el.travelBtn.classList.toggle('hidden', data.unlockedMax < 1)
    this.el.hintText.textContent = tasks.length && done >= tasks.length
      ? 'Every quest is sealed. Explore the maze, shop, or return tomorrow with new work.'
      : 'The blue maze answers only to quests you finish before their deadline.'
  }

  setTouchVisible(visible) { this.el.touchLayer.classList.toggle('hidden', !visible) }
  showPrompt(label) { this.el.promptLabel.textContent = label; this.el.prompt.classList.remove('hidden') }
  hidePrompt() { this.el.prompt.classList.add('hidden') }
  setTargeting(targeting) {
    this.el.crosshair.classList.toggle('targeting', targeting)
    this.el.targetTag.classList.toggle('hidden', !targeting)
  }

  showToast(text, duration = 3600) {
    this.el.toast.textContent = text
    this.el.toast.classList.remove('hidden')
    clearTimeout(this.toastTimer)
    this.toastTimer = setTimeout(() => this.el.toast.classList.add('hidden'), duration)
  }

  showFocusSession({ zone, task, technique, dueLabel, sprintSeconds }) {
    this.el.focusSession.classList.remove('hidden')
    this.el.focusSigil.textContent = technique.glyph
    this.el.focusSigil.style.color = technique.accent
    this.el.focusKicker.textContent = zone.kicker
    this.el.focusTitle.textContent = task.title
    this.el.focusMeta.textContent = `${technique.name} · ${task.focus || 'today’s focus'}`
    this.el.focusGuide.textContent = technique.guide
    this.el.focusSteps.innerHTML = technique.steps.map((step) => `<li>${this._escape(step)}</li>`).join('')
    this.el.focusDue.textContent = dueLabel
    this.el.focusSprintTime.textContent = String(Math.ceil(sprintSeconds))
    this.el.focusRingFill.style.strokeDashoffset = '0'
    this.el.focusProgressBar.style.width = '0%'
    this.el.focusStatus.textContent = 'Start the sprint. Stay with the technique until the ring closes.'
    this.el.focusNoteField.classList.remove('visible')
    this.el.focusNote.value = ''
    this.el.startFocusBtn.disabled = false
    this.el.startFocusBtn.textContent = 'Begin sprint'
    this.el.completeTaskBtn.disabled = true
  }

  setFocusTimer(remaining, total) {
    const pct = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0
    this.el.focusSprintTime.textContent = String(Math.max(0, Math.ceil(remaining)))
    this.el.focusRingFill.style.strokeDashoffset = String((1 - pct) * 100)
    this.el.focusProgressBar.style.width = `${(1 - pct) * 100}%`
  }

  setFocusRunning() {
    this.el.startFocusBtn.disabled = true
    this.el.startFocusBtn.textContent = 'Sprint running'
    this.el.focusStatus.textContent = 'Stay with the technique. The quest can be sealed when the ring closes.'
  }

  setFocusReady(status = 'Sprint complete. Record one thing you will remember, then seal the quest.') {
    this.el.focusSprintTime.textContent = '0'
    this.el.focusRingFill.style.strokeDashoffset = '100'
    this.el.focusProgressBar.style.width = '100%'
    this.el.focusNoteField.classList.add('visible')
    this.el.focusStatus.textContent = status
    this.el.completeTaskBtn.disabled = false
    this.el.startFocusBtn.disabled = true
    this.el.startFocusBtn.textContent = 'Sprint complete'
  }

  setFocusFailed(status) {
    this.el.focusStatus.textContent = status
    this.el.focusNoteField.classList.remove('visible')
    this.el.completeTaskBtn.disabled = true
    this.el.startFocusBtn.disabled = true
    this.el.startFocusBtn.textContent = 'Deadline missed'
  }

  setFocusDue(label) { this.el.focusDue.textContent = label }
  get focusNote() { return this.el.focusNote.value.trim() }
  hideFocusSession() { this.el.focusSession.classList.add('hidden') }

  showReward(data) {
    this.el.reward.classList.remove('hidden')
    this.el.rewardKicker.textContent = data.kicker
    this.el.rewardTitle.textContent = data.title
    this.el.rewardCopy.textContent = data.copy
    this.el.rewardShards.textContent = `+${data.shards}`
    this.el.rewardCharge.textContent = `+${data.charge}`
    this.el.rewardNext.textContent = data.next
  }

  hideReward() { this.el.reward.classList.add('hidden') }

  openQuests(data) {
    this.el.quests.classList.remove('hidden')
    this.updateQuestBoard(data)
  }
  closeQuests() { this.el.quests.classList.add('hidden') }

  updateQuestBoard(data) {
    this.el.questShards.textContent = String(data.shards)
    this.el.questDeadline.textContent = formatDuration(data.dayEndsAt - Date.now())
    const technique = TECHNIQUE_MAP[data.technique]
    this.el.questTechnique.textContent = technique ? `${technique.glyph} ${technique.name}` : 'No technique'
    this.el.questList.innerHTML = ''
    if (!data.tasks.length) {
      this.el.questList.innerHTML = '<div class="planner-empty">No quests yet. Add one below.</div>'
    }
    data.tasks.forEach((task) => {
      const row = document.createElement('div')
      row.className = `quest-row ${task.status}`
      const mark = task.status === 'done' ? '✓' : task.status === 'failed' ? '×' : ''
      const due = task.status === 'pending' ? formatDuration(task.dueAt - Date.now()) : task.status === 'done' ? 'Sealed' : 'Missed'
      row.innerHTML = `
        <span class="quest-check">${mark}</span>
        <div class="quest-main"><strong>${this._escape(task.title)}</strong><span>${task.windowMinutes} min deadline · ${task.sprintSeconds}s sprint</span></div>
        <div class="quest-time ${task.status === 'pending' && task.dueAt - Date.now() < 120000 ? 'urgent' : ''}">${due}<small>${task.status}</small></div>`
      this.el.questList.appendChild(row)
    })
    this.el.inventoryGrid.innerHTML = ''
    this._renderInventory(this.el.inventoryGrid, data.inventory, data.slots, (id, index) => this.onUseItem?.(id, index))
    this.el.inventoryCount.textContent = `${data.inventory.length} / ${data.slots} slots`
  }

  openShop(data) {
    this.el.shop.classList.remove('hidden')
    this.updateShop(data)
  }
  closeShop() { this.el.shop.classList.add('hidden') }

  updateShop(data) {
    this.el.shopShards.textContent = String(data.shards)
    this.el.shopStatus.textContent = data.notice || 'Daily stock: one of each charm per day.'
    this.el.shopList.innerHTML = ''
    for (const item of SHOP_ITEMS) {
      const sold = data.bought.includes(item.id)
      const row = document.createElement('div')
      row.className = `shop-item ${sold ? 'sold' : ''}`
      row.innerHTML = `
        <span class="shop-glyph">${item.glyph}</span>
        <div><strong>${item.name}</strong><span>${item.desc}</span></div>`
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'ghost-btn shop-buy'
      const needsSlot = item.id !== 'pocket'
      const noSlot = needsSlot && data.inventory.length >= data.slots
      const poor = data.shards < item.price
      btn.textContent = sold ? 'Sold out' : `${item.price} shards`
      btn.disabled = sold || poor || noSlot
      btn.addEventListener('click', () => this.onBuyItem?.(item.id))
      row.appendChild(btn)
      this.el.shopList.appendChild(row)
    }
    this.el.shopInventory.innerHTML = ''
    this._renderInventory(this.el.shopInventory, data.inventory, data.slots, (id, index) => this.onUseItem?.(id, index))
    this.el.shopSlots.textContent = `${data.inventory.length} / ${data.slots} slots filled`
  }

  _renderInventory(target, inventory, slots, onUse) {
    target.innerHTML = ''
    for (let i = 0; i < slots; i++) {
      const id = inventory[i]
      const item = SHOP_ITEMS.find((entry) => entry.id === id)
      if (!item) {
        const empty = document.createElement('div')
        empty.className = 'inventory-slot'
        empty.textContent = 'empty slot'
        target.appendChild(empty)
        continue
      }
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'inventory-slot'
      btn.innerHTML = `<b>${item.glyph}</b><strong>${item.name}</strong><span>${item.use}</span>`
      btn.addEventListener('click', () => onUse(item.id, i))
      target.appendChild(btn)
    }
  }

  openSettings() { this.el.settings.classList.remove('hidden') }
  closeSettings() { this.el.settings.classList.add('hidden') }

  openTravel(zones, current, unlockedMax) {
    this.el.travel.classList.remove('hidden')
    this.el.travelList.innerHTML = ''
    zones.forEach((zone, index) => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'travel-option'
      const unlocked = index <= unlockedMax
      btn.disabled = !unlocked || index === current
      const state = index === current ? 'You are here' : unlocked ? 'Enter' : 'Locked by quests'
      btn.innerHTML = `<span class="t-glyph">${zone.glyph}</span><div><strong>${zone.name}</strong><span>Sector ${zone.numeral}</span></div><span class="t-state">${state}</span>`
      btn.addEventListener('click', () => this.onTravel?.(index))
      this.el.travelList.appendChild(btn)
    })
  }

  closeTravel() { this.el.travel.classList.add('hidden') }
  showTransition(title, sub) {
    this.el.transitionTitle.textContent = title
    this.el.transitionSub.textContent = sub
    this.el.transition.classList.remove('hidden')
    requestAnimationFrame(() => this.el.transition.classList.add('visible'))
  }
  hideTransition() {
    this.el.transition.classList.remove('visible')
    setTimeout(() => this.el.transition.classList.add('hidden'), 520)
  }
  setSettingsAvailable(unlockedMax) { this.el.travelBtn.classList.toggle('hidden', unlockedMax < 1) }

  _escape(text) {
    return String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
  }
}
