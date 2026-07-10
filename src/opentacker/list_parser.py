from __future__ import annotations

import re
from dataclasses import dataclass, field


@dataclass
class PaidProject:
    name: str
    description: str
    link: str
    tech: list[str]
    details: str
    payment: str
    getting_started: str
    github_owner: str | None = None
    github_repo: str | None = None
    extra_urls: list[str] = field(default_factory=list)

    @property
    def github_full_name(self) -> str | None:
        if self.github_owner and self.github_repo:
            return f"{self.github_owner}/{self.github_repo}"
        return None

    @property
    def is_github(self) -> bool:
        return bool(self.github_full_name)


_GITHUB_RE = re.compile(
    r"https?://(?:www\.)?github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)",
    re.IGNORECASE,
)
_ROW_RE = re.compile(
    r"^\|\s*(?P<name>[^|]+?)\s*\|\s*(?P<desc>[^|]+?)\s*\|\s*(?P<link>[^|]+?)\s*\|\s*"
    r"(?P<tech>[^|]+?)\s*\|\s*(?P<details>[^|]+?)\s*\|\s*(?P<payment>[^|]+?)\s*\|\s*"
    r"(?P<start>[^|]+?)\s*\|$",
    re.MULTILINE,
)


def _split_tech(raw: str) -> list[str]:
    parts = re.split(r"[,/&]| and ", raw)
    return [p.strip() for p in parts if p.strip()]


def _extract_github(text: str) -> tuple[str | None, str | None]:
    match = _GITHUB_RE.search(text)
    if not match:
        return None, None
    owner, repo = match.group(1), match.group(2)
    repo = repo.removesuffix(".git")
    if owner.lower() in {"issues", "pulls", "actions"}:
        return None, None
    return owner, repo


def parse_paid_projects_readme(markdown: str) -> list[PaidProject]:
    """解析 kunovsky/paid-open-source-projects README 表格。"""
    projects: list[PaidProject] = []
    for match in _ROW_RE.finditer(markdown):
        name = match.group("name").strip()
        if name.lower() in {"name", "----"} or set(name) <= {"-", " "}:
            continue

        link = match.group("link").strip()
        start = match.group("start").strip()
        owner, repo = _extract_github(f"{link} {start}")
        # 部分项目主站不是 GitHub，尝试从 Getting Started 再挖一次
        if not owner:
            owner, repo = _extract_github(start)

        projects.append(
            PaidProject(
                name=name,
                description=match.group("desc").strip(),
                link=link,
                tech=_split_tech(match.group("tech")),
                details=match.group("details").strip(),
                payment=match.group("payment").strip(),
                getting_started=start,
                github_owner=owner,
                github_repo=repo,
            )
        )
    return projects


def filter_by_skills(projects: list[PaidProject], skills: list[str]) -> list[PaidProject]:
    if not skills:
        return projects
    skill_set = {s.lower() for s in skills}
    matched: list[PaidProject] = []
    for p in projects:
        tech_lower = " ".join(t.lower() for t in p.tech)
        if any(s in tech_lower or s in p.description.lower() for s in skill_set):
            matched.append(p)
    return matched
