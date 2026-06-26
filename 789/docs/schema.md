# novel2script — 剧本 YAML Schema 定义文档

## 1. 概述

本文档定义了 novel2script 工具使用的剧本 YAML 格式规范。该 Schema 基于国际剧本创作标准（如 Fountain 格式、Final Draft 格式），结合中文剧本创作的特殊需求设计而成。

### 1.1 设计原则

1. **行业兼容性**：字段命名和结构遵循国际剧本格式惯例（如 INT/EXT、scene heading 标准格式）
2. **可读性优先**：YAML 格式天然具备良好的人类可读性，适合作者直接编辑
3. **完整性**：覆盖剧本创作的所有关键元素——元数据、角色、场景、节拍
4. **可扩展性**：支持自定义字段和批注，方便后续功能扩展
5. **工具友好**：可直接序列化/反序列化为编程语言对象，支持导入主流剧本软件

### 1.2 为什么选择 YAML

| 格式 | 优点 | 缺点 |
|------|------|------|
| **YAML** ✅ | 可读性极佳、支持注释、结构清晰、编辑友好 | 对缩进敏感 |
| JSON | 工具兼容好 | 引号多、不支持注释、可读性差 |
| XML | 结构严谨 | 冗余标签太多、不适合人类编辑 |
| Fountain | 纯文本、极简 | 结构化程度低、不便于机器处理 |

---

## 2. 顶层结构

```yaml
version: "1.0"        # Schema 版本号
meta: { ... }          # 元数据
characters: [ ... ]    # 角色列表
scenes: [ ... ]        # 场景列表
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `version` | string | 是 | Schema 版本号，当前为 `"1.0"` |
| `meta` | object | 是 | 剧本元数据信息 |
| `characters` | array | 是 | 角色定义列表 |
| `scenes` | array | 是 | 场景列表（剧本核心内容） |

---

## 3. meta — 元数据

```yaml
meta:
  title: "三体"
  author: "刘慈欣"
  genre: "sci-fi"
  source_novel: "三体"
  version: "初稿"
  created_at: "2026-06-06T10:30:00"
  updated_at: "2026-06-06T15:45:00"
  notes: "基于小说第一章改编"
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | 是 | 剧本标题 |
| `author` | string | 否 | 编剧/原著作者 |
| `genre` | string | 否 | 体裁类型（drama / comedy / thriller / romance / sci-fi / fantasy / horror 等） |
| `source_novel` | string | 否 | 原著小说名称 |
| `version` | string | 否 | 剧本版本（初稿 / 修订稿 / 定稿） |
| `created_at` | datetime | 否 | 创建时间，格式：ISO 8601 |
| `updated_at` | datetime | 否 | 最后修改时间 |
| `notes` | string | 否 | 备注说明 |

---

## 4. characters — 角色列表

```yaml
characters:
  - name: "汪淼"
    aliases: ["汪教授", "汪淼教授"]
    description: "纳米材料科学家，主要角色，性格沉稳理性"
    character_type: "protagonist"
    relationships:
      - "史强的朋友"
      - "杨冬的前同事"

  - name: "史强"
    aliases: ["大史"]
    description: "警察，性格粗犷直率，办案经验丰富"
    character_type: "protagonist"
    relationships:
      - "汪淼的朋友"
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 角色名称（**大写**，剧本中统一使用的名称） |
| `aliases` | array\<string\> | 否 | 角色别名（小说中的其他称呼，如昵称、全名等） |
| `description` | string | 否 | 角色简介（外貌、性格、身份） |
| `character_type` | string | 否 | 角色类型：`protagonist`（主角）/ `antagonist`（反派）/ `supporting`（配角）/ `minor`（龙套） |
| `relationships` | array\<string\> | 否 | 角色关系描述 |

### 4.1 为什么角色名要大写？

在国际剧本标准中，角色名在首次出现时使用全大写，这是为了：
- 便于快速扫描识别场景中的出场角色
- 与对话内容形成视觉区分
- 符合好莱坞剧本格式惯例

---

## 5. scenes — 场景列表

```yaml
scenes:
  - scene_number: 1
    scene_heading:
      location_type: "INT"
      location: "纳米材料实验室"
      time_of_day: "NIGHT"
    summary: "汪淼在实验室收到神秘倒计时通知"
    characters_present: ["汪淼", "史强"]
    beats:
      - type: "action"
        content: "昏暗的实验室中，只有电脑屏幕发出冷蓝色的光。汪淼盯着显微镜，手指在键盘上快速敲击。"
      - type: "dialogue"
        character: "史强"
        content: "汪教授，打扰了。"
        parenthetical: "推门而入"
        tone: "casual"
      - type: "action"
        content: "汪淼抬起头，皱眉看着来人。"
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `scene_number` | integer | 是 | 场景序号（从 1 开始递增） |
| `scene_heading` | object | 是 | 场景标题信息 |
| `summary` | string | 否 | 场景摘要（一句话概括） |
| `characters_present` | array\<string\> | 否 | 本场景出场角色 |
| `beats` | array\<Beat\> | 是 | 场景节拍列表 |

### 5.1 scene_heading — 场景标题

```yaml
scene_heading:
  location_type: "INT"    # INT（室内）或 EXT（室外）
  location: "纳米材料实验室"  # 地点名称
  time_of_day: "NIGHT"    # 时间段
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `location_type` | string | 是 | 场地类型：`INT`（室内）/ `EXT`（室外）/ `INT/EXT`（内外景兼有） |
| `location` | string | 是 | 地点名称 |
| `time_of_day` | string | 是 | 时间段 |

**time_of_day 取值说明：**

| 值 | 含义 | 对应中文 |
|----|------|----------|
| `MORNING` | 早晨/上午 | 清晨、早上、上午 |
| `DAY` | 白天 | 白天、下午 |
| `AFTERNOON` | 下午 | 午后 |
| `EVENING` | 傍晚/黄昏 | 傍晚、黄昏 |
| `NIGHT` | 夜晚 | 夜晚、深夜 |
| `DAWN` | 黎明 | 黎明、拂晓 |
| `DUSK` | 日落 | 日落时分 |
| `CONTINUOUS` | 紧接上一场 | 时间无缝衔接 |

**为什么使用 INT/EXT？**
INT/EXT 是国际影视行业的标准标识，直接表明拍摄场地类型（室内/室外），是制片团队安排拍摄计划的重要依据。

---

## 6. beats — 节拍

节拍是剧本中的最小叙事单元，每个节拍代表一个独立的动作、对话或转场。

### 6.1 节拍类型总览

| type | 说明 | 必填字段 | 可选字段 |
|------|------|----------|----------|
| `action` | 动作/场景描写 | `content` | — |
| `dialogue` | 角色对话 | `content` | `character`, `parenthetical`, `tone` |
| `transition` | 转场标记 | `content` | — |
| `note` | 批注/备注 | `content` | — |

### 6.2 action — 动作描写

```yaml
- type: "action"
  content: "汪淼猛地站起来，椅子在地板上发出刺耳的摩擦声。"
```

动作描写应为**可拍摄的视觉化描述**，避免内心独白。心理活动需转化为外在行为表现。

### 6.3 dialogue — 对话

```yaml
- type: "dialogue"
  character: "汪淼"
  content: "这不可能……怎么会这样？"
  parenthetical: "震惊地后退一步"
  tone: "shocked"
```

| 字段 | 说明 |
|------|------|
| `character` | 说话人名称（大写，与 characters 列表中的 name 对应） |
| `content` | 对话内容 |
| `parenthetical` | 对话附注（可选，语气、动作提示，如 "低声地"、"愤怒地"） |
| `tone` | 语气/情感基调（可选） |

**常用语气值参考：**

| 值 | 含义 | 值 | 含义 |
|----|------|----|------|
| `angry` | 愤怒 | `calm` | 平静 |
| `sad` | 悲伤 | `excited` | 兴奋 |
| `happy` | 开心 | `nervous` | 紧张 |
| `shocked` | 震惊 | `cold` | 冷淡 |
| `sarcastic` | 讽刺 | `warm` | 温暖 |
| `fearful` | 恐惧 | `neutral` | 平淡 |

### 6.4 transition — 转场

```yaml
- type: "transition"
  content: "CUT TO:"
```

常用转场标记：`CUT TO:`、`FADE IN:`、`FADE OUT.`、`DISSOLVE TO:`、`SMASH CUT TO:`

### 6.5 note — 批注/备注

```yaml
- type: "note"
  content: "此处需要配合音效设计"
```

批注用于导演或编剧在剧本中留下的备注说明，不作为拍摄指令。

---

## 7. 完整示例

```yaml
version: "1.0"

meta:
  title: "三体·第一部"
  author: "刘慈欣（原著）"
  genre: "sci-fi"
  source_novel: "三体"
  version: "初稿"
  created_at: "2026-06-06T10:30:00"
  notes: "基于小说第一章至第三章改编"

characters:
  - name: "汪淼"
    aliases: ["汪教授"]
    description: "纳米材料科学家，性格沉稳理性，对未知充满好奇"
    character_type: "protagonist"
    relationships:
      - "史强的朋友"
      - "杨冬的前同事"

  - name: "史强"
    aliases: ["大史"]
    description: "刑警，粗犷直率，办案经验丰富"
    character_type: "protagonist"

  - name: "杨冬"
    description: "理论物理学家，已故"
    character_type: "supporting"

scenes:
  - scene_number: 1
    scene_heading:
      location_type: "INT"
      location: "纳米材料实验室"
      time_of_day: "NIGHT"
    summary: "汪淼在实验室工作，史强首次来访"
    characters_present: ["汪淼", "史强"]
    beats:
      - type: "action"
        content: >
          昏暗的实验室中，只有电子显微镜的屏幕发出幽蓝的光。
          汪淼坐在仪器前，专注地观察纳米材料的微观结构。

      - type: "action"
        content: "门被推开，走廊的灯光斜射进来。"

      - type: "dialogue"
        character: "史强"
        content: "汪教授，打扰了。"
        tone: "casual"

      - type: "action"
        content: "汪淼缓缓转过头，皱眉看向门口。一个身材魁梧的男人站在逆光中。"

      - type: "dialogue"
        character: "汪淼"
        content: "你是？"
        tone: "cautious"

      - type: "dialogue"
        character: "史强"
        content: "史强，刑警。想找你了解点情况。"
        parenthetical: "掏出证件晃了一下"
        tone: "calm"

      - type: "action"
        content: "汪淼摘下防尘面罩，站起身来。"

      - type: "dialogue"
        character: "汪淼"
        content: "什么情况？"
        tone: "confused"

  - scene_number: 2
    scene_heading:
      location_type: "EXT"
      location: "研究所大楼外"
      time_of_day: "NIGHT"
    summary: "史强向汪淼透露杨冬的死讯"
    characters_present: ["汪淼", "史强"]
    beats:
      - type: "action"
        content: >
          两人走出大楼。夜风裹挟着初秋的凉意。
          路灯将他们的影子拉得很长。

      - type: "dialogue"
        character: "史强"
        content: "你认识杨冬吗？"
        tone: "serious"

      - type: "dialogue"
        character: "汪淼"
        content: "杨冬？当然认识，她是……"
        tone: "neutral"

      - type: "action"
        content: "汪淼突然停住脚步。"

      - type: "dialogue"
        character: "汪淼"
        content: "怎么了？出了什么事？"
        tone: "anxious"

      - type: "dialogue"
        character: "史强"
        content: "她死了。三天前。"
        tone: "flat"

      - type: "action"
        content: "汪淼愣在原地，嘴唇微微颤抖，说不出话来。"

      - type: "transition"
        content: "FADE OUT."
```

---

## 8. 设计决策说明

### 8.1 为什么用 beats 而不是 dialogue + action 分开的结构？

采用 `beats` 统一列表而非将 dialogue 和 action 分离到不同字段，原因：
- **保持叙事顺序**：剧本的节奏感依赖于动作和对话的交替编排
- **便于编辑**：作者可以在同一个列表中增删、调换顺序
- **符合行业惯例**：Fountain、Final Draft 等格式均采用线性节拍序列

### 8.2 为什么 tone 和 parenthetical 是可选的？

- 不是每句对话都需要标注语气或附注
- 过度标注会限制演员的表演空间
- `tone` 仅在语气基调与字面意思不一致时需要标注（如反讽、隐忍等）
- `parenthetical` 用于描述说话时的动作或姿态，帮助演员理解表演方向

### 8.3 为什么 character_type 用字符串而非枚举？

- 便于扩展（未来可能增加 guest、extra 等类型）
- 避免严格的枚举限制导致自定义困难
- 在 YAML 中保持良好的可读性

### 8.4 为什么选择大写角色名？

这是国际剧本格式的标准要求：
- 好莱坞行业标准（WGA 标准格式）
- 便于导演、制片快速扫描角色出场
- 在 Fountain 格式中也是大写角色名

---

## 9. 与其他格式的转换

本 YAML 格式可转换为以下标准格式：

| 目标格式 | 转换方式 |
|----------|----------|
| **Fountain** (.fountain) | 自动映射 scene_heading → 场景标题，dialogue → 对话块 |
| **Final Draft** (.fdx) | 通过 XML 模板映射 |
| **PDF** | 通过 Fountain → PDF 渲染器 |
| **HTML** | 自定义模板渲染 |

---

## 10. Schema 版本历史

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| 1.0 | 2026-06-06 | 初始版本，定义核心结构 |
