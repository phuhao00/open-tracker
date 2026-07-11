import { amountFromText, type NormalizedBounty, type SourceFetcher } from "./types";

const README_URL =
  "https://raw.githubusercontent.com/kunovsky/paid-open-source-projects/main/README.md";

const ROW_RE =
  /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/gm;

const GITHUB_RE =
  /https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/i;

export const paidListSource: SourceFetcher = {
  key: "paid_list",
  name: "付费开源项目列表",
  description: "kunovsky/paid-open-source-projects 上游表格中的付费项目入口",
  async fetch() {
    const res = await fetch(README_URL, {
      headers: { "User-Agent": "opentacker/0.2" },
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error(`拉取付费列表失败: ${res.status}`);
    const md = await res.text();
    const items: NormalizedBounty[] = [];
    for (const match of md.matchAll(ROW_RE)) {
      const name = match[1].trim();
      if (name.toLowerCase() === "name" || /^-+$/.test(name)) continue;
      const desc = match[2].trim();
      const link = match[3].trim();
      const tech = match[4].trim();
      const details = match[5].trim();
      const payment = match[6].trim();
      const start = match[7].trim();
      const gh = `${link} ${start}`.match(GITHUB_RE);
      const repo = gh ? `${gh[1]}/${gh[2].replace(/\.git$/, "")}` : null;
      const amount = amountFromText(payment);
      items.push({
        externalId: `paid:${name}`,
        title: `${name} - ${details}`,
        url: start.startsWith("http") ? start : link,
        projectName: name,
        repo,
        ...amount,
        techTags: tech.split(/[,/&]| and /i).map((t) => t.trim()).filter(Boolean),
        kind: "bounty",
        status: "open",
        summary: desc,
        raw: { link, payment, details, gettingStarted: start },
      });
    }
    return items;
  },
};
