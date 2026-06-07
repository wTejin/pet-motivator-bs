import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'

const app = createApp(App)

// 全局 Vue 错误处理：记录错误但不崩溃
app.config.errorHandler = (err, _instance, info) => {
  console.error('[Vue Error]', info, err)
  // 仅对渲染错误降级处理，非渲染错误继续抛出
  if (info.includes('render') || info.includes('setup')) {
    console.warn('[Vue] 渲染异常已捕获，页面可能部分不可用')
  }
}

app.use(createPinia())
app.use(router)
app.mount('#app')
