<template>
  <div class="script-preview">
    <!-- 头部工具栏 -->
    <div class="preview-toolbar">
      <div class="toolbar-left">
        <h2 class="preview-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="2" y="2" width="20" height="20" rx="2" />
            <line x1="7" y1="2" x2="7" y2="22" />
            <line x1="17" y1="2" x2="17" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
          </svg>
          剧本预览
        </h2>
        <span v-if="script?.meta?.title" class="script-name">{{ script.meta.title }}</span>
      </div>
      <div class="toolbar-actions">
        <button
          class="view-toggle"
          :class="{ active: viewMode === 'structured' }"
          @click="viewMode = 'structured'"
        >
          结构视图
        </button>
        <button
          class="view-toggle"
          :class="{ active: viewMode === 'yaml' }"
          @click="viewMode = 'yaml'"
        >
          YAML
        </button>
      </div>
    </div>

    <!-- 场景导航 -->
    <nav v-if="viewMode === 'structured' && scenes.length" class="scene-nav">
      <button
        v-for="(scene, idx) in scenes"
        :key="scene.scene_number"
        class="scene-nav-item"
        :class="{ active: activeScene === idx }"
        @click="scrollToScene(idx)"
      >
        {{ scene.scene_number }}
      </button>
    </nav>

    <!-- 结构视图 -->
    <div v-if="viewMode === 'structured'" class="scenes-container">
      <div v-if="!scenes.length" class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1">
          <rect x="2" y="2" width="20" height="20" rx="2" />
          <line x1="7" y1="2" x2="7" y2="22" />
          <line x1="17" y1="2" x2="17" y2="22" />
          <line x1="2" y1="12" x2="22" y2="12" />
        </svg>
        <p>粘贴小说文本并点击"开始转换"</p>
        <p class="empty-hint">AI 将为您生成专业格式的剧本</p>
      </div>

      <div
        v-for="(scene, idx) in scenes"
        :key="scene.scene_number"
        :ref="(el) => setSceneRef(idx, el as HTMLElement)"
        class="scene-card card"
        :style="{ animationDelay: `${idx * 0.1}s` }"
      >
        <!-- 场景标题 -->
        <div class="scene-heading">
          <span class="scene-number">{{ scene.scene_number }}</span>
          <span class="heading-text">
            {{ formatHeading(scene.scene_heading) }}
          </span>
          <span v-if="scene.characters_present?.length" class="scene-chars">
            {{ scene.characters_present.join(' · ') }}
          </span>
        </div>

        <!-- 场景摘要 -->
        <p v-if="scene.summary" class="scene-summary">{{ scene.summary }}</p>

        <!-- 节拍列表 -->
        <div class="beats">
          <div
            v-for="(beat, bIdx) in scene.beats"
            :key="bIdx"
            class="beat"
            :class="`beat-${beat.type}`"
          >
            <!-- 动作 -->
            <template v-if="beat.type === 'action'">
              <p class="beat-action">{{ beat.content }}</p>
            </template>

            <!-- 对话 -->
            <template v-else-if="beat.type === 'dialogue'">
              <div class="beat-dialogue">
                <span class="char-name">{{ beat.character }}</span>
                <span v-if="beat.parenthetical" class="paren-text">({{ beat.parenthetical }})</span>
                <p class="dialogue-text">{{ beat.content }}</p>
              </div>
            </template>

            <!-- 转场 -->
            <template v-else-if="beat.type === 'transition'">
              <p class="beat-transition">{{ beat.content }}</p>
            </template>

            <!-- 备注 -->
            <template v-else-if="beat.type === 'note'">
              <p class="beat-note">{{ beat.content }}</p>
            </template>

            <!-- 语气标签 -->
            <span v-if="beat.tone" class="tone-tag">{{ beat.tone }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- YAML 原始视图 -->
    <div v-else class="yaml-view">
      <pre class="yaml-content"><code>{{ yamlContent }}</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useScriptStore } from '../store/script'
import type { SceneHeading } from '../types/script'

const store = useScriptStore()

const viewMode = ref<'structured' | 'yaml'>('structured')
const activeScene = ref(0)
const sceneRefs = ref<(HTMLElement | null)[]>([])

const script = computed(() => store.script)
const scenes = computed(() => script.value?.scenes ?? [])
const yamlContent = computed(() => store.yamlContent)

function setSceneRef(idx: number, el: HTMLElement | null) {
  sceneRefs.value[idx] = el
}

function formatHeading(heading?: SceneHeading): string {
  if (!heading) return '未知场景'
  return `${heading.location_type}. ${heading.location} - ${heading.time_of_day}`
}

function scrollToScene(idx: number) {
  activeScene.value = idx
  sceneRefs.value[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<style scoped>
.script-preview {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  height: 100%;
}

/* 工具栏 */
.preview-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-sm);
}
.toolbar-left {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}
.preview-title {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 1.2rem;
  color: var(--text-primary);
}
.script-name {
  font-size: 0.85rem;
  color: var(--accent-gold);
  font-style: italic;
  padding: 2px 10px;
  background: var(--accent-gold-dim);
  border-radius: 20px;
}
.toolbar-actions {
  display: flex;
  gap: 4px;
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  padding: 3px;
}
.view-toggle {
  padding: 6px 16px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  font-family: var(--font-body);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}
.view-toggle.active {
  background: var(--bg-card);
  color: var(--accent-gold);
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

/* 场景导航 */
.scene-nav {
  display: flex;
  gap: 4px;
  padding: var(--space-sm) 0;
  overflow-x: auto;
  scrollbar-width: none;
}
.scene-nav::-webkit-scrollbar { display: none; }
.scene-nav-item {
  min-width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(212,165,116,0.15);
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}
.scene-nav-item:hover { border-color: var(--accent-gold); color: var(--text-primary); }
.scene-nav-item.active {
  background: var(--accent-red);
  border-color: var(--accent-red);
  color: #fff;
}

/* 场景容器 */
.scenes-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  overflow-y: auto;
  flex: 1;
  padding-right: var(--space-sm);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  padding: var(--space-2xl);
  color: var(--text-muted);
  text-align: center;
}
.empty-hint { font-size: 0.85rem; font-style: italic; }

/* 场景卡片 */
.scene-card {
  animation: fadeInUp 0.5s ease both;
}

.scene-heading {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding-bottom: var(--space-md);
  border-bottom: 1px solid rgba(212,165,116,0.1);
  margin-bottom: var(--space-md);
  flex-wrap: wrap;
}
.scene-number {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-red);
  color: #fff;
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 0.85rem;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}
.heading-text {
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 1rem;
  text-transform: uppercase;
  color: var(--accent-gold);
  letter-spacing: 0.04em;
}
.scene-chars {
  font-size: 0.78rem;
  color: var(--text-muted);
  font-style: italic;
  margin-left: auto;
}

.scene-summary {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-style: italic;
  padding: var(--space-sm) var(--space-md);
  background: var(--accent-gold-dim);
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-md);
  border-left: 3px solid var(--accent-gold);
}

/* 节拍 */
.beats {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.beat {
  position: relative;
  padding: var(--space-sm) 0;
}

/* action */
.beat-action {
  color: var(--text-secondary);
  font-style: italic;
  line-height: 1.9;
  padding-left: var(--space-md);
  border-left: 2px solid rgba(212,165,116,0.1);
}

/* dialogue */
.beat-dialogue {
  padding-left: var(--space-lg);
}
.char-name {
  display: inline-block;
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 0.9rem;
  text-transform: uppercase;
  color: var(--accent-red);
  letter-spacing: 0.06em;
  margin-bottom: 2px;
}
.dialogue-text {
  color: var(--text-primary);
  line-height: 1.8;
  font-size: 1rem;
}

/* parenthetical (inline in dialogue) */
.paren-text {
  font-size: 0.85rem;
  color: var(--text-muted);
  font-style: italic;
  margin-left: var(--space-sm);
}

/* transition */
.beat-transition {
  text-align: right;
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 0.85rem;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.08em;
  padding: var(--space-sm) 0;
}

/* note */
.beat-note {
  font-size: 0.82rem;
  color: var(--info);
  font-style: italic;
  padding: var(--space-sm) var(--space-md);
  background: rgba(107,140,174,0.08);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--info);
}

/* 语气标签 */
.tone-tag {
  position: absolute;
  right: 0;
  top: var(--space-sm);
  font-size: 0.7rem;
  color: var(--text-muted);
  background: var(--bg-surface);
  padding: 2px 8px;
  border-radius: 12px;
  text-transform: lowercase;
  font-style: italic;
}

/* YAML 视图 */
.yaml-view {
  flex: 1;
  overflow: auto;
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  border: var(--film-border);
}
.yaml-content {
  padding: var(--space-lg);
  font-family: var(--font-mono);
  font-size: 0.85rem;
  line-height: 1.7;
  color: var(--accent-gold);
  white-space: pre-wrap;
  word-break: break-word;
}

/* 响应式 */
@media (max-width: 768px) {
  .scene-heading {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-sm);
  }
  .scene-chars { margin-left: 0; }
  .beat-dialogue { padding-left: var(--space-md); }
}
</style>
