# novel2script — AI 小说转剧本工具

面向小说作者的 AI 辅助剧本创作工具，将小说文本智能转换为符合行业标准的结构化 YAML 剧本。

## 功能特性

- 📖 **智能章节识别**：自动检测章节标题，支持多种中文章节格式
- 🎬 **场景自动分割**：混合策略（规则 + LLM），精确识别场景边界
- 🎭 **角色提取**：自动识别角色名称、对话关系和人物类型
- 📝 **剧本转换**：一键将小说转为行业标准剧本格式（YAML）
- ✅ **YAML 校验**：自动验证输出格式，支持自动修复
- 🔌 **多 LLM 支持**：兼容所有 OpenAI 格式 API（DeepSeek、通义千问等）

## 技术栈

- **后端**：Java 17 + Spring Boot 3 + WebFlux
- **AI**：兼容 OpenAI 格式的 LLM API
- **格式**：YAML（Jackson YAML）

## 快速开始

### 1. 配置 LLM API

```bash
cd backend
cp .env.example .env
# 编辑 .env，填入你的 API Key
```

### 2. 启动后端

```bash
cd backend
mvn spring-boot:run
```

服务将在 `http://localhost:8080` 启动。

### 3. 调用 API

```bash
curl -X POST http://localhost:8080/api/v1/convert \
  -H "Content-Type: application/json" \
  -d '{
    "novel_text": "你的小说文本...",
    "options": {
      "title": "剧本标题",
      "author": "作者名"
    }
  }'
```

### 4. Docker 部署

```bash
# 设置环境变量
export LLM_API_KEY=sk-your-key
export LLM_BASE_URL=https://api.deepseek.com

# 启动
docker-compose up -d
```

## 项目结构

```
novel2script/
├── backend/                    # Spring Boot 后端
│   └── src/main/java/com/novel2script/
│       ├── config/             # 配置类
│       ├── controller/         # REST 控制器
│       ├── service/            # 业务服务（转换流水线）
│       ├── model/              # 领域模型
│       ├── dto/                # 数据传输对象
│       ├── prompt/             # 提示词模板
│       └── util/               # 工具类
├── docs/                       # 项目文档
│   ├── schema.md               # YAML Schema 定义
│   └── api.md                  # API 接口文档
├── docker-compose.yml
└── README.md
```

## 文档

- [YAML Schema 定义](docs/schema.md) — 完整的剧本格式规范
- [API 接口文档](docs/api.md) — REST API 详细说明

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/convert` | 小说文本转剧本 |
| POST | `/api/v1/validate` | 校验 YAML 内容 |
| GET | `/api/v1/health` | 健康检查 |

## License

MIT
