<template>
  <div class="character-editor" v-if="characters.length > 0">
    <div class="editor-header">
      <h3 class="editor-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        角色表
      </h3>
      <span class="char-count">{{ characters.length }} 位角色</span>
    </div>

    <div class="characters-grid">
      <div
        v-for="(char, idx) in characters"
        :key="char.name"
        class="char-card"
        :style="{ animationDelay: `${idx * 0.08}s` }"
      >
        <!-- 头像占位 -->
        <div class="char-avatar" :class="char.character_type || 'minor'">
          {{ char.name.charAt(0) }}
        </div>

        <div class="char-info">
          <div class="char-name-row">
            <span class="char-name">{{ char.name }}</span>
            <span
              v-if="char.character_type"
              class="tag"
              :class="`tag-${char.character_type}`"
            >
              {{ typeLabels[char.character_type] }}
            </span>
          </div>

          <p v-if="char.description" class="char-desc">{{ char.description }}</p>

          <div v-if="char.aliases?.length" class="char-aliases">
            <span class="alias-label">别名：</span>
            <span v-for="alias in char.aliases" :key="alias" class="alias-tag">{{ alias }}</span>
          </div>

          <div v-if="char.relationships?.length" class="char-relations">
            <span class="relation-label">关系：</span>
            <span v-for="rel in char.relationships" :key="rel" class="relation-tag">{{ rel }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useScriptStore } from '../store/script'

const store = useScriptStore()
const characters = computed(() => store.characters)

const typeLabels: Record<string, string> = {
  protagonist: '主角',
  antagonist: '反派',
  supporting: '配角',
  minor: '龙套',
}
</script>

<style scoped>
.character-editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.editor-title {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 1.1rem;
  color: var(--text-primary);
}
.char-count {
  font-size: 0.82rem;
  color: var(--text-muted);
}

.characters-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.char-card {
  display: flex;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--bg-surface);
  border: var(--film-border);
  border-radius: var(--radius-md);
  animation: fadeInUp 0.4s ease both;
  transition: border-color 0.2s;
}
.char-card:hover {
  border-color: rgba(212,165,116,0.3);
}

/* 头像 */
.char-avatar {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.1rem;
  flex-shrink: 0;
}
.char-avatar.protagonist {
  background: rgba(196,69,54,0.2);
  color: #e87060;
  border: 2px solid rgba(196,69,54,0.4);
}
.char-avatar.antagonist {
  background: rgba(107,140,174,0.2);
  color: #8ab4d8;
  border: 2px solid rgba(107,140,174,0.4);
}
.char-avatar.supporting {
  background: rgba(212,165,116,0.15);
  color: var(--accent-gold);
  border: 2px solid rgba(212,165,116,0.3);
}
.char-avatar.minor {
  background: rgba(154,149,141,0.1);
  color: var(--text-secondary);
  border: 2px solid rgba(154,149,141,0.2);
}

/* 信息 */
.char-info {
  flex: 1;
  min-width: 0;
}
.char-name-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: 4px;
}
.char-name {
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 0.95rem;
  text-transform: uppercase;
  color: var(--text-primary);
  letter-spacing: 0.04em;
}

.char-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 6px;
}

.char-aliases,
.char-relations {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  font-size: 0.78rem;
  margin-top: 4px;
}
.alias-label,
.relation-label {
  color: var(--text-muted);
  font-weight: 600;
}
.alias-tag {
  padding: 1px 8px;
  background: var(--bg-card);
  border-radius: 10px;
  color: var(--text-secondary);
}
.relation-tag {
  padding: 1px 8px;
  background: rgba(107,140,174,0.1);
  border-radius: 10px;
  color: var(--info);
}

@media (max-width: 768px) {
  .char-card {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
