from pathlib import Path

from opentacker.analyzer import OpportunityKind, classify_issue
from opentacker.config import Config
from opentacker.github_client import IssueItem
from opentacker.list_parser import filter_by_skills, parse_paid_projects_readme

ROOT = Path(__file__).resolve().parents[1]

SAMPLE = """
# list

| Name | Description | Link | Tech Used | Details | Payment | Getting Started |
| ---- | ----------- | ---- | --------- | -------- | ------- | -------------- |
| RudderStack | open source CDP | https://github.com/rudderlabs/rudder-server| GO, TypeScript | Misc issues | $2,000 USD | https://dev.to/example |
| Appflowy | Productivity | https://www.appflowy.io/ | Flutter & Rust | Features | $500/mo | https://github.com/AppFlowy-IO/AppFlowy |
| BountyBoard | Multiple | https://bountyboard.dev/ | Multiple | Bounties | $10-$5000 | https://bountyboard.dev/#faq |
"""


def test_parse_paid_projects():
    projects = parse_paid_projects_readme(SAMPLE)
    assert len(projects) == 3
    assert projects[0].name == "RudderStack"
    assert projects[0].github_full_name == "rudderlabs/rudder-server"
    assert "TypeScript" in projects[0].tech
    assert projects[1].github_full_name == "AppFlowy-IO/AppFlowy"
    assert projects[2].github_full_name is None


def test_filter_by_skills():
    projects = parse_paid_projects_readme(SAMPLE)
    matched = filter_by_skills(projects, ["typescript", "go"])
    names = {p.name for p in matched}
    assert "RudderStack" in names
    assert "Appflowy" not in names


def test_classify_bounty_issue():
    cfg = Config.load(ROOT / "config.yaml")
    issue = IssueItem(
        number=1,
        title="Add MQTT support [bounty]",
        url="https://github.com/example/repo/issues/1",
        state="open",
        labels=["bounty", "enhancement"],
        created_at="2026-01-01T00:00:00Z",
        updated_at="2026-01-02T00:00:00Z",
        comments=3,
        body="Paid bounty available via Algora",
    )
    kind, reasons, score = classify_issue(issue, cfg)
    assert kind == OpportunityKind.BOUNTY
    assert score > 5
    assert reasons


def test_classify_dollar_title_as_bounty():
    cfg = Config.load(ROOT / "config.yaml")
    issue = IssueItem(
        number=2,
        title="[$250] Android - Distance - Manual map shows wrong location",
        url="https://github.com/Expensify/App/issues/95774",
        state="open",
        labels=["Help Wanted"],
        created_at="2026-01-01T00:00:00Z",
        updated_at="2026-01-02T00:00:00Z",
        comments=1,
        body="Please fix the map.",
    )
    kind, _, score = classify_issue(issue, cfg)
    assert kind == OpportunityKind.BOUNTY
    assert score > 5
