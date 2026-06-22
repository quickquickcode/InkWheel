# CyberLab ContentOps 安装部署与使用手册

更新日期：2026-06-16

## 1. 环境要求

- Python 3.9+
- Node.js 18+（用于前端构建与 wemp-operator）
- macOS / Linux / Windows（外部工具在 macOS 上已验证，Windows 需额外验证）
- Google Chrome（小红书 CDP 预览需要）
- opencode CLI（可选，提供本地免费模型；也可配置 `OPENCODE_API_KEY` 使用云端模型）

## 2. 安装

```bash
# 1. 克隆仓库（已包含 external 子项目）
cd CyberLab

# 2. 安装后端依赖
make backend-install

# 3. 安装前端依赖
make frontend-install

# 4. 安装今日头条 CLI 的浏览器依赖
pip3 install -r external/toutiao/toutiao_cli/requirements.txt
playwright install chromium

# 5. 安装小红书工具依赖（可选）
pip install -r external/XiaohongshuSkills/requirements.txt

# 6. 安装微信公众号工具依赖（可选）
cd external/wemp-operator
npm install
```

## 3. 配置

复制环境变量模板：

```bash
cp .env.example backend/.env
```

编辑 `backend/.env`：

```text
# 方式一（推荐）：使用本地 opencode run 免费模型，无需 API key
# 留空以下字段即可，只要系统已安装 opencode CLI
OPENCODE_API_KEY=

# 方式二：使用 OpenCode 云端 API
# OPENCODE_API_KEY=your-opencode-api-key
# OPENCODE_BASE_URL=https://opencode.ai/zen/v1
# OPENCODE_MODEL=mimo-v2.5-free

# 微信公众号草稿创建开关（默认关闭）
WEMP_ALLOW_DRAFT=false
```

可选：强制使用内存存储（默认使用 SQLite）：

```text
CYBERLAB_MEMORY_REPO=1
```

## 4. 启动

```bash
# 终端 1：启动后端
make backend-dev

# 终端 2：启动前端
make frontend-dev
```

访问地址：

- 前端：`http://127.0.0.1:5173`
- 后端 API：`http://127.0.0.1:8000`
- 状态检查：`http://127.0.0.1:8000/api/status`

## 5. 外部工具登录

### 今日头条

```bash
cd external/toutiao/toutiao_cli
python3 cli.py auth login
```

扫码登录后，登录态会保存在本地 session 中。

### 小红书

```bash
cd external/XiaohongshuSkills
python scripts/cdp_publish.py login
```

扫码登录小红书创作者中心。

### 微信公众号

参考 `external/wemp-operator/README.md` 配置公众号 AppID、AppSecret。

## 6. 主要功能使用

### 6.1 发现页（话题驱动的 RSS 采集与推荐榜）

1. 进入“发现”页面。
2. 在顶部话题卡片区选择感兴趣的话题（如“AI 与大模型”“AI 教育”“技术趋势”等）。
3. 点击“刷新榜单”，后端会从该话题对应的 RSS 源子集中异步并发采集，前端通过 SSE 实时显示处理进度、当前源和已采集文章数；完成后自动生成推荐榜。
4. 在“推荐榜”或“资料库”标签中查看爬取的文章，点击“查看”可阅读全文与原文链接。
5. 在排行榜或资料库中使用复选框选择一篇或多篇文章，点击“生成”或“融合生成”。融合生成时可输入创作意图/提示词，后端会综合多篇文章生成三平台内容。

### 6.2 文章分析与生成

1. 在发现页选中文章后，点击“AI 分析”查看摘要、标签、适合平台与调性。
2. 勾选“使用 LLM（opencode run 免费模型）生成”可调用 AI 改写；不勾选则使用确定性模板快速生成。由于 opencode run 免费模型单平台约需 20–40 秒，生成过程会通过 SSE 实时展示当前平台与进度。
3. 点击“一键生成三平台内容”，后端异步生成小红书、今日头条、微信公众号三个版本，前端实时显示进度；完成后自动跳转到内容工作室。

### 6.3 内容工作室

1. 进入“内容工作室”页面。
2. 选择小红书/今日头条/微信标签，查看对应版本。
3. 版本记录中会保存每次生成的草稿。

### 6.4 发布管理

1. 进入“发布管理”页面。
2. 点击“生成预览载荷”查看 JSON 载荷。
3. 点击“执行真实预览”调用外部工具（会二次确认）。
   - 小红书：打开 Chrome 填充表单。
   - 今日头条：校验 Markdown 并给出手动命令。
   - 微信公众号：默认干跑，开启 `WEMP_ALLOW_DRAFT=true` 后创建草稿。

### 6.5 外部工具仓库同步

在“发布管理”页面查看三个 external 仓库的 commit、dirty、落后远程提交数，点击“拉取最新代码”。

## 7. 构建与测试

```bash
# 后端测试
make backend-test

# 前端测试
make frontend-test

# 前端生产构建
make frontend-build
```

## 8. 常见问题

| 现象 | 解决 |
|------|------|
| LLM 分析与生成不可用 | 确认已安装 `opencode` CLI；或配置 `backend/.env` 中的 `OPENCODE_API_KEY` |
| 话题采集返回 0 篇文章 | 尝试切换话题或放宽关键词；部分 RSS 源可能暂时不可达 |
| LLM 生成较慢 | opencode run 免费模型单篇文章约 20-60 秒，可在 UI 关闭 LLM 使用模板快速生成 |
| 今日头条执行预览提示未登录 | 先运行 `python3 cli.py auth login` |
| 小红书预览打不开浏览器 | 确认 Chrome 已安装且 macOS 已授权自动化控制 |
| 后端重启后数据丢失 | 确认未设置 `CYBERLAB_MEMORY_REPO=1`，默认使用 SQLite |
