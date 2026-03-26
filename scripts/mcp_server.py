"""
Jarvis MCP Server — exposes all Jarvis actions as MCP tools.

Any LLM that supports MCP (Claude, OpenAI, etc.) can automatically
discover and call these tools.

Run:
    python mcp_server.py                 # stdio transport (for Claude Code)
    python mcp_server.py --http 8000     # HTTP transport (for OpenAI API)
"""
import json
import os
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path

from fastmcp import FastMCP

# ─── Initialize MCP Server ──────────────────────────────────────────
mcp = FastMCP(name="Jarvis Ear", instructions="Voice-activated AI assistant that executes actions.")

# ─── Data directories ────────────────────────────────────────────────
DATA_DIR = Path(__file__).parent.parent / "data"
NOTES_DIR = DATA_DIR / "notes"
CALENDAR_FILE = DATA_DIR / "calendar.json"


# ─── TOOL: GitHub ────────────────────────────────────────────────────
def _get_github_token() -> str | None:
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        return token
    try:
        result = subprocess.run(["gh", "auth", "token"], capture_output=True, text=True)
        if result.returncode == 0:
            return result.stdout.strip()
    except FileNotFoundError:
        pass
    return None


@mcp.tool
def create_github_issue(repo: str, title: str, body: str = "") -> str:
    """Create a GitHub issue in a repository.

    Args:
        repo: Repository in 'owner/repo' format (e.g., 'ichetanmittal/jarvis-ear')
        title: Issue title
        body: Issue body/description (markdown)
    """
    import requests

    token = _get_github_token()
    if not token:
        return "Error: No GitHub token found. Run 'gh auth login' first."

    if "/" not in repo:
        repo = f"ichetanmittal/{repo}"

    resp = requests.post(
        f"https://api.github.com/repos/{repo}/issues",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github.v3+json"},
        json={"title": title, "body": body},
    )

    if resp.status_code == 201:
        data = resp.json()
        return f"Issue #{data['number']} created: {data['html_url']}"
    else:
        return f"Error {resp.status_code}: {resp.text[:200]}"


@mcp.tool
def list_github_issues(repo: str, limit: int = 5) -> str:
    """List open issues in a GitHub repository.

    Args:
        repo: Repository in 'owner/repo' format
        limit: Max number of issues to return
    """
    import requests

    token = _get_github_token()
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github.v3+json"} if token else {}

    if "/" not in repo:
        repo = f"ichetanmittal/{repo}"

    resp = requests.get(
        f"https://api.github.com/repos/{repo}/issues",
        headers=headers,
        params={"state": "open", "per_page": limit},
    )

    if resp.status_code == 200:
        issues = [f"#{i['number']}: {i['title']}" for i in resp.json() if "pull_request" not in i]
        return "\n".join(issues) if issues else "No open issues."
    else:
        return f"Error {resp.status_code}"


# ─── TOOL: Notes ─────────────────────────────────────────────────────
@mcp.tool
def save_note(content: str) -> str:
    """Save a note for later recall.

    Args:
        content: The note text to save
    """
    NOTES_DIR.mkdir(parents=True, exist_ok=True)
    note_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    note = {"id": note_id, "content": content, "created_at": datetime.now().isoformat()}

    with open(NOTES_DIR / f"{note_id}.json", "w") as f:
        json.dump(note, f, indent=2)

    return f"Note saved: {content[:80]}"


@mcp.tool
def search_notes(query: str) -> str:
    """Search saved notes by keyword.

    Args:
        query: Search term to find in notes
    """
    NOTES_DIR.mkdir(parents=True, exist_ok=True)
    query_lower = query.lower()
    results = []

    for f in sorted(NOTES_DIR.glob("*.json"), reverse=True):
        note = json.loads(f.read_text())
        if query_lower in note.get("content", "").lower():
            results.append(f"[{note['id']}] {note['content']}")

    return "\n".join(results) if results else f"No notes found matching '{query}'."


@mcp.tool
def list_notes(limit: int = 10) -> str:
    """List recent notes.

    Args:
        limit: Max number of notes to return
    """
    NOTES_DIR.mkdir(parents=True, exist_ok=True)
    notes = []

    for f in sorted(NOTES_DIR.glob("*.json"), reverse=True)[:limit]:
        note = json.loads(f.read_text())
        notes.append(f"[{note['id']}] {note['content']}")

    return "\n".join(notes) if notes else "No notes saved yet."


# ─── TOOL: Calendar ──────────────────────────────────────────────────
def _load_calendar() -> list:
    if CALENDAR_FILE.exists():
        return json.loads(CALENDAR_FILE.read_text())
    return []


def _save_calendar(events: list):
    CALENDAR_FILE.parent.mkdir(parents=True, exist_ok=True)
    CALENDAR_FILE.write_text(json.dumps(events, indent=2))


@mcp.tool
def create_event(title: str, date: str = "today", time: str = "09:00", duration_minutes: int = 30) -> str:
    """Create a calendar event.

    Args:
        title: Event title
        date: Date - 'today', 'tomorrow', or YYYY-MM-DD format
        time: Time - '3pm', '15:00', etc.
        duration_minutes: Event duration in minutes
    """
    if date == "today":
        event_date = datetime.now().strftime("%Y-%m-%d")
    elif date == "tomorrow":
        event_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    else:
        event_date = date

    if "pm" in time.lower():
        hour = int(time.lower().replace("pm", "").replace(":", "").strip())
        if hour < 12:
            hour += 12
        event_time = f"{hour:02d}:00"
    elif "am" in time.lower():
        hour = int(time.lower().replace("am", "").replace(":", "").strip())
        event_time = f"{hour:02d}:00"
    else:
        event_time = time

    event = {
        "title": title,
        "date": event_date,
        "time": event_time,
        "duration_minutes": duration_minutes,
        "created_at": datetime.now().isoformat(),
    }

    events = _load_calendar()
    events.append(event)
    _save_calendar(events)

    return f"Event created: {title} on {event_date} at {event_time} ({duration_minutes}min)"


@mcp.tool
def list_events(days_ahead: int = 7) -> str:
    """List upcoming calendar events.

    Args:
        days_ahead: How many days ahead to look
    """
    events = _load_calendar()
    today = datetime.now().strftime("%Y-%m-%d")
    cutoff = (datetime.now() + timedelta(days=days_ahead)).strftime("%Y-%m-%d")

    upcoming = [e for e in events if today <= e.get("date", "") <= cutoff]
    upcoming.sort(key=lambda e: (e.get("date", ""), e.get("time", "")))

    if upcoming:
        lines = [f"- {e['title']} | {e['date']} {e['time']} ({e['duration_minutes']}min)" for e in upcoming]
        return "\n".join(lines)
    return "No upcoming events."


# ─── TOOL: Slack ─────────────────────────────────────────────────────
@mcp.tool
def send_slack_message(channel: str, message: str) -> str:
    """Send a message to a Slack channel.

    Args:
        channel: Channel name (without #) e.g., 'general'
        message: Message text to send
    """
    import requests

    token = os.environ.get("SLACK_BOT_TOKEN")
    if not token:
        return f"[DRY RUN] Would send to #{channel}: {message}"

    resp = requests.post(
        "https://slack.com/api/chat.postMessage",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={"channel": channel, "text": message},
    )
    data = resp.json()

    if data.get("ok"):
        return f"Sent to #{channel}: {message}"
    else:
        return f"Slack error: {data.get('error')}"


# ─── TOOL: General Knowledge ─────────────────────────────────────────
@mcp.tool
def answer_question(question: str) -> str:
    """Answer a general knowledge question. Use this when the user asks something factual.

    Args:
        question: The question to answer
    """
    # This tool is a placeholder — the LLM itself answers the question
    # The tool exists so MCP clients know this capability exists
    return f"Please answer this question directly: {question}"


# ─── Run Server ──────────────────────────────────────────────────────
if __name__ == "__main__":
    if "--http" in sys.argv:
        port = int(sys.argv[sys.argv.index("--http") + 1]) if sys.argv.index("--http") + 1 < len(sys.argv) else 8000
        print(f"Starting Jarvis MCP Server on http://localhost:{port}/mcp/")
        mcp.run(transport="http", port=port)
    else:
        print("Starting Jarvis MCP Server (stdio transport)", file=sys.stderr)
        mcp.run(transport="stdio")
