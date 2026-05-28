<template>
  <div class="shop-hint-page">
    <div class="hint-card">
      <div class="hint-icon">🏪</div>
      <h2 class="hint-title">魔法集市</h2>
      <p class="hint-desc">魔法集市已由后台统一管理</p>
      <p class="hint-sub">如需添加、编辑或上下架商品，请联系管理员在后台操作。</p>
      <router-link to="/coach/score" class="hint-link">返回快速记分</router-link>
    </div>
  </div>
</template>

<style scoped>
.shop-hint-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

.hint-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border-radius: 20px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  padding: 48px 40px;
  text-align: center;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.hint-icon {
  font-size: 48px;
}

.hint-title {
  font-size: 20px;
  font-weight: 800;
  color: #1a1a2e;
  font-family: var(--font-display);
  margin: 0;
}

.hint-desc {
  font-size: 15px;
  color: #333;
  font-weight: 600;
  margin: 0;
}

.hint-sub {
  font-size: 13px;
  color: #888;
  margin: 0;
}

.hint-link {
  margin-top: 8px;
  padding: 10px 24px;
  border-radius: 12px;
  background: linear-gradient(135deg, #42a5f5, #1e88e5);
  color: white;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: opacity 0.2s;
}

.hint-link:hover {
  opacity: 0.9;
}
</style>
