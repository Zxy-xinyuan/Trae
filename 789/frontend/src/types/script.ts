/** 剧本顶层对象 */
export interface Script {
  version: string
  meta?: Meta
  characters: ScriptCharacter[]
  scenes: Scene[]
}

/** 剧本元数据 */
export interface Meta {
  title?: string
  author?: string
  genre?: string
  source_novel?: string
  version?: string
  created_at?: string
  updated_at?: string
  notes?: string
}

/** 角色定义 */
export interface ScriptCharacter {
  name: string
  aliases?: string[]
  description?: string
  character_type?: 'protagonist' | 'antagonist' | 'supporting' | 'minor'
  relationships?: string[]
}

/** 场景 */
export interface Scene {
  scene_number: number
  scene_heading?: SceneHeading
  beats: Beat[]
  summary?: string
  characters_present?: string[]
}

/** 场景标题 */
export interface SceneHeading {
  location_type: 'INT' | 'EXT' | 'INT/EXT'
  location: string
  time_of_day: string
}

/** 节拍类型 */
export type BeatType = 'action' | 'dialogue' | 'transition' | 'note'

/** 场景节拍 */
export interface Beat {
  type: BeatType
  content: string
  character?: string
  parenthetical?: string
  tone?: string
}

/** 转换请求 */
export interface ConversionRequest {
  novel_text: string
  options?: ConversionOptions
}

/** 转换选项 */
export interface ConversionOptions {
  title?: string
  author?: string
  genre?: string
  preserve_chapters?: boolean
  dialogue_mode?: 'strict' | 'lenient'
  generate_summaries?: boolean
}

/** 转换响应 */
export interface ConversionResponse {
  success: boolean
  yaml_content?: string
  script?: Script
  characters?: ScriptCharacter[]
  warnings?: string[]
  processing_time_ms?: number
  error?: string
}

/** YAML 校验响应 */
export interface ValidationResponse {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/** 健康检查响应 */
export interface HealthResponse {
  status: string
  service: string
  timestamp: string
}

/** 错误响应 */
export interface ErrorResponse {
  success: false
  error: string
  message: string
  timestamp: string
}
