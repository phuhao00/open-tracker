/**
 * 招聘门户与公司官网招聘页目录（跳转入口，不抓职位正文）。
 * 合规策略：只收录公开入口 URL，用户点击后去源站投递。
 */
import type { NormalizedBounty, SourceFetcher } from "./types";

type PortalSeed = {
  id: string;
  title: string;
  company: string;
  url: string;
  tags: string[];
  summary: string;
  /** board = 招聘门户搜索入口；careers = 公司官网/ATS */
  channel: "board" | "careers";
};

const BOARD_PORTALS: PortalSeed[] = [
  {
    id: "zhipin-parttime",
    title: "BOSS直聘 · 兼职/灵活用工搜索",
    company: "BOSS直聘",
    url: "https://www.zhipin.com/web/geek/job?query=%E5%85%BC%E8%81%8C",
    tags: ["国内门户", "兼职", "入口"],
    summary: "国内主流直聊招聘门户，进入后可搜索兼职、外包、灵活用工。",
    channel: "board",
  },
  {
    id: "zhilian-parttime",
    title: "智联招聘 · 兼职入口",
    company: "智联招聘",
    url: "https://xiaoyuan.zhaopin.com/",
    tags: ["国内门户", "兼职", "入口"],
    summary: "智联招聘体系入口，可继续筛选兼职与校园/社会岗位。",
    channel: "board",
  },
  {
    id: "51job-parttime",
    title: "前程无忧 · 兼职搜索",
    company: "前程无忧",
    url: "https://search.51job.com/list/000000,000000,0000,00,9,99,%25E5%2585%25BC%25E8%2581%258C,2,1.html",
    tags: ["国内门户", "兼职", "入口"],
    summary: "前程无忧兼职相关搜索页入口。",
    channel: "board",
  },
  {
    id: "liepin",
    title: "猎聘 · 中高端与自由职业相关",
    company: "猎聘",
    url: "https://www.liepin.com/",
    tags: ["国内门户", "入口"],
    summary: "猎聘主站入口，适合中高级与顾问制机会。",
    channel: "board",
  },
  {
    id: "lagou",
    title: "拉勾 · 互联网职位门户",
    company: "拉勾",
    url: "https://www.lagou.com/",
    tags: ["国内门户", "互联网", "入口"],
    summary: "互联网招聘门户入口。",
    channel: "board",
  },
  {
    id: "maimai",
    title: "脉脉 · 职场人脉与招聘",
    company: "脉脉",
    url: "https://maimai.cn/",
    tags: ["国内门户", "入口"],
    summary: "职场社交+招聘入口。",
    channel: "board",
  },
  {
    id: "doumi",
    title: "斗米 · 兼职门户",
    company: "斗米",
    url: "https://www.doumi.com/",
    tags: ["国内门户", "兼职", "入口"],
    summary: "专注兼职与灵活用工的门户首页。",
    channel: "board",
  },
  {
    id: "jianke",
    title: "兼客 · 兼职入口",
    company: "兼客兼职",
    url: "https://www.jianke.com/",
    tags: ["国内门户", "兼职", "入口"],
    summary: "兼职类门户入口（以官网首页为跳转）。",
    channel: "board",
  },
  {
    id: "58-jianzhi",
    title: "58同城 · 兼职频道",
    company: "58同城",
    url: "https://bj.58.com/job.shtml",
    tags: ["国内门户", "兼职", "入口"],
    summary: "分类信息站点的招聘/兼职频道入口（按城市可再切换）。",
    channel: "board",
  },
  {
    id: "linkedin-jobs",
    title: "LinkedIn Jobs · 远程/合同工搜索",
    company: "LinkedIn",
    url: "https://www.linkedin.com/jobs/search/?keywords=part%20time%20OR%20contract%20OR%20freelance&f_JT=C%2CF%2CP",
    tags: ["全球门户", "兼职", "合同", "入口"],
    summary: "LinkedIn 兼职/合同/自由职业筛选入口。",
    channel: "board",
  },
  {
    id: "indeed-remote",
    title: "Indeed · Remote / Part-time",
    company: "Indeed",
    url: "https://www.indeed.com/jobs?q=part+time+OR+contract&remotejob=032b3046-06a3-4876-8dfd-474eb5a3bf65",
    tags: ["全球门户", "兼职", "入口"],
    summary: "Indeed 兼职与远程相关搜索入口。",
    channel: "board",
  },
  {
    id: "glassdoor",
    title: "Glassdoor · 公司与职位门户",
    company: "Glassdoor",
    url: "https://www.glassdoor.com/Job/index.htm",
    tags: ["全球门户", "入口"],
    summary: "公司评价与职位门户入口。",
    channel: "board",
  },
  {
    id: "wellfound",
    title: "Wellfound (AngelList) · 创业公司",
    company: "Wellfound",
    url: "https://wellfound.com/jobs",
    tags: ["全球门户", "创业", "入口"],
    summary: "创业公司招聘门户。",
    channel: "board",
  },
  {
    id: "ycombinator-jobs",
    title: "Y Combinator Work at a Startup",
    company: "Y Combinator",
    url: "https://www.workatastartup.com/jobs",
    tags: ["全球门户", "创业", "入口"],
    summary: "YC 生态创业公司职位门户。",
    channel: "board",
  },
  {
    id: "weworkremotely",
    title: "We Work Remotely",
    company: "We Work Remotely",
    url: "https://weworkremotely.com/",
    tags: ["远程", "入口"],
    summary: "远程工作门户首页。",
    channel: "board",
  },
  {
    id: "flexjobs",
    title: "FlexJobs · 灵活就业门户",
    company: "FlexJobs",
    url: "https://www.flexjobs.com/",
    tags: ["灵活就业", "入口"],
    summary: "主打灵活就业与远程的门户（部分内容需订阅）。",
    channel: "board",
  },
];

/** 知名公司官网 / 公开 ATS 招聘页（持续可扩充） */
const COMPANY_CAREERS: PortalSeed[] = [
  // 国内大厂
  { id: "co-alibaba", title: "阿里巴巴招聘官网", company: "阿里巴巴", url: "https://talent.alibaba.com/", tags: ["公司官网", "大厂"], summary: "阿里集团统一招聘门户。", channel: "careers" },
  { id: "co-tencent", title: "腾讯招聘官网", company: "腾讯", url: "https://careers.tencent.com/", tags: ["公司官网", "大厂"], summary: "腾讯社会招聘与校园招聘入口。", channel: "careers" },
  { id: "co-bytedance", title: "字节跳动招聘官网", company: "字节跳动", url: "https://jobs.bytedance.com/", tags: ["公司官网", "大厂"], summary: "字节跳动全球招聘入口。", channel: "careers" },
  { id: "co-meituan", title: "美团招聘官网", company: "美团", url: "https://zhaopin.meituan.com/", tags: ["公司官网", "大厂"], summary: "美团招聘门户。", channel: "careers" },
  { id: "co-jd", title: "京东招聘官网", company: "京东", url: "https://zhaopin.jd.com/", tags: ["公司官网", "大厂"], summary: "京东招聘入口。", channel: "careers" },
  { id: "co-huawei", title: "华为招聘官网", company: "华为", url: "https://career.huawei.com/", tags: ["公司官网", "大厂"], summary: "华为招聘门户。", channel: "careers" },
  { id: "co-baidu", title: "百度招聘官网", company: "百度", url: "https://talent.baidu.com/", tags: ["公司官网", "大厂"], summary: "百度人才招聘入口。", channel: "careers" },
  { id: "co-netease", title: "网易招聘官网", company: "网易", url: "https://hr.163.com/", tags: ["公司官网", "大厂"], summary: "网易集团招聘入口。", channel: "careers" },
  { id: "co-xiaomi", title: "小米招聘官网", company: "小米", url: "https://hr.xiaomi.com/", tags: ["公司官网", "大厂"], summary: "小米招聘门户。", channel: "careers" },
  { id: "co-pinduoduo", title: "拼多多招聘官网", company: "拼多多", url: "https://careers.pinduoduo.com/", tags: ["公司官网", "大厂"], summary: "拼多多招聘入口。", channel: "careers" },
  { id: "co-bilibili", title: "哔哩哔哩招聘官网", company: "哔哩哔哩", url: "https://jobs.bilibili.com/", tags: ["公司官网"], summary: "B 站招聘入口。", channel: "careers" },
  { id: "co-kuaishou", title: "快手招聘官网", company: "快手", url: "https://zhaopin.kuaishou.com/", tags: ["公司官网"], summary: "快手招聘门户。", channel: "careers" },
  { id: "co-shein", title: "SHEIN 招聘官网", company: "SHEIN", url: "https://www.sheingroup.com/", tags: ["公司官网"], summary: "SHEIN 招聘相关入口。", channel: "careers" },
  { id: "co-didi", title: "滴滴招聘官网", company: "滴滴", url: "https://talent.didiglobal.com/", tags: ["公司官网"], summary: "滴滴招聘入口。", channel: "careers" },
  // 全球科技
  { id: "co-google", title: "Google Careers", company: "Google", url: "https://careers.google.com/", tags: ["公司官网", "全球"], summary: "Google 官方招聘站。", channel: "careers" },
  { id: "co-microsoft", title: "Microsoft Careers", company: "Microsoft", url: "https://careers.microsoft.com/", tags: ["公司官网", "全球"], summary: "微软官方招聘站。", channel: "careers" },
  { id: "co-amazon", title: "Amazon Jobs", company: "Amazon", url: "https://www.amazon.jobs/", tags: ["公司官网", "全球"], summary: "亚马逊官方招聘站。", channel: "careers" },
  { id: "co-meta", title: "Meta Careers", company: "Meta", url: "https://www.metacareers.com/", tags: ["公司官网", "全球"], summary: "Meta 官方招聘站。", channel: "careers" },
  { id: "co-apple", title: "Apple Jobs", company: "Apple", url: "https://jobs.apple.com/", tags: ["公司官网", "全球"], summary: "Apple 官方招聘站。", channel: "careers" },
  { id: "co-openai", title: "OpenAI Careers", company: "OpenAI", url: "https://openai.com/careers/", tags: ["公司官网", "AI"], summary: "OpenAI 招聘入口。", channel: "careers" },
  { id: "co-anthropic", title: "Anthropic Careers", company: "Anthropic", url: "https://www.anthropic.com/careers", tags: ["公司官网", "AI"], summary: "Anthropic 招聘入口。", channel: "careers" },
  { id: "co-stripe", title: "Stripe Jobs", company: "Stripe", url: "https://stripe.com/jobs", tags: ["公司官网"], summary: "Stripe 招聘入口。", channel: "careers" },
  { id: "co-shopify", title: "Shopify Careers", company: "Shopify", url: "https://www.shopify.com/careers", tags: ["公司官网", "远程"], summary: "Shopify 招聘入口。", channel: "careers" },
  { id: "co-gitlab", title: "GitLab Jobs", company: "GitLab", url: "https://about.gitlab.com/jobs/", tags: ["公司官网", "远程"], summary: "GitLab 全远程招聘入口。", channel: "careers" },
  { id: "co-vercel", title: "Vercel Careers", company: "Vercel", url: "https://vercel.com/careers", tags: ["公司官网"], summary: "Vercel 招聘入口。", channel: "careers" },
  { id: "co-notion", title: "Notion Careers", company: "Notion", url: "https://www.notion.so/careers", tags: ["公司官网"], summary: "Notion 招聘入口。", channel: "careers" },
  { id: "co-figma", title: "Figma Careers", company: "Figma", url: "https://www.figma.com/careers/", tags: ["公司官网"], summary: "Figma 招聘入口。", channel: "careers" },
  { id: "co-discord", title: "Discord Careers", company: "Discord", url: "https://discord.com/careers", tags: ["公司官网"], summary: "Discord 招聘入口。", channel: "careers" },
  { id: "co-spotify", title: "Spotify Jobs", company: "Spotify", url: "https://www.lifeatspotify.com/", tags: ["公司官网"], summary: "Spotify 招聘入口。", channel: "careers" },
  { id: "co-airbnb", title: "Airbnb Careers", company: "Airbnb", url: "https://careers.airbnb.com/", tags: ["公司官网"], summary: "Airbnb 招聘入口。", channel: "careers" },
  { id: "co-uber", title: "Uber Careers", company: "Uber", url: "https://www.uber.com/careers/", tags: ["公司官网"], summary: "Uber 招聘入口。", channel: "careers" },
  { id: "co-netflix", title: "Netflix Jobs", company: "Netflix", url: "https://jobs.netflix.com/", tags: ["公司官网"], summary: "Netflix 招聘入口。", channel: "careers" },
  // 公开 ATS 示例（可作为模板，后续按公司 board slug 扩展）
  { id: "ats-greenhouse-example", title: "Greenhouse 公开职位板目录用法", company: "Greenhouse", url: "https://boards.greenhouse.io/", tags: ["ATS", "入口"], summary: "许多公司使用 Greenhouse；可在 boards.greenhouse.io/{company} 访问。", channel: "careers" },
  { id: "ats-lever-example", title: "Lever 公开职位板", company: "Lever", url: "https://jobs.lever.co/", tags: ["ATS", "入口"], summary: "许多创业公司使用 Lever；jobs.lever.co/{company}。", channel: "careers" },
  { id: "ats-ashby", title: "Ashby 公开职位", company: "Ashby", url: "https://jobs.ashbyhq.com/", tags: ["ATS", "入口"], summary: "Ashby ATS 公开板入口前缀。", channel: "careers" },
];

function toItem(seed: PortalSeed): NormalizedBounty {
  return {
    externalId: `portal:${seed.id}`,
    title: seed.title,
    url: seed.url,
    projectName: seed.company,
    techTags: seed.tags,
    kind: "portal",
    status: "open",
    summary: `[${seed.channel === "board" ? "招聘门户" : "公司招聘页"}] ${seed.summary}`,
    raw: { channel: seed.channel, portal: true },
  };
}

/**
 * 从已入库的远程岗位中抽取公司名，生成可跳转的「公司机会回源」入口
 * （跳回 Remotive 公司筛选，避免伪造 careers URL）
 */
async function companyJumpFromDb(): Promise<NormalizedBounty[]> {
  try {
    const { prisma } = await import("../prisma");
    const rows = await prisma.bountyTask.findMany({
      where: {
        status: "open",
        kind: { in: ["job", "parttime"] },
        source: { key: { in: ["remotive", "remoteok", "jobicy"] } },
      },
      select: { projectName: true, url: true, source: { select: { key: true } } },
      take: 400,
    });

    const seen = new Set<string>();
    const items: NormalizedBounty[] = [];
    for (const row of rows) {
      const company = (row.projectName || "").trim();
      if (!company || company.length < 2) continue;
      const key = company.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      // 用该岗位原始链接作为跳转入口（公司维度代表链接）
      items.push({
        externalId: `portal:co-from-feed:${key.slice(0, 80)}`,
        title: `${company} · 招聘相关机会入口`,
        url: row.url,
        projectName: company,
        techTags: ["来自已同步岗位", row.source.key, "公司入口"],
        kind: "portal",
        status: "open",
        summary: `由 ${row.source.key} 已同步岗位聚合出的公司跳转入口，点击前往源站查看。`,
        raw: { channel: "careers", derived: true, from: row.source.key },
      });
      if (items.length >= 80) break;
    }
    return items;
  } catch {
    return [];
  }
}

export const portalDirectorySource: SourceFetcher = {
  key: "portal_directory",
  name: "招聘门户与公司入口",
  description:
    "收录国内外招聘门户搜索页与知名公司官网/ATS 招聘入口，仅作跳转，不爬职位正文",
  async fetch() {
    const seeded = [...BOARD_PORTALS, ...COMPANY_CAREERS].map(toItem);
    const derived = await companyJumpFromDb();
    const seen = new Set(seeded.map((s) => s.externalId));
    const extras = derived.filter((d) => !seen.has(d.externalId));
    return [...seeded, ...extras];
  },
};
