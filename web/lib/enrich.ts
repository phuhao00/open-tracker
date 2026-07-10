import { getProfile, type ProjectProfile, type SettlementClarity } from "./project-profiles";
import type { Opportunity, ProjectRecord } from "./types";

export type EnrichedProject = ProjectRecord & {
  profile: ProjectProfile | null;
  bountyCount: number;
  topTasks: Opportunity[];
  matchScore: number;
  matchedSkills: string[];
  claimUrl: string;
  amountHint: string;
};

const SKILL_ALIASES: Record<string, string[]> = {
  typescript: ["typescript", "ts", "javascript", "js", "nextjs", "next.js", "react"],
  javascript: ["javascript", "js", "typescript", "react", "nextjs"],
  react: ["react", "typescript", "javascript", "nextjs", "flutter"],
  nextjs: ["nextjs", "next.js", "typescript", "react", "javascript"],
  go: ["go", "golang"],
  golang: ["go", "golang"],
  python: ["python", "shell"],
  rust: ["rust", "flutter"],
  flutter: ["flutter", "rust", "dart"],
  java: ["java", "kotlin", "android", "c++"],
  kotlin: ["kotlin", "java", "android"],
  "c++": ["c++", "cpp", "java"],
  shell: ["shell", "python", "bash"],
};

export function normalizeSkill(s: string) {
  return s.trim().toLowerCase().replace(/\./g, "");
}

export function allSkillOptions(projects: ProjectRecord[]): string[] {
  const set = new Set<string>();
  for (const p of projects) {
    for (const t of p.tech) set.add(t);
    if (p.snapshot?.language) set.add(p.snapshot.language);
  }
  const preferred = [
    "TypeScript",
    "JavaScript",
    "React",
    "Nextjs",
    "Python",
    "Go",
    "Rust",
    "Flutter",
    "Java",
    "C++",
    "Shell",
  ];
  const fromData = [...set];
  const ordered = [
    ...preferred.filter((p) =>
      fromData.some((s) => s.toLowerCase() === p.toLowerCase()),
    ),
    ...fromData.filter(
      (s) => !preferred.some((p) => p.toLowerCase() === s.toLowerCase()),
    ),
  ];
  return ordered.filter(
    (v, i, arr) => arr.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i,
  );
}

function skillHits(project: ProjectRecord, skills: string[]): string[] {
  if (!skills.length) return [];
  const hay = [
    ...project.tech,
    project.snapshot?.language ?? "",
    project.description,
    project.name,
  ]
    .join(" ")
    .toLowerCase();

  const hits: string[] = [];
  for (const raw of skills) {
    const key = normalizeSkill(raw);
    const aliases = SKILL_ALIASES[key] ?? [key];
    if (aliases.some((a) => hay.includes(a))) hits.push(raw);
  }
  return hits;
}

export function extractTaskAmount(title: string, fallback: string): string {
  const m =
    title.match(/\[?\s*\$\s*([\d,]+(?:\.\d+)?)\s*\]?/i) ||
    title.match(/\$\s*([\d,]+(?:\.\d+)?)\s*(?:-|–|—|to)\s*\$\s*([\d,]+(?:\.\d+)?)/i);
  if (m) {
    if (m[2]) return `$${m[1]}–$${m[2]}`;
    return `$${m[1]}`;
  }
  return fallback;
}

export function clarityLabel(c: SettlementClarity) {
  if (c === "clear") return { text: "结算清晰", tone: "good" as const };
  if (c === "partial") return { text: "需再确认", tone: "warn" as const };
  return { text: "信息不完整", tone: "bad" as const };
}

export function enrichProjects(
  projects: ProjectRecord[],
  selectedSkills: string[],
): EnrichedProject[] {
  return projects
    .map((project) => {
      const profile = getProfile(project.name) ?? null;
      const matchedSkills = skillHits(project, selectedSkills);
      const bountyCount = project.opportunities.filter((o) => o.kind === "bounty").length;
      const topTasks = [...project.opportunities].sort((a, b) => b.score - a.score).slice(0, 8);

      let matchScore = 0;
      if (!selectedSkills.length) matchScore = 50;
      else matchScore = matchedSkills.length * 28;
      matchScore += Math.min(bountyCount * 6, 24);
      if (profile?.settlement.clarity === "clear") matchScore += 12;
      if (profile?.settlement.clarity === "partial") matchScore += 4;
      matchScore += Math.min(topTasks[0]?.score ?? 0, 10);

      const claimUrl =
        project.getting_started ||
        (project.github ? `https://github.com/${project.github}/issues` : project.link);

      return {
        ...project,
        profile,
        bountyCount,
        topTasks,
        matchScore,
        matchedSkills,
        claimUrl,
        amountHint: profile?.settlement.amount ?? project.payment,
      };
    })
    .sort((a, b) => {
      if (selectedSkills.length) {
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      }
      return b.bountyCount - a.bountyCount || b.opportunities.length - a.opportunities.length;
    });
}
