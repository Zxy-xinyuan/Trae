import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Script, ScriptCharacter, ConversionResponse } from '../types/script'
import { convertNovel } from '../services/api'
import type { ConversionRequest } from '../types/script'

export const useScriptStore = defineStore('script', () => {
  // ========== 状态 ==========
  const script = ref<Script | null>(null)
  const yamlContent = ref<string>('')
  const characters = ref<ScriptCharacter[]>([])
  const warnings = ref<string[]>([])
  const processingTimeMs = ref<number>(0)

  const loading = ref(false)
  const error = ref<string>('')
  const hasResult = computed(() => script.value !== null)

  // 统计信息
  const stats = computed(() => ({
    sceneCount: script.value?.scenes?.length ?? 0,
    characterCount: characters.value.length,
    processingTime: processingTimeMs.value,
  }))

  // ========== 操作 ==========

  /**
   * 执行小说转剧本
   */
  async function convert(request: ConversionRequest) {
    loading.value = true
    error.value = ''
    warnings.value = []

    try {
      const response: ConversionResponse = await convertNovel(request)

      if (response.success) {
        script.value = response.script ?? null
        yamlContent.value = response.yaml_content ?? ''
        characters.value = response.characters ?? []
        warnings.value = response.warnings ?? []
        processingTimeMs.value = response.processing_time_ms ?? 0
      } else {
        error.value = response.error ?? '转换失败'
      }
    } catch (err: any) {
      error.value = err.message ?? err.error ?? '转换请求失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 重置状态
   */
  function reset() {
    script.value = null
    yamlContent.value = ''
    characters.value = []
    warnings.value = []
    processingTimeMs.value = 0
    error.value = ''
  }

  /**
   * 更新角色信息
   */
  function updateCharacter(index: number, updates: Partial<ScriptCharacter>) {
    if (characters.value[index]) {
      characters.value[index] = { ...characters.value[index], ...updates }
    }
  }

  return {
    script,
    yamlContent,
    characters,
    warnings,
    processingTimeMs,
    loading,
    error,
    hasResult,
    stats,
    convert,
    reset,
    updateCharacter,
  }
})
