from __future__ import annotations

import re
from dataclasses import dataclass, field
from enum import Enum

from .config import Config
from .github_client import IssueItem, RepoSnapshot
from .list_parser import PaidProject


class OpportunityKind(str, Enum):
    BOUNTY = "bounty"  # 明确奖金/悬赏
    FEATURE = "feature"  # 新功能
    IMPROVEMENT = "improvement"  # 改进
    OPTIMIZATION = "optimization"  # 性能/优化
    BUGFIX = "bugfix"  # Bug
    GOOD_FIRST = "good_first"  # 新手友好
    OTHER = "other"


KIND_ZH = {
    OpportunityKind.BOUNTY: "奖金悬赏",
    OpportunityKind.FEATURE: "新功能",
    OpportunityKind.IMPROVEMENT: "改进需求",
    OpportunityKind.OPTIMIZATION: "优化/性能",
    OpportunityKind.BUGFIX: "Bug 修复",
    OpportunityKind.GOOD_FIRST: "新手友好",
    OpportunityKind.OTHER: "其他机会",
}


@dataclass
class Opportunity:
    kind: OpportunityKind
    score: float
    project_name: str
    payment: str
    issue: IssueItem
    reasons: list[str] = field(default_factory=list)
    repo: str = ""

    @property
    def kind_label(self) -> str:
        return KIND_ZH.get(self.kind, self.kind.value)


@dataclass
class ProjectProgress:
    project: PaidProject
    snapshot: RepoSnapshot | None
    opportunities: list[Opportunity] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)


def _label_hit(labels: list[str], needles: list[str]) -> list[str]:
    hits: list[str] = []
    lower = [l.lower() for l in labels]
    for n in needles:
        for lab in lower:
            if n in lab:
                hits.append(lab)
                break
    return hits


def _text_hit(text: str, needles: list[str]) -> list[str]:
    t = text.lower()
    hits: list[str] = []
    for n in needles:
        if len(n) <= 4:
            if re.search(rf"\b{re.escape(n)}\b", t):
                hits.append(n)
        elif n in t:
            hits.append(n)
    return hits


def _has_any(blob: str, labels: list[str], keys: tuple[str, ...]) -> bool:
    for k in keys:
        if len(k) <= 4:
            if re.search(rf"\b{re.escape(k)}\b", blob) or any(
                re.search(rf"\b{re.escape(k)}\b", l) for l in labels
            ):
                return True
        elif k in blob or any(k in l for l in labels):
            return True
    return False


def classify_issue(issue: IssueItem, config: Config) -> tuple[OpportunityKind, list[str], float]:
    labels = [l.lower() for l in issue.labels]
    blob = f"{issue.title}\n{issue.body}".lower()
    reasons: list[str] = []
    score = 1.0

    bounty_hits = _label_hit(issue.labels, config.bounty_labels)
    if not bounty_hits:
        bounty_hits = [
            k
            for k in ("bounty", "paid", "reward", "algora", "悬赏", "奖金")
            if k in blob
        ]
    # Expensify 等常用 [$250] / $500 bounty 标题格式
    money_in_title = bool(
        re.search(r"\[?\s*\$\s*\d+", issue.title)
        or re.search(r"due for payment", issue.title, re.I)
    )
    if money_in_title and not bounty_hits:
        bounty_hits = ["金额标记"]

    if bounty_hits or money_in_title:
        reasons.append(f"奖金相关: {', '.join(bounty_hits[:3])}")
        score += 5.0
        kind = OpportunityKind.BOUNTY
    elif any("good first" in l or "beginner" in l or "easy" in l for l in labels):
        reasons.append("新手友好标签")
        score += 2.5
        kind = OpportunityKind.GOOD_FIRST
    elif _has_any(blob, labels, ("optimize", "optimisation", "optimization", "performance", "perf", "slow", "优化", "性能")):
        reasons.append("优化/性能相关")
        score += 3.0
        kind = OpportunityKind.OPTIMIZATION
    elif _has_any(blob, labels, ("feature", "enhancement", "新功能")):
        reasons.append("新功能/增强")
        score += 3.0
        kind = OpportunityKind.FEATURE
    elif _has_any(blob, labels, ("improve", "refactor", "cleanup", "改进", "重构")):
        reasons.append("改进/重构")
        score += 2.5
        kind = OpportunityKind.IMPROVEMENT
    elif any("bug" in l for l in labels) or re.search(r"\bbug\b", blob[:120]):
        reasons.append("Bug 修复")
        score += 2.0
        kind = OpportunityKind.BUGFIX
    else:
        opp_label_hits = _label_hit(issue.labels, config.opportunity_labels)
        kw_hits = _text_hit(blob, config.opportunity_keywords)
        if opp_label_hits or kw_hits:
            reasons.append(f"匹配机会标签/关键词: {', '.join((opp_label_hits + kw_hits)[:4])}")
            score += 1.5
            kind = OpportunityKind.OTHER
        else:
            return OpportunityKind.OTHER, [], 0.0

    # 活跃度加权
    score += min(issue.comments, 10) * 0.15
    score += min(issue.reactions, 20) * 0.1
    if "help wanted" in " ".join(labels):
        reasons.append("help wanted")
        score += 1.5

    return kind, reasons, score


def analyze_project(
    project: PaidProject,
    snapshot: RepoSnapshot | None,
    config: Config,
) -> ProjectProgress:
    progress = ProjectProgress(project=project, snapshot=snapshot)
    if not snapshot:
        progress.notes.append("无 GitHub 仓库快照（可能是官网/GitLab/奖金平台链接）")
        return progress
    if snapshot.error:
        progress.notes.append(f"抓取失败: {snapshot.error}")
        return progress

    if snapshot.pushed_at:
        progress.notes.append(f"最近推送: {snapshot.pushed_at}")
    if snapshot.recent_releases:
        latest = snapshot.recent_releases[0]
        progress.notes.append(
            f"最新发布: {latest.get('tag') or latest.get('name')} ({latest.get('published_at')})"
        )

    for issue in snapshot.recent_issues:
        kind, reasons, score = classify_issue(issue, config)
        if score <= 0:
            continue
        progress.opportunities.append(
            Opportunity(
                kind=kind,
                score=round(score, 2),
                project_name=project.name,
                payment=project.payment,
                issue=issue,
                reasons=reasons,
                repo=snapshot.full_name,
            )
        )

    progress.opportunities.sort(key=lambda o: o.score, reverse=True)
    return progress


def rank_all(progress_list: list[ProjectProgress]) -> list[Opportunity]:
    all_ops: list[Opportunity] = []
    for p in progress_list:
        all_ops.extend(p.opportunities)
    all_ops.sort(key=lambda o: o.score, reverse=True)
    return all_ops
