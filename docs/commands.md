# 命令索引

更新日期：2026-06-16

本文档记录 CyberLab ContentOps 当前常用命令。新增 Makefile target、脚本或外部工具包装后，应同步更新本文件。

## 1. 项目安装

从仓库根目录：

```bash
make install
```

分别安装：

```bash
make backend-install
make frontend-install
```

## 2. 启动开发服务

后端：

```bash
make backend-dev
```

等价命令：

```bash
cd backend
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

前端：

```bash
make frontend-dev
```

等价命令：

```bash
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

访问地址：

```text
前端：http://127.0.0.1:5173
后端：http://127.0.0.1:8000
状态：http://127.0.0.1:8000/api/status
```

## 3. 测试与构建

全部测试：

```bash
make test
```

后端测试：

```bash
make backend-test
```

前端测试：

```bash
make frontend-test
```

前端构建：

```bash
make frontend-build
```

## 4. 轻量探活

后端状态：

```bash
backend/.venv/bin/python -c "import urllib.request; r=urllib.request.urlopen('http://127.0.0.1:8000/api/status', timeout=5); print(r.status, r.read().decode()[:200])"
```

前端首页：

```bash
backend/.venv/bin/python -c "import urllib.request; r=urllib.request.urlopen('http://127.0.0.1:5173/', timeout=5); print(r.status, r.read().decode()[:120])"
```

## 5. RSS 与 LLM 相关命令

触发 RSS 采集（需要后端已启动）：

```bash
curl -X POST http://127.0.0.1:8000/api/rss/collect \
  -H "Content-Type: application/json" \
  -d '{"source_ids": [], "keyword": "AI", "days": 7, "limit": 20}'
```

触发 LLM 文章分析：

```bash
curl -X POST http://127.0.0.1:8000/api/content/analyze \
  -H "Content-Type: application/json" \
  -d '{"article_id": "<article_id>"}'
```

触发 LLM 内容生成：

```bash
curl -X POST http://127.0.0.1:8000/api/content/generate \
  -H "Content-Type: application/json" \
  -d '{"article_id": "<article_id>", "platforms": ["xiaohongshu", "toutiao", "wechat"], "use_llm": true}'
```

## 6. 外部工具仓库同步

查看外部仓库状态：

```bash
curl http://127.0.0.1:8000/api/external-repos
```

拉取指定仓库：

```bash
curl -X POST http://127.0.0.1:8000/api/external-repos/sync \
  -H "Content-Type: application/json" \
  -d '{"name": "toutiao"}'
```

## 7. 外部工具命令边界

以下命令目前仅作为后续接入参考，不由 CyberLab 自动触发真实发布。

任何外部工具命令进入后端适配器前，必须先在 `platform_status.md` 登记状态，并在 `validation_protocol.md` 中补齐 mock 验证方式。

小红书预览候选：

```bash
cd external/XiaohongshuSkills
python scripts/publish_pipeline.py --preview --title "标题" --content "正文" --image-urls "https://example.com/image.jpg"
```

今日头条 CLI 候选：

```bash
cd external/toutiao/toutiao_cli
python3 cli.py micro publish "内容"
```

微信公众号采集候选：

```bash
cd external/wemp-operator
node scripts/content/smart-collect.mjs --query "AI热点" --keywords "AI,LLM" --sources "hackernews,v2ex,36kr"
```

## 8. 维护规则

- 新增命令时说明运行目录。
- 涉及外部平台动作时说明是否 preview、draft 还是 publish。
- 不在命令示例中放 Cookie、Token、AppSecret 或真实账号信息。
- 如果命令会生成产物，说明产物应落到 `experiment_artifacts.md` 规定的目录。
