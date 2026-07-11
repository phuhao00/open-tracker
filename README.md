# OpenTacker

付费开源接单助手：帮你从 [paid-open-source-projects](https://github.com/kunovsky/paid-open-source-projects) 里，按技能匹配适合自己的 bounty 项目，看清「项目做什么、怎么结算、怎么接单」，并一键跳转认领任务。

包含两部分：

- **Python 追踪器**：定期抓取项目进展、奖金 Issue、新功能 / 改进 / 优化需求，生成报告与 JSON 快照
- **Next.js 选型界面**：目标选择 → 技能匹配 → 结算说明 → 去接任务的引导式交互

## 能做什么

1. **拉取付费项目列表** — 解析上游 README 表格（名称、技术栈、报酬、入门链接）
2. **抓取项目进展** — GitHub stars、open issues、最近 Release、最近更新的 Issue
3. **识别赚钱机会** — 自动分类：奖金悬赏 / 新功能 / 改进 / 优化 / Bug / 新手友好
4. **技能与目标匹配** — 按技术栈、结算清晰度、练手/冲大额等目标筛选项目
5. **结算说明** — 展示报酬模式、金额、付款时机、平台与认领步骤
6. **一键去接任务** — 从推荐任务直达 GitHub Issue / bounty 页
7. **增量对比** — 对比上次快照，标出新增机会
8. **定期运行** — 本地 cron 调度，或用 GitHub Actions 每天自动跑

## 快速开始

```bash
# 1. 创建虚拟环境并安装
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
# source .venv/bin/activate

pip install -e ".[dev]"

# 2. （推荐）配置 GitHub Token，提高 API 限额
copy .env.example .env
# 编辑 .env，填入 GITHUB_TOKEN=ghp_xxx

# 3. 按你的技能改 config.yaml 里的 skills

# 4. 跑一次
opentacker run

# 查看报告
opentacker show
# 或打开 reports/latest.md
```

### 常用命令

| 命令 | 说明 |
|------|------|
| `opentacker list` | 只解析列表，不抓 Issue |
| `opentacker run` | 全量追踪并生成报告 |
| `opentacker run --all` | 忽略 skills，追踪全部项目 |
| `opentacker show` | 打印最新 Markdown 报告 |
| `opentacker schedule` | 按 `config.yaml` 的 cron 定时跑 |

## 配置说明

编辑根目录 `config.yaml`：

- `skills` — 你的技术栈，用于过滤项目
- `github.bounty_labels` / `opportunity_labels` / `opportunity_keywords` — 机会识别规则
- `schedule.cron` — 本地定时表达式（默认每天 9:00）
- `output.reports_dir` / `history_dir` — 报告与历史快照目录

## 报告读法

生成后看 `reports/latest.md`：

1. **今日优先机会** — 按得分排序，优先点开「奖金悬赏」
2. **新功能 / 改进 / 优化** — 适合中长期贡献、建立维护者信任
3. **各项目进展摘要** — 最近推送、Release、高分 Issue
4. 对比 `data/history/` 下历史 JSON，发现**新增**需求

## GitHub Actions 定时跑（可选）

仓库已带 `.github/workflows/daily-track.yml`。推送到 GitHub 后：

1. 在仓库 Settings → Secrets 添加 `GITHUB_TOKEN`（Actions 自带 token 通常也够用）
2. 每天 UTC 01:00（北京时间 09:00）自动生成报告
3. 报告会 commit 到 `reports/latest.md`（可按需改成只上传 Artifact）

## 项目结构

```
opentacker/
├── config.yaml              # 主配置
├── src/opentacker/
│   ├── list_parser.py       # 解析付费项目列表
│   ├── github_client.py     # GitHub API
│   ├── analyzer.py          # 机会分类与打分
│   ├── reporter.py          # Markdown / JSON 报告
│   ├── tracker.py           # 一次完整流水线
│   └── cli.py               # 命令行入口
├── reports/                 # 生成的报告
├── data/history/            # 历史快照（用于增量对比）
└── tests/
```

## 赚钱建议（务实）

- 先从 **Expensify / Trigger.dev / tscircuit** 等有明确 bounty 流程的项目入手
- 读每个项目的 Getting Started，确认如何 **claim** 奖金（Algora、Issue 评论、申请表等）
- 小额 / good first issue 先交 1–2 个 PR，再冲大额 bounty
- 把 `skills` 收窄到你真正能交付的栈，报告会更有用

## 图表网站（Next.js）

```bash
# 先确保有最新数据（可选，智能匹配页用）
opentacker run --all

# 启动前端
cd web
cp .env.example .env   # 首次：配置 AUTH_SECRET / 可选 GITHUB_TOKEN
npm install
npx prisma db push
npm run dev
```

浏览器打开 http://localhost:3000 ：

- **悬赏大厅**：多源自动抓取（付费列表 / GitHub / Algora），登录后可同步与收藏
- **智能匹配**：按技能与结算画像选型
- **注册/登录 + 我的工作台**：管理技能、目标、数据源开关、短名单

## License

MIT
