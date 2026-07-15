# OpenTacker

全球灵活就业与招聘聚合平台 —— 发现开源悬赏、远程/兼职岗位、招聘门户与公司官网入口；按技能匹配、认领协作、沉淀履历与收益。

A global flexible-work and recruiting aggregation platform — discover OSS bounties, remote/part-time openings, job-board portals and company career pages; match by skills, claim collaboratively, and build your public work profile.

---

## About / 关于

### 中文

OpenTacker（开源追踪 · 机会大厅）面向**灵活就业者、独立开发者与兼职贡献者**，把分散在全网的赚钱机会聚合到同一个产品里：

- **开源悬赏**：跟踪付费开源项目列表与 GitHub / Algora 等 bounty 机会  
- **在招岗位**：接入 RemoteOK、Remotive、Jobicy、Arbeitnow 等开放数据源中的远程/兼职/合同岗  
- **门户入口**：收录 BOSS、智联、LinkedIn、Indeed 及知名公司 careers 页，只做合规跳转（不爬岗位正文）  
- **分类交互**：按大类 → 地区 → 用工形态 → 数据源分层筛选，目标是成为最好用的招聘聚合体验  
- **协作防撞车**：认领任务、社区动态、公开主页与自报收益账本，让灵活就业可积累信誉  

上游灵感来自 [paid-open-source-projects](https://github.com/kunovsky/paid-open-source-projects)。产品包含 **Python 追踪器**（报告与快照）与 **Next.js Web**（机会大厅与协作网络）。

### English

OpenTacker is built for **flexible workers, indie developers, and part-time contributors**. It aggregates earning opportunities that are usually scattered across the internet:

- **OSS bounties** — paid open-source lists plus GitHub / Algora bounty discovery  
- **Open roles** — remote / part-time / contract jobs from open APIs (RemoteOK, Remotive, Jobicy, Arbeitnow)  
- **Portal jumps** — curated links to major job boards and company careers pages (entry points only; no ToS-violating scraping of private listings)  
- **Clear taxonomy UX** — browse by category → region → work type → source, aiming for best-in-class job aggregation interaction  
- **Collaboration** — claim tasks to avoid collisions, community feed, public profiles, and a self-reported earnings ledger  

Inspired by [paid-open-source-projects](https://github.com/kunovsky/paid-open-source-projects). The repo ships a **Python tracker** (reports & snapshots) and a **Next.js web app** (opportunity hall & collaboration network).

---

## Features / 能力一览

| Area | 中文 | English |
|------|------|---------|
| Discovery | 多源抓取悬赏、岗位与门户入口 | Multi-source discovery for bounties, jobs, portals |
| Taxonomy | 大类 / 地区 / 用工形态 / 数据源筛选 | Bucket / region / work-type / source filters |
| Matching | 按技能与目标个性化排序 | Skill- and goal-based ranking |
| Collaboration | 认领防撞车、社区动态 | Claims + community activity feed |
| Profile | 公开主页、信誉与收益账本 | Public profile, reputation, earnings ledger |
| Tracker CLI | Markdown / JSON 报告与定时跑 | Markdown/JSON reports and scheduled runs |

---

## Quick start / 快速开始

### Web（推荐主产品）

```bash
cd web
cp .env.example .env   # set AUTH_SECRET; optional GITHUB_TOKEN
npm install
npx prisma db push
npm run dev            # http://localhost:6700
```

同步岗位与门户（可选）：

```bash
cd web
npx tsx scripts/sync-jobs.ts      # remote job boards
npx tsx scripts/sync-portals.ts   # portal + company career entries
# or sync everything while logged in via「同步全网机会」
```

### Python tracker（付费开源报告）

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate

pip install -e ".[dev]"
copy .env.example .env    # or cp; set GITHUB_TOKEN
# edit config.yaml → skills

opentacker run
opentacker show           # or open reports/latest.md
```

| Command | Description |
|---------|-------------|
| `opentacker list` | Parse paid list only |
| `opentacker run` | Full track + report |
| `opentacker run --all` | Ignore skills filter |
| `opentacker show` | Print latest Markdown report |
| `opentacker schedule` | Local cron from `config.yaml` |

---

## Web product map / 前端功能

浏览器打开 **http://localhost:6700**：

- **机会大厅** — 分层筛选；数据源包括付费列表 / GitHub / Algora / RemoteOK / Remotive / Jobicy / Arbeitnow / 门户目录  
- **智能匹配** — 技能与结算画像选型（基于 tracker 快照）  
- **协作社区** — 进行中认领、动态流、伙伴墙  
- **工作台** — 档案、认领状态、收益账本、数据源开关、短名单  
- **公开主页** `/u/[id]` — 信誉、技能与履历  

环境变量见 [`web/.env.example`](web/.env.example)：`DATABASE_URL`、`AUTH_SECRET`、`NEXTAUTH_URL`（默认 `http://localhost:6700`）、可选 `GITHUB_TOKEN`。

---

## Configuration / 配置

### Tracker — `config.yaml`

- `skills` — tech stack filter  
- `github.bounty_labels` / `opportunity_*` — opportunity heuristics  
- `schedule.cron` — local schedule (default daily 09:00)  
- `output.*` — report & history directories  

### Web sources — `web/lib/sources/`

New fetchers register in `ALL_FETCHERS` inside [`web/lib/sources/sync.ts`](web/lib/sources/sync.ts). Portal seeds live in [`web/lib/sources/portal-directory.ts`](web/lib/sources/portal-directory.ts). Taxonomy for filters: [`web/lib/taxonomy.ts`](web/lib/taxonomy.ts).

---

## Compliance note / 合规说明

| Allowed | Not in default product |
|---------|-------------------------|
| Official / public APIs & RSS | Bulk scraping of BOSS / 智联 / LinkedIn closed listings |
| Curated career / board **entry URLs** | Storing full proprietary job HTML without license |

国内主流招聘站职位正文需在源站登录查看；本仓库以**跳转入口 + 开放数据**为主路径。

---

## Project layout / 目录

```
opentacker/
├── config.yaml                 # tracker config
├── src/opentacker/             # Python CLI pipeline
├── reports/                    # Markdown reports
├── data/history/               # JSON snapshots
├── web/                        # Next.js app (port 6700)
│   ├── app/                    # routes & APIs
│   ├── components/             # hall, community, dashboard…
│   ├── lib/sources/            # multi-source fetchers
│   ├── lib/taxonomy.ts         # classification system
│   ├── prisma/                 # SQLite schema
│   └── scripts/                # sync-jobs, sync-portals…
└── tests/
```

---

## Practical tips / 实务建议

**中文**  
先完善技能档案 → 同步机会 → 用大类筛选「在招岗位 / 门户 / 悬赏」→ 认领或跳转投递 → 收款后记入账本。开源 bounty 建议从流程清晰的项目（如 Algora 生态）练手。

**English**  
Complete your skill profile → sync sources → filter by opening / portal / bounty → claim or jump to apply → log earnings. For OSS bounties, start with projects that have a clear claim & payout flow.

---

## License

MIT
