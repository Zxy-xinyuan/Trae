<template>
  <div class="export-panel" v-if="hasResult">
    <!-- 统计信息 -->
    <div class="stats-row">
      <div class="stat-item">
        <span class="stat-value">{{ stats.sceneCount }}</span>
        <span class="stat-label">场景</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ stats.characterCount }}</span>
        <span class="stat-label">角色</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ formattedTime }}</span>
        <span class="stat-label">耗时</span>
      </div>
    </div>

    <!-- 警告 -->
    <div v-if="warnings.length" class="warnings">
      <div v-for="warn in warnings" :key="warn" class="warning-item">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        {{ warn }}
      </div>
    </div>

    <!-- 导出按钮 -->
    <div class="export-actions">
      <button class="btn btn-secondary" @click="downloadYaml">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        下载 YAML
      </button>

      <button class="btn btn-secondary" @click="copyYaml">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        {{ copied ? '已复制 ✓' : '复制 YAML' }}
      </button>

      <button class="btn btn-secondary" @click="handleValidate" :disabled="validating">
        <template v-if="validating">
          <div class="spinner" />
          校验中...
        </template>
        <template v-else>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          校验格式
        </template>
      </button>
    </div>

    <!-- 校验结果 -->
    <div v-if="validationResult" class="validation-result" :class="validationResult.valid ? 'valid' : 'invalid'">
      <p v-if="validationResult.valid" class="valid-msg">✓ YAML 格式校验通过</p>
      <template v-else>
        <p class="invalid-msg">✗ 格式校验未通过</p>
        <ul v-if="validationResult.errors.length">
          <li v-for="err in validationResult.errors" :key="err">{{ err }}</li>
        </ul>
      </template>
      <ul v-if="validationResult.warnings.length" class="warn-list">
        <li v-for="w in validationResult.warnings" :key="w">{{ w }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useScriptStore } from '../store/script'
import { validateYaml } from '../services/api'
import type { ValidationResponse } from '../types/script'

const store = useScriptStore()
const copied = ref(false)
const validating = ref(false)
const validationResult = ref<ValidationResponse | null>(null)

const hasResult = computed(() => store.hasResult)
const stats = computed(() => store.stats)
const warnings = computed(() => store.warnings)

const formattedTime = computed(() => {
  const ms = stats.value.processingTime
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
})

function downloadYaml() {
  if (!store.yamlContent) return
  const blob = new Blob([store.yamlContent], { type: 'text/yaml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${store.script?.meta?.title || 'screenplay'}.yaml`
  a.click()
  URL.revokeObjectURL(url)
}

async function copyYaml() {
  if (!store.yamlContent) return
  try {
    await navigator.clipboard.writeText(store.yamlContent)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // fallback
    const textarea = document.createElement('textarea')
    textarea.value = store.yamlContent
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }
}

async function handleValidate() {
  if (!store.yamlContent) return
  validating.value = true
  validationResult.value = null
  try {
    validationResult.value = await validateYaml(store.yamlContent)
  } catch (err: any) {
    validationResult.value = {
      valid: false,
      errors: [err.message ?? '校验请求失败'],
      warnings: [],
    }
  } finally {
    validating.value = false
  }
}
</script>

<style scoped>
.export-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

/* 统计 */
.stats-row {
  display: flex;
  gap: var(--space-md);
}
.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-md);
  background: var(--bg-surface);
  border: var(--film-border);
  border-radius: var(--radius-md);
}
.stat-value {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--accent-gold);
}
.stat-label {
  font-size: 0.78rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-top: 2px;
}

/* 警告 */
.warnings {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.warning-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 0.82rem;
  color: var(--warning);
  padding: var(--space-sm) var(--space-md);
  background: rgba(212,165,116,0.08);
  border-radius: var(--radius-sm);
}

/* 导出按钮 */
.export-actions {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
}
.export-actions .btn {
  flex: 1;
  min-width: 120px;
  padding: 10px 16px;
  font-size: 0.88rem;
}

/* 校验结果 */
.validation-result {
  padding: var(--space-md);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
}
.validation-result.valid {
  background: rgba(90,158,111,0.1);
  border: 1px solid var(--success);
  color: var(--success);
}
.validation-result.invalid {
  background: rgba(196,69,54,0.1);
  border: 1px solid var(--error);
  color: #f0a0a0;
}
.valid-msg,
.invalid-msg {
  font-weight: 600;
  margin-bottom: 4px;
}
.validation-result ul {
  margin-top: 4px;
  padding-left: var(--space-lg);
}
.validation-result li {
  margin-bottom: 2px;
}
.warn-list {
  color: var(--warning);
}

@media (max-width: 768px) {
  .stats-row { flex-direction: column; }
  .export-actions { flex-direction: column; }
  .export-actions .btn { min-width: 100%; }
}
</style>
