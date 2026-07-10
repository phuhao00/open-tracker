from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

from .analyzer import KIND_ZH, Opportunity, OpportunityKind, ProjectProgress, rank_all
from .github_client import utc_now_iso
from .list_parser import PaidProject


def _ensure_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def progress_to_dict(items: list[ProjectProgress]) -> dict[str, Any]:
    return {
        "generated_at": utc_now_iso(),
        "project_count": len(items),
        "projects": [
            {
                "name": p.project.name,
                "description": p.project.description,
                "link": p.project.link,
                "tech": p.project.tech,
                "payment": p.project.payment,
                "getting_started": p.project.getting_started,
                "github": p.project.github_full_name,
                "notes": p.notes,
                "snapshot": None
                if not p.snapshot
                else {
                    "full_name": p.snapshot.full_name,
                    "stars": p.snapshot.stars,
                    "open_issues": p.snapshot.open_issues,
                    "language": p.snapshot.language,
                    "pushed_at": p.snapshot.pushed_at,
                    "topics": p.snapshot.topics,
                    "error": p.snapshot.error,
                    "releases": p.snapshot.recent_releases,
                },
                "opportunities": [
                    {
                        "kind": o.kind.value,
                        "kind_zh": o.kind_label,
                        "score": o.score,
                        "title": o.issue.title,
                        "url": o.issue.url,
                        "labels": o.issue.labels,
                        "updated_at": o.issue.updated_at,
                        "comments": o.issue.comments,
                        "reasons": o.reasons,
                        "payment": o.payment,
                        "repo": o.repo,
                    }
                    for o in p.opportunities
                ],
            }
            for p in items
        ],
    }


def render_markdown(
    projects: list[PaidProject],
    progress_list: list[ProjectProgress],
    *,
    skills: list[str] | None = None,
) -> str:
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    ranked = rank_all(progress_list)
    bounty = [o for o in ranked if o.kind == OpportunityKind.BOUNTY]
    features = [o for o in ranked if o.kind == OpportunityKind.FEATURE]
    improvements = [o for o in ranked if o.kind == OpportunityKind.IMPROVEMENT]
    optimizations = [o for o in ranked if o.kind == OpportunityKind.OPTIMIZATION]

    lines: list[str] = [
        "# 付费开源项目追踪报告",
        "",
        f"> 生成时间：{now}",
        f"> 来源：[paid-open-source-projects](https://github.com/kunovsky/paid-open-source-projects)",
        f"> 追踪项目数：{len(progress_list)} / 列表总数：{len(projects)}",
    ]
    if skills:
        lines.append(f"> 技能过滤：{', '.join(skills)}")
    lines += ["", "## 今日优先机会（按得分）", ""]

    if not ranked:
        lines.append("_暂未匹配到带奖金/功能/优化标签的开放 Issue，可放宽 config.yaml 中的关键词。_")
    else:
        lines += [
            "| 得分 | 类型 | 项目 | 报酬 | Issue | 原因 |",
            "| ---- | ---- | ---- | ---- | ----- | ---- |",
        ]
        for o in ranked[:30]:
            title = o.issue.title.replace("|", "\\|")
            reasons = "; ".join(o.reasons).replace("|", "\\|")
            lines.append(
                f"| {o.score} | {o.kind_label} | {o.project_name} | {o.payment} | "
                f"[{title}]({o.issue.url}) | {reasons} |"
            )

    def section(title: str, items: list[Opportunity]) -> None:
        lines.extend(["", f"## {title}", ""])
        if not items:
            lines.append("_无_")
            return
        for o in items[:15]:
            lines.append(
                f"- **[{o.project_name}]** ({o.payment}) "
                f"[{o.issue.title}]({o.issue.url}) — {'; '.join(o.reasons)} "
                f"`score={o.score}`"
            )

    section("明确奖金 / 悬赏", bounty)
    section("新功能需求", features)
    section("改进需求", improvements)
    section("优化 / 性能", optimizations)

    lines.extend(["", "## 各项目进展摘要", ""])
    for p in progress_list:
        gh = p.project.github_full_name or "非 GitHub / 未解析"
        lines.append(f"### {p.project.name}")
        lines.append("")
        lines.append(f"- 描述：{p.project.description}")
        lines.append(f"- 技术栈：{', '.join(p.project.tech) or '未知'}")
        lines.append(f"- 报酬：{p.project.payment}")
        lines.append(f"- 详情：{p.project.details}")
        lines.append(f"- 入门：{p.project.getting_started}")
        lines.append(f"- GitHub：{gh}")
        if p.snapshot and not p.snapshot.error:
            lines.append(
                f"- 仓库：⭐ {p.snapshot.stars} · open issues {p.snapshot.open_issues} · "
                f"语言 {p.snapshot.language or '-'} · 最近推送 {p.snapshot.pushed_at or '-'}"
            )
            if p.snapshot.recent_releases:
                rel = p.snapshot.recent_releases[0]
                lines.append(
                    f"- 最新 Release：[{rel.get('tag') or rel.get('name')}]({rel.get('url')}) "
                    f"({rel.get('published_at')})"
                )
        for note in p.notes:
            lines.append(f"- 备注：{note}")
        top = p.opportunities[:5]
        if top:
            lines.append("- 高分机会：")
            for o in top:
                lines.append(
                    f"  - [{KIND_ZH[o.kind]}] [{o.issue.title}]({o.issue.url}) "
                    f"(score={o.score})"
                )
        lines.append("")

    lines.extend(
        [
            "## 如何用这份报告赚钱",
            "",
            "1. 优先看「明确奖金 / 悬赏」和得分最高的 Issue。",
            "2. 打开项目的 Getting Started / CONTRIBUTING，确认领取 bounty 的流程。",
            "3. 新手可从 good first issue / 小额 bounty 入手建立信誉。",
            "4. 定期跑 `opentacker run`，对比 `data/history` 里的历史 JSON，发现新增需求。",
            "",
        ]
    )
    return "\n".join(lines)


def save_reports(
    projects: list[PaidProject],
    progress_list: list[ProjectProgress],
    *,
    reports_dir: Path,
    history_dir: Path,
    skills: list[str] | None = None,
) -> tuple[Path, Path]:
    _ensure_dir(reports_dir)
    _ensure_dir(history_dir)

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    md_path = reports_dir / f"report_{stamp}.md"
    latest_md = reports_dir / "latest.md"
    json_path = history_dir / f"snapshot_{stamp}.json"
    latest_json = history_dir / "latest.json"

    payload = progress_to_dict(progress_list)
    md = render_markdown(projects, progress_list, skills=skills)

    md_path.write_text(md, encoding="utf-8")
    latest_md.write_text(md, encoding="utf-8")
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    latest_json.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return latest_md, latest_json


def diff_new_opportunities(
    previous: dict[str, Any] | None,
    current: dict[str, Any],
) -> list[dict[str, Any]]:
    """对比两次快照，找出新增的机会 Issue。"""
    if not previous:
        return []
    prev_urls: set[str] = set()
    for proj in previous.get("projects", []):
        for opp in proj.get("opportunities", []):
            if opp.get("url"):
                prev_urls.add(opp["url"])

    new_items: list[dict[str, Any]] = []
    for proj in current.get("projects", []):
        for opp in proj.get("opportunities", []):
            url = opp.get("url")
            if url and url not in prev_urls:
                new_items.append({**opp, "project": proj.get("name")})
    new_items.sort(key=lambda x: x.get("score", 0), reverse=True)
    return new_items
