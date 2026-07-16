/** 招聘聚合统一分类体系 —— 用于筛选、分面、展示 */

export type OpportunityBucket = "opening" | "portal" | "bounty";
export type RegionCode = "cn" | "global" | "remote";
export type WorkType = "fulltime" | "parttime" | "contract" | "bounty" | "other";
export type PortalChannel = "board" | "careers" | "";

export type Taxonomy = {
  bucket: OpportunityBucket;
  region: RegionCode;
  workType: WorkType;
  channel: PortalChannel;
};

export const BUCKET_META: Array<{
  id: "" | OpportunityBucket;
  label: string;
  hint: string;
}> = [
  { id: "", label: "全部机会", hint: "悬赏 · 岗位 · 门户入口" },
  { id: "opening", label: "在招岗位", hint: "远程 / 兼职 / 合同" },
  { id: "portal", label: "门户入口", hint: "跳转各大招聘站与公司官网" },
  { id: "bounty", label: "开源悬赏", hint: "Bounty / 付费 Issue" },
];

export const REGION_META: Array<{ id: "" | RegionCode; label: string }> = [
  { id: "", label: "全球不限" },
  { id: "cn", label: "国内" },
  { id: "global", label: "海外" },
  { id: "remote", label: "远程优先" },
];

export const WORK_TYPE_META: Array<{ id: "" | WorkType; label: string }> = [
  { id: "", label: "不限形态" },
  { id: "parttime", label: "兼职" },
  { id: "contract", label: "合同/外包" },
  { id: "fulltime", label: "全职" },
  { id: "bounty", label: "悬赏单" },
];

export const CHANNEL_META: Array<{ id: PortalChannel; label: string }> = [
  { id: "", label: "全部入口" },
  { id: "board", label: "招聘门户" },
  { id: "careers", label: "公司官网" },
];

export const SOURCE_GROUP: Record<string, { label: string; region: RegionCode }> = {
  paid_list: { label: "开源悬赏", region: "global" },
  github_search: { label: "开源悬赏", region: "global" },
  algora: { label: "开源悬赏", region: "global" },
  remoteok: { label: "远程岗位", region: "remote" },
  remotive: { label: "远程岗位", region: "remote" },
  jobicy: { label: "远程岗位", region: "remote" },
  arbeitnow: { label: "欧洲科技", region: "global" },
  portal_directory: { label: "门户入口", region: "cn" },
  community: { label: "社区发布", region: "global" },
};

const CN_HINT =
  /国内|中国|zhipin|智联|前程|猎聘|拉勾|斗米|兼客|阿里|腾讯|字节|美团|京东|华为|百度|网易|小米|拼多多|快手|滴滴|哔哩|脉脉|58|cn\b/i;
const GLOBAL_HINT =
  /全球|海外|google|microsoft|amazon|meta|apple|linkedin|indeed|glassdoor|openai|anthropic|stripe|shopify|gitlab|yc\b|wellfound|remoteok|remotive|jobicy|arbeitnow|美国|欧洲|eu\b/i;
const CONTRACT_HINT = /contract|contractor|freelance|外包|顾问|consulting/i;
const PARTTIME_HINT = /part[\s-]?time|兼职|小时工|hourly|灵活就业/i;
const FULLTIME_HINT = /full[\s-]?time|全职|permanent/i;

export function classifyTaxonomy(input: {
  kind: string;
  sourceKey: string;
  title?: string | null;
  summary?: string | null;
  techTags?: string[];
  rawJson?: string | null;
}): Taxonomy {
  const tags = (input.techTags || []).map(String);
  const blob = [input.title, input.summary, ...tags, input.sourceKey].join(" ");

  let channel: PortalChannel = "";
  try {
    const raw = input.rawJson ? JSON.parse(input.rawJson) : {};
    if (raw?.channel === "board" || raw?.channel === "careers") channel = raw.channel;
  } catch {
    /* ignore */
  }
  if (!channel) {
    if (tags.some((t) => /门户|board/i.test(t)) || /招聘门户/.test(input.summary || "")) {
      channel = "board";
    } else if (tags.some((t) => /公司官网|careers|ATS/i.test(t)) || /公司招聘页/.test(input.summary || "")) {
      channel = "careers";
    }
  }

  let bucket: OpportunityBucket = "opening";
  if (input.kind === "portal" || input.sourceKey === "portal_directory") bucket = "portal";
  else if (
    input.kind === "bounty" ||
    ["paid_list", "github_search", "algora"].includes(input.sourceKey)
  ) {
    bucket = "bounty";
  } else if (input.sourceKey === "community" && input.kind === "bounty") {
    bucket = "bounty";
  } else if (input.kind === "opportunity") {
    bucket = "opening";
  }

  let workType: WorkType = "other";
  if (bucket === "bounty" || input.kind === "bounty") workType = "bounty";
  else if (input.kind === "parttime" || PARTTIME_HINT.test(blob)) workType = "parttime";
  else if (CONTRACT_HINT.test(blob) || /项目协作|外包/.test(blob)) workType = "contract";
  else if (input.kind === "job" || FULLTIME_HINT.test(blob) || /雇佣机会/.test(blob))
    workType = "fulltime";
  else if (input.kind === "opportunity") workType = "contract";
  else if (bucket === "portal") workType = "other";

  let region: RegionCode = SOURCE_GROUP[input.sourceKey]?.region || "global";
  if (tags.some((t) => /国内/.test(t)) || CN_HINT.test(blob)) region = "cn";
  else if (
    tags.some((t) => /远程|remote/i.test(t)) ||
    ["remoteok", "remotive", "jobicy"].includes(input.sourceKey)
  ) {
    region = "remote";
  } else if (tags.some((t) => /全球|海外/.test(t)) || GLOBAL_HINT.test(blob)) {
    region = "global";
  }

  if (bucket === "portal" && channel === "board" && CN_HINT.test(blob)) region = "cn";
  if (bucket === "portal" && GLOBAL_HINT.test(blob) && !CN_HINT.test(blob)) region = "global";

  return { bucket, region, workType, channel };
}

export function taxonomyLabel(t: Taxonomy) {
  const bucket =
    BUCKET_META.find((b) => b.id === t.bucket)?.label || t.bucket;
  const region =
    REGION_META.find((r) => r.id === t.region)?.label || t.region;
  const work =
    WORK_TYPE_META.find((w) => w.id === t.workType)?.label || t.workType;
  return { bucket, region, work };
}
