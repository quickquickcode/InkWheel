# 实验产物目录契约

更新日期：2026-06-02

本文档定义课程实验运行过程中产生的草稿、预览、截图、日志和报告应如何归档。当前项目尚未正式创建这些目录；后续实现持久化和报告导出时，应按此契约落地。

## 1. 目录分区

建议目录：

```text
artifacts/
├── runs/
│   └── <run_id>/
│       ├── run.json
│       ├── audit.json
│       ├── trends.json
│       ├── drafts.json
│       ├── previews/
│       ├── screenshots/
│       └── report.md
├── previews/
│   └── <platform>/
├── reports/
├── screenshots/
└── tmp/
```

## 2. 产物分区说明

| 分区 | 内容 | Git 策略 | 审计用途 |
| --- | --- | --- | --- |
| `artifacts/runs/<run_id>/run.json` | 实验批次元数据 | 默认忽略 | 记录时间、操作者、配置摘要 |
| `artifacts/runs/<run_id>/audit.json` | 机器可读审计指标 | 默认忽略，可保留样例 | 支持复盘和自动修复 |
| `artifacts/runs/<run_id>/trends.json` | 趋势输入和采集结果 | 默认忽略 | 区分真实采集和 fallback |
| `artifacts/runs/<run_id>/drafts.json` | 三平台内容草稿 | 默认忽略 | 比较平台表达差异 |
| `artifacts/runs/<run_id>/previews/` | 平台预览载荷或草稿文件 | 默认忽略 | 审计字段映射和安全模式 |
| `artifacts/runs/<run_id>/screenshots/` | 前端或外部工具截图 | 默认忽略 | 视觉验收和课堂展示 |
| `artifacts/runs/<run_id>/report.md` | 实验报告 | 可按需纳入样例 | 课程交付物 |
| `artifacts/tmp/` | 临时文件 | 忽略 | 不作为审计证据 |

## 3. 命名规则

推荐 `run_id`：

```text
run_YYYYMMDD_HHMMSS_<short_slug>
```

示例：

```text
run_20260602_104500_ai_education
```

平台预览文件命名：

```text
<platform>_preview.json
<platform>_draft.md
<platform>_screenshot.png
```

## 4. 敏感信息规则

产物中不得保存：

- Cookie。
- 验证码。
- Access Token。
- AppSecret。
- 完整手机号、邮箱或真实账号标识。
- 外部平台返回的隐私字段。

必须保存平台状态时，使用脱敏值：

```text
account: student_01
account_masked: 138****0000
auth_state: logged_in / not_connected / expired
```

## 5. 实验报告建议结构

```text
# 实验报告

## 基本信息
- run_id：
- 时间：
- 操作者：
- 关键词：
- 数据源：

## 趋势采集
- 是否使用 fallback：
- 趋势数量：
- 关键热点：

## 内容生成
- 小红书版本摘要：
- 今日头条版本摘要：
- 微信公众号版本摘要：

## 发布预览
- 小红书：
- 今日头条：
- 微信公众号：

## 审计指标
- error：
- warning：
- info：

## 人工复盘
- 平台表达差异：
- 内容风险：
- 下一步修改：
```

## 6. 当前实现差距

- 尚未创建 `artifacts/` 目录。
- 后端仍是内存状态，不能导出完整 run。
- 前端尚未提供报告导出入口。
- 预览载荷只显示在页面上，尚未归档。

近期实现报告导出时，应先写 `run.json`、`audit.json` 和 `report.md`，再逐步补截图和平台草稿。
