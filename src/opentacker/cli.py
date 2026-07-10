from __future__ import annotations

import argparse
import sys
from pathlib import Path

from rich.console import Console

from . import __version__
from .config import Config
from .tracker import run_once

# Windows 终端常为 GBK，强制可回退，避免打印 Issue 标题时崩溃
console = Console(legacy_windows=False, soft_wrap=True)
try:
    sys.stdout.reconfigure(errors="replace")  # type: ignore[attr-defined]
    sys.stderr.reconfigure(errors="replace")  # type: ignore[attr-defined]
except Exception:
    pass


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="opentacker",
        description="定期追踪付费开源项目进展、奖金与可贡献需求",
    )
    parser.add_argument(
        "--config",
        "-c",
        default=None,
        help="配置文件路径（默认 config.yaml）",
    )
    parser.add_argument("--version", action="version", version=f"opentacker {__version__}")

    sub = parser.add_subparsers(dest="command", required=True)

    run_p = sub.add_parser("run", help="立即执行一次全量追踪并生成报告")
    run_p.add_argument(
        "--all",
        action="store_true",
        help="忽略 skills 过滤，追踪列表中全部项目",
    )

    sub.add_parser("list", help="仅解析并打印付费项目列表（不抓 Issue）")

    sched = sub.add_parser("schedule", help="按 config 中的 cron 定期执行")
    sched.add_argument(
        "--all",
        action="store_true",
        help="忽略 skills 过滤",
    )

    sub.add_parser("show", help="在终端打印最新报告 reports/latest.md")
    return parser


def cmd_list(config: Config) -> int:
    from .github_client import GitHubClient
    from .list_parser import filter_by_skills, parse_paid_projects_readme
    from .tracker import load_source_readme

    with GitHubClient(token=config.github_token) as client:
        readme = load_source_readme(config, client)
    projects = parse_paid_projects_readme(readme)
    matched = filter_by_skills(projects, config.skills) if config.skills else projects

    console.print(f"共解析 {len(projects)} 个项目，技能匹配 {len(matched)} 个\n")
    for p in projects:
        mark = "✓" if p in matched else " "
        gh = p.github_full_name or "(无 GitHub)"
        console.print(f"[{mark}] {p.name}")
        console.print(f"    技术: {', '.join(p.tech)} | 报酬: {p.payment}")
        console.print(f"    仓库: {gh}")
        console.print(f"    入门: {p.getting_started}")
        console.print()
    return 0


def cmd_show(config: Config) -> int:
    path = config.reports_dir / "latest.md"
    if not path.exists():
        console.print("[red]还没有报告，请先运行:[/] opentacker run")
        return 1
    console.print(path.read_text(encoding="utf-8"))
    return 0


def cmd_schedule(config: Config, use_all: bool) -> int:
    from apscheduler.schedulers.blocking import BlockingScheduler
    from apscheduler.triggers.cron import CronTrigger

    console.print(
        f"[cyan]已启动调度[/] cron={config.cron!r} tz={config.timezone} "
        f"（Ctrl+C 退出）"
    )

    def job() -> None:
        console.rule("[bold]定时任务触发[/]")
        try:
            run_once(config, use_skills_filter=not use_all)
        except Exception as exc:  # noqa: BLE001 — 调度中需吞掉以免中断
            console.print(f"[red]本次运行失败:[/] {exc}")

    scheduler = BlockingScheduler(timezone=config.timezone)
    trigger = CronTrigger.from_crontab(config.cron, timezone=config.timezone)
    scheduler.add_job(job, trigger, id="opentacker_run")
    # 启动时先跑一次
    job()
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        console.print("\n调度已停止")
    return 0


def main(argv: list[str] | None = None) -> None:
    parser = _build_parser()
    args = parser.parse_args(argv)

    try:
        config = Config.load(args.config)
    except FileNotFoundError as exc:
        console.print(f"[red]{exc}[/]")
        console.print("请在项目根目录放置 config.yaml，或用 --config 指定路径。")
        sys.exit(1)

    if args.command == "run":
        run_once(config, use_skills_filter=not args.all)
        sys.exit(0)
    if args.command == "list":
        sys.exit(cmd_list(config))
    if args.command == "show":
        sys.exit(cmd_show(config))
    if args.command == "schedule":
        sys.exit(cmd_schedule(config, use_all=args.all))
    parser.error(f"未知命令: {args.command}")


if __name__ == "__main__":
    main()
