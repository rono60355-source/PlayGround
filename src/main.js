import './style.css'
import { Game } from './game.js'

const canvas = document.getElementById('world')

try {
  window.lumenfall = new Game(canvas)
} catch (error) {
  console.error('Lumenfall failed to start', error)
  const intro = document.getElementById('intro')
  if (intro) {
    intro.innerHTML = `
      <div class="intro-inner" style="grid-template-columns:1fr;max-width:620px">
        <div class="rite-card" style="grid-column:1;grid-row:1;justify-self:center">
          <p class="eyebrow">The Atlas is quiet</p>
          <h2 style="font-family:var(--serif);font-weight:400;font-size:34px;margin:8px 0 12px">WebGL could not begin</h2>
          <p style="color:var(--muted);font-size:13px;line-height:1.6;margin:0 0 18px">
            Lumenfall needs a WebGL2-capable browser. Try updating the browser, enabling hardware acceleration, or opening the game on a newer phone or tablet.
          </p>
          <button class="primary-btn" type="button" onclick="location.reload()"><span>Try Again</span></button>
        </div>
      </div>`
  }
}
