import { SUBJECTS, SUBJECT_ORDER, ZONES, matchTopic } from './data.js'

const $ = (id) => document.getElementById(id)

export class UI {
  constructor() {
    this.el = {
      intro: $('intro'),
      subjectGrid: $('subjectGrid'),
      topicInput: $('topicInput'),
      focusHint: $('focusHint'),
      beginBtn: $('beginBtn'),
      hud: $('hud'),
      hudSubject: $('hudSubject'),
      hudFocus: $('hudFocus'),
      hudSector: $('hudSector'),
      missionDots: $('missionDots'),
      objectiveText: $('objectiveText'),
      chargePips: $('chargePips'),
      chargeText: $('chargeText'),
      settingsBtn: $('settingsBtn'),
      crosshair: $('crosshair'),
      targetTag: $('targetTag'),
      prompt: $('prompt'),
      promptLabel: $('promptLabel'),
      interactBtn: $('interactBtn'),
      promptKey: document.querySelector('#interactBtn .key'),
      toast: $('toast'),
      touchLayer: $('touchLayer'),
      joystick: $('joystick'),
      joyThumb: $('joyThumb'),
      fireBtn: $('fireBtn'),
      hintText: $('hintText'),
      puzzle: $('puzzle'),
      puzzleSigil: $('puzzleSigil'),
      puzzleKicker: $('puzzleKicker'),
      puzzleTitle: $('puzzleTitle'),
      puzzleFocus: $('puzzleFocus'),
      questionIndex: $('questionIndex'),
      puzzleProgressBar: $('puzzleProgressBar'),
      questionText: $('questionText'),
      answerList: $('answerList'),
      answerNote: $('answerNote'),
      continueQuestion: $('continueQuestion'),
      reward: $('reward'),
      rewardKicker: $('rewardKicker'),
      rewardTitle: $('rewardTitle'),
      rewardCopy: $('rewardCopy'),
      rewardCorrect: $('rewardCorrect'),
      rewardCharge: $('rewardCharge'),
      rewardNext: $('rewardNext'),
      rewardBtn: $('rewardBtn'),
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
    this.selectedSubject = null
    this.toastTimer = null
    this._buildSubjects()
    this._buildPips()
    this._buildDots()
    this._bind()
  }

  _buildSubjects() {
    this.el.subjectGrid.innerHTML = ''
    for (const key of SUBJECT_ORDER) {
      const subject = SUBJECTS[key]
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'subject-chip'
      btn.dataset.subject = key
      btn.innerHTML = `<span class="glyph">${subject.glyph}</span><span class="label">${subject.name}</span>`
      btn.addEventListener('click', () => this.selectSubject(key))
      this.el.subjectGrid.appendChild(btn)
    }
  }

  _buildPips() {
    this.el.chargePips.innerHTML = ''
    for (let i = 0; i < 8; i++) this.el.chargePips.appendChild(document.createElement('i'))
  }

  _buildDots() {
    this.el.missionDots.innerHTML = ''
    for (let i = 0; i < 3; i++) this.el.missionDots.appendChild(document.createElement('i'))
  }

  _bind() {
    this.el.beginBtn.addEventListener('click', () => this.onBegin?.())
    this.el.topicInput.addEventListener('input', () => this.updateFocusHint())
    this.el.topicInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !this.el.beginBtn.disabled) this.onBegin?.()
    })
    this.el.settingsBtn.addEventListener('click', () => this.onSettings?.())
    this.el.interactBtn.addEventListener('click', () => this.onInteract?.())
    this.el.fireBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.onFire?.() })
    this.el.rewardBtn.addEventListener('click', () => this.onRewardClose?.())
    this.el.continueQuestion.addEventListener('click', () => this.onContinue?.())
    this.el.closeSettings.addEventListener('click', () => this.onCloseSettings?.())
    this.el.closeTravel.addEventListener('click', () => this.onCloseTravel?.())
    this.el.sensitivity.addEventListener('input', () => this.onSensitivity?.(Number(this.el.sensitivity.value)))
    this.el.tiltBtn.addEventListener('click', () => this.onTiltToggle?.())
    this.el.comfortBtn.addEventListener('click', () => this.onComfortToggle?.())
    this.el.travelBtn.addEventListener('click', () => this.onOpenTravel?.())
    this.el.resetDayBtn.addEventListener('click', () => this.onResetDay?.())
  }

  selectSubject(key, focus = null) {
    this.selectedSubject = key
    for (const chip of this.el.subjectGrid.children) chip.classList.toggle('active', chip.dataset.subject === key)
    if (focus !== null) this.el.topicInput.value = focus
    this.updateFocusHint()
    this.updateBeginState()
    this.onSubjectSelected?.(key)
  }

  get subject() { return this.selectedSubject }
  get focus() { return this.el.topicInput.value.trim() }

  updateFocusHint() {
    const focus = this.focus
    const key = this.selectedSubject
    if (!key) {
      this.el.focusHint.textContent = 'Choose a subject above, then name the focus of today’s study.'
      this.el.focusHint.classList.remove('matched')
      this.updateBeginState()
      return
    }
    const subject = SUBJECTS[key]
    const topic = matchTopic(key, focus)
    if (topic) {
      this.el.focusHint.textContent = `Archive match · ${topic.label}. The trials will answer to this focus.`
      this.el.focusHint.classList.add('matched')
    } else if (focus.length > 1) {
      this.el.focusHint.textContent = `Focus recorded · the trial will weave it into ${subject.name} foundations.`
      this.el.focusHint.classList.remove('matched')
    } else {
      this.el.focusHint.textContent = `Name today’s ${subject.name.toLowerCase()} focus to enter the Atlas.`
      this.el.focusHint.classList.remove('matched')
    }
    this.updateBeginState()
  }

  updateBeginState() {
    this.el.beginBtn.disabled = !(this.selectedSubject && this.focus.length > 1)
  }

  setBeginLabel(text) {
    const span = this.el.beginBtn.querySelector('span')
    if (span) span.textContent = text
  }

  setTilt(enabled, status = null) {
    this.el.tiltBtn.setAttribute('aria-checked', String(enabled))
    if (status) this.el.tiltStatus.textContent = status
  }

  setComfort(enabled) {
    this.el.comfortBtn.setAttribute('aria-checked', String(enabled))
  }

  setSensitivity(value) { this.el.sensitivity.value = String(value) }

  hideIntro() {
    this.el.intro.classList.add('fading')
    setTimeout(() => this.el.intro.classList.add('hidden'), 850)
    this.el.hud.classList.remove('hidden')
  }

  updateHUD(data) {
    const zone = ZONES[data.zoneIndex]
    const subject = SUBJECTS[data.subject]
    this.el.hudSubject.textContent = `${subject.glyph} ${subject.name.toUpperCase()}`
    this.el.hudFocus.textContent = data.focus
    this.el.hudSector.textContent = `Sector ${zone.numeral} · ${zone.name}`
    this.el.hudSubject.style.color = subject.accent

    const dots = this.el.missionDots.children
    for (let i = 0; i < dots.length; i++) {
      dots[i].className = i < data.completed ? 'done' : (i === data.completed && data.completed < 3 ? 'current' : '')
    }
    if (data.completed >= 3) {
      this.el.objectiveText.textContent = 'Day complete · the Atlas remembers'
    } else if (data.zoneIndex === data.completed) {
      this.el.objectiveText.textContent = ZONES[data.completed].objective
    } else {
      this.el.objectiveText.textContent = `Seek the waygate · ${ZONES[data.completed].name}`
    }
    this.el.hintText.textContent = data.completed >= 3
      ? 'Every beacon burns. Explore the Atlas, or return tomorrow with a new study.'
      : data.completed === 0
        ? 'Follow the beacon light. Study trials are the only key.'
        : 'The waygate has answered your study. Enter to continue.'

    const pips = this.el.chargePips.children
    for (let i = 0; i < pips.length; i++) pips[i].className = i < data.charges ? 'full' : ''
    this.el.chargeText.textContent = data.charges > 0 ? `${data.charges} charge${data.charges === 1 ? '' : 's'} ready` : 'Dormant'
    this.el.chargeText.classList.toggle('ready', data.charges > 0)
    this.el.travelBtn.classList.toggle('hidden', data.unlockedMax < 1)
    this.el.hintText.textContent = data.completed >= 3
      ? 'Every beacon burns. Explore the Atlas, or return tomorrow with a new study.'
      : 'Aether charge is earned only by completing today’s study trials.'
  }

  setTouchVisible(visible) {
    this.el.touchLayer.classList.toggle('hidden', !visible)
    this.el.promptKey.textContent = visible ? 'Tap' : 'E'
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

  showPuzzle(zone, question, index, total) {
    this.el.puzzle.classList.remove('hidden')
    const subject = SUBJECTS[this.selectedSubject] || SUBJECTS.mathematics
    this.el.puzzleSigil.textContent = subject.glyph
    this.el.puzzleSigil.style.color = subject.accent
    this.el.puzzleKicker.textContent = zone.kicker
    this.el.puzzleTitle.textContent = zone.missionTitle
    this.el.puzzleFocus.textContent = `${subject.name} · ${this.focus}`
    this.el.questionIndex.textContent = String(index + 1).padStart(2, '0')
    this.renderQuestion(question, index, total)
  }

  renderQuestion(question, index, total) {
    this.el.questionText.textContent = question.prompt
    this.el.answerNote.classList.add('hidden')
    this.el.answerNote.classList.remove('wrong-note')
    this.el.answerList.innerHTML = ''
    const letters = ['A', 'B', 'C', 'D']
    question.choices.forEach((choice, i) => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'answer'
      btn.dataset.index = String(i)
      btn.innerHTML = `<span class="letter">${letters[i]}</span><span>${choice}</span>`
      btn.addEventListener('click', () => this.onAnswer?.(i))
      this.el.answerList.appendChild(btn)
    })
    this.el.continueQuestion.disabled = true
    this.el.continueQuestion.querySelector('span').textContent = 'Continue'
    this.el.puzzleProgressBar.style.width = `${(index / total) * 100}%`
  }

  markAnswer(choiceIndex, answerIndex, correct, why) {
    const buttons = [...this.el.answerList.children]
    buttons.forEach((btn, i) => {
      btn.disabled = true
      if (i === answerIndex) btn.classList.add('correct')
      if (i === choiceIndex && !correct) btn.classList.add('wrong')
    })
    this.el.answerNote.textContent = why
    this.el.answerNote.classList.remove('hidden')
    this.el.answerNote.classList.toggle('wrong-note', !correct)
    this.el.continueQuestion.querySelector('span').textContent = correct ? 'Continue' : 'Try Again'
    this.el.continueQuestion.disabled = false
  }

  setPuzzleProgress(value) { this.el.puzzleProgressBar.style.width = `${value}%` }

  setContinueEnabled(enabled) { this.el.continueQuestion.disabled = !enabled }

  hidePuzzle() { this.el.puzzle.classList.add('hidden') }

  showReward(data) {
    this.el.reward.classList.remove('hidden')
    this.el.rewardKicker.textContent = data.kicker
    this.el.rewardTitle.textContent = data.title
    this.el.rewardCopy.textContent = data.copy
    this.el.rewardCorrect.textContent = String(data.correct)
    this.el.rewardCharge.textContent = `+${data.charge}`
    this.el.rewardNext.textContent = data.next
  }

  hideReward() { this.el.reward.classList.add('hidden') }

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
      const state = index === current ? 'You are here' : unlocked ? 'Enter' : 'Locked by study'
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
