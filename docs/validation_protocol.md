# 模块验证协议

更新日期：2026-06-02

本文档定义 CyberLab 模块从“能跑”升级到“可审计”的验证方式。它借鉴了演武堂 PPT 项目的 showcase protocol，但当前项目不生成 PPT 组件展示包，而是为数据源、生成器、平台适配器和前端工作流留下可复用验收包。

## 1. 验证包目标

每个能力升级到 L3 及以上时，都应能回答：

- 输入是什么？
- 输出是什么？
- 失败时怎么表现？
- 是否触发真实平台动作？
- 有哪些测试证明？
- 有哪些截图、日志或预览证据？
- 文档中的能力等级是否同步更新？

## 2. 验证包建议结构

后续可在 `artifacts/runs/<run_id>/` 中保存：

```text
validation/
├── request.json
├── response.json
├── audit.json
├── logs.txt
├── screenshots/
└── notes.md
```

当前未实现自动生成时，也可以在开发记录里手动贴出摘要。

## 3. 趋势源验证

最低要求：

- mock 源站返回正常数据。
- mock 源站失败后触发 fallback。
- 返回 `TrendItem` 字段完整。
- 运行日志区分真实采集和备用数据。

建议测试：

```bash
cd backend
.venv/bin/pytest tests/test_services.py
```

验收证据：

- 请求源站列表、关键词、limit。
- 返回趋势数量。
- 是否出现 `trend_fallback_used`。
- 失败源站的错误摘要。

## 4. 内容生成器验证

最低要求：

- 同一趋势可以生成三平台版本。
- 每个平台版本包含标题、正文、标签或摘要字段。
- 请求不存在趋势时返回明确错误。
- 模板生成器和 mock LLM 生成器输出同一结构。

验收证据：

- `GenerateRequest` 摘要。
- `PostDraft` 摘要。
- `content_variant_count`。
- 内容长度 warning。

## 5. 平台适配器验证

最低要求：

- preview 函数不触发真实发布。
- 返回平台、模式、message、command_hint 和 payload。
- payload 缺字段时有明确错误或 warning。
- 外部命令用 mock subprocess 或 mock HTTP client 验证。

平台专项要求：

| 平台 | 验证重点 |
| --- | --- |
| 小红书 | 强制 `--preview`，图片字段映射，绝不默认发布 |
| 今日头条 | `content/topic/images` 载荷，CLI/MCP 二选一入口清晰 |
| 微信公众号 | Markdown 草稿结构，草稿路径和素材需求清楚 |

验收证据：

- `AdapterPreview` JSON。
- `adapter_preview_ready` 指标。
- mock 外部调用参数。
- 若运行真实预览，保存截图和脱敏日志。

## 6. 前端工作流验证

最低要求：

- 关键页面可导航。
- 无控制台错误。
- 移动端无横向溢出。
- 加载、成功、失败、空状态能被用户理解。

建议检查：

```bash
cd frontend
npm test
npm run build
```

可见 UI 变化还应做浏览器截图检查，并记录截图路径。

## 7. 实验报告验证

最低要求：

- 能导出 run 基本信息。
- 能列出趋势、草稿、预览和日志。
- 能区分 fallback 与真实采集。
- 能隐藏敏感信息。

验收证据：

- `report.md`。
- `audit.json`。
- 脱敏检查说明。

## 8. 升级登记

模块升级后，应同步更新：

- `capability_levels.md`：等级和说明。
- `platform_status.md`：如涉及平台。
- `audit_metrics.md`：如新增指标。
- `experiment_artifacts.md`：如新增产物类型。
- `development_plan.md`：如影响阶段计划。
