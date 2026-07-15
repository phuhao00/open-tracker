import type { NormalizedBounty } from "./types";

/** 灵活就业相关：兼职 / 合同 / 自由职业 / 远程等 */
const FLEX_RE =
  /part[\s-]?time|parttime|contract|freelance|contractor|temporary|hourly|gig|灵活|兼职|外包|远程|remote|freelance|contract/i;

const PARTTIME_RE = /part[\s-]?time|parttime|hourly|兼职|小时工/i;

export function classifyJobKind(input: {
  title?: string;
  jobType?: string;
  tags?: string[];
  description?: string;
}): "parttime" | "job" {
  const blob = [input.title, input.jobType, ...(input.tags || []), input.description]
    .filter(Boolean)
    .join(" ");
  if (PARTTIME_RE.test(blob)) return "parttime";
  return "job";
}

export function isFlexibleRelevant(input: {
  title?: string;
  jobType?: string;
  tags?: string[];
  description?: string;
  remote?: boolean;
}): boolean {
  if (input.remote) return true;
  const blob = [input.title, input.jobType, ...(input.tags || []), input.description]
    .filter(Boolean)
    .join(" ");
  return FLEX_RE.test(blob);
}

/** 解析年薪/月薪美元等，粗估为美分区间 */
export function amountFromSalaryText(text?: string | null): {
  amountText: string | null;
  amountMin: number | null;
  amountMax: number | null;
  currency: string;
} {
  if (!text || !text.trim()) {
    return { amountText: null, amountMin: null, amountMax: null, currency: "USD" };
  }
  const raw = text.trim();
  const currency = /€|EUR/i.test(raw) ? "EUR" : /£|GBP/i.test(raw) ? "GBP" : "USD";
  const nums = [...raw.matchAll(/([\d,]+(?:\.\d+)?)\s*k?/gi)].map((m) => {
    let n = parseFloat(m[1].replace(/,/g, ""));
    if (/k/i.test(m[0])) n *= 1000;
    return Math.round(n * 100);
  });
  if (!nums.length) {
    return { amountText: raw.slice(0, 80), amountMin: null, amountMax: null, currency };
  }
  // 年薪数字通常很大；保留原文展示
  return {
    amountText: raw.slice(0, 80),
    amountMin: Math.min(...nums),
    amountMax: Math.max(...nums),
    currency,
  };
}

export function stripHtml(html: string, max = 280): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export type { NormalizedBounty };
