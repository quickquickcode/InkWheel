# 审计指标契约

更新日期：2026-06-16

本文档定义 CyberLab ContentOps 后续应沉淀的机器可读审计指标。当前系统已有运行日志和 SQLite 持久化，但尚未实现统一 `AuditMetric` JSON 结构；本文件是目标契约，用于指导后续实现。

## 1. 目标结构

一次实验运行可以导出如下结构：

```json
{
  "run_id": "run_20260602_001",
  "started_at": "2026-06-02T10:00:00+08:00",
  "metrics": [
    {
      "name": "trend_fallback_used",
      "value": 1,
      "severity": "warning",
      "stage": "trend_collect",
      "path": "sources.wemp_fetch_news",
      "reason": "external_source_failed",
      "details": {
        "keyword": "AI 教育",
        "requested_sources": ["toutiao", "36kr"],
        "fallback_count": 8
      }
    }
  ],
  "issues": [
    {
      "severity": "warning",
      "message": "趋势采集使用备用数据",
      "stage": "trend_collect",
      "path": "sources.wemp_fetch_news"
    }
  ]
}
```

## 2. 字段定义

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `name` | string | 稳定的 snake_case 指标名。 |
| `value` | number / string / boolean | 指标值。 |
| `severity` | `info` / `warning` / `error` | 严重程度。 |
| `stage` | string | 所属阶段：`trend_collect`、`content_generate`、`adapter_preview`、`review`、`publish`、`report`。 |
| `path` | string | 具体对象路径，例如 `sources.toutiao`、`adapters.xiaohongshu`。 |
| `reason` | string | 机器可读原因短语。 |
| `details` | object | 上下文字段，不包含密钥、Cookie 或验证码。 |

## 3. 标准指标列表

| 指标 | 取值 | 阶段 | 含义 | 修复建议 |
| --- | --- | --- | --- | --- |
| `trend_collect_count` | int | `trend_collect` | 本次采集得到的趋势数量。 | 为 0 时检查源站配置、关键词和 fallback。 |
| `trend_fallback_used` | 0 / 1 | `trend_collect` | 是否使用备用趋势。 | 检查外部爬虫、网络和源站健康；报告中标注样例数据。 |
| `source_unavailable` | 0 / 1 | `trend_collect` | 某个源站不可用。 | 查看 `details.error`，必要时禁用该源站。 |
| `source_latency_ms` | int | `trend_collect` | 单个源站采集耗时。 | 持续偏高时降低 limit 或异步化。 |
| `rss_collect_count` | int | `rss_collect` | 本次 RSS 采集得到的文章数量。 | 为 0 时检查源站可用性、关键词和时间范围。 |
| `rss_source_failed` | 0 / 1 | `rss_collect` | 某个 RSS 源站抓取失败。 | 查看 `details.error`，必要时禁用该源站。 |
| `llm_request_failed` | 0 / 1 | `content_generate` / `analyze` | LLM 请求失败。 | 检查 API key、网络、模型可用性和限流情况。 |
| `llm_fallback_used` | 0 / 1 | `content_generate` | 是否因 LLM 失败回退到模板生成。 | 若频繁发生，检查模型配置与提示词。 |
| `content_variant_count` | int | `content_generate` | 生成的平台版本数量。 | 少于请求平台数时检查生成器和平台枚举。 |
| `content_generation_failed` | 0 / 1 | `content_generate` | 内容生成失败。 | 查看趋势输入、生成器配置和模板/模型异常。 |
| `content_length_warning` | int | `content_generate` | 某平台内容长度可能不适合。 | 缩短或拆分内容，按平台规则调整。 |
| `adapter_preview_ready` | 0 / 1 | `adapter_preview` | 适配器成功返回预览载荷。 | 为 0 时检查字段映射和适配器状态。 |
| `adapter_payload_missing` | int | `adapter_preview` | 预览载荷缺少必填字段数量。 | 补齐平台字段，例如标题、正文、图片、topic。 |
| `external_tool_not_configured` | 0 / 1 | `adapter_preview` | 外部工具路径或依赖未配置。 | 检查 `external/` 克隆、依赖安装和平台环境说明。 |
| `external_tool_executed` | 0 / 1 | `execute_preview` | 是否真实执行了外部工具 preview/draft 命令。 | 用于审计真实平台接触记录。 |
| `external_tool_manual_confirm` | 0 / 1 | `execute_preview` | 外部工具执行后是否需要人工确认。 | 若不需要，检查是否误触发了自动发布。 |
| `external_repo_behind` | int | `sync` | 外部工具仓库落后远程的提交数。 | 定期同步以保持外部工具最新。 |
| `real_action_blocked` | 0 / 1 | `publish` | 系统阻止真实平台动作。 | 这是安全指标；若需要发布，先补审核状态。 |
| `review_gate_missing` | 0 / 1 | `review` | 真实动作缺少审核门禁。 | 禁止上线，先实现 approved/rejected 状态机。 |
| `artifact_written` | int | `report` | 本次运行写出的产物数量。 | 为 0 时检查报告/截图/预览归档逻辑。 |
| `secret_redaction_applied` | 0 / 1 | `report` | 是否执行敏感字段脱敏。 | 为 0 时不得导出包含平台数据的报告。 |

## 4. Severity 用法

- `info`：观察性指标，例如采集数量、耗时、生成版本数。
- `warning`：流程可继续，但需要在报告中说明，例如 fallback、字段不完整、内容长度偏长。
- `error`：流程不安全或不可继续，例如真实发布缺少审核门禁、外部工具配置错误、必填字段缺失。

## 5. 修复回路

后续 LLM 或实验报告模块可以按以下顺序处理指标：

1. 按 `stage` 分组。
2. 优先处理 `error`，再处理 `warning`。
3. 使用 `path` 定位数据源、生成器或平台适配器。
4. 根据 `reason` 和 `details` 修改对应配置或输入。
5. 重新运行同一实验批次，比较新旧指标。

## 6. 当前实现差距

当前系统只保存 `Job` 文案日志，尚未保存统一 `AuditMetric`。近期应优先：

1. 在后端模型中增加 `AuditMetric` 或 `Job.details`。
2. 在趋势采集和发布预览中先 emit 最小指标。
3. 在前端日志页面显示 severity、stage 和 details 摘要。
4. 在实验报告导出时包含 metrics 和 issues。
