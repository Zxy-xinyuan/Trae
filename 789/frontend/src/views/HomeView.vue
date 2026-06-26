<template>
  <div class="home-view">
    <!-- 顶部导航 -->
    <header class="app-header">
      <div class="header-brand">
        <div class="logo-mark">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent-gold)" stroke-width="1.5">
            <rect x="2" y="2" width="20" height="20" rx="2" />
            <line x1="7" y1="2" x2="7" y2="22" />
            <line x1="17" y1="2" x2="17" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
          </svg>
        </div>
        <div>
          <h1 class="app-title">novel2script</h1>
          <p class="app-tagline">AI 驱动的小说转剧本工具</p>
        </div>
      </div>
      <div class="header-status">
        <span class="status-dot" :class="serverStatus" />
        <span class="status-text">{{ statusText }}</span>
      </div>
    </header>

    <!-- 错误通知 -->
    <transition name="toast">
      <div v-if="store.error" class="toast toast-error" @click="store.error = ''">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
        {{ store.error }}
      </div>
    </transition>

    <!-- 成功通知 -->
    <transition name="toast">
      <div v-if="showSuccess" class="toast toast-success">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        转换成功！共 {{ store.stats.sceneCount }} 个场景，{{ store.stats.characterCount }} 个角色
      </div>
    </transition>

    <!-- 主内容区 -->
    <main class="main-content" :class="{ 'has-result': store.hasResult }">
      <!-- 左侧：输入区 -->
      <section class="panel panel-input">
        <ChapterInput />
      </section>

      <!-- 右侧：预览区 -->
      <section class="panel panel-preview">
        <!-- 加载状态 -->
        <div v-if="store.loading" class="loading-overlay">
          <div class="film-loader">
            <div class="film-reel" />
            <div class="loading-text">
              <p class="loading-title">AI 正在创作剧本</p>
              <p class="loading-hint">分析情节结构、识别角色、生成场景...</p>
            </div>
          </div>
          <div class="loading-progress">
            <div class="progress-bar">
              <div class="progress-fill" />
            </div>
          </div>
        </div>

        <!-- 结果展示 -->
        <template v-else>
          <ScriptPreview />
          <CharacterEditor />
          <ExportPanel />
        </template>
      </section>
    </main>

    <!-- 底部 -->
    <footer class="app-footer">
      <p>novel2script · 让每一个好故事都能被搬上银幕</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useScriptStore } from '../store/script'
import { checkHealth } from '../services/api'
import ChapterInput from '../components/ChapterInput.vue'
import ScriptPreview from '../components/ScriptPreview.vue'
import CharacterEditor from '../components/CharacterEditor.vue'
import ExportPanel from '../components/ExportPanel.vue'

const store = useScriptStore()
const serverStatus = ref<'online' | 'offline' | 'checking'>('checking')
const showSuccess = ref(false)

const statusText = computed(() => {
  switch (serverStatus.value) {
    case 'online': return '服务就绪'
    case 'offline': return '服务离线'
    case 'checking': return '检查中...'
  }
})

watch(() => store.error, (val) => {
  if (val) {
    setTimeout(() => { store.error = '' }, 6000)
  }
})

watch(() => store.hasResult, (val) => {
  if (val && !store.error) {
    showSuccess.value = true
    setTimeout(() => { showSuccess.value = false }, 4000)
  }
})

onMounted(async () => {
  try {
    await checkHealth()
    serverStatus.value = 'online'
  } catch {
    serverStatus.value = 'offline'
  }
})
</script>

<style scoped>
.home-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ========== 头部 ========== */
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md) var(--space-xl);
  border-bottom: var(--film-border);
  background: linear-gradient(180deg, rgba(26,26,36,0.9) 0%, transparent 100%);
  backdrop-filter: blur(8px);
  position: sticky;
  top: 0;
  z-index: 100;
}
.header-brand {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}
.logo-mark {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-gold-dim);
  border-radius: var(--radius-md);
  border: 1px solid rgba(212,165,116,0.2);
}
.app-title {
  font-family: var(--font-display);
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}
.app-tagline {
  font-size: 0.78rem;
  color: var(--text-muted);
  font-style: italic;
}

.header-status {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transition: background 0.3s;
}
.status-dot.online { background: var(--success); box-shadow: 0 0 8px rgba(90,158,111,0.5); }
.status-dot.offline { background: var(--error); }
.status-dot.checking { background: var(--warning); animation: pulse-glow 1.5s infinite; }
.status-text {
  font-size: 0.82rem;
  color: var(--text-muted);
}

/* ========== 主内容 ========== */
.main-content {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: var(--space-lg);
  padding: var(--space-xl);
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
}

.panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.panel-input {
  position: sticky;
  top: 80px;
  align-self: start;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
}

.panel-preview {
  min-height: 400px;
}

/* 加载状态 */
.loading-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-xl);
  padding: var(--space-2xl);
  min-height: 300px;
}
.film-loader {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
}
.loading-text {
  text-align: left;
}
.loading-title {
  font-family: var(--font-display);
  font-size: 1.2rem;
  color: var(--accent-gold);
  margin-bottom: 4px;
}
.loading-hint {
  font-size: 0.85rem;
  color: var(--text-muted);
  font-style: italic;
}

.loading-progress {
  width: 240px;
}
.progress-bar {
  height: 3px;
  background: var(--bg-surface);
  border-radius: 2px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-red), var(--accent-gold));
  border-radius: 2px;
  animation: progressAnim 3s ease-in-out infinite;
}
@keyframes progressAnim {
  0%   { width: 0%; margin-left: 0; }
  50%  { width: 60%; margin-left: 20%; }
  100% { width: 0%; margin-left: 100%; }
}

/* ========== Toast ========== */
.toast {
  position: fixed;
  top: 80px;
  right: 24px;
  z-index: 10000;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  cursor: pointer;
}
.toast-enter-active { animation: slideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
.toast-leave-active { animation: slideIn 0.3s ease reverse; }

/* ========== 底部 ========== */
.app-footer {
  text-align: center;
  padding: var(--space-lg);
  border-top: var(--film-border);
  color: var(--text-muted);
  font-size: 0.82rem;
  font-style: italic;
}

/* ========== 响应式 ========== */
@media (max-width: 1024px) {
  .main-content {
    grid-template-columns: 1fr;
    padding: var(--space-lg);
  }
  .panel-input {
    position: static;
    max-height: none;
  }
}

@media (max-width: 768px) {
  .app-header {
    flex-direction: column;
    gap: var(--space-sm);
    text-align: center;
    padding: var(--space-md);
  }
  .main-content {
    padding: var(--space-md);
    gap: var(--space-md);
  }
  .film-loader {
    flex-direction: column;
    text-align: center;
  }
  .loading-text { text-align: center; }
}
</style>
