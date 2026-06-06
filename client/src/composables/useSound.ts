/**
 * 音效系统 — 使用 Web Audio API 合成音效，无需外部音频文件
 */
let audioCtx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  // 恢复被浏览器暂停的 AudioContext（需要用户交互后）
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

/** 主音量 0~1 */
function masterGain(ctx: AudioContext, vol = 0.3): GainNode {
  const g = ctx.createGain()
  g.gain.value = vol
  g.connect(ctx.destination)
  return g
}

/** 播放一个频率上升的叮咚声（惊喜掉落） */
export function playLuckyDrop(rarity?: string) {
  try {
    const ctx = getCtx()
    const out = masterGain(ctx, 0.35)
    const now = ctx.currentTime

    // 根据稀有度调整音符数量
    const noteCount = rarity === 'legendary' ? 8 : rarity === 'epic' ? 6 : 4
    const baseFreq = rarity === 'legendary' ? 440 : rarity === 'epic' ? 392 : 330

    for (let i = 0; i < noteCount; i++) {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = i % 2 === 0 ? 'sine' : 'triangle'
      osc.frequency.value = baseFreq * Math.pow(2, i / 4) // 上升音阶
      g.gain.setValueAtTime(0, now + i * 0.12)
      g.gain.linearRampToValueAtTime(0.25, now + i * 0.12 + 0.05)
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4)
      osc.connect(g)
      g.connect(out)
      osc.start(now + i * 0.12)
      osc.stop(now + i * 0.12 + 0.45)
    }

    // Legendary 额外加一个低音共鸣
    if (rarity === 'legendary') {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 220
      g.gain.setValueAtTime(0, now)
      g.gain.linearRampToValueAtTime(0.15, now + 0.5)
      g.gain.exponentialRampToValueAtTime(0.001, now + 2.5)
      osc.connect(g)
      g.connect(out)
      osc.start(now)
      osc.stop(now + 2.5)
    }
  } catch {
    // 静默失败，不阻塞 UI
  }
}

/** 播放升级音效 — 三个上升音符 */
export function playLevelUp() {
  try {
    const ctx = getCtx()
    const out = masterGain(ctx, 0.3)
    const now = ctx.currentTime
    const freqs = [523, 659, 784] // C5, E5, G5

    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      g.gain.setValueAtTime(0, now + i * 0.15)
      g.gain.linearRampToValueAtTime(0.2, now + i * 0.15 + 0.05)
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.5)
      osc.connect(g)
      g.connect(out)
      osc.start(now + i * 0.15)
      osc.stop(now + i * 0.15 + 0.55)
    })
  } catch { /* 静默 */ }
}

/** 播放进化音效 — 更长更宏伟的上升音 */
export function playEvolution() {
  try {
    const ctx = getCtx()
    const out = masterGain(ctx, 0.35)
    const now = ctx.currentTime

    // 渐强的合成音
    for (let i = 0; i < 5; i++) {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(330, now + i * 0.2)
      osc.frequency.linearRampToValueAtTime(660, now + i * 0.2 + 0.3)
      g.gain.setValueAtTime(0, now + i * 0.2)
      g.gain.linearRampToValueAtTime(0.15, now + i * 0.2 + 0.15)
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.2 + 0.6)
      osc.connect(g)
      g.connect(out)
      osc.start(now + i * 0.2)
      osc.stop(now + i * 0.2 + 0.65)
    }
  } catch { /* 静默 */ }
}

/** 播放购买音效 — 收银机 "cha-ching" */
export function playPurchase() {
  try {
    const ctx = getCtx()
    const out = masterGain(ctx, 0.25)
    const now = ctx.currentTime

    // 两个短促的高音模拟收银机
    const notes = [880, 1175]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'square'
      osc.frequency.value = freq
      g.gain.setValueAtTime(0, now + i * 0.08)
      g.gain.linearRampToValueAtTime(0.12, now + i * 0.08 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.15)
      osc.connect(g)
      g.connect(out)
      osc.start(now + i * 0.08)
      osc.stop(now + i * 0.08 + 0.2)
    })
  } catch { /* 静默 */ }
}

/** 播放装备音效 — 轻轻 "click" */
export function playEquip() {
  try {
    const ctx = getCtx()
    const out = masterGain(ctx, 0.15)
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 1200
    g.gain.setValueAtTime(0, now)
    g.gain.linearRampToValueAtTime(0.1, now + 0.01)
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.1)
    osc.connect(g)
    g.connect(out)
    osc.start(now)
    osc.stop(now + 0.12)
  } catch { /* 静默 */ }
}

/** 播放签到音效 — 轻快的两音 */
export function playCheckin() {
  try {
    const ctx = getCtx()
    const out = masterGain(ctx, 0.25)
    const now = ctx.currentTime

    const notes = [440, 660]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      g.gain.setValueAtTime(0, now + i * 0.12)
      g.gain.linearRampToValueAtTime(0.18, now + i * 0.12 + 0.03)
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.35)
      osc.connect(g)
      g.connect(out)
      osc.start(now + i * 0.12)
      osc.stop(now + i * 0.12 + 0.4)
    })
  } catch { /* 静默 */ }
}

/** 播放点数增加音效 */
export function playPointsEarned() {
  try {
    const ctx = getCtx()
    const out = masterGain(ctx, 0.2)
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(600, now)
    osc.frequency.linearRampToValueAtTime(900, now + 0.15)
    g.gain.setValueAtTime(0, now)
    g.gain.linearRampToValueAtTime(0.15, now + 0.03)
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
    osc.connect(g)
    g.connect(out)
    osc.start(now)
    osc.stop(now + 0.35)
  } catch { /* 静默 */ }
}

/** 停止所有音效（用于清理） */
export function stopAllSounds() {
  if (audioCtx) {
    audioCtx.close()
    audioCtx = null
  }
}
