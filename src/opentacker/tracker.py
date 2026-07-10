from __future__ import annotations

import json
from pathlib import Path

import sys

from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn

from .analyzer import analyze_project, rank_all
from .config import Config
from .github_client import GitHubClient
from .list_parser import filter_by_skills, parse_paid_projects_readme
from .reporter import diff_new_opportunities, progress_to_dict, save_reports

console = Console(legacy_windows=False, soft_wrap=True)
try:
    sys.stdout.reconfigure(errors="replace")  # type: ignore[attr-defined]
    sys.stderr.reconfigure(errors="replace")  # type: ignore[attr-defined]
except Exception:
    pass


def load_source_readme(config: Config, client: GitHubClient) -> str:
    if config.local_readme:
        path = Path(config.local_readme)
        if not path.is_absolute():
            path = Path.cwd() / path
        return path.read_text(encoding="utf-8")
    return client.fetch_readme_text(config.readme_url)


def run_once(config: Config, *, use_skills_filter: bool = True) -> Path:
    config.reports_dir.mkdir(parents=True, exist_ok=True)
    config.history_dir.mkdir(parents=True, exist_ok=True)
    config.cache_dir.mkdir(parents=True, exist_ok=True)

    prev_path = config.history_dir / "latest.json"
    previous = None
    if prev_path.exists():
        previous = json.loads(prev_path.read_text(encoding="utf-8"))

    with GitHubClient(token=config.github_token) as client:
        console.print("[bold cyan]正在拉取付费开源项目列表...[/]")
        readme = load_source_readme(config, client)
        (config.cache_dir / "source_readme.md").write_text(readme, encoding="utf-8")

        all_projects = parse_paid_projects_readme(readme)
        projects = (
            filter_by_skills(all_projects, config.skills)
            if use_skills_filter
            else all_projects
        )
        console.print(
            f"列表共 [bold]{len(all_projects)}[/] 个项目，"
            f"本次追踪 [bold]{len(projects)}[/] 个"
            + ("（已按 skills 过滤）" if use_skills_filter and config.skills else "")
        )

        progress_list = []
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("抓取仓库进展...", total=len(projects))
            for project in projects:
                progress.update(task, description=f"抓取 {project.name}...")
                snapshot = None
                if project.github_owner and project.github_repo:
                    snapshot = client.snapshot_repo(
                        project.github_owner,
                        project.github_repo,
                        max_issues=config.max_issues_per_repo,
                    )
                progress_list.append(analyze_project(project, snapshot, config))
                progress.advance(task)

    current = progress_to_dict(progress_list)
    new_ops = diff_new_opportunities(previous, current)
    ranked = rank_all(progress_list)

    rate_limited = any(
        p.snapshot and p.snapshot.error and "速率受限" in (p.snapshot.error or "")
        for p in progress_list
    )
    if rate_limited and not ranked and previous:
        console.print(
            "[yellow]本次因 GitHub API 限额几乎无数据，已保留上次有效报告，未覆盖。[/]"
        )
        console.print(
            "请在 .env 设置 GITHUB_TOKEN 后重试：https://github.com/settings/tokens"
        )
        return config.reports_dir / "latest.md"

    md_path, json_path = save_reports(
        all_projects,
        progress_list,
        reports_dir=config.reports_dir,
        history_dir=config.history_dir,
        skills=config.skills if use_skills_filter else None,
    )

    console.print()
    console.print(f"[green]报告已生成:[/] {md_path}")
    console.print(f"[green]快照已保存:[/] {json_path}")
    console.print(f"匹配机会总数: [bold]{len(ranked)}[/]")
    if previous is not None:
        console.print(f"相对上次新增机会: [bold yellow]{len(new_ops)}[/]")
        for item in new_ops[:8]:
            title = str(item.get("title") or "").encode("ascii", "replace").decode("ascii")
            console.print(
                f"  - [{item.get('kind_zh')}] {item.get('project')}: "
                f"{title} ({item.get('url')})"
            )
    if ranked:
        console.print("\n[bold]Top 5 机会:[/]")
        for o in ranked[:5]:
            title = o.issue.title.encode("ascii", "replace").decode("ascii")
            console.print(
                f"  {o.score:>5}  {o.kind_label:8}  {o.project_name} - {title}"
            )
            console.print(f"         {o.issue.url}")

    if not config.github_token:
        console.print(
            "\n[yellow]提示:[/] 未设置 GITHUB_TOKEN，API 限额较低（约 60 次/小时）。"
            " 复制 .env.example 为 .env 并填入 token 更稳妥。"
        )
    return md_path
