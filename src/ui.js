import {
  FRIENDS, TECHNIQUES, TECHNIQUE_BY_ID, ZONES, SUGGESTIONS, PACE_OPTIONS,
  formatClock, formatDuration, friendById, itemById,
} from './data.js'

const $ = (id) => document.getElementById(id)
const RING_CIRCUMFERENCE = 2 * Math.PI * 88
const MAX_TASKS = 6
const HEART_MAX = 5
const WEAKNESS_MAX = 3

function uid(prefix = 'v') {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

function truncate(text, length = 54) {
  return text.length > length ? `${text.slice(0, length - 1)}…` : text
}

export class UI {
  constructor() {
    this.el = {
      cover: $('cover'),
      coverShards: $('coverShards'),
      coverStats: $('coverStats'),
      enterBtn: $('enterBtn'),
      intro: $('intro'),
      friendStrip: $('friendStrip'),
      techniqueGrid: $('techniqueGrid'),
      taskInput: $('taskInput'),
      taskMinutes: $('taskMinutes'),
      addTaskBtn: $('addTaskBtn'),
      techniqueHint: $('techniqueHint'),
      suggestionRow: $('suggestionRow'),
      taskList: $('taskList'),
      taskEmpty: $('taskEmpty'),
      plannerShards: $('plannerShards'),
      plannerPace: $('plannerPace'),
      marketBtn: $('marketBtn'),
      beginBtn: $('beginBtn'),
      hud: $('hud'),
      hudPlan: $('hudPlan'),
      hudShards: $('hudShards'),
      hudSector: $('hudSector'),
      dayTime: $('dayTime'),
      dayFill: $('dayFill'),
      missionDots: $('missionDots'),
      objectiveText: $('objectiveText'),
      objectiveTimer: $('objectiveTimer'),
      heartPips: $('heartPips'),
      weaknessPips: $('weaknessPips'),
      weaknessText: $('weaknessText'),
      friendsBtn: $('friendsBtn'),
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
      ritual: $('ritual'),
      ritualSigil: $('ritualSigil'),
      ritualKicker: $('ritualKicker'),
      ritualTitle: $('ritualTitle'),
      ritualFocus: $('ritualFocus'),
      ritualBadge: $('ritualBadge'),
      ritualTime: $('ritualTime'),
      ritualArc: $('ritualArc'),
      ritualCore: $('ritualCore'),
      ritualFill: $('ritualFill'),
      ritualTip: $('ritualTip'),
      focusBtn: $('focusBtn'),
      abandonBtn: $('abandonBtn'),
      reward: $('reward'),
      rewardKicker: $('rewardKicker'),
      rewardTitle: $('rewardTitle'),
      rewardCopy: $('rewardCopy'),
      rewardShards: $('rewardShards'),
      rewardTime: $('rewardTime'),
      rewardTimeLabel: $('rewardTimeLabel'),
      rewardNext: $('rewardNext'),
      rewardBtn: $('rewardBtn'),
      defeat: $('defeat'),
      defeatKicker: $('defeatKicker'),
      defeatTitle: $('defeatTitle'),
      defeatCopy: $('defeatCopy'),
      defeatUnfinished: $('defeatUnfinished'),
      defeatHearts: $('defeatHearts'),
      defeatStreak: $('defeatStreak'),
      defeatBtn: $('defeatBtn'),
      shop: $('shop'),
      closeShop: $('closeShop'),
      shopShards: $('shopShards'),
      shopList: $('shopList'),
      slotCount: $('slotCount'),
      inventoryList: $('inventoryList'),
      friends: $('friends'),
      closeFriends: $('closeFriends'),
      friendsList: $('friendsList'),
      settings: $('settings'),
      closeSettings: $('closeSettings'),
      sensitivity: $('sensitivity'),
      tiltBtn: $('tiltBtn'),
      tiltStatus: $('tiltStatus'),
      comfortBtn: $('comfortBtn'),
      paceGroup: $('paceGroup'),
      paceStatus: $('paceStatus'),
      travelBtn: $('travelBtn'),
      endDayBtn: $('endDayBtn'),
      resetDayBtn: $('resetDayBtn'),
      travel: $('travel'),
      closeTravel: $('closeTravel'),
      travelList: $('travelList'),
      transition: $('transition'),
      transitionTitle: $('transitionTitle'),
      transitionSub: $('transitionSub'),
    }
    this.draftTasks = []
    this.draftTechnique = 'pomodoro'
    this.unlockedFriends = ['lyra']
    this.shopData = null
    this.toastTimer = null
    this._buildCover()
    this._buildTechniques()
    this._buildSuggestions()
    this._buildPips()
    this._bind()
    this.setDraftTechnique('pomodoro', false)
  }

  _buildCover() {
    this.el.coverShards.innerHTML = ''
    for (let i = 0; i < 30; i++) {
      const shard = document.createElement('i')
      const left = Math.random() * 100
      const top = 8 + Math.random() * 84
      const size = 6 + Math.random() * 30
      shard.style.left = `${left}%`
      shard.style.top = `${top}%`
      shard.style.width = `${size}px`
      shard.style.height = `${size * (0.5 + Math.random() * 1.4)}px`
      shard.style.setProperty('--delay', `${-Math.random() * 12}s`)
      shard.style.setProperty('--duration', `${9 + Math.random() * 16}s`)
      shard.style.setProperty('--drift', `${(Math.random() - 0.5) * 70}px`)
      shard.style.opacity = String(0.12 + Math.random() * 0.42)
      this.el.coverShards.appendChild(shard)
    }
  }

  _buildTechniques() {
    this.el.techniqueGrid.innerHTML = ''
    for (const tech of TECHNIQUES) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'technique-chip'
      btn.dataset.technique = tech.id
      btn.innerHTML = `<span class="t-glyph">${tech.glyph}</span><span class="t-name">${tech.name}</span><span class="t-min">${tech.minutes}m</span>`
      btn.style.setProperty('--tech-accent', tech.accent)
      btn.addEventListener('click', () => this.setDraftTechnique(tech.id))
      this.el.techniqueGrid.appendChild(btn)
    }
  }

  _buildSuggestions() {
    this.el.suggestionRow.innerHTML = ''
    for (const suggestion of SUGGESTIONS) {
      const tech = TECHNIQUE_BY_ID[suggestion.technique]
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'suggestion-chip'
      btn.innerHTML = `<span>${tech.glyph}</span>${suggestion.title}`
      btn.addEventListener('click', () => {
        this.el.taskInput.value = suggestion.title
        this.setDraftTechnique(suggestion.technique)
        this.el.taskInput.focus()
      })
      this.el.suggestionRow.appendChild(btn)
    }
  }

  _buildPips() {
    this.el.heartPips.innerHTML = ''
    for (let i = 0; i < HEART_MAX; i++) this.el.heartPips.appendChild(document.createElement('i'))
    this.el.weaknessPips.innerHTML = ''
    for (let i = 0; i < WEAKNESS_MAX; i++) this.el.weaknessPips.appendChild(document.createElement('i'))
  }

  _bind() {
    this.el.enterBtn.addEventListener('click', () => this.onEnter?.())
    this.el.beginBtn.addEventListener('click', () => this.onBegin?.())
    this.el.addTaskBtn.addEventListener('click', () => this.addDraftTask())
    this.el.taskInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        this.addDraftTask()
      }
    })
    this.el.marketBtn.addEventListener('click', () => this.onShop?.())
    this.el.shopBtn.addEventListener('click', () => this.onShop?.())
    this.el.closeShop.addEventListener('click', () => this.onCloseShop?.())
    this.el.friendsBtn.addEventListener('click', () => this.onFriends?.())
    this.el.closeFriends.addEventListener('click', () => this.onCloseFriends?.())
    this.el.settingsBtn.addEventListener('click', () => this.onSettings?.())
    this.el.closeSettings.addEventListener('click', () => this.onCloseSettings?.())
    this.el.rewardBtn.addEventListener('click', () => this.onRewardClose?.())
    this.el.defeatBtn.addEventListener('click', () => this.onDefeat?.())
    this.el.interactBtn.addEventListener('click', () => this.onInteract?.())
    this.el.fireBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.onFire?.() })
    this.el.abandonBtn.addEventListener('click', () => this.onAbandon?.())
    this.el.sensitivity.addEventListener('input', () => this.onSensitivity?.(Number(this.el.sensitivity.value)))
    this.el.tiltBtn.addEventListener('click', () => this.onTiltToggle?.())
    this.el.comfortBtn.addEventListener('click', () => this.onComfortToggle?.())
    this.el.travelBtn.addEventListener('click', () => this.onOpenTravel?.())
    this.el.closeTravel.addEventListener('click', () => this.onCloseTravel?.())
    this.el.endDayBtn.addEventListener('click', () => this.onEndDay?.())
    this.el.resetDayBtn.addEventListener('click', () => this.onResetDay?.())
    this.el.paceGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('.pace-btn')
      if (btn) this.onPace?.(btn.dataset.pace)
    })

    const hold = (active) => (e) => {
      e.preventDefault()
      this.onRitualHold?.(active)
    }
    this.el.focusBtn.addEventListener('pointerdown', hold(true))
    this.el.focusBtn.addEventListener('pointerup', hold(false))
    this.el.focusBtn.addEventListener('pointercancel', hold(false))
    this.el.focusBtn.addEventListener('pointerleave', hold(false))
    this.el.focusBtn.addEventListener('contextmenu', (e) => e.preventDefault())
  }

  setDraftTechnique(id, updateField = true) {
    const tech = TECHNIQUE_BY_ID[id] || TECHNIQUES[0]
    this.draftTechnique = tech.id
    for (const chip of this.el.techniqueGrid.children) {
      chip.classList.toggle('active', chip.dataset.technique === tech.id)
    }
    if (updateField) this.el.taskMinutes.value = String(tech.minutes)
    this.el.techniqueHint.innerHTML = `<b>${tech.name}</b> · ${tech.blurb}`
    this.el.techniqueHint.style.color = tech.accent
  }

  addDraftTask() {
    const title = this.el.taskInput.value.trim()
    if (title.length < 2) {
      this.el.taskInput.focus()
      this.el.techniqueHint.textContent = 'Give the vow a name first. A promise needs words.'
      this.el.techniqueHint.style.color = 'var(--danger)'
      return
    }
    if (this.draftTasks.length >= MAX_TASKS) {
      this.el.techniqueHint.textContent = 'The maze holds six prisms. Keep today to six vows.'
      this.el.techniqueHint.style.color = 'var(--danger)'
      return
    }
    const tech = TECHNIQUE_BY_ID[this.draftTechnique] || TECHNIQUES[0]
    const minutes = Math.max(5, Math.min(90, Number(this.el.taskMinutes.value) || tech.minutes))
    this.draftTasks.push({ id: uid('task'), title, technique: tech.id, minutes })
    this.el.taskInput.value = ''
    this.setDraftTechnique(tech.id, false)
    this.renderTaskList()
    this.updateBeginState()
  }

  removeDraftTask(id) {
    this.draftTasks = this.draftTasks.filter((task) => task.id !== id)
    this.renderTaskList()
    this.updateBeginState()
  }

  renderTaskList() {
    this.el.taskList.innerHTML = ''
    this.el.taskEmpty.classList.toggle('hidden', this.draftTasks.length > 0)
    this.draftTasks.forEach((task, index) => {
      const tech = TECHNIQUE_BY_ID[task.technique] || TECHNIQUES[0]
      const row = document.createElement('div')
      row.className = 'task-row'
      row.style.setProperty('--tech-accent', tech.accent)
      row.innerHTML = `
        <span class="task-index">${String(index + 1).padStart(2, '0')}</span>
        <span class="task-glyph">${tech.glyph}</span>
        <div class="task-copy">
          <strong dir="auto">${escapeHtml(task.title)}</strong>
          <span>${tech.name} · ${task.minutes} min</span>
        </div>
        <button class="task-remove" type="button" aria-label="Remove vow">✕</button>`
      row.querySelector('.task-remove').addEventListener('click', () => this.removeDraftTask(task.id))
      this.el.taskList.appendChild(row)
    })
  }

  updateBeginState() {
    this.el.beginBtn.disabled = this.draftTasks.length === 0
  }

  setBeginLabel(text) {
    const span = this.el.beginBtn.querySelector('span')
    if (span) span.textContent = text
  }

  getPlannedTasks() {
    return this.draftTasks.map((task) => ({ ...task }))
  }

  setPlannedTasks(tasks) {
    this.draftTasks = (tasks || []).map((task) => ({
      id: task.id || uid('task'),
      title: task.title,
      technique: task.technique,
      minutes: Number(task.minutes) || TECHNIQUE_BY_ID[task.technique]?.minutes || 20,
    }))
    this.renderTaskList()
    this.updateBeginState()
  }

  setFriends(ids) {
    this.unlockedFriends = ids || []
    this.el.friendStrip.innerHTML = ''
    for (const friend of FRIENDS) {
      const unlocked = this.unlockedFriends.includes(friend.id)
      const chip = document.createElement('div')
      chip.className = `friend-chip ${unlocked ? 'unlocked' : 'locked'}`
      chip.setAttribute('role', 'listitem')
      chip.style.setProperty('--friend-color', friend.color)
      chip.innerHTML = `
        <span class="friend-glyph">${friend.glyph}</span>
        <div><strong>${friend.name}</strong><span>${unlocked ? friend.perk : 'Locked · find a lantern in the market'}</span></div>`
      this.el.friendStrip.appendChild(chip)
    }
  }

  setShards(value) {
    const text = `✦ ${Math.max(0, Math.round(value))}`
    this.el.plannerShards.textContent = text
    this.el.hudShards.textContent = text
    this.el.shopShards.textContent = `${text} shards`
  }

  setPace(pace) {
    const option = PACE_OPTIONS[pace] || PACE_OPTIONS.steady
    this.el.plannerPace.textContent = `Day pace · ${option.label}`
    this.el.paceStatus.textContent = option.blurb
    for (const btn of this.el.paceGroup.querySelectorAll('.pace-btn')) {
      btn.classList.toggle('active', btn.dataset.pace === pace)
    }
  }

  showCover({ label, streak, rites, shards, friends }) {
    this.el.coverStats.innerHTML = `
      <div><span>${streak || 0}</span><i>day streak</i></div>
      <div><span>${rites || 0}</span><i>vigils kept</i></div>
      <div><span>✦ ${shards || 0}</span><i>shards</i></div>
      <div><span>${friends || 1} / ${FRIENDS.length}</span><i>friends</i></div>`
    const span = this.el.enterBtn.querySelector('span')
    if (span) span.textContent = label || 'Enter the Labyrinth'
    this.el.cover.classList.remove('hidden')
  }

  hideCover() {
    this.el.cover.classList.add('fading')
    setTimeout(() => this.el.cover.classList.add('hidden'), 850)
  }

  showPlanner({ tasks, shards, friends, pace, sealed }) {
    this.el.intro.classList.remove('hidden', 'fading')
    this.setPlannedTasks(tasks || [])
    this.setFriends(friends || this.unlockedFriends)
    this.setShards(shards || 0)
    this.setPace(pace || 'steady')
    if (sealed) {
      this.setBeginLabel('Return to the sealed maze')
      this.el.techniqueHint.textContent = 'Today is sealed. The prisms are quiet, but the maze is open to explore.'
      this.el.techniqueHint.style.color = 'var(--lumen)'
    } else {
      this.setBeginLabel('Seal the day')
    }
    this.updateBeginState()
  }

  hidePlanner() {
    this.el.intro.classList.add('fading')
    setTimeout(() => this.el.intro.classList.add('hidden'), 850)
  }

  showHUD() { this.el.hud.classList.remove('hidden') }
  hideHUD() { this.el.hud.classList.add('hidden') }

  setTaskCount(count) {
    this.el.missionDots.innerHTML = ''
    for (let i = 0; i < Math.max(1, count); i++) this.el.missionDots.appendChild(document.createElement('i'))
  }

  updateHUD(data) {
    const total = data.tasks.length
    const done = data.tasks.filter((task) => task.status === 'done').length
    this.el.hudPlan.textContent = total ? `${done} / ${total} vows` : 'No vows'
    this.setShards(data.shards)
    const zone = ZONES[data.zoneIndex] || ZONES[0]
    this.el.hudSector.textContent = `Sector ${zone.numeral} · ${zone.name}`

    const dots = this.el.missionDots.children
    data.tasks.forEach((task, index) => {
      const dot = dots[index]
      if (!dot) return
      dot.className = task.status === 'done' ? 'done' : task.status === 'failed' ? 'failed' : (index === data.currentIndex ? 'current' : '')
    })

    if (total && done === total) {
      this.el.objectiveText.textContent = 'All vows kept · the day is yours'
    } else if (data.zoneIndex !== 0) {
      this.el.objectiveText.textContent = 'Return to the Azure Labyrinth'
    } else {
      const next = data.tasks.find((task) => task.status !== 'done')
      this.el.objectiveText.textContent = next ? truncate(next.title, 48) : 'Find the lit focus prism'
    }

    const remainingMinutes = Math.max(0, (23 * 60 + 59) - data.clock)
    const hours = Math.floor(remainingMinutes / 60)
    const mins = Math.round(remainingMinutes % 60)
    this.el.objectiveTimer.textContent = data.victory
      ? 'The day is sealed'
      : `${hours}h ${String(mins).padStart(2, '0')}m before nightfall`

    const hearts = this.el.heartPips.children
    for (let i = 0; i < hearts.length; i++) hearts[i].className = i < data.hearts ? 'full' : 'spent'
    const weakness = this.el.weaknessPips.children
    for (let i = 0; i < weakness.length; i++) weakness[i].className = i < data.weakness ? 'full' : ''
    this.el.weaknessText.textContent = data.weakness === 0
      ? (data.ward > 0 ? 'Steady · ward ready' : 'Steady')
      : data.weakness === 1 ? 'Weakened ×1' : data.weakness === 2 ? 'Weakened ×2 · careful' : 'Fractured ×3'
    this.el.weaknessText.classList.toggle('danger', data.weakness > 0)

    this.el.hintText.textContent = total && done === total
      ? 'Every vow is kept. Explore the crystal reaches, or return tomorrow with a new plan.'
      : data.zoneIndex !== 0
        ? 'The focus prisms wait in the Azure Labyrinth. Find a waygate.'
        : 'Follow the lit prism. Keep every vow inside its timer.'
    this.el.travelBtn.classList.toggle('hidden', data.unlockedMax < 1)
    this.updateClock(data)
  }

  updateClock(data) {
    const clock = data.clock ?? 8 * 60
    this.el.dayTime.textContent = formatClock(clock)
    const span = (23 * 60 + 59) - 8 * 60
    const progress = Math.max(0, Math.min(1, (clock - 8 * 60) / span))
    this.el.dayFill.style.width = `${progress * 100}%`
    this.el.dayFill.classList.toggle('late', progress > 0.75)
    this.el.dayFill.classList.toggle('critical', progress > 0.92)
  }

  setTouchVisible(visible) {
    this.el.touchLayer.classList.toggle('hidden', !visible)
  }

  showPrompt(label) {
    this.el.promptLabel.textContent = label
    this.el.prompt.classList.remove('hidden')
  }

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

  showRitual({ task, tech, duration }) {
    this.el.ritual.classList.remove('hidden')
    this.el.ritualSigil.textContent = tech.glyph
    this.el.ritualSigil.style.color = tech.accent
    this.el.ritualKicker.textContent = `Focus ritual · ${tech.name}`
    this.el.ritualTitle.textContent = task.title
    this.el.ritualTitle.setAttribute('dir', 'auto')
    this.el.ritualFocus.textContent = `${task.minutes} minute vow · ${tech.blurb}`
    this.el.ritualBadge.textContent = 'TIMED'
    this.el.ritualTip.textContent = tech.tip
    this.el.ritualTime.textContent = formatDuration(duration)
    this.el.ritualFill.style.width = '0%'
    this.el.ritualArc.style.strokeDashoffset = String(RING_CIRCUMFERENCE)
    this.el.focusBtn.querySelector('span').textContent = 'Hold to focus'
    this.el.focusBtn.classList.remove('holding')
    this.el.ritualCore.classList.remove('lit')
    this.el.ritualCore.style.color = tech.accent
  }

  updateRitual({ remaining, progress, holding }) {
    this.el.ritualTime.textContent = formatDuration(remaining)
    this.el.ritualFill.style.width = `${Math.max(0, Math.min(1, progress)) * 100}%`
    this.el.ritualArc.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, progress))))
    this.el.focusBtn.classList.toggle('holding', holding)
    this.el.ritualCore.classList.toggle('lit', holding)
    const label = this.el.focusBtn.querySelector('span')
    if (holding) label.textContent = progress > 0.78 ? 'Almost there…' : 'Keep holding…'
    else label.textContent = progress > 0.02 ? 'Hold to continue' : 'Hold to focus'
  }

  setRitualHolding(holding) {
    this.el.focusBtn.classList.toggle('holding', holding)
  }

  hideRitual() {
    this.el.ritual.classList.add('hidden')
    this.el.focusBtn.classList.remove('holding')
  }

  showReward(data) {
    this.el.reward.classList.remove('hidden')
    this.el.rewardKicker.textContent = data.kicker
    this.el.rewardTitle.textContent = data.title
    this.el.rewardCopy.textContent = data.copy
    this.el.rewardShards.textContent = data.shards
    this.el.rewardTime.textContent = data.time
    this.el.rewardNext.textContent = data.next
    const rune = this.el.reward.querySelector('.reward-rune')
    if (rune) rune.textContent = data.variant === 'victory' ? '✦' : '◇'
  }

  hideReward() { this.el.reward.classList.add('hidden') }

  showDefeat(data) {
    this.el.defeat.classList.remove('hidden')
    this.el.defeatKicker.textContent = data.kicker
    this.el.defeatTitle.textContent = data.title
    this.el.defeatCopy.textContent = data.copy
    this.el.defeatUnfinished.textContent = String(data.unfinished)
    this.el.defeatHearts.textContent = String(data.hearts)
    this.el.defeatStreak.textContent = String(data.streak)
  }

  hideDefeat() { this.el.defeat.classList.add('hidden') }

  openShop(data) {
    this.shopData = data
    this.renderShop()
    this.el.shop.classList.remove('hidden')
  }

  refreshShop(data) {
    if (data) this.shopData = data
    if (this.shopData) this.renderShop()
  }

  renderShop() {
    const data = this.shopData
    if (!data) return
    this.setShards(data.shards)
    this.el.shopList.innerHTML = ''
    const inventoryFull = data.inventory.length >= data.slots
    data.stock.forEach((item) => {
      const purchased = !!data.purchased[item.id]
      const ownedFriend = item.kind === 'friend' && data.friends.includes(item.friend)
      const noRoom = inventoryFull && !purchased
      const poor = data.shards < item.price
      let reason = `Buy ✦${item.price}`
      let disabled = false
      if (purchased) { reason = 'Sold today'; disabled = true }
      else if (ownedFriend) { reason = 'Already with you'; disabled = true }
      else if (noRoom) { reason = 'Satchel full'; disabled = true }
      else if (poor) { reason = `Need ✦${item.price - data.shards} more`; disabled = true }
      const card = document.createElement('div')
      card.className = `shop-card ${purchased ? 'sold' : ''}`
      card.innerHTML = `
        <span class="shop-glyph">${item.glyph}</span>
        <div class="shop-copy">
          <strong>${item.name}</strong>
          <span>${item.blurb}</span>
        </div>
        <button class="shop-buy" type="button" ${disabled ? 'disabled' : ''}>${reason}</button>`
      const btn = card.querySelector('.shop-buy')
      if (!disabled) btn.addEventListener('click', () => this.onBuy?.(item.id))
      this.el.shopList.appendChild(card)
    })

    this.el.slotCount.textContent = `${data.inventory.length} / ${data.slots} slots${data.ward ? ` · ${data.ward} ward ready` : ''}`
    this.el.inventoryList.innerHTML = ''
    if (!data.inventory.length) {
      const empty = document.createElement('p')
      empty.className = 'task-empty'
      empty.textContent = 'Your satchel is empty. Buy something from today’s stock, or keep your shards for tomorrow.'
      this.el.inventoryList.appendChild(empty)
      return
    }
    data.inventory.forEach((entry) => {
      const item = itemById(entry.itemId)
      if (!item) return
      const card = document.createElement('div')
      card.className = 'inventory-card'
      const charm = item.kind === 'charm'
      const label = charm ? 'Equipped' : item.kind === 'friend' ? 'Call friend' : 'Use'
      card.innerHTML = `
        <span class="shop-glyph">${item.glyph}</span>
        <div class="shop-copy">
          <strong>${item.name}</strong>
          <span>${item.blurb}</span>
        </div>
        <button class="shop-buy use" type="button" ${charm ? 'disabled' : ''}>${label}</button>`
      const btn = card.querySelector('.shop-buy')
      if (!charm) btn.addEventListener('click', () => this.onUseItem?.(entry.uid))
      this.el.inventoryList.appendChild(card)
    })
  }

  closeShop() { this.el.shop.classList.add('hidden') }

  openFriends(unlocked) {
    this.el.friendsList.innerHTML = ''
    for (const friend of FRIENDS) {
      const has = unlocked.includes(friend.id)
      const card = document.createElement('div')
      card.className = `friend-card ${has ? 'unlocked' : 'locked'}`
      card.style.setProperty('--friend-color', friend.color)
      card.innerHTML = `
        <span class="friend-glyph big">${friend.glyph}</span>
        <div>
          <strong>${friend.name}</strong>
          <span>${has ? friend.perk : 'Not yet called. Buy their lantern in the daily market.'}</span>
        </div>
        <b>${has ? 'WALKING WITH YOU' : 'LOCKED'}</b>`
      this.el.friendsList.appendChild(card)
    }
    this.el.friends.classList.remove('hidden')
  }

  closeFriends() { this.el.friends.classList.add('hidden') }

  openSettings() { this.el.settings.classList.remove('hidden') }
  closeSettings() { this.el.settings.classList.add('hidden') }

  setTilt(enabled, status = null) {
    this.el.tiltBtn.setAttribute('aria-checked', String(enabled))
    if (status) this.el.tiltStatus.textContent = status
  }

  setComfort(enabled) {
    this.el.comfortBtn.setAttribute('aria-checked', String(enabled))
  }

  setSensitivity(value) { this.el.sensitivity.value = String(value) }

  openTravel(zones, current, unlockedMax) {
    this.el.travel.classList.remove('hidden')
    this.el.travelList.innerHTML = ''
    zones.forEach((zone, index) => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'travel-option'
      const unlocked = index <= unlockedMax
      btn.disabled = !unlocked || index === current
      const state = index === current ? 'You are here' : unlocked ? 'Enter' : 'Locked by vows'
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

  setSettingsAvailable(unlockedMax) {
    this.el.travelBtn.classList.toggle('hidden', unlockedMax < 1)
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
