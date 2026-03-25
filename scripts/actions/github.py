"""
GitHub action handler.

Supports:
  - Create an issue
  - Create a pull request
  - List open issues
  - List open PRs
  - Search repositories

Uses GITHUB_TOKEN env var, or auto-detects from `gh` CLI auth.
Token needs scopes: repo, read:org
"""
import os
import subprocess
import requests

GITHUB_API = "https://api.github.com"

_cached_token = None


def get_token() -> str | None:
    """Get GitHub token from env var or gh CLI."""
    global _cached_token
    if _cached_token:
        return _cached_token

    # Try env var first
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        _cached_token = token
        return token

    # Fall back to gh CLI
    try:
        result = subprocess.run(["gh", "auth", "token"], capture_output=True, text=True)
        if result.returncode == 0 and result.stdout.strip():
            _cached_token = result.stdout.strip()
            return _cached_token
    except FileNotFoundError:
        pass

    return None


def _headers():
    return {
        "Authorization": f"Bearer {get_token()}",
        "Accept": "application/vnd.github.v3+json",
    }


def _default_owner() -> str:
    """Default GitHub owner/org — uses the authenticated user."""
    return os.environ.get("GITHUB_OWNER", "ichetanmittal")


def create_issue(repo: str, title: str, body: str = "", labels: list = None) -> dict:
    """
    Create a GitHub issue.

    Args:
        repo: "owner/repo" or just "repo" (uses default owner)
        title: Issue title
        body: Issue body (markdown)
        labels: Optional list of label names
    """
    token = get_token()
    if not token:
        return {
            "success": True,
            "detail": f"[DRY RUN] Would create issue in {repo}: {title}",
            "dry_run": True,
        }

    if "/" not in repo:
        repo = f"{_default_owner()}/{repo}"

    payload = {"title": title, "body": body}
    if labels:
        payload["labels"] = labels

    resp = requests.post(f"{GITHUB_API}/repos/{repo}/issues", headers=_headers(), json=payload)

    if resp.status_code == 201:
        data = resp.json()
        return {
            "success": True,
            "detail": f"Created issue #{data['number']}: {data['html_url']}",
            "url": data["html_url"],
            "number": data["number"],
        }
    else:
        return {"success": False, "detail": f"GitHub error {resp.status_code}: {resp.text[:200]}"}


def list_issues(repo: str, state: str = "open", limit: int = 5) -> dict:
    """List issues in a repository."""
    token = get_token()
    if not token:
        return {"success": True, "detail": f"[DRY RUN] Would list issues in {repo}", "dry_run": True}

    if "/" not in repo:
        repo = f"{_default_owner()}/{repo}"

    resp = requests.get(
        f"{GITHUB_API}/repos/{repo}/issues",
        headers=_headers(),
        params={"state": state, "per_page": limit, "sort": "updated"},
    )

    if resp.status_code == 200:
        issues = [
            {"number": i["number"], "title": i["title"], "state": i["state"], "url": i["html_url"]}
            for i in resp.json()
            if "pull_request" not in i  # exclude PRs
        ]
        return {"success": True, "issues": issues}
    else:
        return {"success": False, "detail": f"GitHub error {resp.status_code}"}


def list_prs(repo: str, state: str = "open", limit: int = 5) -> dict:
    """List pull requests in a repository."""
    token = get_token()
    if not token:
        return {"success": True, "detail": f"[DRY RUN] Would list PRs in {repo}", "dry_run": True}

    if "/" not in repo:
        repo = f"{_default_owner()}/{repo}"

    resp = requests.get(
        f"{GITHUB_API}/repos/{repo}/pulls",
        headers=_headers(),
        params={"state": state, "per_page": limit, "sort": "updated"},
    )

    if resp.status_code == 200:
        prs = [
            {"number": p["number"], "title": p["title"], "state": p["state"], "url": p["html_url"]}
            for p in resp.json()
        ]
        return {"success": True, "pull_requests": prs}
    else:
        return {"success": False, "detail": f"GitHub error {resp.status_code}"}


def search_repos(query: str, limit: int = 5) -> dict:
    """Search GitHub repositories."""
    resp = requests.get(
        f"{GITHUB_API}/search/repositories",
        headers=_headers() if get_token() else {},
        params={"q": query, "per_page": limit, "sort": "stars"},
    )

    if resp.status_code == 200:
        repos = [
            {"name": r["full_name"], "description": r["description"], "stars": r["stargazers_count"], "url": r["html_url"]}
            for r in resp.json()["items"]
        ]
        return {"success": True, "repositories": repos}
    else:
        return {"success": False, "detail": f"GitHub error {resp.status_code}"}


def execute(params: dict) -> dict:
    """Entry point called by the action router."""
    action = params.get("action", "create_issue")

    if action == "create_issue":
        return create_issue(
            repo=params.get("repo", ""),
            title=params.get("title", ""),
            body=params.get("body", ""),
            labels=params.get("labels"),
        )
    elif action == "list_issues":
        return list_issues(repo=params.get("repo", ""), limit=params.get("limit", 5))
    elif action == "list_prs":
        return list_prs(repo=params.get("repo", ""), limit=params.get("limit", 5))
    elif action == "search_repos":
        return search_repos(query=params.get("query", ""), limit=params.get("limit", 5))
    else:
        return {"success": False, "detail": f"Unknown GitHub action: {action}"}
