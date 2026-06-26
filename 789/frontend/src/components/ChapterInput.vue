<template>
  <div class="chapter-input">
    <!-- 标题区 -->
    <div class="input-header">
      <div class="header-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          <line x1="8" y1="7" x2="16" y2="7" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      </div>
      <div>
        <h2 class="input-title">小说文本</h2>
        <p class="input-subtitle">粘贴或输入您的小说内容</p>
      </div>
    </div>

    <!-- 文本输入区 -->
    <div class="text-area-wrapper" :class="{ 'has-error': charCount > 0 && charCount < 100 }">
      <textarea
        ref="textareaRef"
        v-model="novelText"
        class="novel-textarea"
        placeholder="在此粘贴您的小说文本&#10;&#10;支持包含多个章节的内容，工具将自动识别章节结构并转换为专业剧本格式..."
        @input="autoResize"
      />
      <div class="textarea-glow" />
    </div>

    <!-- 状态栏 -->
    <div class="status-bar">
      <div class="char-count" :class="charCountClass">
        <span class="count-number">{{ formattedCharCount }}</span>
        <span class="count-label">字</span>
        <span v-if="charCount > 0 && charCount < 100" class="count-hint">
          （最少 100 字）
        </span>
      </div>
      <div v-if="charCount >= 100" class="estimate">
        预计 {{ estimatedScenes }} 个场景 · {{ estimatedTime }}
      </div>
    </div>

    <!-- 选项折叠面板 -->
    <div class="options-panel">
      <button class="options-toggle" @click="showOptions = !showOptions">
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2"
          :style="{ transform: showOptions ? 'rotate(90deg)' : 'rotate(0)' }"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        转换选项
      </button>

      <transition name="slide">
        <div v-show="showOptions" class="options-grid">
          <div class="option-field">
            <label>剧本标题</label>
            <input v-model="options.title" type="text" placeholder="留空则由 AI 推断" />
          </div>
          <div class="option-field">
            <label>原著作者</label>
            <input v-model="options.author" type="text" placeholder="可选" />
          </div>
          <div class="option-field">
            <label>体裁类型</label>
            <select v-model="options.genre">
              <option value="">自动识别</option>
              <option value="drama">剧情</option>
              <option value="comedy">喜剧</option>
              <option value="thriller">悬疑</option>
              <option value="romance">爱情</option>
              <option value="sci-fi">科幻</option>
              <option value="fantasy">奇幻</option>
              <option value="horror">恐怖</option>
              <option value="action">动作</option>
            </select>
          </div>
          <div class="option-field">
            <label>对话模式</label>
            <select v-model="options.dialogue_mode">
              <option value="lenient">宽松识别</option>
              <option value="strict">严格识别</option>
            </select>
          </div>
          <div class="option-field checkbox-field">
            <label>
              <input v-model="options.generate_summaries" type="checkbox" />
              生成场景摘要
            </label>
          </div>
        </div>
      </transition>
    </div>

    <!-- 转换按钮 -->
    <button
      class="convert-btn btn btn-primary"
      :disabled="!canConvert || loading"
      @click="handleConvert"
    >
      <template v-if="loading">
        <div class="film-reel-sm" />
        <span>转换中...</span>
      </template>
      <template v-else>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        <span>开始转换</span>
      </template>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import { useScriptStore } from '../store/script'
import type { ConversionOptions } from '../types/script'

const store = useScriptStore()

const textareaRef = ref<HTMLTextAreaElement>()
const novelText = ref('')
const showOptions = ref(false)
const options = ref<ConversionOptions>({
  title: '',
  author: '',
  genre: '',
  dialogue_mode: 'lenient',
  generate_summaries: true,
})

const charCount = computed(() => novelText.value.length)
const canConvert = computed(() => charCount.value >= 100)
const loading = computed(() => store.loading)

const formattedCharCount = computed(() => {
  return charCount.value.toLocaleString()
})

const charCountClass = computed(() => {
  if (charCount.value === 0) return ''
  if (charCount.value < 100) return 'count-low'
  return 'count-ok'
})

const estimatedScenes = computed(() => {
  return Math.max(1, Math.floor(charCount.value / 500))
})

const estimatedTime = computed(() => {
  const seconds = Math.max(10, Math.floor(charCount.value / 200))
  if (seconds < 60) return `约 ${seconds} 秒`
  return `约 ${Math.floor(seconds / 60)} 分钟`
})

function autoResize() {
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.style.height = 'auto'
      textareaRef.value.style.height = Math.min(textareaRef.value.scrollHeight, 500) + 'px'
    }
  })
}

async function handleConvert() {
  if (!canConvert.value || loading.value) return

  const cleanOptions: ConversionOptions = {}
  if (options.value.title) cleanOptions.title = options.value.title
  if (options.value.author) cleanOptions.author = options.value.author
  if (options.value.genre) cleanOptions.genre = options.value.genre
  cleanOptions.dialogue_mode = options.value.dialogue_mode
  cleanOptions.generate_summaries = options.value.generate_summaries

  await store.convert({
    novel_text: novelText.value,
    options: cleanOptions,
  })
}

onMounted(() => {
  autoResize()
})
</script>

<style scoped>
.chapter-input {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.input-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.header-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-gold-dim);
  border-radius: var(--radius-md);
  color: var(--accent-gold);
}

.input-title {
  font-family: var(--font-display);
  font-size: 1.3rem;
  color: var(--text-primary);
  font-weight: 700;
}

.input-subtitle {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-top: 2px;
}

/* 文本域 */
.text-area-wrapper {
  position: relative;
  border-radius: var(--radius-lg);
  border: var(--film-border);
  background: var(--bg-surface);
  transition: border-color 0.3s, box-shadow 0.3s;
}
.text-area-wrapper:focus-within {
  border-color: var(--accent-gold);
  box-shadow: 0 0 0 3px var(--accent-gold-dim);
}
.text-area-wrapper.has-error {
  border-color: var(--error);
}

.novel-textarea {
  width: 100%;
  min-height: 240px;
  max-height: 500px;
  padding: var(--space-lg);
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 1rem;
  line-height: 2;
  resize: vertical;
  outline: none;
}
.novel-textarea::placeholder {
  color: var(--text-muted);
  font-style: italic;
}

.textarea-glow {
  position: absolute;
  inset: 0;
  border-radius: var(--radius-lg);
  pointer-events: none;
  opacity: 0;
  background: radial-gradient(ellipse at center, var(--accent-gold-dim), transparent 70%);
  transition: opacity 0.4s;
}
.text-area-wrapper:focus-within .textarea-glow {
  opacity: 1;
}

/* 状态栏 */
.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 var(--space-xs);
  font-size: 0.82rem;
}

.char-count {
  color: var(--text-muted);
  transition: color 0.3s;
}
.count-low { color: var(--error); }
.count-ok  { color: var(--success); }
.count-number {
  font-family: var(--font-mono);
  font-weight: 500;
  margin-right: 4px;
}
.count-hint {
  opacity: 0.8;
}

.estimate {
  color: var(--text-muted);
  font-style: italic;
}

/* 选项面板 */
.options-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  background: none;
  border: none;
  color: var(--text-secondary);
  font-family: var(--font-body);
  font-size: 0.9rem;
  cursor: pointer;
  padding: var(--space-sm) 0;
  transition: color 0.2s;
}
.options-toggle:hover { color: var(--accent-gold); }
.options-toggle svg {
  transition: transform 0.3s;
}

.options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-md);
  padding: var(--space-md) 0;
}

.option-field label {
  display: block;
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin-bottom: 6px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.option-field input,
.option-field select {
  width: 100%;
  padding: 8px 12px;
  font-size: 0.9rem;
}

.checkbox-field label {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  cursor: pointer;
  text-transform: none;
  font-weight: 400;
  font-size: 0.9rem;
}
.checkbox-field input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--accent-red);
}

/* 转换按钮 */
.convert-btn {
  width: 100%;
  padding: 16px;
  font-size: 1.05rem;
  letter-spacing: 0.06em;
  animation: pulse-glow 3s ease-in-out infinite;
}
.convert-btn:disabled {
  animation: none;
}

.film-reel-sm {
  width: 20px;
  height: 20px;
  border: 2px solid transparent;
  border-top-color: var(--text-primary);
  border-right-color: var(--text-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* 折叠动画 */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
.slide-enter-to,
.slide-leave-from {
  opacity: 1;
  max-height: 300px;
}

/* 响应式 */
@media (max-width: 768px) {
  .options-grid {
    grid-template-columns: 1fr;
  }
  .novel-textarea {
    min-height: 180px;
    font-size: 0.95rem;
  }
}
</style>
