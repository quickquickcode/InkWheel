# 从这里开始

更新日期：2026-06-02

现在 `docs/` 里的文档比较多，不需要从头到尾一次读完。按你的目的选一条路线即可。

## 1. 只想快速了解项目

建议顺序：

1. `README.md`：知道有哪些文档。
2. `architecture.md`：看系统分层、当前链路和安全边界。
3. `platform_status.md`：看三平台工具当前到底能做到哪一步。

读完这三份，你就能判断：项目当前是课程实验控制台，保持 preview/draft-only，没有真实发布。

## 2. 准备继续开发

建议顺序：

1. `architecture.md`：先看分层纪律，避免把逻辑写错位置。
2. `development_plan.md`：看近期路线和完成定义。
3. `capability_levels.md`：看当前模块等级，决定先补哪块。
4. `commands.md`：看启动、测试、构建和外部工具边界。

开发时只要记住一句话：新增能力要能说清输入、输出、失败路径、测试和文档更新。

## 3. 准备审计或验收

建议顺序：

1. `audit_guide.md`：看审计对象和记录模板。
2. `audit_metrics.md`：看未来机器可读指标应该长什么样。
3. `validation_protocol.md`：看一个模块从“能跑”到“可审计”要补哪些证据。
4. `experiment_artifacts.md`：看实验产物以后应该怎么归档。

当前很多审计指标和产物目录还是目标契约，不是已实现功能。文档里会明确写“当前实现差距”。

## 4. 准备接入平台工具

建议顺序：

1. `platform_status.md`：看小红书、今日头条、微信公众号外部库状态。
2. `capability_levels.md`：看各平台适配器当前等级。
3. `validation_protocol.md`：看平台适配器验证要求。
4. `commands.md`：看外部命令只能作为边界参考，不直接自动发布。

接平台的底线：先 preview，再 mock，再人工预览，最后才考虑真实动作；真实动作必须有审核门禁。

## 5. 每份文档一句话

| 文档 | 一句话用途 |
| --- | --- |
| `architecture.md` | 系统怎么分层，代码应该放哪里，哪些边界不能破。 |
| `development_plan.md` | 后续做什么、先做什么、做到什么算完成。 |
| `platform_status.md` | 三个外部平台工具当前状态、风险和下一步。 |
| `capability_levels.md` | 每个模块现在是 L几，为什么，下一步怎么升级。 |
| `audit_guide.md` | 开发时怎么留审计记录，不该记录什么敏感信息。 |
| `audit_metrics.md` | 未来运行审计 JSON 的字段和指标名。 |
| `validation_protocol.md` | 模块升级时要留下什么测试、截图、日志和预览证据。 |
| `experiment_artifacts.md` | 实验运行、草稿、预览、截图、报告以后放哪里。 |
| `commands.md` | 常用启动、测试、探活和外部工具参考命令。 |
| `ui-concept.png` | 前端视觉概念图。 |

## 6. 推荐阅读节奏

第一轮只看：

```text
START_HERE.md -> architecture.md -> platform_status.md
```

第二轮按开发任务补看：

```text
development_plan.md -> capability_levels.md -> validation_protocol.md
```

第三轮做审计或报告时再看：

```text
audit_guide.md -> audit_metrics.md -> experiment_artifacts.md
```
