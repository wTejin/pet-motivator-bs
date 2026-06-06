<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { playLuckyDrop } from '../composables/useSound'

export interface LuckyDropItem {
  id: string
  name: string
  emoji: string
  description: string
  type: string
  rarity: string
  imageClass: string
  imageUrl?: string | null
  effect: any
}

export interface LuckyDropResult {
  item: LuckyDropItem
  animation: string
}

const props = defineProps<{
  drop: LuckyDropResult | null
  playerId?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const router = useRouter()

const visible = ref(false)
const dismissing = ref(false)
let autoTimer: ReturnType<typeof setTimeout> | null = null

watch(() => props.drop, (val) => {
  if (val) {
    visible.value = true
    dismissing.value = false
    autoTimer = setTimeout(() => dismiss(), 3500)
  }
})

function dismiss() {
  if (autoTimer) { clearTimeout(autoTimer); autoTimer = null }
  dismissing.value = true
  setTimeout(() => {
    visible.value = false
    dismissing.value = false
    emit('close')
  }, 400)
}

function takeIt() {
  if (autoTimer) { clearTimeout(autoTimer); autoTimer = null }
  dismiss()
}

// 音效：惊喜掉落出现时播放
watch(() => props.drop, (val) => {
  if (val) {
    playLuckyDrop(val.animation || val.item?.rarity)
  }
})

function goToBackpack() {
  if (autoTimer) { clearTimeout(autoTimer); autoTimer = null }
  const pid = props.playerId
  dismiss()
  if (pid) {
    router.push(`/player/${pid}/shop`)
  }
}

onBeforeUnmount(() => {
  if (autoTimer) clearTimeout(autoTimer)
})

const rarityLabel: Record<string, string> = {
  common: '普通',
  uncommon: '稀有',
  rare: '精良',
  epic: '史诗',
  legendary: '传说',
}

const rarityColor: Record<string, string> = {
  common: '#4ade80',
  uncommon: '#60a5fa',
  rare: '#c084fc',
  epic: '#fb923c',
  legendary: '#fbbf24',
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="visible && drop"
        class="lucky-drop-overlay"
        :class="[`rarity-${drop.animation}`, { dismissing }]"
        @click.self="takeIt"
      >
        <!-- 背景粒子 -->
        <div class="particles-container">
          <div v-for="i in 20" :key="i" class="particle" :style="{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${1.5 + Math.random() * 2}s`,
          }" />
        </div>

        <!-- 光柱 -->
        <div class="light-beam" />

        <div class="drop-card" :class="{ dismissing }">
          <!-- 稀有度标签 -->
          <div class="rarity-badge" :style="{ background: rarityColor[drop.item.rarity] || '#4ade80' }">
            {{ rarityLabel[drop.item.rarity] || drop.item.rarity }}
          </div>

          <!-- 物品图标 -->
          <div class="item-emoji-wrap">
            <img
              v-if="drop.item.type === 'badge' && drop.item.effect?.equip?.badgeSvg"
              :src="drop.item.effect.equip.badgeSvg"
              class="item-badge-img"
              alt="badge"
            />
            <img
              v-else-if="drop.item.imageUrl"
              :src="drop.item.imageUrl"
              class="item-emoji"
              alt="icon"
            />
            <span v-else class="item-emoji">{{ drop.item.emoji }}</span>
          </div>

          <!-- 标题 -->
          <h2 class="item-title">✨ 惊喜掉落！✨</h2>

          <!-- 物品名 -->
          <p class="item-name">{{ drop.item.name }}</p>

          <!-- 描述 -->
          <p class="item-desc">{{ drop.item.description }}</p>

          <!-- 收下按钮 -->
          <button class="take-btn" @click="takeIt">收下！🎉</button>

          <!-- 查看背包 -->
          <button class="backpack-link" @click="goToBackpack">🎒 查看我的背包</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.lucky-drop-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  overflow: hidden;
}

/* ── 稀有度光效 ── */
.rarity-green  { --glow: #4ade80; --beam: rgba(74, 222, 128, 0.3); }
.rarity-blue   { --glow: #60a5fa; --beam: rgba(96, 165, 250, 0.3); }
.rarity-purple { --glow: #c084fc; --beam: rgba(192, 132, 252, 0.3); }
.rarity-orange { --glow: #fb923c; --beam: rgba(251, 146, 60, 0.3); }
.rarity-golden { --glow: #fbbf24; --beam: rgba(251, 191, 36, 0.4); }

/* ── 光柱 ── */
.light-beam {
  position: absolute;
  top: -50%;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  height: 200%;
  background: radial-gradient(ellipse at center, var(--beam) 0%, transparent 70%);
  animation: beam-pulse 2s ease-in-out infinite;
  pointer-events: none;
}

@keyframes beam-pulse {
  0%, 100% { opacity: 0.5; transform: translateX(-50%) scaleY(1); }
  50% { opacity: 1; transform: translateX(-50%) scaleY(1.1); }
}

/* ── 粒子 ── */
.particles-container {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.particle {
  position: absolute;
  top: 0;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--glow);
  animation: particle-fall linear infinite;
}
@keyframes particle-fall {
  0% { transform: translateY(-10px) scale(1); opacity: 1; }
  100% { transform: translateY(100vh) scale(0); opacity: 0; }
}

/* ── 卡片 ── */
.drop-card {
  position: relative;
  z-index: 1;
  background: linear-gradient(145deg, #1e1b4b, #312e81, #1e1b4b);
  border: 2px solid var(--glow);
  border-radius: 24px;
  padding: 32px 40px;
  text-align: center;
  max-width: 340px;
  width: 90%;
  box-shadow:
    0 0 40px var(--glow),
    0 0 80px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  animation: card-enter 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.drop-card.dismissing {
  animation: card-exit 0.3s ease-in forwards;
}

@keyframes card-enter {
  0% { transform: scale(0.3) rotate(-10deg); opacity: 0; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}
@keyframes card-exit {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(0.5) translateY(30px); opacity: 0; }
}

.rarity-badge {
  display: inline-block;
  padding: 3px 16px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 12px;
}

.item-emoji-wrap {
  margin: 12px 0;
}
.item-emoji {
  font-size: 72px;
  display: inline-block;
  animation: emoji-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  filter: drop-shadow(0 0 20px var(--glow));
}
.item-badge-img {
  width: 120px;
  height: 120px;
  object-fit: contain;
  display: inline-block;
  animation: emoji-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  filter: drop-shadow(0 0 20px var(--glow));
}
@keyframes emoji-pop {
  0% { transform: scale(0) rotate(-30deg); }
  60% { transform: scale(1.3) rotate(5deg); }
  100% { transform: scale(1) rotate(0deg); }
}

.item-title {
  font-size: 18px;
  color: #fbbf24;
  margin: 8px 0 4px;
  font-weight: 700;
}

.item-name {
  font-size: 22px;
  font-weight: 800;
  color: #fff;
  margin: 0 0 8px;
}

.item-desc {
  font-size: 13px;
  color: #a5b4fc;
  margin: 0 0 20px;
  line-height: 1.5;
}

.take-btn {
  background: linear-gradient(135deg, var(--glow), color-mix(in srgb, var(--glow) 70%, white));
  color: #fff;
  border: none;
  border-radius: 14px;
  padding: 10px 40px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  box-shadow: 0 4px 20px var(--glow);
}
.take-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 30px var(--glow);
}
.take-btn:active {
  transform: scale(0.97);
}

.backpack-link {
  display: block;
  margin: 12px auto 0;
  background: transparent;
  color: #a5b4fc;
  border: 1px solid rgba(165, 180, 252, 0.3);
  border-radius: 12px;
  padding: 8px 24px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.backpack-link:hover {
  background: rgba(165, 180, 252, 0.15);
  color: #c7d2fe;
  border-color: rgba(165, 180, 252, 0.6);
}

/* ── 过渡 ── */
.modal-fade-enter-active { transition: opacity 0.3s; }
.modal-fade-leave-active { transition: opacity 0.3s; }
.modal-fade-enter-from,
.modal-fade-leave-to { opacity: 0; }

/* ── Legendary 全屏特效 ── */
.rarity-golden .drop-card {
  animation: card-enter 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), legendary-shimmer 2s ease-in-out infinite;
}
@keyframes legendary-shimmer {
  0%, 100% { box-shadow: 0 0 40px #fbbf24, 0 0 80px #f59e0b, 0 0 120px rgba(0,0,0,0.3); }
  50% { box-shadow: 0 0 60px #fbbf24, 0 0 120px #f59e0b, 0 0 180px rgba(0,0,0,0.3); }
}
</style>
