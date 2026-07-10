"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  allSkillOptions,
  clarityLabel,
  enrichProjects,
  extractTaskAmount,
  type EnrichedProject,
} from "@/lib/enrich";
import { KIND_COLORS } from "@/lib/colors";
import type { Opportunity, ProjectRecord } from "@/lib/types";

const DEFAULT_SKILLS = ["TypeScript", "React", "JavaScript"];
const STORAGE_KEY = "opentacker.prefs.v1";

type GoalId = "quick" | "clear" | "big" | "learn";

const GOALS: Array<{
  id: GoalId;
  title: string;
  desc: string;
}> = [
  { id: "quick", title: "想快点接到单", desc: "优先有现成任务、金额写在标题上的项目" },
  { id: "clear", title: "结算要清楚", desc: "只看付款路径明确、不容易白干的项目" },
  { id: "big", title: "想冲大额", desc: "偏向 $1000+ 或高单价 bounty，接受更高门槛" },
  { id: "learn", title: "先练手涨经验", desc: "小额 / 入门友好，建立信誉再冲大单" },
];

type Prefs = {
  skills: string[];
  goal: GoalId;
  shortlist: string[];
};

function loadPrefs(fallbackSkills: string[]): Prefs {
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

export function MatchWorkspace({
  projects,
  generatedAt,
}: {
  projects: ProjectRecord[];
  generatedAt: string;
}) {
  const skillOptions = useMemo(() => allSkillOptions(projects), [projects]);
  const defaults = DEFAULT_SKILLS.filter((s) =>
    skillOptions.some((o) => o.toLowerCase() === s.toLowerCase()),
  );

  const [skills, setSkills] = useState<string[]>(defaults);
  const [goal, setGoal] = useState<GoalId>("quick");
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [onlyWithTasks, setOnlyWithTasks] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [pendingTask, setPendingTask] = useState<{
    project: EnrichedProject;
    task: Opportunity;
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [, startTransition] = useTransition();
  const detailRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const prefs = loadPrefs(defaults);
    setSkills(prefs.skills);
    setGoal(prefs.goal);
    setShortlist(prefs.shortlist);
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ skills, goal, shortlist } satisfies Prefs),
    );
  }, [skills, goal, shortlist, hydrated]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!pendingTask) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPendingTask(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingTask]);

  const enriched = useMemo(() => enrichProjects(projects, skills), [projects, skills]);

  const filtered = useMemo(() => {
    let list = enriched.filter((p) => {
      if (onlyWithTasks && p.opportunities.length === 0) return false;
      if (skills.length && p.matchedSkills.length === 0) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        const blob = `${p.name} ${p.description} ${p.profile?.summaryZh ?? ""} ${p.tech.join(" ")}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      if (goal === "clear" && p.profile?.settlement.clarity !== "clear") return false;
      if (goal === "big") {
        const amount = `${p.amountHint} ${p.payment}`.toLowerCase();
        const looksBig =
          /2,?000|2340|1,?000|500\s*per\s*month|\$500/i.test(amount) ||
          p.profile?.difficulty === "较难";
        if (!looksBig) return false;
      }
      if (goal === "learn") {
        const easy =
          p.profile?.difficulty === "入门" ||
          p.opportunities.some((o) => o.kind === "good_first") ||
          /\$\s*80|\$\s*30|\$\s*50/i.test(p.amountHint);
        if (!easy && p.profile?.settlement.clarity !== "clear") return false;
      }
      return true;
    });

    if (goal === "quick") {
      list = [...list].sort(
        (a, b) =>
          b.bountyCount - a.bountyCount ||
          b.matchScore - a.matchScore ||
          b.opportunities.length - a.opportunities.length,
      );
    }
    return list;
  }, [enriched, onlyWithTasks, skills, query, goal]);

  const selected =
    filtered.find((p) => p.name === selectedName) ??
    filtered[0] ??
    null;

  const step = !skills.length ? 1 : !selected ? 2 : pendingTask ? 4 : 3;

  const coach = useMemo(() => buildCoach({ skills, goal, filtered, selected }), [
    skills,
    goal,
    filtered,
    selected,
  ]);

  function toggleSkill(skill: string) {
    startTransition(() => {
      setSkills((prev) => {
        const next = prev.some((s) => s.toLowerCase() === skill.toLowerCase())
          ? prev.filter((s) => s.toLowerCase() !== skill.toLowerCase())
          : [...prev, skill];
        return next;
      });
      setSelectedName(null);
    });
  }

  function selectProject(name: string) {
    setSelectedName(name);
    setToast(`已选中 ${name}，右侧可以看结算和任务`);
    window.requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function toggleShortlist(name: string) {
    setShortlist((prev) => {
      const exists = prev.includes(name);
      const next = exists ? prev.filter((n) => n !== name) : [...prev, name];
      setToast(exists ? `已从短名单移除 ${name}` : `已加入短名单：${name}`);
      return next;
    });
  }

  const shortlistedProjects = enriched.filter((p) => shortlist.includes(p.name));

  return (
    <div className="workspace">
      <JourneyBar step={step} />

      <section className={`coach panel ${coach.tone}`}>
        <div className="coach-label">给你的建议</div>
        <p className="coach-text">{coach.text}</p>
        {coach.actionLabel && (
          <button
            type="button"
            className="btn gold coach-action"
            onClick={() => {
              if (coach.actionKind === "claim" && selected?.topTasks[0]) {
                setPendingTask({ project: selected, task: selected.topTasks[0] });
                return;
              }
              if (coach.actionProject) selectProject(coach.actionProject);
            }}
          >
            {coach.actionLabel}
          </button>
        )}
      </section>

      <section className="matcher panel">
        <div className="matcher-head">
          <div>
            <h2>你现在最想怎样赚钱？</h2>
            <p className="hint">先选一个目标，我会帮你把不合适的项目先藏起来。</p>
          </div>
          <div className="matcher-meta">更新于 {formatTime(generatedAt)}</div>
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
          {skillOptions.map((skill) => {
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
                setToast("已显示全部项目");
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
            placeholder="搜项目名，比如 Expensify…"
            aria-label="搜索项目"
          />
          <label className="check">
            <input
              type="checkbox"
              checked={onlyWithTasks}
              onChange={(e) => setOnlyWithTasks(e.target.checked)}
            />
            只看现在有任务的
          </label>
        </div>
      </section>

      {shortlistedProjects.length > 0 && (
        <section className="shortlist-bar panel">
          <div>
            <strong>我的短名单</strong>
            <span className="muted"> · 先收藏，回头再接</span>
          </div>
          <div className="shortlist-chips">
            {shortlistedProjects.map((p) => (
              <button
                key={p.name}
                type="button"
                className="skill-chip active"
                onClick={() => selectProject(p.name)}
              >
                {p.name}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="split">
        <section className="project-rail" aria-label="匹配项目列表">
          <div className="rail-title-row">
            <h2 className="rail-title">为你筛出的项目</h2>
            <span className="rail-count">
              {filtered.length} 个合适
            </span>
          </div>

          {filtered.length === 0 && (
            <div className="empty panel human-empty">
              <strong>这组条件有点严。</strong>
              <p>试试换个目标，或点「先不限技能」。你也可以先看结算清晰的 Expensify / tscircuit。</p>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  setGoal("quick");
                  setSkills(defaults);
                  setOnlyWithTasks(true);
                  setQuery("");
                }}
              >
                恢复推荐设置
              </button>
            </div>
          )}

          {filtered.map((p, index) => (
            <ProjectPickCard
              key={p.name}
              project={p}
              rank={index + 1}
              active={selected?.name === p.name}
              bookmarked={shortlist.includes(p.name)}
              why={whyRecommended(p, goal, skills)}
              onSelect={() => selectProject(p.name)}
              onBookmark={() => toggleShortlist(p.name)}
            />
          ))}
        </section>

        <section className="detail-pane" ref={detailRef}>
          {selected ? (
            <ProjectDetail
              project={selected}
              bookmarked={shortlist.includes(selected.name)}
              onBookmark={() => toggleShortlist(selected.name)}
              onClaimTask={(task) => setPendingTask({ project: selected, task })}
            />
          ) : (
            <div className="empty panel human-empty">
              <strong>还没选项目</strong>
              <p>左边点一下卡片，我就会把「做什么、怎么结算、怎么接」摊开给你看。</p>
            </div>
          )}
        </section>
      </div>

      {selected && selected.topTasks[0] && !pendingTask && (
        <div className="sticky-cta" role="region" aria-label="下一步行动">
          <div>
            <strong>下一步建议</strong>
            <p>
              先看清 {selected.name} 的结算规则，再去接：
              <em> {selected.topTasks[0].title.slice(0, 42)}
              {selected.topTasks[0].title.length > 42 ? "…" : ""}</em>
            </p>
          </div>
          <button
            type="button"
            className="btn gold"
            onClick={() =>
              setPendingTask({ project: selected, task: selected.topTasks[0] })
            }
          >
            准备去接最高分任务
          </button>
        </div>
      )}

      {pendingTask && (
        <ClaimSheet
          project={pendingTask.project}
          task={pendingTask.task}
          onClose={() => setPendingTask(null)}
        />
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function JourneyBar({ step }: { step: number }) {
  const items = [
    { n: 1, label: "定目标/技能" },
    { n: 2, label: "挑项目" },
    { n: 3, label: "看结算" },
    { n: 4, label: "去接任务" },
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

function ProjectPickCard({
  project,
  rank,
  active,
  bookmarked,
  why,
  onSelect,
  onBookmark,
}: {
  project: EnrichedProject;
  rank: number;
  active: boolean;
  bookmarked: boolean;
  why: string;
  onSelect: () => void;
  onBookmark: () => void;
}) {
  const clarity = project.profile
    ? clarityLabel(project.profile.settlement.clarity)
    : { text: "待补充", tone: "warn" as const };

  return (
    <div className={`pick-card ${active ? "active" : ""} ${rank === 1 ? "top-pick" : ""}`}>
      <button type="button" className="pick-main" onClick={onSelect}>
        <div className="pick-top">
          <div className="pick-title-row">
            {rank === 1 && <span className="reco-badge">最推荐</span>}
            <strong>{project.name}</strong>
          </div>
          <span className={`tone ${clarity.tone}`}>{clarity.text}</span>
        </div>
        <p className="pick-summary">{project.profile?.summaryZh ?? project.description}</p>
        <p className="why-line">{why}</p>
        <div className="pick-tags">
          {(project.matchedSkills.length ? project.matchedSkills : project.tech.slice(0, 3)).map(
            (t) => (
              <span key={t} className="mini-tag">
                {t}
              </span>
            ),
          )}
        </div>
        <div className="pick-foot">
          <span className="gold-text">{project.amountHint}</span>
          <span>
            {project.bountyCount} 奖金 · {project.opportunities.length} 任务
          </span>
        </div>
      </button>
      <button
        type="button"
        className={`bookmark ${bookmarked ? "on" : ""}`}
        onClick={onBookmark}
        aria-label={bookmarked ? "移出短名单" : "加入短名单"}
        title={bookmarked ? "移出短名单" : "先收藏，稍后再看"}
      >
        {bookmarked ? "★" : "☆"}
      </button>
    </div>
  );
}

function ProjectDetail({
  project,
  bookmarked,
  onBookmark,
  onClaimTask,
}: {
  project: EnrichedProject;
  bookmarked: boolean;
  onBookmark: () => void;
  onClaimTask: (task: Opportunity) => void;
}) {
  const profile = project.profile;
  const settlement = profile?.settlement;
  const clarity = settlement
    ? clarityLabel(settlement.clarity)
    : { text: "待补充", tone: "warn" as const };
  const primaryTask = project.topTasks[0];
  const primaryAmount = primaryTask
    ? extractTaskAmount(primaryTask.title, project.amountHint)
    : project.amountHint;

  return (
    <div className="detail panel detail-enter" key={project.name}>
      <div className="detail-hero">
        <div>
          <div className="eyebrow">{profile?.category ?? "付费开源项目"}</div>
          <h2>{project.name}</h2>
          <p className="detail-summary">{profile?.summaryZh ?? project.description}</p>
          <p className="human-line">
            用人话讲：{humanOneLiner(project)}
          </p>
        </div>
        <div className="detail-cta-stack">
          <button type="button" className="btn ghost" onClick={onBookmark}>
            {bookmarked ? "★ 已在短名单" : "☆ 先收藏这个项目"}
          </button>
          <a className="btn primary" href={project.claimUrl} target="_blank" rel="noreferrer">
            打开上手入口 ↗
          </a>
          {project.github && (
            <a
              className="btn ghost"
              href={`https://github.com/${project.github}/issues`}
              target="_blank"
              rel="noreferrer"
            >
              浏览全部 Issues
            </a>
          )}
          {primaryTask && (
            <button type="button" className="btn gold" onClick={() => onClaimTask(primaryTask)}>
              准备接最高分任务（{primaryAmount}）
            </button>
          )}
        </div>
      </div>

      <div className="info-grid">
        <div className="info-block">
          <h3>适合你吗？</h3>
          <ul>
            {(profile?.fitFor ?? ["请结合技术栈自行判断"]).map((x) => (
              <li key={x}>✓ {x}</li>
            ))}
          </ul>
          {profile?.notFitFor?.length ? (
            <>
              <h4>可能不太适合</h4>
              <ul className="muted-list">
                {profile.notFitFor.map((x) => (
                  <li key={x}>– {x}</li>
                ))}
              </ul>
            </>
          ) : null}
          <div className="pill-row">
            <span className="mini-tag">{profile?.difficulty ?? "未知难度"}</span>
            {project.tech.map((t) => (
              <span key={t} className="mini-tag">
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="info-block settlement">
          <div className="settle-head">
            <h3>钱怎么结？</h3>
            <span className={`tone ${clarity.tone}`}>{clarity.text}</span>
          </div>
          <dl className="settle-dl">
            <div>
              <dt>报酬模式</dt>
              <dd>{settlement?.model ?? "见项目说明"}</dd>
            </div>
            <div>
              <dt>大概能拿</dt>
              <dd className="gold-text">{settlement?.amount ?? project.payment}</dd>
            </div>
            <div>
              <dt>什么时候给</dt>
              <dd>{settlement?.whenPaid ?? "需向维护者确认"}</dd>
            </div>
            <div>
              <dt>走哪个平台</dt>
              <dd>{settlement?.platform ?? "GitHub / 项目方"}</dd>
            </div>
          </dl>
          <h4>想拿到钱，按这个做</h4>
          <ol className="claim-steps">
            {(settlement?.howToClaim ?? ["打开 Getting Started", "按官方流程认领"]).map(
              (step, i) => (
                <li key={step}>
                  <span>{i + 1}</span>
                  {step}
                </li>
              ),
            )}
          </ol>
          {settlement?.notes && <p className="settle-note">{settlement.notes}</p>}
        </div>
      </div>

      <div className="task-section">
        <div className="task-head">
          <h3>现在可以接的任务</h3>
          <span className="muted">先点「准备去接」，我会提醒你核对结算</span>
        </div>

        {project.topTasks.length === 0 ? (
          <div className="empty soft">
            暂时没抓到开放任务。你可以先收藏项目，或打开上手入口看看有没有新 bounty。
            <div style={{ marginTop: 12 }}>
              <a className="btn primary" href={project.claimUrl} target="_blank" rel="noreferrer">
                去上手入口看看 ↗
              </a>
            </div>
          </div>
        ) : (
          <div className="task-list">
            {project.topTasks.map((task, idx) => {
              const amount = extractTaskAmount(task.title, project.amountHint);
              return (
                <article key={task.url} className={`task-card ${idx === 0 ? "best" : ""}`}>
                  <div className="task-main">
                    <div className="task-meta">
                      {idx === 0 && <span className="reco-badge">先做这个</span>}
                      <span
                        className="badge"
                        style={{
                          background: `${KIND_COLORS[task.kind] ?? "#8B9BB4"}22`,
                          borderColor: `${KIND_COLORS[task.kind] ?? "#8B9BB4"}55`,
                          color: KIND_COLORS[task.kind] ?? "#8B9BB4",
                        }}
                      >
                        {task.kind_zh}
                      </span>
                      <span className="score">推荐分 {task.score.toFixed(1)}</span>
                      <span className="gold-text amount">{amount}</span>
                    </div>
                    <h4>{task.title}</h4>
                    <p className="muted">
                      {task.reasons.slice(0, 2).join(" · ") || "开放中"}
                      {task.labels.length ? ` · ${task.labels.slice(0, 3).join(", ")}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn gold claim"
                    onClick={() => onClaimTask(task)}
                  >
                    准备去接
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {profile?.startSteps?.length ? (
        <div className="start-box">
          <h3>如果你决定做这个项目</h3>
          <ol>
            {profile.startSteps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

function ClaimSheet({
  project,
  task,
  onClose,
}: {
  project: EnrichedProject;
  task: Opportunity;
  onClose: () => void;
}) {
  const amount = extractTaskAmount(task.title, project.amountHint);
  const settlement = project.profile?.settlement;
  const checks = [
    "确认这个 Issue / bounty 还没被别人占走",
    "扫一眼结算规则，知道合并后怎么申请付款",
    "准备好按 CONTRIBUTING / bounty 页的要求提 PR",
  ];

  return (
    <div className="sheet-backdrop" role="presentation" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="claim-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-head">
          <div>
            <div className="eyebrow">出发前 30 秒确认</div>
            <h3 id="claim-title">准备去接：{project.name}</h3>
          </div>
          <button type="button" className="icon-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        <p className="sheet-task">{task.title}</p>
        <div className="sheet-pay">
          <span>预估报酬</span>
          <strong className="gold-text">{amount}</strong>
        </div>

        <ul className="sheet-checks">
          {checks.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>

        {settlement && (
          <p className="settle-note">
            提醒：{settlement.platform} · {settlement.whenPaid}
          </p>
        )}

        <div className="sheet-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            再想想
          </button>
          <a
            className="btn gold"
            href={task.url}
            target="_blank"
            rel="noreferrer"
            onClick={onClose}
          >
            好，打开任务页 ↗
          </a>
        </div>
      </div>
    </div>
  );
}

function buildCoach({
  skills,
  goal,
  filtered,
  selected,
}: {
  skills: string[];
  goal: GoalId;
  filtered: EnrichedProject[];
  selected: EnrichedProject | null;
}) {
  if (!skills.length) {
    return {
      tone: "warn",
      text: "先点几个你会的技能吧。选得越准，后面越少踩坑。",
      actionLabel: null as string | null,
      actionProject: null as string | null,
      actionKind: "select" as "select" | "claim",
    };
  }
  if (!filtered.length) {
    return {
      tone: "warn",
      text: "按你现在的目标，暂时没有很合适的项目。换个目标，或者先不限技能看看。",
      actionLabel: null,
      actionProject: null,
      actionKind: "select" as const,
    };
  }
  const top = filtered[0];
  if (!selected || selected.name === top.name) {
    const goalText =
      goal === "clear"
        ? "你很在意结算清晰"
        : goal === "big"
          ? "你想冲大额"
          : goal === "learn"
            ? "你想先练手"
            : "你想尽快接到单";
    return {
      tone: "good",
      text: `${goalText}，又会 ${skills.slice(0, 3).join(" / ")} —— 我最推荐从「${top.name}」开始。${whyRecommended(top, goal, skills)}`,
      actionLabel: `看看 ${top.name}`,
      actionProject: top.name,
      actionKind: "select" as const,
    };
  }
  return {
    tone: "good",
    text: `你正在看「${selected.name}」。确认结算方式后，选一个任务点「准备去接」，我会帮你做出发前检查。`,
    actionLabel: selected.topTasks[0] ? "准备接最高分任务" : null,
    actionProject: selected.name,
    actionKind: "claim" as const,
  };
}

function whyRecommended(p: EnrichedProject, goal: GoalId, skills: string[]) {
  const bits: string[] = [];
  if (p.matchedSkills.length) bits.push(`匹配你的 ${p.matchedSkills.slice(0, 2).join("、")}`);
  if (p.profile?.settlement.clarity === "clear") bits.push("结算路径清楚");
  if (p.bountyCount > 0) bits.push(`有 ${p.bountyCount} 个奖金向任务`);
  if (goal === "learn" && p.profile?.difficulty === "入门") bits.push("门槛更友好");
  if (goal === "big") bits.push("更偏向高报酬");
  if (!bits.length) bits.push(`当前有 ${p.opportunities.length} 个可跟进任务`);
  return bits.join(" · ");
}

function humanOneLiner(p: EnrichedProject) {
  if (p.name === "Expensify") return "做移动端/前端小修小补，标题里写着价钱，相对好上手。";
  if (p.name === "tscircuit") return "用 React 写电路，钱走 Algora，适合前端想接点新鲜的。";
  if (p.name === "RudderStack") return "偏硬核数据管道，钱可能很多，但别当第一单。";
  if (p.name === "Appflowy") return "不是点 Issue 就结账，而是申请导师制月薪。";
  if (p.name === "BusKill") return "安全/打包向，大额单很香，但要对 Linux/Qubes 有底。";
  return p.profile?.summaryZh?.slice(0, 42) ?? "先看结算，再决定要不要投入时间。";
}

function formatTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Shanghai",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
