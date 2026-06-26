# novel2script — API 接口文档

## 基础信息

- **Base URL**: `http://localhost:8080/api/v1`
- **Content-Type**: `application/json`
- **编码**: UTF-8

---

## 1. 小说转剧本

### `POST /api/v1/convert`

将小说文本转换为结构化 YAML 剧本。

#### 请求体

```json
{
  "novel_text": "小说文本内容...",
  "options": {
    "title": "剧本标题",
    "author": "原著作者",
    "genre": "体裁类型",
    "preserve_chapters": false,
    "dialogue_mode": "lenient",
    "generate_summaries": true
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `novel_text` | string | 是 | 小说文本，100-200000字符 |
| `options.title` | string | 否 | 剧本标题，不提供则由AI推断 |
| `options.author` | string | 否 | 原著作者 |
| `options.genre` | string | 否 | 体裁（drama/comedy/thriller/romance/sci-fi 等） |
| `options.preserve_chapters` | boolean | 否 | 是否保留章节结构，默认 false |
| `options.dialogue_mode` | string | 否 | 对话提取模式：strict（严格）/ lenient（宽松），默认 lenient |
| `options.generate_summaries` | boolean | 否 | 是否生成场景摘要，默认 true |

#### 成功响应 (200)

```json
{
  "success": true,
  "yaml_content": "version: \"1.0\"\nmeta:\n  title: ...\n...",
  "script": {
    "version": "1.0",
    "meta": { ... },
    "characters": [ ... ],
    "scenes": [ ... ]
  },
  "characters": [
    {
      "name": "汪淼",
      "aliases": ["汪教授"],
      "description": "纳米材料科学家",
      "character_type": "protagonist",
      "relationships": ["史强的朋友"]
    }
  ],
  "warnings": ["检测到 3 个章节"],
  "processing_time_ms": 15230
}
```

#### 错误响应 (400)

```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "novel_text: 小说文本长度应在100-200000字符之间",
  "timestamp": "2026-06-06T10:30:00"
}
```

#### 调用示例

```bash
curl -X POST http://localhost:8080/api/v1/convert \
  -H "Content-Type: application/json" \
  -d '{
    "novel_text": "第一章 初始\n\n深夜，纳米材料实验室内，汪淼独自坐在显微镜前...",
    "options": {
      "title": "三体",
      "author": "刘慈欣"
    }
  }'
```

---

## 2. YAML 校验

### `POST /api/v1/validate`

校验 YAML 内容是否符合剧本格式。

#### 请求体

```json
{
  "yaml_content": "version: \"1.0\"\nmeta:\n  title: ..."
}
```

#### 响应

```json
{
  "valid": true,
  "errors": [],
  "warnings": ["缺少 characters 角色列表"]
}
```

---

## 3. 健康检查

### `GET /api/v1/health`

#### 响应

```json
{
  "status": "UP",
  "service": "novel2script",
  "timestamp": "2026-06-06T10:30:00"
}
```

---

## 错误码

| HTTP 状态码 | 错误码 | 说明 |
|-------------|--------|------|
| 400 | `VALIDATION_ERROR` | 请求参数校验失败 |
| 400 | `CONVERSION_ERROR` | 转换过程出错 |
| 500 | `INTERNAL_ERROR` | 服务器内部错误 |
| 500 | `LLM_ERROR` | LLM 调用失败 |

---

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `LLM_API_KEY` | LLM API 密钥 | - |
| `LLM_BASE_URL` | LLM API 地址 | `https://api.deepseek.com` |
| `LLM_MODEL` | 模型名称 | `deepseek-chat` |
| `LLM_MAX_TOKENS` | 最大生成 token 数 | `8192` |
| `LLM_TEMPERATURE` | 生成温度 | `0.3` |
| `LLM_TIMEOUT` | 调用超时（秒） | `120` |
