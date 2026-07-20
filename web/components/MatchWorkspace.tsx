"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { BountyListItem } from "@/lib/bounties-list";
import { scoreTaskForUser } from "@/lib/matching";
import { KIND_LABEL, SOURCE_LABEL } from "@/lib/source-labels";
import { clarityLabel, coachTipsForTask } from "@/lib/task-coach";

const DEFAULT_SKILLS = ["TypeScript", "React", "JavaScript"];
const STORAGE_KEY = "opentacker.prefs.v1";

const SKILL_OPTIONS = [
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
];

type GoalId = "quick" | "clear" | "big" | "learn";

const GOALS: Array<{ id: GoalId; title: string; desc: string }> = [
  { id: "quick", title: "想快点接到单", desc: "优先悬赏与兼职，上手快" },
  { id: "clear", title: "结算要清楚", desc: "偏向有金额说明、路径清晰的机会" },
  { id: "big", title: "想冲大额", desc: "偏向高金额悬赏或高薪岗位" },
  { id: "learn", title: "先练手涨经验", desc: "小额 / 入门友好，建立信誉" },
];

type Prefs = { skills: string[]; goal: GoalId; shortlist: string[] };

type ScoredItem = BountyListItem & { localScore: number; localReasons: string[] };

function loadLocalPrefs(fallbackSkills: string[]): Prefs {
  if (typeof window === "undefined") {
    return { skills: fallbackSkills, goal: "quick", shortlist: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { skills: fallbackSkills, goal: "quick", shortlist: [] };
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return {
      skills: parsed.skills?.length ? parsed.skills : fallbackSkills,
      goal: parsed.goal ?? "quick",
      shortlist: parsed.shortlist ?? [],
    };
  } catch {
    return { skills: fallbackSkills, goal: "quick", shortlist: [] };
  }
}

function isExternalUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

export function MatchWorkspace({
  initialItems,
  fetchedAt,
}: {
  initialItems: BountyListItem[];
  fetchedAt: string;
}) {
  const { status } = useSession();
  const [skills, setSkills] = useState<string[]>(DEFAULT_SKILLS);
  const [goal, setGoal] = useState<GoalId>("quick");
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [prefsSource, setPrefsSource] = useState<"local" | "account">("local");
  const [, startTransition] = useTransition();
  const detailRef = useRef<HTMLElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      if (status === "authenticated") {
        try {
          const res = await fetch("/api/me");
          if (res.ok) {
            const me = await res.json();
            if (cancelled) return;
            const meSkills = Array.isArray(me.skills) ? me.skills.map(String) : [];
            setSkills(meSkills.length ? meSkills : DEFAULT_SKILLS);
            setGoal((me.goal as GoalId) || "quick");
            setPrefsSource("account");
            const local = loadLocalPrefs(DEFAULT_SKILLS);
            setShortlist(local.shortlist);
            setHydrated(true);
            return;
          }
        } catch {
          /* fall through to local */
        }
      }
      if (status === "loading") return;
      const prefs = loadLocalPrefs(DEFAULT_SKILLS);
      if (cancelled) return;
      setSkills(prefs.skills);
      setGoal(prefs.goal);
      setShortlist(prefs.shortlist);
      setPrefsSource("local");
      setHydrated(true);
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, [status]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ skills, goal, shortlist } satisfies Prefs),
    );
  }, [skills, goal, shortlist, hydrated]);

  useEffect(() => {
    if (!hydrated || prefsSource !== "account" || status !== "authenticated") return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills, goal }),
      }).catch(() => undefined);
    }, 600);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [skills, goal, hydrated, prefsSource, status]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  const scored = useMemo((): ScoredItem[] => {
    return initialItems.map((item) => {
      const { score, reasons } = scoreTaskForUser({
        skills,
        goal,
        techTags: item.techTags,
        title: item.title,
        summary: item.summary,
        amountText: item.amountText,
        amountMax: item.amountMax,
        kind: item.kind,
        activeClaims: item.activeClaims?.length ?? 0,
      });
      return { ...item, localScore: score, localReasons: reasons };
    });
  }, [initialItems, skills, goal]);

  const filtered = useMemo(() => {
    let list = scored.filter((item) => {
      if (query.trim()) {
        const q = query.toLowerCase();
        const blob = `${item.title} ${item.projectName} ${item.summary || ""} ${item.techTags.join(" ")}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      if (skills.length) {
        const hay = `${item.title} ${item.summary || ""} ${item.techTags.join(" ")}`.toLowerCase();
        const hit = skills.some((s) => hay.includes(s.toLowerCase()));
        // 无技能命中时保留综合分尚可的项，避免列表被筛空
        if (!hit) return item.localScore >= 28;
      }
      return true;
    });
    list = [...list].sort((a, b) => b.localScore - a.localScore);
    return list;
  }, [scored, query, skills]);

  const selected =
    filtered.find((i) => i.id === selectedId) ?? filtered[0] ?? null;

  const step = !skills.length ? 1 : !selected ? 2 : 3;
  const coach = useMemo(
    () => buildCoach({ skills, goal, filtered, selected }),
    [skills, goal, filtered, selected],
  );

  function toggleSkill(skill: string) {
    startTransition(() => {
      setSkills((prev) => {
        const next = prev.some((s) => s.toLowerCase() === skill.toLowerCase())
          ? prev.filter((s) => s.toLowerCase() !== skill.toLowerCase())
          : [...prev, skill];
        return next;
      });
      setSelectedId(null);
    });
  }

  function selectTask(id: string) {
    setSelectedId(id);
    const item = scored.find((i) => i.id === id);
    if (item) setToast(`已选中 ${item.projectName}`);
    window.requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function toggleShortlist(id: string) {
    setShortlist((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((n) => n !== id) : [...prev, id];
      setToast(exists ? "已从短名单移除" : "已加入短名单");
      return next;
    });
  }

  const shortlistedItems = scored.filter((i) => shortlist.includes(i.id));

  if (!initialItems.length) {
    return (
      <div className="panel human-empty">
        <strong>大厅里还没有可匹配的机会</strong>
        <p>先去机会大厅同步外部源，或自行发布一条协作机会。</p>
        <div className="detail-cta-stack" style={{ justifyContent: "flex-start" }}>
          <Link href="/" className="btn primary">
            去机会大厅
          </Link>
          <Link href="/publish" className="btn ghost">
            发布机会
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace">
      <JourneyBar step={step} />

      <section className={`coach panel ${coach.tone}`}>
        <div className="coach-label">给你的建议</div>
        <p className="coach-text">{coach.text}</p>
        {coach.actionLabel && coach.actionId && (
          <button
            type="button"
            className="btn gold coach-action"
            onClick={() => selectTask(coach.actionId!)}
          >
            {coach.actionLabel}
          </button>
        )}
      </section>

      <section className="matcher panel">
        <div className="matcher-head">
          <div>
            <h2>你现在最想怎样赚钱？</h2>
            <p className="hint">
              目标与技能与工作台共用
              {prefsSource === "account" ? "（已登录，会自动保存）" : "（游客保存在本机）"}。
            </p>
          </div>
          <div className="matcher-meta">数据更新于 {formatTime(fetchedAt)}</div>
        </div>

        <div className="goal-grid">
          {GOALS.map((g) => (
            <button
              key={g.id}
              type="button"
              className={`goal-card ${goal === g.id ? "active" : ""}`}
              onClick={() => {
                setGoal(g.id);
                setToast(`已切换目标：${g.title}`);
              }}
            >
              <strong>{g.title}</strong>
              <span>{g.desc}</span>
            </button>
          ))}
        </div>

        <div className="section-label">你的技能（可多选）</div>
        <div className="skill-cloud">
          {SKILL_OPTIONS.map((skill) => {
            const active = skills.some((s) => s.toLowerCase() === skill.toLowerCase());
            return (
              <button
                key={skill}
                type="button"
                className={`skill-chip ${active ? "active" : ""}`}
                onClick={() => toggleSkill(skill)}
                aria-pressed={active}
              >
                {active ? "✓ " : ""}
                {skill}
              </button>
            );
          })}
          {skills.length > 0 && (
            <button
              type="button"
              className="skill-chip ghost"
              onClick={() => {
                setSkills([]);
                setToast("已显示更广的机会");
              }}
            >
              先不限技能
            </button>
          )}
        </div>

        <div className="toolbar compact">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜职位、项目、技能…"
            aria-label="搜索机会"
          />
        </div>
      </section>

      {shortlistedItems.length > 0 && (
        <section className="shortlist-bar panel">
          <div>
            <strong>我的短名单</strong>
            <span className="muted"> · 先收藏，回头再接</span>
          </div>
          <div className="shortlist-chips">
            {shortlistedItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className="skill-chip active"
                onClick={() => selectTask(item.id)}
              >
                {item.projectName}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="split">
        <section className="project-rail" aria-label="匹配机会列表">
          <div className="rail-title-row">
            <h2 className="rail-title">为你筛出的机会</h2>
            <span className="rail-count">{filtered.length} 个合适</span>
          </div>

          {filtered.length === 0 && (
            <div className="empty panel human-empty">
              <strong>这组条件有点严。</strong>
              <p>试试换个目标，或点「先不限技能」。</p>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  setGoal("quick");
                  setSkills(DEFAULT_SKILLS);
                  setQuery("");
                }}
              >
                恢复推荐设置
              </button>
            </div>
          )}

          {filtered.map((item, index) => (
            <TaskPickCard
              key={item.id}
              item={item}
              rank={index + 1}
              active={selected?.id === item.id}
              bookmarked={shortlist.includes(item.id)}
              onSelect={() => selectTask(item.id)}
              onBookmark={() => toggleShortlist(item.id)}
            />
          ))}
        </section>

        <section className="detail-pane" ref={detailRef}>
          {selected ? (
            <TaskDetail
              item={selected}
              bookmarked={shortlist.includes(selected.id)}
              onBookmark={() => toggleShortlist(selected.id)}
            />
          ) : (
            <div className="empty panel human-empty">
              <strong>还没选机会</strong>
              <p>左边点一下卡片，我会把适合度、结算提示和行动按钮摊开。</p>
            </div>
          )}
        </section>
      </div>

      {selected && (
        <div className="sticky-cta" role="region" aria-label="下一步行动">
          <div>
            <strong>下一步建议</strong>
            <p>
              先看清详情，再决定是否认领：
              <em>
                {" "}
                {selected.title.slice(0, 42)}
                {selected.title.length > 42 ? "…" : ""}
              </em>
            </p>
          </div>
          <Link href={`/opportunity/${selected.id}`} className="btn gold">
            打开机会详情
          </Link>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

function JourneyBar({ step }: { step: number }) {
  const items = [
    { n: 1, label: "定目标/技能" },
    { n: 2, label: "挑机会" },
    { n: 3, label: "看详情去接" },
  ];
  return (
    <ol className="journey">
      {items.map((item) => (
        <li key={item.n} className={step >= item.n ? "done" : ""}>
          <span className="journey-num">{item.n}</span>
          <span>{item.label}</span>
        </li>
      ))}
    </ol>
  );
}

function TaskPickCard({
  item,
  rank,
  active,
  bookmarked,
  onSelect,
  onBookmark,
}: {
  item: ScoredItem;
  rank: number;
  active: boolean;
  bookmarked: boolean;
  onSelect: () => void;
  onBookmark: () => void;
}) {
  const tips = coachTipsForTask(item);
  const clarity = clarityLabel(tips.clarity);
  return (
    <article className={`pick-card ${active ? "active" : ""} ${rank === 1 ? "best" : ""}`}>
      <button type="button" className="pick-main" onClick={onSelect}>
        <div className="pick-top">
          <span className="rank-badge">#{rank}</span>
          <span className="mini-tag">{KIND_LABEL[item.kind] || item.kind}</span>
          <span className={`clarity-pill ${clarity.tone}`}>{clarity.text}</span>
          <span className="match-score">{item.localScore} 分</span>
        </div>
        <h3>{item.title}</h3>
        <p className="muted">
          {item.projectName}
          {item.amountText ? ` · ${item.amountText}` : ""}
        </p>
        <p className="why-line">{item.localReasons[0] || "综合适合度较高"}</p>
      </button>
      <button
        type="button"
        className={`bookmark-btn ${bookmarked ? "on" : ""}`}
        aria-label={bookmarked ? "移出短名单" : "加入短名单"}
        onClick={onBookmark}
      >
        {bookmarked ? "★" : "☆"}
      </button>
    </article>
  );
}

function TaskDetail({
  item,
  bookmarked,
  onBookmark,
}: {
  item: ScoredItem;
  bookmarked: boolean;
  onBookmark: () => void;
}) {
  const tips = coachTipsForTask(item);
  const clarity = clarityLabel(tips.clarity);
  const external = isExternalUrl(item.url);

  return (
    <div className="panel detail-enter">
      <div className="detail-head">
        <div>
          <div className="pick-tags">
            <span className="mini-tag">{SOURCE_LABEL[item.source.key] || item.source.name}</span>
            <span className="mini-tag">{KIND_LABEL[item.kind] || item.kind}</span>
            <span className={`clarity-pill ${clarity.tone}`}>{clarity.text}</span>
          </div>
          <h2>{item.title}</h2>
          <p className="muted">
            {item.projectName}
            {item.amountText ? ` · ${item.amountText}` : ""}
          </p>
        </div>
        <button type="button" className={`btn ghost ${bookmarked ? "active" : ""}`} onClick={onBookmark}>
          {bookmarked ? "★ 已收藏" : "☆ 短名单"}
        </button>
      </div>

      {item.localReasons.length > 0 && (
        <div className="match-reasons">
          {item.localReasons.map((r) => (
            <span key={r} className="mini-tag">
              {r}
            </span>
          ))}
        </div>
      )}

      {item.summary && <p className="detail-summary">{item.summary}</p>}

      <div className="coach-block">
        <strong>结算提示</strong>
        <p>{tips.settlement}</p>
      </div>
      <div className="coach-block">
        <strong>怎么上手</strong>
        <p>{tips.howTo}</p>
      </div>

      <div className="pick-tags">
        {item.techTags.slice(0, 8).map((t) => (
          <span key={t} className="mini-tag">
            {t}
          </span>
        ))}
      </div>

      <div className="detail-cta-stack" style={{ marginTop: "1rem" }}>
        <Link href={`/opportunity/${item.id}`} className="btn gold">
          打开机会详情
        </Link>
        {external && (
          <a className="btn primary" href={item.url} target="_blank" rel="noreferrer">
            打开源站 ↗
          </a>
        )}
        {item.kind !== "portal" && (
          <Link href={`/opportunity/${item.id}`} className="btn ghost">
            去认领协作
          </Link>
        )}
      </div>
    </div>
  );
}

function buildCoach(input: {
  skills: string[];
  goal: GoalId;
  filtered: ScoredItem[];
  selected: ScoredItem | null;
}): { text: string; tone: string; actionLabel?: string; actionId?: string } {
  if (!input.skills.length) {
    return {
      tone: "tone-warn",
      text: "先点几个技能标签，我会按技能与目标重排机会列表。",
    };
  }
  if (!input.filtered.length) {
    return {
      tone: "tone-warn",
      text: "当前筛选偏严。换目标或点「先不限技能」再试。",
    };
  }
  const top = input.filtered[0];
  if (!input.selected) {
    return {
      tone: "tone-good",
      text: `按你的目标「${GOALS.find((g) => g.id === input.goal)?.title}」，最靠前的是「${top.projectName}」——${top.localReasons[0] || "综合匹配度高"}。`,
      actionLabel: "查看这条机会",
      actionId: top.id,
    };
  }
  const tips = coachTipsForTask(input.selected);
  return {
    tone: tips.clarity === "clear" ? "tone-good" : "tone-info",
    text: `${input.selected.projectName}：${tips.settlement} ${tips.howTo}`,
    actionLabel: "打开详情准备接单",
    actionId: input.selected.id,
  };
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("zh-CN", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
