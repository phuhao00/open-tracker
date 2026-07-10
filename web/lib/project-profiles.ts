export type SettlementClarity = "clear" | "partial" | "unclear";

export type ProjectProfile = {
  /** 与上游列表 name 精确匹配 */
  name: string;
  /** 一句话：这个项目是干嘛的 */
  summaryZh: string;
  /** 适合谁 */
  fitFor: string[];
  /** 不适合谁 / 门槛 */
  notFitFor: string[];
  /** 结算方式说明 */
  settlement: {
    model: string;
    amount: string;
    whenPaid: string;
    howToClaim: string[];
    platform: string;
    clarity: SettlementClarity;
    notes: string;
  };
  /** 上手路径 */
  startSteps: string[];
  difficulty: "入门" | "中等" | "较难";
  category: string;
};

/**
 * 人工整理的项目画像：上游 README 只有英文短描述，
 * 这里补齐「做什么 / 怎么结算 / 怎么接单」便于选型。
 */
export const PROJECT_PROFILES: ProjectProfile[] = [
  {
    name: "Expensify",
    summaryZh:
      "开源报销与财务协作 App（New Expensify）。大量带 [$250]/[$500] 标记的 Issue，合并后按贡献指南结算，是目前列表里接单路径最清晰的之一。",
    fitFor: ["React Native", "TypeScript", "移动端 UI", "喜欢小额高频 bounty"],
    notFitFor: ["纯后端 / 不碰移动端", "想一次拿几千美金大单"],
    settlement: {
      model: "按 Issue 标价 bounty",
      amount: "常见 $250–$500 / 单",
      whenPaid: "PR 合并且通过审核后，按 CONTRIBUTING 流程申请付款（标题常写 Due for payment）",
      howToClaim: [
        "打开带 [$250] 等金额的 Issue，确认尚未被占用",
        "按 CONTRIBUTING.md 评论认领 / 提交 PR",
        "合并后按指南提交付款信息",
      ],
      platform: "GitHub Issue + Expensify 贡献指南",
      clarity: "clear",
      notes: "标题里的金额通常就是该任务报价，结算细节以官方 CONTRIBUTING 为准。",
    },
    startSteps: [
      "阅读 CONTRIBUTING.md",
      "筛选 Help Wanted + 金额标题 Issue",
      "本地跑通 App 再动手",
    ],
    difficulty: "中等",
    category: "财务协作 / 移动端",
  },
  {
    name: "tscircuit",
    summaryZh:
      "用 React/TypeScript 写电路与 PCB 的开源框架。奖金走 Algora，金额从几刀到几百刀不等，适合前端 + 电子兴趣交叉的人。",
    fitFor: ["TypeScript", "React", "电子/PCB 兴趣", "Algora 平台经验"],
    notFitFor: ["完全不懂前端", "排斥硬件相关概念"],
    settlement: {
      model: "Algora bounty",
      amount: "$5–$300 / 单（视 bounty 而定）",
      whenPaid: "在 Algora 认领并完成 PR，维护者验收后由 Algora 打款",
      howToClaim: [
        "打开 algora.io/tscircuit/bounties",
        "认领对应 bounty / Issue",
        "提交 PR 并关联 bounty",
      ],
      platform: "Algora",
      clarity: "clear",
      notes: "以 Algora 页面标价为准，GitHub Issue 可能只是讨论入口。",
    },
    startSteps: ["逛 Algora bounty 列表", "读仓库 README 与贡献文档", "从带 bounty 标签的 Issue 入手"],
    difficulty: "中等",
    category: "硬件设计工具",
  },
  {
    name: "Trigger.dev",
    summaryZh:
      "开源的 TypeScript 后台任务 / Job 框架。有 Feature 与 bounty 类 Issue，金额大约 $50–$200，适合全栈 TS 开发者。",
    fitFor: ["TypeScript", "Next.js", "后台任务 / 队列", "Node.js"],
    notFitFor: ["只做纯 UI、不碰服务端"],
    settlement: {
      model: "按 bounty 金额",
      amount: "约 $50–$200 / 单",
      whenPaid: "完成指定 Issue/PR 并被接受后，按项目 bounty 说明结算",
      howToClaim: [
        "在 GitHub Issues 找带 bounty / feature 的任务",
        "评论表达认领意向",
        "按维护者要求提交 PR",
      ],
      platform: "GitHub Issues",
      clarity: "partial",
      notes: "金额区间明确，但具体打款渠道需在 Issue/讨论中向维护者确认。",
    },
    startSteps: ["浏览 open issues", "跑通本地示例", "挑小额 feature 试水"],
    difficulty: "中等",
    category: "开发者基础设施",
  },
  {
    name: "RudderStack",
    summaryZh:
      "开源 Customer Data Platform（CDP），把事件数据接到仓库与下游工具。大额 bounty（可达 $2000），偏 Go / 数据管道，门槛较高。",
    fitFor: ["Go", "数据管道 / ETL", "TypeScript（周边）", "能啃复杂后端"],
    notFitFor: ["纯前端", "想快速小额变现"],
    settlement: {
      model: "大额 bounty",
      amount: "可达 $2,000 USD / bounty",
      whenPaid: "完成官方公布的 bounty 任务并通过验收后付款",
      howToClaim: [
        "阅读 Dev.to / 官方「devs wanted」说明",
        "确认当前开放的 bounty 范围",
        "与维护者确认认领与验收标准",
      ],
      platform: "官方招募帖 + GitHub",
      clarity: "partial",
      notes: "报酬高但任务难；开放 Issue 不一定都带现成 bounty，需对照官方招募说明。",
    },
    startSteps: ["读官方招募文", "熟悉 rudder-server 架构", "再挑匹配 bounty 的 Issue"],
    difficulty: "较难",
    category: "数据平台",
  },
  {
    name: "Etherpad",
    summaryZh:
      "实时在线协作文档编辑器。有小额付费贡献（约 $80），适合 JavaScript / 实时协作方向，适合练手与建立信誉。",
    fitFor: ["JavaScript", "实时协作", "Web 前端", "想接小额单"],
    notFitFor: ["只想做大额 bounty"],
    settlement: {
      model: "小额付费 Issue",
      amount: "约 $80 USD",
      whenPaid: "完成指定贡献后按项目说明结算",
      howToClaim: ["在 etherpad-lite Issues 找可付费任务", "与维护者确认是否仍付费", "提交 PR"],
      platform: "GitHub Issues",
      clarity: "partial",
      notes: "金额较低，适合练手；接单前务必确认该 Issue 是否仍在付费计划内。",
    },
    startSteps: ["浏览 Issues", "本地跑 Etherpad", "从 a11y / 性能类小任务开始"],
    difficulty: "入门",
    category: "协作编辑",
  },
  {
    name: "Appflowy",
    summaryZh:
      "开源 Notion 类生产力工具（Flutter + Rust）。付费形式是导师制月薪约 $500，不是按 Issue 现结 bounty。",
    fitFor: ["Flutter", "Rust", "愿意参加 mentorship", "能稳定投入一个月以上"],
    notFitFor: ["只想按单接 bounty、不愿走申请制"],
    settlement: {
      model: "导师制月薪",
      amount: "约 $500 / 月",
      whenPaid: "通过 Mentorship 申请并按计划交付后按月结算",
      howToClaim: [
        "打开 AppFlowy Mentorship / Contributor Guidance",
        "按文档申请加入计划",
        "在导师指导下完成功能或修 bug",
      ],
      platform: "AppFlowy Mentorship 计划",
      clarity: "clear",
      notes: "这是「项目制月薪」不是「点开 Issue 就有 $xx」。",
    },
    startSteps: ["读 Mentorship 文档", "准备作品集/过往 PR", "提交申请"],
    difficulty: "中等",
    category: "生产力工具",
  },
  {
    name: "BusKill",
    summaryZh:
      "开源「笔记本物理安全」杀线工具。有大额 QubesOS 打包 bounty（约 $2340），也有普通功能/安全 Issue，偏安全与打包。",
    fitFor: ["Python", "Shell", "Linux / Qubes", "安全方向"],
    notFitFor: ["纯 Web 前端", "无 Linux 环境"],
    settlement: {
      model: "专项大额 bounty + 普通 Issue",
      amount: "Qubes 打包约 $2,340（扣费后略少）；其他任务需另确认",
      whenPaid: "完成 bounty 页面规定的交付物并通过验收后付款",
      howToClaim: [
        "阅读 buskill.in 上的 Qubes package bounty 说明",
        "确认交付标准与付款条件",
        "在对应 Issue 认领并交付",
      ],
      platform: "BusKill 官网 bounty 页 + GitHub",
      clarity: "clear",
      notes: "大额单门槛高；普通 Issue 不一定都付费，以 bounty 页为准。",
    },
    startSteps: ["读 Qubes bounty 页", "评估自己是否具备 Qubes 打包能力", "再决定是否认领"],
    difficulty: "较难",
    category: "安全硬件/软件",
  },
  {
    name: "openScale",
    summaryZh:
      "开源体重与身体指标追踪 App。历史上有 MQTT 体脂秤连接等小额 bounty（约 $30），偏 Android / 嵌入式连接。",
    fitFor: ["Java/Kotlin Android", "物联网 / MQTT", "小额练手"],
    notFitFor: ["只做 Web", "追求高报酬"],
    settlement: {
      model: "历史 BountySource / 小额功能赏金",
      amount: "约 $30 USD（示例任务）",
      whenPaid: "完成指定功能请求后按 bounty 平台规则结算",
      howToClaim: ["打开 Getting Started / BountySource 链接", "确认 bounty 是否仍有效", "提交实现"],
      platform: "BountySource（需核实是否仍开放）",
      clarity: "unclear",
      notes: "金额小且平台可能过期，接单前务必确认 bounty 仍有效。",
    },
    startSteps: ["核实 bounty 链接是否有效", "再投入开发时间"],
    difficulty: "入门",
    category: "健康追踪",
  },
  {
    name: "BountyBoard",
    summaryZh:
      "聚合多个开源项目 bounty 的平台入口，本身不是单一产品仓库。适合去站内浏览跨项目悬赏。",
    fitFor: ["想货比三家看多项目 bounty", "技术栈较杂"],
    notFitFor: ["想盯单一仓库深耕"],
    settlement: {
      model: "平台聚合，各项目各自结算",
      amount: "$10–$5000（视具体 bounty）",
      whenPaid: "以各 bounty 发布方规则为准",
      howToClaim: ["打开 bountyboard.dev", "筛选语言与金额", "跳转到具体项目认领"],
      platform: "BountyBoard",
      clarity: "partial",
      notes: "这里是「入口」，结算细节在每个具体 bounty 页面。",
    },
    startSteps: ["打开平台", "按技能过滤", "点进具体 bounty"],
    difficulty: "入门",
    category: "Bounty 聚合平台",
  },
  {
    name: "Conquest of Our Ancestors",
    summaryZh:
      "2D 大战略游戏（GitLab）。有跨平台、美术、新功能等小额 bounty 计划，信息相对分散，需自行核实。",
    fitFor: ["C++", "游戏开发", "跨平台"],
    notFitFor: ["只做 Web", "需要清晰现成 bounty 流程"],
    settlement: {
      model: "首单约 $50，后续 TBA",
      amount: "首个 bounty 约 $50",
      whenPaid: "以项目 bounty 说明为准（信息较少）",
      howToClaim: ["打开 Getting Started / bounty 说明页", "联系维护者确认", "再开始开发"],
      platform: "GitLab / GitHub 说明页",
      clarity: "unclear",
      notes: "结算与任务列表清晰度较低，建议先沟通再投入。",
    },
    startSteps: ["读 bounty 说明", "私信/Issue 确认是否仍付费"],
    difficulty: "中等",
    category: "游戏",
  },
];

export function getProfile(name: string): ProjectProfile | undefined {
  return PROJECT_PROFILES.find((p) => p.name.toLowerCase() === name.toLowerCase());
}
