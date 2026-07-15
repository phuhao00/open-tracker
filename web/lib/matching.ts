export function parseSkills(raw: string | null | undefined): string[] {
  try {
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}

export function scoreTaskForUser(input: {
  skills: string[];
  goal: string;
  techTags: string[];
  title: string;
  summary?: string | null;
  amountText?: string | null;
  amountMax?: number | null;
  kind: string;
  activeClaims?: number;
}): { score: number; reasons: string[] } {
  const skills = input.skills.map((s) => String(s).toLowerCase());
  const tags = [
    ...input.techTags.map((t) => String(t).toLowerCase()),
    input.title.toLowerCase(),
    (input.summary || "").toLowerCase(),
  ].join(" ");

  let score = 10;
  const reasons: string[] = [];

  const hits = skills.filter((s) => tags.includes(s.toLowerCase()));
  if (hits.length) {
    score += hits.length * 18;
    reasons.push(`匹配技能 ${hits.slice(0, 3).join("、")}`);
  }

  if (input.kind === "bounty") {
    score += 12;
    reasons.push("明确悬赏类");
  }
  if (input.kind === "parttime") {
    score += 14;
    reasons.push("兼职/灵活就业岗");
  }
  if (input.kind === "job") {
    score += 8;
    reasons.push("远程/灵活岗位");
  }
  if (input.kind === "portal") {
    score += 10;
    reasons.push("招聘门户/公司入口");
  }
  if (input.amountText || (input.amountMax && input.amountMax > 0)) {
    score += 10;
    reasons.push("有金额信息");
  }

  if (input.goal === "big" && (input.amountMax || 0) >= 50000) {
    score += 15;
    reasons.push("符合冲大额目标");
  }
  if (input.goal === "learn" && (input.amountMax || 0) > 0 && (input.amountMax || 0) <= 15000) {
    score += 12;
    reasons.push("适合练手金额");
  }
  if (input.goal === "quick" && (input.kind === "bounty" || input.kind === "parttime")) {
    score += 8;
  }
  if (input.goal === "clear" && input.amountText) {
    score += 10;
    reasons.push("金额较清晰");
  }

  const claims = input.activeClaims || 0;
  if (claims === 0) {
    score += 6;
    reasons.push("暂无人认领");
  } else if (claims >= 2) {
    score -= 8;
    reasons.push(`已有 ${claims} 人在做，竞争偏高`);
  }

  return { score, reasons: reasons.slice(0, 3) };
}

export function formatUsdCents(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}
