#!/usr/bin/env python3
"""Fetch a Jira issue (Server/Data Center REST API v2, personal access token) and print it as Markdown.

Usage:
  python3 jira_fetch.py PROJ-12345                 # summary, description, comments, attachments
  python3 jira_fetch.py PROJ-12345 --attachments DIR   # also download attachments into DIR

Credentials are looked up in this order (the token is never printed):
  1. JIRA_URL / JIRA_PERSONAL_TOKEN environment variables
  2. the "jira" MCP server in ~/.claude.json (user scope or any project scope)
  3. the "jira" MCP server in Claude Desktop's claude_desktop_config.json

Optional: JIRA_CUSTOMER_FIELD=customfield_NNNNN prints a multi-select "customer" custom field.
"""
import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path


def find_credentials():
    url, token = os.environ.get("JIRA_URL"), os.environ.get("JIRA_PERSONAL_TOKEN")
    if url and token:
        return url, token, "environment"
    candidates = []
    claude_json = Path.home() / ".claude.json"
    if claude_json.exists():
        try:
            data = json.loads(claude_json.read_text())
            candidates.append(("~/.claude.json (user)", data.get("mcpServers", {})))
            for proj, cfg in (data.get("projects") or {}).items():
                candidates.append((f"~/.claude.json ({proj})", (cfg or {}).get("mcpServers", {})))
        except Exception:
            pass
    desktop = Path.home() / "Library/Application Support/Claude/claude_desktop_config.json"
    if desktop.exists():
        try:
            candidates.append(("Claude Desktop config", json.loads(desktop.read_text()).get("mcpServers", {})))
        except Exception:
            pass
    for source, servers in candidates:
        for name, server in (servers or {}).items():
            env = (server or {}).get("env", {})
            if env.get("JIRA_URL") and env.get("JIRA_PERSONAL_TOKEN"):
                return env["JIRA_URL"].rstrip("/"), env["JIRA_PERSONAL_TOKEN"], f"{source} -> {name}"
    return None, None, None


def get(url, token, accept="application/json"):
    req = urllib.request.Request(url, headers={"Authorization": "Bearer " + token, "Accept": accept})
    return urllib.request.urlopen(req, timeout=60)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    key = sys.argv[1].strip().upper()
    attach_dir = None
    if "--attachments" in sys.argv:
        attach_dir = Path(sys.argv[sys.argv.index("--attachments") + 1])

    base, token, source = find_credentials()
    if not base:
        print("BLOCKER: no Jira credentials found. Configure the 'jira' MCP server "
              "(mcp-atlassian with JIRA_URL and JIRA_PERSONAL_TOKEN) or set those environment variables.")
        sys.exit(1)

    fields = "summary,description,status,issuetype,priority,comment,attachment,versions,fixVersions,issuelinks,components,labels,environment,reporter,assignee,created,updated"
    customer_field = os.environ.get("JIRA_CUSTOMER_FIELD")
    if customer_field:
        fields += "," + customer_field
    try:
        issue = json.load(get(f"{base}/rest/api/2/issue/{key}?fields={fields}", token))
    except urllib.error.HTTPError as e:
        print(f"BLOCKER: Jira returned HTTP {e.code} for {key} ({base}). Check the key and the token's access.")
        sys.exit(1)

    f = issue["fields"]
    name = lambda x: (x or {}).get("name") or (x or {}).get("displayName") or ""
    print(f"# {key}: {f.get('summary')}")
    print(f"- Link: {base}/browse/{key}")
    print(f"- Type: {name(f.get('issuetype'))} | Status: {name(f.get('status'))} | Priority: {name(f.get('priority'))}")
    print(f"- Affects versions: {', '.join(v['name'] for v in f.get('versions') or []) or '-'}"
          f" | Fix versions: {', '.join(v['name'] for v in f.get('fixVersions') or []) or '-'}")
    print(f"- Components: {', '.join(c['name'] for c in f.get('components') or []) or '-'} | Labels: {', '.join(f.get('labels') or []) or '-'}")
    print(f"- Reporter: {name(f.get('reporter'))} | Assignee: {name(f.get('assignee'))} | Created: {(f.get('created') or '')[:10]} | Updated: {(f.get('updated') or '')[:10]}")
    if customer_field:
        customers = [c.get("value", "") for c in f.get(customer_field) or [] if isinstance(c, dict)]
        print(f"- Customer References: {', '.join(customers) or '-'}")
    links = []
    for l in f.get("issuelinks") or []:
        other = l.get("outwardIssue") or l.get("inwardIssue") or {}
        rel = l["type"].get("outward") if l.get("outwardIssue") else l["type"].get("inward")
        links.append(f"{rel} {other.get('key')} ({(other.get('fields') or {}).get('summary', '')})")
    print(f"- Linked issues: {'; '.join(links) or '-'}")
    if f.get("environment"):
        print(f"\n## Environment\n{f['environment']}")
    print(f"\n## Description\n{f.get('description') or '(empty)'}")

    comments = (f.get("comment") or {}).get("comments", [])
    print(f"\n## Comments ({len(comments)})")
    for c in comments:
        print(f"\n### {name(c.get('author'))} - {(c.get('created') or '')[:10]}\n{c.get('body')}")

    attachments = f.get("attachment") or []
    print(f"\n## Attachments ({len(attachments)})")
    for a in attachments:
        print(f"- {a['filename']} ({a.get('mimeType')}, {a.get('size')} bytes)")
    if attach_dir and attachments:
        attach_dir.mkdir(parents=True, exist_ok=True)
        for a in attachments:
            target = attach_dir / a["filename"]
            try:
                target.write_bytes(get(a["content"], token, accept="*/*").read())
                print(f"  downloaded -> {target}")
            except Exception as e:
                print(f"  could not download {a['filename']}: {e}")
    print(f"\n(credentials from: {source})")


if __name__ == "__main__":
    main()
