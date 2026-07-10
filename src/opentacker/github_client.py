from __future__ import annotations

import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

import httpx


@dataclass
class IssueItem:
    number: int
    title: str
    url: str
    state: str
    labels: list[str]
    created_at: str
    updated_at: str
    comments: int
    body: str = ""
    author: str = ""
    reactions: int = 0


@dataclass
class RepoSnapshot:
    full_name: str
    description: str | None
    stars: int
    open_issues: int
    language: str | None
    pushed_at: str | None
    topics: list[str] = field(default_factory=list)
    recent_issues: list[IssueItem] = field(default_factory=list)
    recent_releases: list[dict[str, Any]] = field(default_factory=list)
    error: str | None = None


class GitHubClient:
    def __init__(self, token: str | None = None, timeout: float = 30.0):
        headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "opentacker/0.1",
        }
        if token:
            headers["Authorization"] = f"Bearer {token}"
        self._client = httpx.Client(
            base_url="https://api.github.com",
            headers=headers,
            timeout=timeout,
            follow_redirects=True,
        )

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> "GitHubClient":
        return self

    def __exit__(self, *args: object) -> None:
        self.close()

    def _get(self, path: str, params: dict[str, Any] | None = None) -> Any:
        for attempt in range(3):
            resp = self._client.get(path, params=params)
            remaining = resp.headers.get("X-RateLimit-Remaining")
            if remaining == "0" or (
                resp.status_code == 403 and "rate limit" in resp.text.lower()
            ):
                reset = resp.headers.get("X-RateLimit-Reset")
                wait = max(1, int(reset) - int(time.time()) + 1) if reset else 60
                # 无 token 时限额极低：短暂重试一次后快速失败，避免卡死
                if attempt == 0 and wait <= 20:
                    time.sleep(wait)
                    continue
                raise httpx.HTTPStatusError(
                    f"GitHub API 速率受限（剩余等待约 {wait}s）。"
                    f"请在 .env 设置 GITHUB_TOKEN 后重试。",
                    request=resp.request,
                    response=resp,
                )
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            return resp.json()
        resp.raise_for_status()
        return resp.json()

    def fetch_readme_text(self, url: str) -> str:
        resp = self._client.get(url)
        resp.raise_for_status()
        return resp.text

    def get_repo(self, owner: str, repo: str) -> dict[str, Any] | None:
        return self._get(f"/repos/{owner}/{repo}")

    def list_issues(
        self,
        owner: str,
        repo: str,
        *,
        state: str = "open",
        per_page: int = 40,
        labels: str | None = None,
    ) -> list[dict[str, Any]]:
        params: dict[str, Any] = {
            "state": state,
            "per_page": min(per_page, 100),
            "sort": "updated",
            "direction": "desc",
        }
        if labels:
            params["labels"] = labels
        data = self._get(f"/repos/{owner}/{repo}/issues", params=params)
        if not data:
            return []
        # 过滤掉 PR（GitHub issues API 会混入 PR）
        return [i for i in data if "pull_request" not in i]

    def list_releases(self, owner: str, repo: str, per_page: int = 5) -> list[dict[str, Any]]:
        data = self._get(
            f"/repos/{owner}/{repo}/releases",
            params={"per_page": per_page},
        )
        return data or []

    def snapshot_repo(
        self,
        owner: str,
        repo: str,
        *,
        max_issues: int = 40,
    ) -> RepoSnapshot:
        full = f"{owner}/{repo}"
        try:
            meta = self.get_repo(owner, repo)
            if not meta:
                return RepoSnapshot(
                    full_name=full,
                    description=None,
                    stars=0,
                    open_issues=0,
                    language=None,
                    pushed_at=None,
                    error="仓库不存在或不可访问",
                )

            raw_issues = self.list_issues(owner, repo, per_page=max_issues)
            issues = [
                IssueItem(
                    number=i["number"],
                    title=i.get("title") or "",
                    url=i.get("html_url") or "",
                    state=i.get("state") or "open",
                    labels=[lbl.get("name", "") for lbl in i.get("labels", [])],
                    created_at=i.get("created_at") or "",
                    updated_at=i.get("updated_at") or "",
                    comments=int(i.get("comments") or 0),
                    body=(i.get("body") or "")[:2000],
                    author=(i.get("user") or {}).get("login") or "",
                    reactions=int((i.get("reactions") or {}).get("total_count") or 0),
                )
                for i in raw_issues
            ]

            releases = self.list_releases(owner, repo)
            return RepoSnapshot(
                full_name=full,
                description=meta.get("description"),
                stars=int(meta.get("stargazers_count") or 0),
                open_issues=int(meta.get("open_issues_count") or 0),
                language=meta.get("language"),
                pushed_at=meta.get("pushed_at"),
                topics=list(meta.get("topics") or []),
                recent_issues=issues,
                recent_releases=[
                    {
                        "tag": r.get("tag_name"),
                        "name": r.get("name"),
                        "url": r.get("html_url"),
                        "published_at": r.get("published_at"),
                        "prerelease": r.get("prerelease", False),
                    }
                    for r in releases
                ],
            )
        except httpx.HTTPError as exc:
            return RepoSnapshot(
                full_name=full,
                description=None,
                stars=0,
                open_issues=0,
                language=None,
                pushed_at=None,
                error=str(exc),
            )


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
