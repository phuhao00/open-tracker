/** 可被客户端安全引用的文案与阈值（勿放 Node-only API） */

export const TRUST_REPUTATION_MIN = 5;
export const TRUST_ACCOUNT_DAYS = 3;
export const MAX_POSTS_PER_DAY = 3;
export const DEFAULT_EXPIRE_DAYS = 30;

export type EngagementType = "project" | "employment";
export type ContactMode = "profile" | "email" | "url";
export type ModerationStatus = "pending" | "approved" | "rejected" | "taken_down";

export const EMPLOYMENT_DISCLAIMER =
  "我确认：本平台仅提供机会信息展示，不构成职业介绍或劳务中介；用工合规（合同、社保、税务等）由发布方自行依法承担。";

export const PUBLISH_NOTICE_ZH = [
  "OpenTacker 是协作与机会信息平台，不做职业介绍中介，不向求职者收取入职/内推费用。",
  "请自行撰写摘要，勿粘贴从封闭招聘站抓取的完整职位正文。",
  "项目协作 / 外包 / 悬赏为主路径；雇佣类信息仅作展示，发布方须依法用工。",
  "禁止违法、欺诈、传销及歧视性内容；平台有权审核、驳回或下架。",
  "联系与成交请通过公开档案或你填写的联系方式完成，平台不保证成交结果。",
].join("\n");

export const BLOCKED_PATTERNS: RegExp[] = [
  /色情|裸体|援交|约炮/i,
  /赌博|博彩|网赌|私彩/i,
  /毒品|冰毒|大麻|吸毒/i,
  /传销|庞氏|杀猪盘|资金盘/i,
  /代孕|买卖器官/i,
  /枪支|军火|爆炸物/i,
  /内推费|入职费|保证金.*求职|求职者.*收费/i,
];

export function contentLooksBlocked(...parts: Array<string | null | undefined>): string | null {
  const blob = parts.filter(Boolean).join("\n");
  for (const re of BLOCKED_PATTERNS) {
    if (re.test(blob)) return "内容包含不允许发布的信息，请修改后重试";
  }
  return null;
}

export function decideModerationStatus(user: {
  reputation: number;
  createdAt: Date;
  role?: string | null;
}): ModerationStatus {
  if (user.role === "moderator") return "approved";
  if (user.reputation >= TRUST_REPUTATION_MIN) return "approved";
  const ageMs = Date.now() - new Date(user.createdAt).getTime();
  if (ageMs >= TRUST_ACCOUNT_DAYS * 24 * 60 * 60 * 1000) return "approved";
  return "pending";
}

export function isModerator(user: { role?: string | null; email?: string | null }): boolean {
  if (user.role === "moderator") return true;
  const allow = (process.env.MODERATOR_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (user.email && allow.includes(user.email.toLowerCase())) return true;
  return false;
}
