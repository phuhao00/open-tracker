from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml
from dotenv import load_dotenv
import os


@dataclass
class Config:
    readme_url: str
    local_readme: str | None
    skills: list[str]
    max_issues_per_repo: int
    bounty_labels: list[str]
    opportunity_labels: list[str]
    opportunity_keywords: list[str]
    cron: str
    timezone: str
    reports_dir: Path
    history_dir: Path
    cache_dir: Path
    language: str
    github_token: str | None = None
    raw: dict[str, Any] = field(default_factory=dict, repr=False)

    @classmethod
    def load(cls, path: str | Path | None = None) -> "Config":
        load_dotenv()
        config_path = Path(
            path
            or os.getenv("OPENTACKER_CONFIG")
            or "config.yaml"
        )
        if not config_path.exists():
            raise FileNotFoundError(f"配置文件不存在: {config_path}")

        with config_path.open(encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}

        source = data.get("source", {})
        github = data.get("github", {})
        schedule = data.get("schedule", {})
        output = data.get("output", {})

        root = config_path.resolve().parent
        reports_dir = root / output.get("reports_dir", "reports")
        history_dir = root / output.get("history_dir", "data/history")
        cache_dir = root / output.get("cache_dir", "data/cache")

        return cls(
            readme_url=source.get(
                "readme_url",
                "https://raw.githubusercontent.com/kunovsky/paid-open-source-projects/main/README.md",
            ),
            local_readme=source.get("local_readme"),
            skills=[s.lower() for s in data.get("skills", [])],
            max_issues_per_repo=int(github.get("max_issues_per_repo", 40)),
            bounty_labels=[x.lower() for x in github.get("bounty_labels", [])],
            opportunity_labels=[x.lower() for x in github.get("opportunity_labels", [])],
            opportunity_keywords=[x.lower() for x in github.get("opportunity_keywords", [])],
            cron=schedule.get("cron", "0 9 * * *"),
            timezone=schedule.get("timezone", "Asia/Shanghai"),
            reports_dir=reports_dir,
            history_dir=history_dir,
            cache_dir=cache_dir,
            language=output.get("language", "zh"),
            github_token=os.getenv("GITHUB_TOKEN") or None,
            raw=data,
        )
