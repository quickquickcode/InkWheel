# 平台工具接入状态审计

更新日期：2026-06-16

本文档记录三个外部平台工具在 CyberLab ContentOps 中的接入状态。它用于开发排期、风险评估和课程实验审计。

相关文档：

- 能力等级：`capability_levels.md`
- 验证协议：`validation_protocol.md`
- 审计指标：`audit_metrics.md`
- 命令索引：`commands.md`

## 1. 总览

| 平台 | 外部目录 | 当前用途 | 当前接入状态 | 推荐模式 |
| --- | --- | --- | --- | --- |
| 小红书 | `external/XiaohongshuSkills` | 图文/视频发布、CDP 登录、内容检索 | 已真实接入后端适配器，默认 `--preview` | preview-only |
| 今日头条 | `external/toutiao` | 微头条/文章发布、科技频道爬虫、MCP 服务 | 已真实接入 `toutiao_cli`，校验 Markdown 并给出手动命令 | manual-preview |
| 微信公众号 | `external/wemp-operator` | 热点采集、文章生成、草稿/发布、数据分析 | 已接入 `publish.mjs`，草稿创建受 `WEMP_ALLOW_DRAFT` 开关控制 | draft-only |

当前能力等级：小红书 L2 → L3、今日头条 L2 → L3、微信公众号 L2 → L3（真实调用已通，但 mock 测试与审计证据需持续补充）。

## 2. 小红书工具状态

外部项目：`white0dew/XiaohongshuSkills`

本地位置：

```text
external/XiaohongshuSkills
```

关键入口：

```text
external/XiaohongshuSkills/scripts/publish_pipeline.py
external/XiaohongshuSkills/scripts/cdp_publish.py
external/XiaohongshuSkills/scripts/chrome_launcher.py
external/XiaohongshuSkills/config/accounts.json.example
```

当前能力：

- 支持图文和视频发布。
- 支持 CDP 连接 Chrome。
- 支持多账号 Cookie 隔离。
- 支持 `--preview`，可以只填充页面并停留人工确认。
- 支持登录检测、二维码、内容搜索和部分互动动作。

CyberLab 接入方式：

- 适配器：`backend/app/adapters/xiaohongshu.py`
- 执行命令：`python publish_pipeline.py --preview --title <title> --content-file <file> --images <placeholder>`
- 默认使用本地占位图 `external/XiaohongshuSkills/public/whitedew.jpg` 通过参数校验。
- 返回 stdout/stderr、退出码和手动确认提示。

主要风险：

- README 明确提示存在平台风控、限流、封号风险。
- 外部 README 写明目前主要测试 Windows，macOS 需要单独验证。
- 自动化依赖平台 DOM 选择器，页面改版后容易失效。
- CyberLab 已强制使用 `--preview`，不自动发布。

后续任务：

1. 增加 mock subprocess 测试，验证命令参数拼接。
2. macOS 环境完整跑一次 `--preview` 并截图。
3. 收集 CDP 端口、Chrome 路径等配置外部化。

## 3. 今日头条工具状态

外部项目：`quickquickcode/toutiao`

本地位置：

```text
external/toutiao
```

当前远端状态：

```text
main: 2973437 Initial commit: 今日头条自动化工具集合
```

关键子项目：

| 子目录 | 状态 | 说明 |
| --- | --- | --- |
| `toutiao_cli` | 已接入 | Python + Playwright，手动确认式发布 |
| `toutiao_scraper` | 可作为热点采集候选 | Playwright 科技频道爬虫，输出 JSONL |
| `toutiao_mcp_server` | 需要修复后再接 | 接口完整，但 Selenium ChromeDriver 路径硬编码 Windows |
| `toutiao_npm_cli` | 暂不建议接 | 有 TypeScript 代码，但缺少 `package.json`，无法按 README 直接构建 |

CyberLab 接入方式：

- 适配器：`backend/app/adapters/toutiao.py`
- 登录检查：`python cli.py auth status`
- 本地校验：`python cli.py article preview <article.md>`
- 手动发布命令：`python cli.py article publish <article.md>`
- 微头条命令：`python cli.py micro publish "内容" --topic "话题"`

主要风险：

- 需要本地扫码登录，登录态会过期。
- `article publish` 会打开浏览器并停在“请手动点击发布按钮”阶段，仍有人工操作空间。
- 今日头条登录态、验证码和页面结构都可能变化。

后续任务：

1. 增加 mock subprocess 测试覆盖成功、未登录、Markdown 解析失败路径。
2. 修复 `toutiao_mcp_server` 的 ChromeDriver 获取方式，改为平台无关配置。

## 4. 微信公众号工具状态

外部项目：`IanShaw027/wemp-operator`

本地位置：

```text
external/wemp-operator
```

关键入口：

```text
external/wemp-operator/scripts/content/fetch_news.py
external/wemp-operator/scripts/content/smart-collect.mjs
external/wemp-operator/scripts/content/generate.mjs
external/wemp-operator/scripts/content/publish.mjs
external/wemp-operator/templates/article.md
```

当前能力：

- 支持多源热点采集。
- 支持公众号文章生成、发布和模板。
- 支持数据分析日报、周报和互动管理。
- README 声称包含微信公众号 API 集成能力。

CyberLab 接入方式：

- 适配器：`backend/app/adapters/wechat.py`
- 执行命令：`node external/wemp-operator/scripts/content/publish.mjs --file <article.md>`
- 默认 `WEMP_ALLOW_DRAFT=false`，只返回命令，不创建真实草稿。
- 开启 `WEMP_ALLOW_DRAFT=true` 并配置公众号后，才会调用 `publish.mjs` 创建草稿。

主要风险：

- 真实公众号能力依赖 AppID、AppSecret 和公众号权限。
- 草稿、发布、素材上传涉及真实微信平台副作用。
- 需要明确区分生成本地 Markdown、创建草稿、群发发布三个阶段。

后续任务：

1. 增加 Markdown 草稿内容测试。
2. 增加草稿创建结果的 mock 测试。
3. 将 AppID/AppSecret 配置模板化，不提交真实密钥。

## 5. 统一接入策略

所有平台工具必须通过后端适配器接入，不能从前端直接执行外部命令。

当前阶段：

1. 载荷预览：只生成平台字段，不执行外部工具。 ✅
2. 命令预览：生成待执行命令和参数摘要，不运行。 ✅
3. Mock 执行：用 mock subprocess 验证调用契约。 🔄 进行中
4. 人工预览：运行外部工具的 preview 或 draft-only 模式，保存截图和日志。 ✅ 已支持，需本地登录态
5. 审核通过：只有审核状态为 approved 时才允许进入真实平台动作。 ⏸️ 待实现

## 6. 平台接入验收清单

接入任一平台前，必须确认：

- 已明确平台动作属于 preview、draft、publish 还是 analytics。
- 已有 mock 测试覆盖成功和失败路径。
- 已在 UI 中展示当前模式和风险提示。
- 已确认不会保存敏感登录态。
- 已记录命令参数，但不记录密钥和 Cookie。
- 已说明失败后的人工恢复方式。
- 已更新本文档和 `development_plan.md`。
- 已更新 `capability_levels.md` 中的平台等级。
- 如新增运行信号，已更新 `audit_metrics.md`。
